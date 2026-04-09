from typing import TypeVar, Generic, List, Type
from pydantic import BaseModel
from sqlalchemy.orm import Query
import math

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    pages: int

    class Config:
        from_attributes = True

def paginate(query: Query, page: int, size: int, response_model: Type[T]) -> PaginatedResponse[T]:
    if page < 1:
        page = 1
    if size < 1:
        size = 1
    if size > 200:
        size = 200

    total = query.count()
    pages = math.ceil(total / size) if total > 0 else 0
    
    items = query.offset((page - 1) * size).limit(size).all()
    
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=pages
    )
