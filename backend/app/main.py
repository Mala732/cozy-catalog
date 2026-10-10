
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from pathlib import Path
from uuid import uuid4
from io import BytesIO

from fastapi import UploadFile, File
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError

import jwt
from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, ConfigDict, Field
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from .database import engine, Base, get_db
from .models import Product, ProductImage


Base.metadata.create_all(bind=engine)

app = FastAPI(title="Zolis Digital Print API")

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads")).resolve()
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Restrict browser access to configured frontend origins.
# Configure FRONTEND_ORIGINS before deployment.
frontend_origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:8081",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "")
ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH", "")
password_hasher = PasswordHash.recommended()
bearer_scheme = HTTPBearer(auto_error=False)


def require_admin_config():
    if not JWT_SECRET_KEY or len(JWT_SECRET_KEY) < 32:
        raise HTTPException(
            status_code=503,
            detail="Admin authentication is not configured",
        )
    if not ADMIN_USERNAME or not ADMIN_PASSWORD_HASH:
        raise HTTPException(
            status_code=503,
            detail="Admin credentials are not configured",
        )


def get_current_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        bearer_scheme
    ),
):
    require_admin_config()

    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Admin authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET_KEY,
            algorithms=["HS256"],
            options={"require": ["sub", "exp"]},
        )
        if payload.get("sub") != ADMIN_USERNAME:
            raise ValueError("Invalid subject")
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired admin session",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return ADMIN_USERNAME


class AdminLogin(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=256)


class ProductCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    category: str = Field(min_length=1, max_length=50)
    price: Optional[float] = Field(default=None, ge=0)
    description: Optional[str] = None
    image_url: Optional[str] = Field(default=None, max_length=500)
    is_available: bool = True


class ProductResponse(ProductCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/admin/login")
def admin_login(
    credentials: AdminLogin,
):
    require_admin_config()

    username_ok = secrets.compare_digest(
        credentials.username,
        ADMIN_USERNAME,
    )

    try:
        password_ok = password_hasher.verify(
            credentials.password,
            ADMIN_PASSWORD_HASH,
        )
    except Exception:
        password_ok = False

    if not username_ok or not password_ok:
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
        )

    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {
            "sub": ADMIN_USERNAME,
            "iat": now,
            "exp": now + timedelta(hours=2),
        },
        JWT_SECRET_KEY,
        algorithm="HS256",
    )

    return {"access_token": token, "token_type": "bearer"}


@app.get("/api/products", response_model=List[ProductResponse])
def get_products(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Product).filter(Product.is_available.is_(True))

    if category:
        query = query.filter(Product.category.ilike(category))

    return query.order_by(Product.id.desc()).all()


@app.get("/api/admin/products", response_model=List[ProductResponse])
def get_admin_products(
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    return db.query(Product).order_by(Product.id.desc()).all()

@app.get("/api/products/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .filter(
            Product.id == product_id,
            Product.is_available.is_(True),
        )
        .first()
    )

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return product


@app.post(
    "/api/products",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    db_product = Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


@app.put("/api/products/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    product: ProductCreate,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    db_product = db.query(Product).filter(Product.id == product_id).first()

    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")

    for field, value in product.model_dump().items():
        setattr(db_product, field, value)

    db.commit()
    db.refresh(db_product)
    return db_product


@app.delete("/api/products/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    db_product = db.query(Product).filter(Product.id == product_id).first()

    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")

    db.delete(db_product)
    db.commit()
    return {"message": "Product deleted"}



MAX_IMAGE_BYTES = 5 * 1024 * 1024
ALLOWED_IMAGE_FORMATS = {
    "JPEG": "jpg",
    "PNG": "png",
    "WEBP": "webp",
}


@app.post("/api/admin/uploads", status_code=status.HTTP_201_CREATED)
async def upload_product_image(
    file: UploadFile = File(...),
    admin: str = Depends(get_current_admin),
):
    content = await file.read(MAX_IMAGE_BYTES + 1)
    await file.close()

    if not content:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Images must be 5 MB or smaller.",
        )

    try:
        with Image.open(BytesIO(content)) as image:
            image.verify()

        with Image.open(BytesIO(content)) as image:
            image_format = image.format
            image_width, image_height = image.size
            image.load()

    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise HTTPException(
            status_code=400,
            detail="Please upload a valid JPEG, PNG, or WebP image.",
        )

    if image_format not in ALLOWED_IMAGE_FORMATS:
        raise HTTPException(
            status_code=400,
            detail="Only JPEG, PNG, and WebP images are supported.",
        )

    if image_width > 8000 or image_height > 8000:
        raise HTTPException(
            status_code=400,
            detail="Image dimensions must not exceed 8000 × 8000 pixels.",
        )

    filename = f"{uuid4().hex}.{ALLOWED_IMAGE_FORMATS[image_format]}"
    destination = UPLOAD_DIR / filename
    destination.write_bytes(content)

    return {"image_url": f"/uploads/{filename}"}
