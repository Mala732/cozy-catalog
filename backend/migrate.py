
from sqlalchemy import inspect, text

from app.database import engine, Base
from app.models import Product, ProductImage  # Register both models


with engine.begin() as connection:
    inspector = inspect(connection)

    if "products" not in inspector.get_table_names():
        raise RuntimeError(
            "The products table does not exist. "
            "Check the database connection before migrating."
        )

    columns = {
        column["name"]: column
        for column in inspector.get_columns("products")
    }

    if "price" not in columns:
        raise RuntimeError("The products table has no price column.")

    if not columns["price"]["nullable"]:
        if connection.dialect.name == "postgresql":
            connection.execute(
                text("ALTER TABLE products ALTER COLUMN price DROP NOT NULL")
            )
            print("Updated products.price to allow empty prices.")
        else:
            raise RuntimeError(
                "This migration expects PostgreSQL. "
                "No database changes were made for this database type."
            )
    else:
        print("Product prices already allow empty values.")

    Base.metadata.create_all(bind=connection)

print("Migration completed. Product image support is ready.")
