import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path

router = APIRouter(prefix="/upload", tags=["upload"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"}


@router.post("")
async def upload_image(file: UploadFile = File(...)):
    """上传题目图片"""
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"不支持的文件格式: {ext}")

    filename = f"{uuid.uuid4()}{ext}"
    filepath = UPLOAD_DIR / filename

    content = await file.read()
    filepath.write_bytes(content)

    return {
        "url": f"/uploads/{filename}",
        "filename": filename,
        "size": len(content),
    }
