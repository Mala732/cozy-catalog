import requests

API_URL = "http://localhost:8000/api/products"

sample_products = [
    {
        "title": "Ceramic Artisan Mug",
        "category": "Homeware",
        "price": 24.50,
        "description": "Handcrafted terracotta ceramic mug with a smooth warm matte finish.",
        "image_url": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500",
        "is_available": True
    },
    {
        "title": "Woven Linen Throw Blanket",
        "category": "Decor",
        "price": 48.00,
        "description": "Soft 100% natural linen throw with raw fringe edges, perfect for cozy spaces.",
        "image_url": "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=500",
        "is_available": True
    },
    {
        "title": "Scented Soy Candle (Amber & Vanilla)",
        "category": "Candles",
        "price": 18.00,
        "description": "Hand-poured soy wax candle in an amber glass jar with a wooden wick.",
        "image_url": "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=500",
        "is_available": True
    }
]

def seed_database():
    print("Seeding database via FastAPI endpoint...")
    for product in sample_products:
        res = requests.post(API_URL, json=product)
        if res.status_code == 201:
            print(f"Added: {product['title']}")
        else:
            print(f"Failed to add {product['title']}: {res.status_code}")

if __name__ == "__main__":
    seed_database()