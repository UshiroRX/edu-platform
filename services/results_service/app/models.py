import uuid
from sqlalchemy import Column, Integer
from sqlalchemy.dialects.postgresql import UUID
from services.results_service.app.db import Base

class Result(Base):
    __tablename__ = "results"
    __table_args__ = {"schema": "results"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False) 
    points = Column(Integer, nullable=False, default=0)
