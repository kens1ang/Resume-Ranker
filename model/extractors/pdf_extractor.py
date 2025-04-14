import PyPDF2
import tempfile
import shutil
from pathlib import Path
from fastapi import UploadFile, HTTPException
from utils.logging import setup_logger

logger = setup_logger("pdf-extractor")

def extract_text_from_pdf(file_path):
    """Extract text from a PDF file using PyPDF2."""
    text = ""
    try:
        with open(file_path, "rb") as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in range(len(pdf_reader.pages)):
                page_text = pdf_reader.pages[page].extract_text() or ""
                text += page_text + "\n"
        
        if not text.strip():
            logger.warning(f"No text extracted from PDF at {file_path}")
            return None
        
        logger.info(f"Successfully extracted {len(text)} characters from PDF")
        return text
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {e}")
        return None

def save_upload_file_tmp(upload_file: UploadFile) -> Path:
    """Save an upload file to a temporary file and return its path."""
    try:
        suffix = Path(upload_file.filename).suffix
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(upload_file.file, tmp)
            return Path(tmp.name)
    except Exception as e:
        logger.error(f"Error saving upload file: {e}")
        raise HTTPException(status_code=500, detail=f"Error saving uploaded file: {str(e)}")