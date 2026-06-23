import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from .db.session import engine
from .db import Base
from .api.problems import router as problems_router
from .api.upload import router as upload_router
from .api.ai import router as ai_router

# 创建数据库表
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="物理可视化 API",
    description="物理受力分析与运动轨迹可视化 —— 后端服务",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://*.app.codebuddy.work",  # CloudStudio 部署
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件（上传的图片等）
uploads_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# API 路由
app.include_router(problems_router, prefix="/api")
app.include_router(upload_router, prefix="/api")
app.include_router(ai_router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}
