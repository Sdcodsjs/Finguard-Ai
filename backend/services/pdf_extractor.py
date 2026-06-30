"""
FinGuard AI — PDF Extraction Pipeline
OCR + PDF parsing with confidence scoring.
Supports text-native PDFs and scanned image PDFs (Tesseract fallback).
"""
import os
import re
import json
import structlog
from pathlib import Path
from typing import Any
from dataclasses import dataclass, field

log = structlog.get_logger()


@dataclass
class PageContent:
    page_num: int
    text: str
    ocr_used: bool = False
    confidence: float = 1.0  # 0.0–1.0


@dataclass
class ExtractedDocument:
    pages: list[PageContent] = field(default_factory=list)
    full_text: str = ""
    page_count: int = 0
    ocr_quality: float = 1.0
    file_size_bytes: int = 0
    extraction_method: str = "native"  # native | ocr | hybrid
    mda_section: str = ""  # MD&A text for document diff (Module 19)
    mda_start_page: int | None = None
    mda_end_page: int | None = None


def extract_pdf(file_path: str) -> ExtractedDocument:
    """
    Main PDF extraction function.
    1. Try PyMuPDF (fast, native text)
    2. If page is image-only, fall back to Tesseract OCR
    3. Flag low-confidence pages
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {file_path}")

    file_size = path.stat().st_size
    pages: list[PageContent] = []

    try:
        import fitz  # PyMuPDF
        doc = fitz.open(str(path))
        ocr_page_count = 0

        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text")

            if _is_text_empty(text):
                # Fall back to OCR for this page
                ocr_text, confidence = _ocr_page(page)
                pages.append(PageContent(
                    page_num=page_num + 1,
                    text=ocr_text,
                    ocr_used=True,
                    confidence=confidence,
                ))
                ocr_page_count += 1
            else:
                pages.append(PageContent(
                    page_num=page_num + 1,
                    text=text,
                    ocr_used=False,
                    confidence=0.95,
                ))

        doc.close()

        total_pages = len(pages)
        avg_confidence = sum(p.confidence for p in pages) / max(total_pages, 1)
        extraction_method = (
            "ocr" if ocr_page_count == total_pages
            else "hybrid" if ocr_page_count > 0
            else "native"
        )

        full_text = "\n\n".join(
            f"[PAGE {p.page_num}]\n{p.text}" for p in pages
        )

        result = ExtractedDocument(
            pages=pages,
            full_text=full_text,
            page_count=total_pages,
            ocr_quality=round(avg_confidence, 3),
            file_size_bytes=file_size,
            extraction_method=extraction_method,
        )

        # Extract MD&A section for document diff (Module 19)
        result.mda_section, result.mda_start_page, result.mda_end_page = _extract_mda(pages)

        log.info(
            "pdf_extracted",
            pages=total_pages,
            ocr_pages=ocr_page_count,
            quality=avg_confidence,
            method=extraction_method,
            file=path.name,
        )

        return result

    except ImportError:
        log.warning("pymupdf_not_available", fallback="pdfplumber")
        return _extract_with_pdfplumber(path, file_size)
    except Exception as e:
        log.error("pdf_extraction_error", error=str(e), file=str(path))
        raise


def _is_text_empty(text: str) -> bool:
    """A page is considered empty if it has fewer than 50 non-whitespace chars."""
    return len(text.strip()) < 50


def _ocr_page(page) -> tuple[str, float]:
    """
    Use Tesseract OCR on a PyMuPDF page.
    Returns (text, confidence_0_to_1).
    """
    try:
        import pytesseract
        from PIL import Image
        import io

        mat = page.get_pixmap(dpi=200)
        img_data = mat.tobytes("png")
        img = Image.open(io.BytesIO(img_data))

        # Get detailed OCR data with confidence
        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
        confidences = [
            int(c) for c in data["conf"] if c != "-1" and int(c) > 0
        ]
        avg_conf = sum(confidences) / max(len(confidences), 1) / 100.0

        text = pytesseract.image_to_string(img, lang="eng")
        return text, min(avg_conf, 0.9)  # cap at 0.9 for OCR pages

    except ImportError:
        log.warning("tesseract_not_available")
        return "", 0.3
    except Exception as e:
        log.error("ocr_error", error=str(e))
        return "", 0.2


def _extract_with_pdfplumber(path: Path, file_size: int) -> ExtractedDocument:
    """Fallback: pdfplumber extraction."""
    try:
        import pdfplumber
        pages = []

        with pdfplumber.open(str(path)) as pdf:
            for i, page in enumerate(pdf.pages):
                text = page.extract_text() or ""
                pages.append(PageContent(
                    page_num=i + 1,
                    text=text,
                    ocr_used=False,
                    confidence=0.85 if text else 0.2,
                ))

        full_text = "\n\n".join(
            f"[PAGE {p.page_num}]\n{p.text}" for p in pages
        )
        avg_quality = sum(p.confidence for p in pages) / max(len(pages), 1)
        result = ExtractedDocument(
            pages=pages,
            full_text=full_text,
            page_count=len(pages),
            ocr_quality=round(avg_quality, 3),
            file_size_bytes=file_size,
            extraction_method="pdfplumber",
        )
        result.mda_section, result.mda_start_page, result.mda_end_page = _extract_mda(pages)
        return result

    except Exception as e:
        log.error("pdfplumber_error", error=str(e))
        return ExtractedDocument(
            pages=[],
            full_text="",
            page_count=0,
            ocr_quality=0.0,
            file_size_bytes=file_size,
            extraction_method="failed",
        )


def _extract_mda(pages: list[PageContent]) -> tuple[str, int | None, int | None]:
    """
    Find and extract the MD&A (Management Discussion & Analysis) section.
    Used for year-over-year document diff (Module 19).
    """
    mda_patterns = [
        r"management.{0,10}discussion.{0,10}analysis",
        r"management.{0,10}report",
        r"directors.{0,10}report",
        r"MD&A",
    ]
    end_patterns = [
        r"financial statements",
        r"auditor.{0,10}report",
        r"notes to.{0,10}accounts",
        r"independent auditor",
    ]

    mda_start = None
    mda_end = None
    mda_texts = []

    for page in pages:
        text_lower = page.text.lower()

        if mda_start is None:
            for pattern in mda_patterns:
                if re.search(pattern, text_lower):
                    mda_start = page.page_num
                    break

        if mda_start is not None and mda_end is None:
            for pattern in end_patterns:
                if re.search(pattern, text_lower) and page.page_num > mda_start + 2:
                    mda_end = page.page_num - 1
                    break
            if mda_end is None:
                mda_texts.append(page.text)

    # Cap MD&A at 30 pages
    if mda_start is not None and mda_end is None:
        mda_end = mda_start + min(30, len(pages) - mda_start)

    return "\n\n".join(mda_texts[:30]), mda_start, mda_end


def chunk_text(text: str, chunk_size: int = 1500, overlap: int = 200) -> list[dict]:
    """
    Split text into overlapping chunks for RAG embedding.
    Preserves page number references.
    Returns list of {text, page, chunk_index}.

    re.split(r"\\[PAGE (\\d+)\\]", text) with a capture group produces:
    [before_page1, "1", text_of_page1, "2", text_of_page2, ...]
    i.e. odd indices are page numbers, even indices are text sections.
    """
    chunks = []
    # Split on page markers — capture group produces alternating text/page-num segments
    page_sections = re.split(r"\[PAGE (\d+)\]", text)

    chunk_buffer = ""
    current_page = 1
    chunk_index = 0

    # page_sections[0] = text before first [PAGE] marker (preamble)
    # page_sections[1] = "1" (page number string)
    # page_sections[2] = text content of page 1
    # page_sections[3] = "2", page_sections[4] = text of page 2 ... etc.

    # Handle preamble (text before first page marker)
    if page_sections:
        chunk_buffer += page_sections[0]

    # Walk through the rest in pairs: (page_num_str, page_text)
    i = 1
    while i + 1 <= len(page_sections) - 1:
        try:
            current_page = int(page_sections[i])
        except (ValueError, IndexError):
            current_page = current_page  # keep previous page on parse failure
        section_text = page_sections[i + 1] if i + 1 < len(page_sections) else ""
        chunk_buffer += section_text
        i += 2

        # Flush chunks whenever buffer exceeds chunk_size
        while len(chunk_buffer) >= chunk_size:
            chunk_text_content = chunk_buffer[:chunk_size]
            chunks.append({
                "text": chunk_text_content,
                "page": current_page,
                "chunk_index": chunk_index,
            })
            chunk_index += 1
            chunk_buffer = chunk_buffer[chunk_size - overlap:]

    # Add remaining buffer
    if chunk_buffer.strip():
        chunks.append({
            "text": chunk_buffer,
            "page": current_page,
            "chunk_index": chunk_index,
        })

    return chunks
