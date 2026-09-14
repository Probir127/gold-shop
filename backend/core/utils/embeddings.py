from __future__ import annotations
import math
import logging
from huggingface_hub import InferenceClient
from django.conf import settings

logger = logging.getLogger(__name__)

def get_embedding(text: str, tenant=None) -> list[float]:
    """
    Generate a 384-dimensional vector embedding for the input text using HuggingFace Inference API.
    Uses the sentence-transformers/all-MiniLM-L6-v2 model.
    """
    if not text:
        return []

    # Get API token from settings or tenant BYOK
    if tenant and tenant.llm_mode == 'byok' and tenant.llm_api_key:
        api_key = tenant.llm_api_key
    else:
        api_key = getattr(settings, 'HUGGINGFACE_API_KEY', '')

    if not api_key:
        logger.warning("No HuggingFace API key found — embedding generation skipped.")
        return []

    try:
        client = InferenceClient(token=api_key)
        # Hugging Face feature_extraction API gives a 384-dim dense representation
        res = client.feature_extraction(
            text,
            model="sentence-transformers/all-MiniLM-L6-v2"
        )
        
        # In case the response is wrapped inside nested lists (e.g. [[...]])
        if isinstance(res, list):
            while len(res) > 0 and isinstance(res[0], list):
                res = res[0]
            return [float(x) for x in res]
        
        logger.warning(f"Unexpected response format from HF feature extraction: {type(res)}")
    except Exception as e:
        logger.warning(f"Failed to generate Hugging Face embedding: {e}")
    
    return []

def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    """Calculate the cosine similarity between two vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    
    dot_product = sum(x * y for x, y in zip(v1, v2))
    norm_v1 = math.sqrt(sum(x * x for x in v1))
    norm_v2 = math.sqrt(sum(y * y for y in v2))
    
    if norm_v1 == 0.0 or norm_v2 == 0.0:
        return 0.0
        
    return dot_product / (norm_v1 * norm_v2)
