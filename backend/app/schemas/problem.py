from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ProblemCreate(BaseModel):
    scene_type: str = Field(..., description="场景类型")
    scene_json: dict = Field(..., description="场景配置JSON对象")
    text: Optional[str] = Field(None, description="题目原文")
    image_urls: Optional[list[str]] = Field(default_factory=list, description="图片URL列表")
    source: str = Field(default="manual", description="来源")


class ProblemResponse(BaseModel):
    id: int
    scene_type: str
    scene_json: str
    text: Optional[str] = None
    image_urls: Optional[str] = None
    source: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ParseRequest(BaseModel):
    """AI 解析请求（预留）"""
    text: Optional[str] = Field(None, description="题目文字")
    image_url: Optional[str] = Field(None, description="题目图片URL")


class ParseResponse(BaseModel):
    """AI 解析响应"""
    scene_config: dict = Field(default_factory=dict, description="解析后的场景配置")
    error: Optional[str] = Field(None, description="错误信息")
