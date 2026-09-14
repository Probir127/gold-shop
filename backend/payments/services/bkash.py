import requests
from django.conf import settings
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class BkashGateway:
    """
    bKash Tokenized Checkout Integration.
    """
    
    def __init__(self):
        # Default to sandbox if settings not present
        self.base_url = getattr(settings, 'BKASH_BASE_URL', 'https://tokenized.sandbox.bka.sh/v1.2.0-beta')
        self.app_key = getattr(settings, 'BKASH_APP_KEY', '')
        self.app_secret = getattr(settings, 'BKASH_APP_SECRET', '')
        self.username = getattr(settings, 'BKASH_USERNAME', '')
        self.password = getattr(settings, 'BKASH_PASSWORD', '')
        self.token = None
        self.token_expiry = None
    
    def get_token(self):
        """Grant token for API access."""
        # Use cached token if valid
        if self.token and self.token_expiry and self.token_expiry > datetime.now():
            return self.token
        
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'username': self.username,
            'password': self.password,
        }
        data = {
            'app_key': self.app_key,
            'app_secret': self.app_secret,
        }
        
        try:
            response = requests.post(
                f'{self.base_url}/tokenized/checkout/token/grant',
                json=data,
                headers=headers,
                timeout=30
            )
            response.raise_for_status()
            result = response.json()
            
            if result.get('statusCode') == '0000' and result.get('id_token'):
                self.token = result['id_token']
                # Token usually valid for 3600s, set expiry slightly earlier to be safe
                self.token_expiry = datetime.now() + timedelta(seconds=3500)
                return self.token
            else:
                logger.error(f"bKash Grant Token Failed: {result}")
                raise Exception(f"Failed to get token: {result.get('statusMessage')}")
                
        except Exception as e:
            logger.error(f"bKash Token Error: {str(e)}")
            raise

    def create_payment(self, order_id, amount, callback_url):
        """
        Create a bKash payment request.
        Returns payment URL for user redirect.
        """
        try:
            token = self.get_token()
            
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': token,
                'X-APP-Key': self.app_key,
            }
            data = {
                'mode': '0011',  # 0011 = Checkout without Wallet
                'payerReference': order_id,
                'callbackURL': callback_url,
                'amount': str(amount),
                'currency': 'BDT',
                'intent': 'sale',
                'merchantInvoiceNumber': order_id,
            }
            
            response = requests.post(
                f'{self.base_url}/tokenized/checkout/create',
                json=data,
                headers=headers,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Create Payment Error: {str(e)}")
            return {'statusCode': '9999', 'statusMessage': str(e)}
    
    def execute_payment(self, payment_id):
        """Execute payment after user completes bKash flow."""
        try:
            token = self.get_token()
            
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': token,
                'X-APP-Key': self.app_key,
            }
            data = {'paymentID': payment_id}
            
            response = requests.post(
                f'{self.base_url}/tokenized/checkout/execute',
                json=data,
                headers=headers,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Execute Payment Error: {str(e)}")
            return {'statusCode': '9999', 'statusMessage': str(e)}

    def query_payment(self, payment_id):
        """Check status of a payment."""
        try:
            token = self.get_token()
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': token,
                'X-APP-Key': self.app_key,
            }
            data = {'paymentID': payment_id}
            
            response = requests.post(
                f'{self.base_url}/tokenized/checkout/payment/status',
                json=data,
                headers=headers,
                timeout=30
            )
            return response.json()
        except Exception as e:
            return {'statusCode': '9999', 'statusMessage': str(e)}

# Singleton instance
bkash_gateway = BkashGateway()
