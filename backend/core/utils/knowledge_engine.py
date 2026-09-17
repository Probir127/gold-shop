from __future__ import annotations
import requests
from bs4 import BeautifulSoup
from typing import List
from django.utils import timezone
import pypdf
from .prompt_builder import build_system_prompt

def extract_pdf_text(file_path: str) -> str:
    """
    Extract text from a PDF file using pypdf.
    """
    try:
        text = ""
        with open(file_path, "rb") as f:
            reader = pypdf.PdfReader(f)
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        return text.strip()
    except Exception as e:
        raise Exception(f"PDF extraction failed: {str(e)}")

def scrape_url(url: str) -> str:
    """
    Fetch content from URL and extract readable text.
    """
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (GrownK-Knowledge-Bot/1.0)'
        }
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove noise
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'iframe']):
            tag.decompose()
            
        # Get text and clean whitespace
        text = soup.get_text(separator='\n')
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        return '\n'.join(lines)
        
    except Exception as e:
        raise Exception(f"Scraping failed: {str(e)}")

def chunk_text(text: str, chunk_size: int = 1500, overlap: int = 200) -> List[str]:
    """
    Split text into overlapping chunks.
    """
    if not text:
        return []
        
    chunks = []
    start = 0
    text_len = len(text)
    
    while start < text_len:
        end = min(start + chunk_size, text_len)
        
        # Try to find a good breaking point (newline or period)
        if end < text_len:
            # Look for last newline in the last 20% of the chunk
            search_start = int(start + (chunk_size * 0.8))
            last_break = text.rfind('\n', search_start, end)
            if last_break == -1:
                last_break = text.rfind('. ', search_start, end)
            
            if last_break != -1:
                end = last_break + 1
        
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
            
        start = end - overlap
        if start >= text_len - overlap:
            break
            
    return chunks

def ingest_source(source):
    """
    Main entry point to process a KnowledgeSource.
    """
    from ..models import KnowledgeChunk, BotConfig
    
    source.status = 'processing'
    source.save(update_fields=['status'])
    
    try:
        content = ""
        if source.source_type == 'url':
            content = scrape_url(source.url)
        elif source.source_type in ('text', 'manual'):  # accept both for backward compat
            content = source.raw_content
        elif source.source_type in ('file', 'product_feed'):
            if not source.uploaded_file:
                raise Exception("No file uploaded for this source.")
            content = extract_pdf_text(source.uploaded_file.path)
        else:
            raise Exception(f"Unsupported source type: {source.source_type}")
            
        if not content:
            raise Exception("No content extracted from source.")
            
        # 1. Clear existing chunks
        source.chunks.all().delete()
        
        # 2. Create new chunks with vector embeddings
        from .embeddings import get_embedding
        chunks = chunk_text(content)
        objs = []
        for chunk in chunks:
            embedding = get_embedding(chunk, source.tenant)
            objs.append(
                KnowledgeChunk(
                    tenant=source.tenant,
                    source=source,
                    content=chunk,
                    char_count=len(chunk),
                    vector_embedding=embedding
                )
            )
        KnowledgeChunk.objects.bulk_create(objs)
        
        # 3. Update source status
        source.status = 'ready'
        source.chunk_count = len(chunks)
        source.last_synced = timezone.now()
        source.error_message = ""
        source.save(update_fields=['status', 'chunk_count', 'last_synced', 'error_message'])
        
        # 4. Trigger system prompt regeneration
        config = BotConfig.get_config(source.tenant)
        config.system_prompt = build_system_prompt(source.tenant)
        config.save(update_fields=['system_prompt'])
        
        return True
        
    except Exception as e:
        source.status = 'failed'
        source.error_message = str(e)
        source.save(update_fields=['status', 'error_message'])
        raise e

class KnowledgeEngine:
    def __init__(self, tenant):
        self.tenant = tenant

    def query(self, text, client=None):
        """
        Query the knowledge base and return an AI response.
        """
        from .prompt_builder import build_system_prompt
        from ..models import KnowledgeChunk
        
        # 1. Fetch relevant context
        chunks = KnowledgeChunk.objects.filter(tenant=self.tenant).only('content')[:5]
        context = "\n".join([c.content for c in chunks])
        
        # 2. Build prompt
        system_prompt = build_system_prompt(self.tenant)
        if context:
            system_prompt += f"\n\nContext from our knowledge base:\n{context}"
            
        # 3. Simple response for now
        reply = f"Hello! I am the AI for {self.tenant.business_name}. You said: '{text}'"
        intent = "general_query"
        was_fallback = False
        
        return reply, intent, was_fallback
