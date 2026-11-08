import os
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from .database import Base, engine, SessionLocal
from .models import Deployment


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="DeployLab API",
    description="API for the DeployLab DevOps demonstration environment",
    version="1.0.0",
)


class HealthResponse(BaseModel):
    status: str


class StatusResponse(BaseModel):
    application: str
    api: str
    database: str
    environment: str


class InfoResponse(BaseModel):
    application: str
    version: str
    environment: str
    platform: str
    runtime: str


@app.get("/api/health", response_model=HealthResponse)
def health():
    return {"status": "ok"}


@app.get("/api/status", response_model=StatusResponse)
def status():
    database_status = "connected"

    db: Session = SessionLocal()

    try:
        db.execute(text("SELECT 1"))
    except Exception:
        database_status = "unavailable"
    finally:
        db.close()

    if database_status != "connected":
        raise HTTPException(
            status_code=503,
            detail={
                "application": "online",
                "api": "healthy",
                "database": database_status,
            },
        )

    return {
        "application": "online",
        "api": "healthy",
        "database": database_status,
        "environment": os.getenv("DEPLOY_ENVIRONMENT", "local"),
    }


@app.get("/api/info", response_model=InfoResponse)
def info():
    return {
        "application": "DeployLab",
        "version": os.getenv("DEPLOY_VERSION", "local"),
        "environment": os.getenv("DEPLOY_ENVIRONMENT", "local"),
        "platform": os.getenv("DEPLOY_PLATFORM", "Docker"),
        "runtime": "FastAPI",
    }


@app.get("/api/deployments")
def deployments():
    db: Session = SessionLocal()

    try:
        records = (
            db.query(Deployment)
            .order_by(Deployment.created_at.desc())
            .limit(10)
            .all()
        )

        return [
            {
                "id": record.id,
                "version": record.version,
                "status": record.status,
                "environment": record.environment,
                "created_at": record.created_at,
            }
            for record in records
        ]

    finally:
        db.close()


def record_startup_deployment():
    db: Session = SessionLocal()

    try:
        deployment = Deployment(
            version=os.getenv("DEPLOY_VERSION", "local"),
            status="successful",
            environment=os.getenv("DEPLOY_ENVIRONMENT", "local"),
        )

        db.add(deployment)
        db.commit()

    finally:
        db.close()


@app.on_event("startup")
def startup():
    record_startup_deployment()
