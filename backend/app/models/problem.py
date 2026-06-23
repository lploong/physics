from sqlalchemy import Column, Integer, String, Text, DateTime, func
from ..db.session import Base


class Problem(Base):
    __tablename__ = "problems"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    scene_type = Column(String(50), nullable=False, comment="场景类型")
    scene_json = Column(Text, nullable=False, comment="场景配置JSON")
    text = Column(Text, nullable=True, comment="题目原文")
    image_urls = Column(Text, nullable=True, comment="图片URL列表(JSON数组)")
    source = Column(String(20), default="manual", comment="来源: manual / ai_parsed")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
