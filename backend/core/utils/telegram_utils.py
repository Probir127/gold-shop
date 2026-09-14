from __future__ import annotations
import requests
import logging

logger = logging.getLogger(__name__)

class TelegramBot:
    def __init__(self, token):
        self.token = token
        self.base_url = f"https://api.telegram.org/bot{self.token}"

    def set_webhook(self, url, secret_token=None):
        """Register the webhook URL with Telegram with optional secret token verification."""
        endpoint = f"{self.base_url}/setWebhook"
        payload = {"url": url}
        if secret_token:
            payload["secret_token"] = secret_token
        try:
            response = requests.post(endpoint, json=payload)
            return response.json()
        except Exception as e:
            logger.error(f"Telegram set_webhook error: {e}")
            return {"ok": False, "description": str(e)}

    def send_message(self, chat_id, text):
        """Send a message to a specific Telegram chat."""
        endpoint = f"{self.base_url}/sendMessage"
        data = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML"
        }
        try:
            response = requests.post(endpoint, json=data)
            return response.json()
        except Exception as e:
            logger.error(f"Telegram send_message error: {e}")
            return {"ok": False, "description": str(e)}

    def get_file_url(self, file_id):
        """Get the absolute URL of a file from its file_id."""
        endpoint = f"{self.base_url}/getFile"
        try:
            res = requests.get(endpoint, params={"file_id": file_id}).json()
            if res.get("ok"):
                file_path = res["result"]["file_path"]
                return f"https://api.telegram.org/file/bot{self.token}/{file_path}"
        except Exception as e:
            logger.error(f"Telegram get_file_url error: {e}")
        return None
