"""
AI 解析服务 —— DeepSeek API 接入

将高中物理题目（文字或图片）解析为场景配置 JSON。
"""

import json
import os
import httpx

# DeepSeek API 配置
# 从环境变量读取 API Key: DEEPSEEK_API_KEY
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

# 场景 Schema（作为 prompt 上下文）
SCENE_SCHEMA_HINT = """你是一个高中物理题库解析器。请将题目解析为以下 JSON 格式的场景配置：

{
  "scene": {
    "type": "场景类型，从以下选择: incline(斜面)/projectile(抛体)/circular_horizontal(水平圆周)/circular_vertical(竖直圆周)/connected_bodies(连接体)/free_body(自由物体)/plank_block(板块模型)/conveyor_belt(传送带)/spring_oscillator(弹簧振子)/electric_field(电场)/magnetic_field(磁场)",
    "gravity": [gx, gy],  // 重力加速度，默认 [0, 9.8]
    "bodies": [
      {
        "id": "物体ID，如block/ball/particle",
        "mass": 质量kg,
        "position": [x, y],  // 初始位置(米)，屏幕坐标系y轴向下
        "velocity": [vx, vy],  // 初速度(m/s)
        "charge": 电荷C,  // 可选，电磁场场景
        "shape": "rectangle/point/circle",
        "size": [宽, 高],
        "color": "#HEX色值"
      }
    ],
    "constraints": [
      // 根据场景类型添加对应约束:
      // 斜面: {"type":"incline_plane","angle":倾角度,"friction_coeff":摩擦系数,"length":斜面长,"pivot":[x,y],"body_id":"物体ID"}
      // 绳: {"type":"rope","body_ids":["id1","id2"],"length":绳长,"pivot":[x,y]}
      // 弹簧: {"type":"spring","body_id":"id","anchor":[x,y],"spring_constant":k,"rest_length":L}
      // 传送带: {"type":"conveyor_belt","speed":v,"direction":角度,"body_id":"id"}
      // 板块: {"type":"plank","body_ids":["block","plank"],"friction_coeff":μ,"ground_friction":μ2}
      // 电场: {"type":"electric_field","field_strength":E,"direction":角度}
      // 磁场: {"type":"magnetic_field","field_strength":B,"direction":"into_page/out_of_page"}
    ]
  },
  "simulation": {
    "duration": 模拟时长秒,
    "time_step": 0.016
  }
}

只输出 JSON，不要额外说明。"""


async def parse_problem(text: str | None = None, image_url: str | None = None) -> dict:
    """
    解析物理题目为场景配置

    流程：
    1. 构造 prompt（文字直接传入，图片暂不支持）
    2. 调用 DeepSeek API
    3. 解析 JSON 响应
    4. 验证并返回
    """
    if not text:
        return {
            "error": "请提供题目文字描述",
            "scene_config": {},
        }

    if not DEEPSEEK_API_KEY:
        return {
            "error": "未配置 DEEPSEEK_API_KEY 环境变量，请设置后重试",
            "scene_config": {},
        }

    messages = [
        {"role": "system", "content": SCENE_SCHEMA_HINT},
        {"role": "user", "content": f"请解析以下高中物理题目：\n\n{text}"},
    ]

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                DEEPSEEK_API_URL,
                headers={
                    "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "deepseek-chat",
                    "messages": messages,
                    "temperature": 0.1,
                    "max_tokens": 2048,
                },
            )

            if response.status_code != 200:
                return {
                    "error": f"API 调用失败: HTTP {response.status_code}",
                    "scene_config": {},
                }

            data = response.json()
            content = data["choices"][0]["message"]["content"]

            # 提取 JSON（可能被 markdown 代码块包裹）
            json_str = content.strip()
            if json_str.startswith("```"):
                json_str = json_str.split("```")[1]
                if json_str.startswith("json"):
                    json_str = json_str[4:]
                json_str = json_str.strip()

            scene_config = json.loads(json_str)
            return {"scene_config": scene_config}

    except json.JSONDecodeError:
        return {
            "error": "AI 返回格式无法解析，请重试",
            "scene_config": {},
        }
    except httpx.TimeoutException:
        return {
            "error": "API 请求超时，请重试",
            "scene_config": {},
        }
    except Exception as e:
        return {
            "error": f"解析出错: {str(e)}",
            "scene_config": {},
        }
