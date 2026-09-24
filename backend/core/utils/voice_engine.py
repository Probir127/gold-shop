from __future__ import annotations
"""
Voice Engine — Speech-to-Text and Text-to-Speech pipeline.
Supports voice message transcription and spoken audio generation for WhatsApp & Web clients.
"""
import io
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def transcribe_audio(audio_bytes: bytes, content_type: str = "audio/ogg", language: str = "auto") -> str:
    """
    Transcribe incoming voice audio into text.
    Uses Whisper or HF audio inference endpoint with graceful fallback.
    """
    if not audio_bytes:
        return ""
    try:
        from huggingface_hub import InferenceClient
        api_key = getattr(settings, 'HUGGINGFACE_API_KEY', '')
        if api_key:
            client = InferenceClient(token=api_key)
            result = client.automatic_speech_recognition(
                audio=audio_bytes,
                model="openai/whisper-large-v3-turbo"
            )
            return result.get('text', '').strip()
    except Exception as e:
        logger.warning("Voice transcription failed or skipped: %s", e)
    return ""


def synthesize_speech(text: str, language: str = "bn", voice: str = "default") -> bytes | None:
    """
    Synthesize text into spoken audio (TTS).
    Returns audio bytes (mp3/ogg) for dispatching to WhatsApp or Web chat.
    """
    if not text:
        return None
    try:
        from huggingface_hub import InferenceClient
        api_key = getattr(settings, 'HUGGINGFACE_API_KEY', '')
        if api_key:
            client = InferenceClient(token=api_key)
            model = "facebook/mms-tts-ben" if language == "bn" else "facebook/mms-tts-eng"
            audio = client.text_to_speech(text=text, model=model)
            return audio
    except Exception as e:
        logger.warning("Voice synthesis failed or skipped: %s", e)
    return None
