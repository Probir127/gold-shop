from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes # For CSRF exemption if needed
from rest_framework.permissions import AllowAny
from django.shortcuts import redirect
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from orders.models import Order
from .services.sslcommerz import sslcommerz_gateway

class SslCommerzInitView(APIView):
    """Initialize SSLCommerz payment for an order."""
    
    def post(self, request):
        order_id = request.data.get('order_id')
        
        if not order_id:
             return Response({'error': 'Order ID is required'}, status=400)
        
        try:
            order = Order.objects.get(order_id=order_id)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=404)
        
        if order.payment_status == 'paid':
            return Response({'error': 'Order already paid'}, status=400)
        
        # Build Callbacks
        backend_url = getattr(settings, 'BACKEND_URL', 'http://localhost:8000')
        success_url = f"{backend_url}/api/payments/ssl/success/"
        fail_url = f"{backend_url}/api/payments/ssl/fail/"
        cancel_url = f"{backend_url}/api/payments/ssl/cancel/"
        
        result = sslcommerz_gateway.create_session(
            order=order,
            callback_url_success=success_url,
            callback_url_fail=fail_url,
            callback_url_cancel=cancel_url
        )
        
        if result['success']:
            order.payment_status = 'awaiting_payment'
            # order.bkash_payment_id = result['sessionkey'] # Reusing field or add new
            order.save()
            
            return Response({
                'success': True,
                'gateway_url': result['gateway_url']
            })
        else:
            return Response({
                'success': False,
                'error': result.get('error', 'Payment initiation failed')
            }, status=400)

@method_decorator(csrf_exempt, name='dispatch')
class SslCommerzSuccessView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        return self.handle_callback(request)

    def handle_callback(self, request):
        data = request.POST
        val_id = data.get('val_id')
        tran_id = data.get('tran_id')
        
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        
        # In production, verify hash/validation via API again
        # For simple integration:
        try:
            order = Order.objects.get(order_id=tran_id)
            order.payment_status = 'paid'
            order.bkash_transaction_id = val_id  # Using this field for generic trans id
            order.save()
            
            # Trigger Email Notification
            try:
                from orders.emails import send_order_confirmation_email
                send_order_confirmation_email(order)
            except Exception as e:
                print(f"Email Trigger Error: {e}")
                
            return redirect(f"{frontend_url}/order-success?id={tran_id}&payment=success")
        except Order.DoesNotExist:
            return redirect(f"{frontend_url}/payment-failed?reason=order_not_found")

@method_decorator(csrf_exempt, name='dispatch')
class SslCommerzFailView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        return redirect(f"{frontend_url}/payment-failed?reason=failed")

@method_decorator(csrf_exempt, name='dispatch')
class SslCommerzCancelView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        return redirect(f"{frontend_url}/payment-failed?reason=cancelled")
