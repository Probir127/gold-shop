from __future__ import annotations
"""
Sentiment Analyzer — Phase 4
Rule-based sentiment detection for chatbot interactions.
Can be upgraded to LLM-based sentiment analysis later.
"""

POSITIVE_KEYWORDS = [
    'thank', 'thx', 'great', 'awesome', 'good', 'excellent', 'happy', 'love',
    'perfect', 'nice', 'appreciate', 'gratitude', 'helpful', 'thanks',
    'ধন্যবাদ', 'ভালো', 'চমৎকার', 'খুশি'
]

NEGATIVE_KEYWORDS = [
    'bad', 'worst', 'awful', 'terrible', 'horrible', 'poor', 'issue', 'problem',
    'broken', 'error', 'scam', 'fraud', 'cheat', 'lie', 'disappointed',
    'angry', 'frustrated', 'failed', 'failure', 'refund', 'money back',
    'খারাপ', 'সমস্যা', 'ভুল', 'ক্ষতি'
]

def analyze_sentiment(text: str) -> str:
    """
    Analyzes text and returns 'positive', 'negative', or 'neutral'.
    """
    text_lower = text.lower().strip()
    
    # Check negative first (higher priority for monitoring)
    if any(kw in text_lower for kw in NEGATIVE_KEYWORDS):
        return 'negative'
    
    # Check positive
    if any(kw in text_lower for kw in POSITIVE_KEYWORDS):
        return 'positive'
    
    return 'neutral'
