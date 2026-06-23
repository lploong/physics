from fastapi import APIRouter

from ..schemas.problem import ParseRequest, ParseResponse
from ..services.ai_service import parse_problem

router = APIRouter(prefix="/parse", tags=["parse"])


@router.post("", response_model=ParseResponse)
async def parse(data: ParseRequest):
    """
    AI 解析题目 —— DeepSeek API

    接收 { text, image_url }
    → LLM 提取物理参数
    → 返回场景配置 JSON
    """
    result = await parse_problem(text=data.text, image_url=data.image_url)

    err = result.get("error")
    return ParseResponse(
        scene_config=result.get("scene_config", {}),
        error=err,
    )
