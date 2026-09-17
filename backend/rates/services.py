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
            conn = http.client.HTTPSConnection("gold.g.apised.com", timeout=8)
            headers = {"x-api-key": api_key}
            conn.request("GET", "/v1/latest?metals=XAU&weight_unit=gram&base_currency=USD", headers=headers)
            res = conn.getresponse()
            raw = res.read().decode('utf-8')
            if res.status == 200:
                data = json.loads(raw)
                xau = {}
                if isinstance(data, dict):
                    if 'data' in data and isinstance(data['data'], dict):
                        xau = data['data'].get('metal_prices', {}).get('XAU', {})
                    elif 'metal_prices' in data:
                        xau = data.get('metal_prices', {}).get('XAU', {})

                price_24k_usd = float(xau.get('price_24k') or xau.get('price', 0))
                if price_24k_usd > 0:
                    price_22k_usd = float(xau.get('price_22k', 0))
                    price_21k_usd = float(xau.get('price_21k', 0))
                    price_18k_usd = float(xau.get('price_18k', 0))

                    rate_24k_bdt = round(price_24k_usd * usd_bdt)
                    rate_22k_bdt = round(price_22k_usd * usd_bdt) if price_22k_usd > 0 else round(rate_24k_bdt * 0.916)
                    rate_21k_bdt = round(price_21k_usd * usd_bdt) if price_21k_usd > 0 else round(rate_24k_bdt * 0.875)
                    rate_18k_bdt = round(price_18k_usd * usd_bdt) if price_18k_usd > 0 else round(rate_24k_bdt * 0.750)
                    rate_trad_bdt = round(rate_24k_bdt * 0.625)

                    return {
                        'source': 'APISED Gold Market (Live)',
                        'price_usd_per_gram': round(price_24k_usd, 2),
                        'price_usd_per_oz': round(price_24k_usd * TROY_OZ_TO_GRAM, 2),
                        'usd_to_bdt': usd_bdt,
                        'rate_24k': rate_24k_bdt,
                        'rate_22k': rate_22k_bdt,
                        'rate_21k': rate_21k_bdt,
                        'rate_18k': rate_18k_bdt,
                        'rate_traditional': rate_trad_bdt,
                        'change': xau.get('change'),
                        'change_percentage': xau.get('change_percentage'),
                        'updated_at': 'Live Market',
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
