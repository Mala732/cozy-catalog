const API_URL = "http://localhost:8000/api/products";

async function fetchProducts() {
  const container = document.getElementById("catalog-grid");

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("Failed to load catalog");
    
    const products = await response.json();

    if (products.length === 0) {
      container.innerHTML = `
        <div class="status-msg">
          No catalog items available at the moment. Check back soon!
        </div>`;
      return;
    }

    container.innerHTML = products.map(product => {
      const title = escapeHtml(product.title);
      const category = escapeHtml(product.category);
      const description = escapeHtml(product.description || '');
      const price = product.price.toFixed(2);
      const imageUrl = product.image_url || 'https://via.placeholder.com/400x300/f3ede4/c87d55?text=No+Image';

      // Pre-filled WhatsApp message link for client inquiries
      const whatsappMsg = encodeURIComponent(`Hi! I'm interested in the "${product.title}" listed for $${price}. Is it available?`);
      const whatsappUrl = `https://wa.me/?text=${whatsappMsg}`;

      return `
        <article class="product-card">
          <div class="card-image-wrapper">
            <img src="${imageUrl}" alt="${title}" loading="lazy" />
          </div>
          <div class="card-body">
            <span class="card-category">${category}</span>
            <h2 class="card-title">${title}</h2>
            <p class="card-description">${description}</p>
            <div class="card-footer">
              <span class="card-price">$${price}</span>
              <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration: none;">
                <button class="share-btn">Inquire</button>
              </a>
            </div>
          </div>
        </article>
      `;
    }).join('');

  } catch (error) {
    console.error(error);
    container.innerHTML = `
      <div class="status-msg">
        Unable to load the catalog right now. Please verify your backend server is running.
      </div>`;
  }
}

// Utility function to prevent XSS attacks
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", fetchProducts);