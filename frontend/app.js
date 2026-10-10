const API_URL = "http://localhost:8000/api/products";
const API_ORIGIN = "http://localhost:8000";

// Add your real WhatsApp number here using country code and digits only.
// Example format: "COUNTRYCODEPHONENUMBER" — no +, spaces, or dashes.
const WHATSAPP_NUMBER = "";

const state = {
  products: [],
  category: "all",
  search: "",
  sort: "featured"
};

const $ = (selector) => document.querySelector(selector);

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Prices are quoted individually, so never display a numeric price.
function money() {
  return "Contact for price";
}

function getProductImageUrl(value) {
  if (!value) return "";

  try {
    // Uploaded paths such as /uploads/photo.jpg belong to the backend.
    const candidate = new URL(value, API_ORIGIN);

    if (!["http:", "https:"].includes(candidate.protocol)) {
      return "";
    }

    return candidate.href;
  } catch {
    return "";
  }
}

function getInquiryUrl(productTitle) {
  const message = encodeURIComponent(
    `Hello! I'm interested in "${String(productTitle || "a product").slice(0, 120)}". Could you share the details and price?`
  );

  // Use WhatsApp when a real business number has been configured.
  if (/^\d{7,15}$/.test(WHATSAPP_NUMBER)) {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
  }

  // Until the number is configured, direct customers to the contact section.
  return "#contact";
}

function getCategories() {
  return [...new Set(
    state.products.map(p =>
      String(p.category || "Uncategorized").trim()
    )
  )].sort((a, b) => a.localeCompare(b));
}

function renderCategories() {
  $("#categoryOptions").innerHTML = getCategories().map(category => `
    <button
      class="category-button"
      type="button"
      data-category="${escapeHtml(category)}">
      ${escapeHtml(category)}
    </button>
  `).join("");

  document.querySelectorAll("[data-category]").forEach(button => {
    button.classList.toggle(
      "selected",
      button.dataset.category === state.category
    );
  });
}

function getVisibleProducts() {
  const query = state.search.trim().toLowerCase();

  const visible = state.products.filter(product => {
    const category = String(
      product.category || "Uncategorized"
    ).trim();

    const matchesCategory =
      state.category === "all" || category === state.category;

    const searchable = [
      product.title,
      product.category,
      product.description
    ].map(value => String(value || "")).join(" ").toLowerCase();

    return matchesCategory &&
      (!query || searchable.includes(query));
  });

  if (state.sort === "title-asc") {
    visible.sort((a, b) =>
      String(a.title || "").localeCompare(String(b.title || ""))
    );
  } else if (state.sort === "price-asc") {
    // All public prices are quote-only, so keep their original order.
  } else if (state.sort === "price-desc") {
    // All public prices are quote-only, so keep their original order.
  }

  return visible;
}

function renderProducts() {
  const container = $("#catalog-grid");
  const visible = getVisibleProducts();

  $("#resultsCount").textContent =
    `${visible.length} ${visible.length === 1 ? "product" : "products"}`;

  const filter = $("#activeFilter");

  if (state.category !== "all") {
    filter.hidden = false;
    $("#activeFilterLabel").textContent =
      `Category: ${state.category}`;
  } else {
    filter.hidden = true;
  }

  if (!visible.length) {
    container.innerHTML = `
      <div class="status-msg">
        ${state.products.length
          ? "No products match those filters. Try another search or browse all products."
          : "Our catalog is being prepared. Please check back soon."}
      </div>`;
    return;
  }

  container.innerHTML = visible.map(product => {
    const title = escapeHtml(product.title || "Untitled product");
    const category = escapeHtml(product.category || "Uncategorized");
    const description = escapeHtml(
      product.description || "Contact us to learn more about this product."
    );

    const photo = getProductImageUrl(product.image_url);
    const inquiryUrl = getInquiryUrl(product.title);
    const whatsappConfigured = /^\d{7,15}$/.test(WHATSAPP_NUMBER);

    const image = photo
      ? `<img
           src="${escapeHtml(photo)}"
           alt="${title}"
           loading="lazy"
           onerror="this.onerror=null;this.parentElement.textContent='Zolis Digital Print'">`
      : `<div class="image-placeholder">Zolis Digital Print</div>`;

    return `
      <article class="product-card">
        <div class="card-image">${image}</div>
        <div class="card-body">
          <span class="card-category">${category}</span>
          <h3 class="card-title">${title}</h3>
          <p class="card-description">${description}</p>
          <div class="card-footer">
            <span class="card-price">${money()}</span>
            <a
              class="inquire-btn"
              href="${inquiryUrl}"
              ${whatsappConfigured
                ? 'target="_blank" rel="noopener noreferrer"'
                : 'aria-label="Visit the contact section to enquire"'}
            >
              ${whatsappConfigured ? "WhatsApp ↗" : "Enquire ↗"}
            </a>
          </div>
        </div>
      </article>`;
  }).join("");
}

async function fetchProducts() {
  const container = $("#catalog-grid");

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`Catalog request failed: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Unexpected catalog response format");
    }

    state.products = data;
    renderCategories();
    renderProducts();
  } catch (error) {
    console.error("Unable to load catalog:", error);
    $("#resultsCount").textContent = "Catalog unavailable";

    container.innerHTML = `
      <div class="status-msg">
        We couldn't load the catalog. Check that the backend is running
        and the API address is correct, then refresh the page.
      </div>`;
  }
}

function setCategory(category) {
  state.category = category;
  renderCategories();
  renderProducts();

  $("#breadcrumbCurrent").textContent =
    category === "all" ? "Catalog" : category;

  if (window.innerWidth <= 760) closeSidebar();
}

function closeSidebar() {
  $("#sidebar").classList.remove("open");
  $("#scrim").classList.remove("show");
  $("#menuToggle").setAttribute("aria-expanded", "false");
}

document.addEventListener("DOMContentLoaded", () => {
  $("#year").textContent = new Date().getFullYear();

  $("#categoryToggle").addEventListener("click", () => {
    const button = $("#categoryToggle");
    const expanded = button.getAttribute("aria-expanded") === "true";

    button.setAttribute("aria-expanded", String(!expanded));
    $("#categoryList").hidden = expanded;
  });

  $("#categoryList").addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (button) setCategory(button.dataset.category);
  });

  $("#searchInput").addEventListener("input", event => {
    state.search = event.target.value;
    renderProducts();
  });

  $("#sortSelect").addEventListener("change", event => {
    state.sort = event.target.value;
    renderProducts();
  });

  $("#clearFilter").addEventListener("click", () => {
    setCategory("all");
  });

  $("#menuToggle").addEventListener("click", () => {
    const isOpen = $("#sidebar").classList.toggle("open");
    $("#scrim").classList.toggle("show", isOpen);
    $("#menuToggle").setAttribute("aria-expanded", String(isOpen));
  });

  $("#scrim").addEventListener("click", closeSidebar);

  document.querySelectorAll('.sidebar a[href^="#"]').forEach(link => {
    link.addEventListener("click", () => {
      document.querySelectorAll(".sidebar .nav-link").forEach(item => {
        item.classList.remove("active");
      });

      if (link.classList.contains("nav-link")) {
        link.classList.add("active");
      }

      closeSidebar();
    });
  });

  fetchProducts();
});
