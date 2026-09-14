import os
import json
import http.client
import urllib.request
import logging
from datetime import date
from .models import GoldRate

logger = logging.getLogger(__name__)

TROY_OZ_TO_GRAM = 31.1034768
DEFAULT_USD_BDT = 122.5

def fetch_live_gold_price():
    """
    Fetches live gold price per troy ounce / gram.
    Tries APISED first with the configured key.
    If APISED returns unauthorized or fails, falls back to real-time Gold Market API (gold-api.com).
    Returns dict with source, raw_price, currency, and computed rates per gram in BDT.
    """
    api_key = os.getenv('APISED_API_KEY', '').strip()
    usd_bdt = float(os.getenv('USD_TO_BDT_RATE', DEFAULT_USD_BDT))
    
    # 1. Try APISED if key provided
    if api_key:
        try:
            conn = http.client.HTTPSConnection("gold.g.apised.com", timeout=6)
            headers = {"x-api-key": api_key}
            conn.request("GET", "/v1/latest?metals=XAU&weight_unit=gram&base_currency=USD", headers=headers)
            res = conn.getresponse()
            raw = res.read().decode('utf-8')
            if res.status == 200:
                data = json.loads(raw)
                price_per_gram_usd = None
                if 'data' in data and 'rates' in data['data']:
                    price_per_gram_usd = float(data['data']['rates'].get('XAU', 0))
                elif 'rates' in data:
                    price_per_gram_usd = float(data['rates'].get('XAU', 0))
                elif 'price' in data:
                    price_per_gram_usd = float(data['price'])

                if price_per_gram_usd and price_per_gram_usd > 0:
                    rate_24k_bdt = round(price_per_gram_usd * usd_bdt)
                    return {
                        'source': 'APISED Gold API (Live)',
                        'price_usd_per_gram': round(price_per_gram_usd, 2),
                        'price_usd_per_oz': round(price_per_gram_usd * TROY_OZ_TO_GRAM, 2),
                        'usd_to_bdt': usd_bdt,
                        'rate_24k': rate_24k_bdt,
                        'rate_22k': round(rate_24k_bdt * 0.916),
                        'rate_21k': round(rate_24k_bdt * 0.875),
                        'rate_18k': round(rate_24k_bdt * 0.750),
                        'rate_traditional': round(rate_24k_bdt * 0.625),
                        'status': 'success'
                    }
        except Exception as e:
            logger.warning(f"APISED fetch failed, trying fallback: {e}")

    # 2. Fallback to live global Gold Market API (gold-api.com)
    try:
        req = urllib.request.Request(
            'https://api.gold-api.com/price/XAU',
            headers={'User-Agent': 'SaharaGold-PriceEngine/1.0'}
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode('utf-8'))
                oz_usd = float(data.get('price', 0))
                if oz_usd > 0:
                    gram_usd = oz_usd / TROY_OZ_TO_GRAM
                    rate_24k_bdt = round(gram_usd * usd_bdt)
                    return {
                        'source': 'Global Gold Market Exchange (Live)',
                        'price_usd_per_gram': round(gram_usd, 2),
                        'price_usd_per_oz': round(oz_usd, 2),
                        'usd_to_bdt': usd_bdt,
                        'rate_24k': rate_24k_bdt,
                        'rate_22k': round(rate_24k_bdt * 0.916),
                        'rate_21k': round(rate_24k_bdt * 0.875),
                        'rate_18k': round(rate_24k_bdt * 0.750),
                        'rate_traditional': round(rate_24k_bdt * 0.625),
                        'updated_at': data.get('updatedAtReadable', 'Just now'),
                        'status': 'success'
                    }
    except Exception as e:
        logger.error(f"Fallback live gold API failed: {e}")

    return {
        'status': 'error',
        'message': 'Unable to connect to live gold market sources.'
    }

def sync_live_rate_to_database():
    """
    Fetches live market data and updates today's GoldRate record.
    Returns (gold_rate_obj, market_info)
    """
    market = fetch_live_gold_price()
    if market.get('status') != 'success':
        return None, market

    today = date.today()
    obj, created = GoldRate.objects.update_or_create(
        date=today,
        defaults={
            'rate_22k': market['rate_22k'],
            'rate_21k': market['rate_21k'],
            'rate_18k': market['rate_18k'],
            'rate_traditional': market['rate_traditional']
        }
    )
    return obj, market
