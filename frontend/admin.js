const API_BASE = "http://localhost:8000/api";
const API_ORIGIN = "http://localhost:8000";
const TOKEN_KEY = "zolis_admin_token";

const $ = (selector) => document.querySelector(selector);

let products = [];

function showMessage(selector, message, type = "") {
  const element = $(selector);
  element.textContent = message;
  element.className = type;
}

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

function showDashboard() {
  $("#loginSection").hidden = true;
  $("#dashboardSection").hidden = false;
}

function showLogin() {
  sessionStorage.removeItem(TOKEN_KEY);
  $("#loginSection").hidden = false;
  $("#dashboardSection").hidden = true;
  $("#password").value = "";
  resetProductForm();
}

function imageUrl(path) {
  if (!path) return "";

  try {
    const url = new URL(path, API_ORIGIN);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.href;
  } catch {
    return "";
  }
}

async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    showLogin();
    throw new Error("Your admin session has expired. Please sign in again.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : `Request failed (${response.status}).`
    );
  }

  return data;
}

$("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const button = $("#loginButton");
  button.disabled = true;
  button.textContent = "Signing in…";
  showMessage("#message", "");

  try {
    const response = await fetch(`${API_BASE}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: $("#username").value.trim(),
        password: $("#password").value
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        response.status === 401
          ? "Incorrect username or password."
          : data.detail || "Login failed. Please try again."
      );
    }

    if (!data.access_token) {
      throw new Error("The server did not return an access token.");
    }

    sessionStorage.setItem(TOKEN_KEY, data.access_token);
    $("#password").value = "";
    showDashboard();
    await loadProducts();
  } catch (error) {
    showMessage(
      "#message",
      error instanceof TypeError
        ? "Cannot reach the server. Check that the backend is running."
        : error.message,
      "error"
    );
  } finally {
    button.disabled = false;
    button.textContent = "Sign in";
  }
});

function resetProductForm() {
  $("#productForm").reset();
  $("#productId").value = "";
  $("#productAvailable").checked = true;
  $("#formHeading").textContent = "Add a Product";
  $("#saveProductButton").textContent = "Save Product";
  $("#cancelEditButton").hidden = true;
  showMessage("#productMessage", "");
}

$("#cancelEditButton").addEventListener("click", resetProductForm);

$("#productForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const button = $("#saveProductButton");
  const productId = $("#productId").value;
  const selectedFile = $("#productImage").files[0];

  button.disabled = true;
  button.textContent = selectedFile ? "Uploading and saving…" : "Saving…";
  showMessage("#productMessage", "");

  try {
    let imageUrlValue = "";

    if (productId) {
      const existing = products.find(
        product => String(product.id) === productId
      );
      imageUrlValue = existing?.image_url || "";
    }

    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        throw new Error("Please choose an image smaller than 5 MB.");
      }

      if (!["image/jpeg", "image/png", "image/webp"].includes(selectedFile.type)) {
        throw new Error("Please choose a JPEG, PNG, or WebP image.");
      }

      const formData = new FormData();
      formData.append("file", selectedFile);

      const uploaded = await apiRequest("/admin/uploads", {
        method: "POST",
        body: formData
      });

      imageUrlValue = uploaded.image_url;
    }

    const payload = {
      title: $("#productTitle").value.trim(),
      category: $("#productCategory").value.trim(),
      description: $("#productDescription").value.trim() || null,
      price: null,
      image_url: imageUrlValue || null,
      is_available: $("#productAvailable").checked
    };

    const path = productId
      ? `/products/${encodeURIComponent(productId)}`
      : "/products";

    await apiRequest(path, {
      method: productId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    resetProductForm();
    showMessage(
      "#productMessage",
      productId ? "Product updated successfully." : "Product added successfully.",
      "success"
    );

    await loadProducts();
  } catch (error) {
    showMessage("#productMessage", error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = $("#productId").value ? "Update Product" : "Save Product";
  }
});

function renderProducts() {
  const container = $("#productList");

  $("#productCount").textContent =
    `${products.length} product${products.length === 1 ? "" : "s"}`;

  if (!products.length) {
    container.innerHTML =
      '<div class="empty-state">No products yet. Use the form above to add your first product.</div>';
    return;
  }

  container.innerHTML = products.map(product => {
    const title = escapeHtml(product.title || "Untitled product");
    const category = escapeHtml(product.category || "Uncategorized");
    const description = escapeHtml(product.description || "No description added.");
    const photo = imageUrl(product.image_url);

    return `
      <article class="product-item">
        ${photo
          ? `<img src="${escapeHtml(photo)}" alt="${title}" loading="lazy">`
          : '<div class="empty-state">No product photo</div>'}
        <h3>${title}</h3>
        <div class="product-meta">
          <span class="tag">${category}</span>
          <span class="tag ${product.is_available ? "" : "unavailable"}">
            ${product.is_available ? "Available" : "Unavailable"}
          </span>
        </div>
        <p>${description}</p>
        <p>Public price: Contact for price</p>
        <div class="button-row">
          <button type="button" data-edit="${product.id}">Edit</button>
          <button type="button" class="danger-button" data-delete="${product.id}">
            Delete
          </button>
        </div>
      </article>`;
  }).join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadProducts() {
  const container = $("#productList");
  container.innerHTML = '<div class="empty-state">Loading products…</div>';

  try {
    products = await apiRequest("/admin/products");
    renderProducts();
  } catch (error) {
    container.innerHTML =
      `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

$("#productList").addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");

  if (editButton) {
    const product = products.find(
      item => String(item.id) === editButton.dataset.edit
    );
    if (!product) return;

    $("#productId").value = product.id;
    $("#productTitle").value = product.title || "";
    $("#productCategory").value = product.category || "";
    $("#productDescription").value = product.description || "";
    $("#productAvailable").checked = Boolean(product.is_available);
    $("#productImage").value = "";
    $("#formHeading").textContent = "Edit Product";
    $("#saveProductButton").textContent = "Update Product";
    $("#cancelEditButton").hidden = false;
    showMessage("#productMessage", "Editing selected product.");
    $("#productTitle").focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  if (deleteButton) {
    const product = products.find(
      item => String(item.id) === deleteButton.dataset.delete
    );
    if (!product) return;

    if (!window.confirm(`Delete "${product.title}" permanently?`)) return;

    deleteButton.disabled = true;

    try {
      await apiRequest(`/products/${encodeURIComponent(product.id)}`, {
        method: "DELETE"
      });

      if ($("#productId").value === String(product.id)) {
        resetProductForm();
      }

      showMessage("#productMessage", "Product deleted.", "success");
      await loadProducts();
    } catch (error) {
      showMessage("#productMessage", error.message, "error");
      deleteButton.disabled = false;
    }
  }
});

$("#refreshProductsButton").addEventListener("click", loadProducts);
$("#logoutButton").addEventListener("click", showLogin);

if (getToken()) {
  showDashboard();
  loadProducts();
}