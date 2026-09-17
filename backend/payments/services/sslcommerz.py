from sslcommerz_lib import SSLCOMMERZ
from django.conf import settings

class SslCommerzGateway:
    """
    SSLCommerz Payment Gateway Integration.
    Supports bKash, Nagad, Visa, Mastercard, etc.
    """
    
    def __init__(self):
        self.store_id = getattr(settings, 'SSLCOMMERZ_STORE_ID', 'testbox')
        self.store_pass = getattr(settings, 'SSLCOMMERZ_STORE_PASS', 'qwerty')
        self.is_sandbox = getattr(settings, 'SSLCOMMERZ_IS_SANDBOX', True)
        self.sslcz = SSLCOMMERZ({
            'store_id': self.store_id,
            'store_pass': self.store_pass,
            'issandbox': self.is_sandbox
        })

    def create_session(self, order, callback_url_success, callback_url_fail, callback_url_cancel):
        """
        Create a payment session and return the redirect URL.
        """
        post_body = {}
        post_body['total_amount'] = str(order.total)
        post_body['currency'] = "BDT"
        post_body['tran_id'] = order.order_id
        post_body['success_url'] = callback_url_success
        post_body['fail_url'] = callback_url_fail
        post_body['cancel_url'] = callback_url_cancel
        post_body['emi_option'] = 0
        
        # Customer Info
        post_body['cus_name'] = order.customer_name
        post_body['cus_email'] = order.customer_email or 'customer@example.com'
        post_body['cus_phone'] = order.customer_phone
        post_body['cus_add1'] = order.shipping_address
        post_body['cus_city'] = order.city
        post_body['cus_country'] = "Bangladesh"
        
        # Shipping Info (Optional but good for records)
        post_body['shipping_method'] = "Courier"
        post_body['num_of_item'] = order.items.count()
        post_body['ship_name'] = order.customer_name
        post_body['ship_add1'] = order.shipping_address
        post_body['ship_city'] = order.city
        post_body['ship_country'] = "Bangladesh"
        
        # Product Info
        post_body['product_name'] = "Gold Jewelry"
        post_body['product_category'] = "Jewelry"
        post_body['product_profile'] = "general"

        response = self.sslcz.createSession(post_body)
        
        if 'GatewayPageURL' in response:
            return {
                'success': True,
                'gateway_url': response['GatewayPageURL'],
                'sessionkey': response.get('sessionkey')
            }
        else:
            return {
                'success': False,
                'error': response.get('failedreason', 'Unknown error')
            }

    def validate_payment(self, post_data):
        """
        Validate a successful callback with SSLCommerz server-to-server.
        """
        validation_id = post_data.get('val_id')
        if not validation_id:
            return None
        return self.sslcz.validationTransactionOrder(validation_id)

# Singleton instance
sslcommerz_gateway = SslCommerzGateway()
