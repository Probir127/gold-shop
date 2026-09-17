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
from decimal import Decimal, InvalidOperation
from core.utils.invoice_access import validate_invoice_access_token

class SslCommerzInitView(APIView):
    """Initialize SSLCommerz payment for an order."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        order_id = request.data.get('order_id')
        access_token = request.data.get('access_token', '')
        
        if not order_id:
             return Response({'error': 'Order ID is required'}, status=400)
        
        try:
            order = Order.objects.get(order_id=order_id)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=404)

        token_valid = validate_invoice_access_token(access_token, 'order', order.order_id)
        user = request.user
        owner_valid = bool(
            user and user.is_authenticated and (
                user.is_staff
                or user.email.lower() == order.customer_email.lower()
                or ''.join(char for char in user.username if char.isdigit()).removeprefix('88')
                == ''.join(char for char in order.customer_phone if char.isdigit()).removeprefix('88')
            )
        )
        if not token_valid and not owner_valid:
            return Response({'error': 'Order verification failed'}, status=403)
        
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
        
        try:
            order = Order.objects.get(order_id=tran_id)
            validation = sslcommerz_gateway.validate_payment(data)
            if not validation or validation.get('status') != 'VALID':
                return redirect(f"{frontend_url}/payment-failed?reason=unverified")

            if validation.get('tran_id') != order.order_id:
                return redirect(f"{frontend_url}/payment-failed?reason=order_mismatch")

            try:
                validated_amount = Decimal(str(validation.get('amount')))
            except (InvalidOperation, TypeError):
                return redirect(f"{frontend_url}/payment-failed?reason=amount_mismatch")

            if validated_amount != order.total or validation.get('currency') != 'BDT':
                return redirect(f"{frontend_url}/payment-failed?reason=amount_mismatch")

            if order.payment_status == 'paid':
                return redirect(f"{frontend_url}/order-success?id={tran_id}&payment=success")

            order.payment_status = 'paid'
            order.bkash_transaction_id = val_id
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
