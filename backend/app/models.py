from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.sql import func

from .database import Base


class Deployment(Base):
    __tablename__ = "deployments"

    id = Column(Integer, primary_key=True, index=True)
    version = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False)
    environment = Column(String(50), nullable=False, default="demo")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
