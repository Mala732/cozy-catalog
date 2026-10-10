from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from .database import engine, Base, get_db
from .models import Product

# Create DB tables automatically on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Cozy Store Catalog API")

# Enable CORS for local JavaScript frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas for validation
class ProductCreate(BaseModel):
    title: str
    category: str
    price: float
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_available: bool = True

class ProductResponse(ProductCreate):
    id: int
    class Config:
        from_attributes = True

@app.get("/api/products", response_model=List[ProductResponse])
def get_products(category: Optional[str] = None, db: Session = Depends(get_db)):
    """Fetch all products or filter by category."""
    query = db.query(Product).filter(Product.is_available == True)
    if category:
        query = query.filter(Product.category.ilike(category))
    return query.all()

@app.post("/api/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    """Add a new product to the database."""
    db_product = Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@app.get("/api/products/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    """Get single product details."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product