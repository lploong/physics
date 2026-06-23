import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..models.problem import Problem
from ..schemas.problem import ProblemCreate, ProblemResponse

router = APIRouter(prefix="/problems", tags=["problems"])


@router.post("", response_model=ProblemResponse)
def create_problem(data: ProblemCreate, db: Session = Depends(get_db)):
    """保存题目"""
    problem = Problem(
        scene_type=data.scene_type,
        scene_json=json.dumps(data.scene_json, ensure_ascii=False),
        text=data.text,
        image_urls=json.dumps(data.image_urls, ensure_ascii=False) if data.image_urls else "[]",
        source=data.source,
    )
    db.add(problem)
    db.commit()
    db.refresh(problem)
    return problem


@router.get("", response_model=list[ProblemResponse])
def list_problems(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    """获取题目列表"""
    problems = (
        db.query(Problem)
        .order_by(Problem.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return problems


@router.get("/{problem_id}", response_model=ProblemResponse)
def get_problem(problem_id: int, db: Session = Depends(get_db)):
    """获取单个题目"""
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="题目不存在")
    return problem


@router.delete("/{problem_id}")
def delete_problem(problem_id: int, db: Session = Depends(get_db)):
    """删除题目"""
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="题目不存在")
    db.delete(problem)
    db.commit()
    return {"message": "删除成功"}
