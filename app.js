// ============================================
// BestNotes — App Logic v2
// Instamojo + Google Drive edition
// ============================================

(function () {
  "use strict";

  /* ====================================================
     PAGE LOADER
  ==================================================== */
  window.addEventListener("load", () => {
    const loader = document.getElementById("pageLoader");
    setTimeout(() => loader && loader.classList.add("hide"), 350);
  });

  /* ====================================================
     NAVBAR: scroll glass effect
  ==================================================== */
  const navbar = document.getElementById("navbar");
  function onScroll() {
    if (window.scrollY > 12) navbar && navbar.classList.add("scrolled");
    else navbar && navbar.classList.remove("scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ====================================================
     MOBILE MENU
  ==================================================== */
  const navToggle   = document.getElementById("navToggle");
  const mobileMenu  = document.getElementById("mobileMenu");
  const mobileOvl   = document.getElementById("mobileOverlay");
  const mobileClose = document.getElementById("mobileClose");

  function openMobileMenu()  { mobileMenu.classList.add("open"); mobileOvl.classList.add("open"); document.body.style.overflow = "hidden"; }
  function closeMobileMenu() { mobileMenu.classList.remove("open"); mobileOvl.classList.remove("open"); document.body.style.overflow = ""; }

  navToggle   && navToggle.addEventListener("click", openMobileMenu);
  mobileClose && mobileClose.addEventListener("click", closeMobileMenu);
  mobileOvl   && mobileOvl.addEventListener("click", closeMobileMenu);
  mobileMenu  && mobileMenu.querySelectorAll("a").forEach(a => a.addEventListener("click", closeMobileMenu));

  /* ====================================================
     DARK MODE
  ==================================================== */
  const themeToggle = document.getElementById("themeToggle");
  function applyTheme(t) { document.documentElement.classList.toggle("dark", t === "dark"); }

  // Auto-detect system preference if no stored preference
  let storedTheme = "light";
  try {
    const saved = window.localStorage.getItem("bn_theme");
    if (saved) storedTheme = saved;
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) storedTheme = "dark";
  } catch (e) {}
  applyTheme(storedTheme);

  themeToggle && themeToggle.addEventListener("click", () => {
    const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
    applyTheme(next);
    try { window.localStorage.setItem("bn_theme", next); } catch (e) {}
  });

  /* ====================================================
     SCROLL REVEAL (IntersectionObserver)
  ==================================================== */
  const io = new IntersectionObserver(
    (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in-view"); io.unobserve(e.target); } }),
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  function observeReveal(root) {
    (root || document).querySelectorAll(".reveal, .reveal-scale, .stroke").forEach(el => io.observe(el));
  }
  observeReveal();

  /* ====================================================
     TOAST
  ==================================================== */
  const toast    = document.getElementById("toast");
  const toastMsg = document.getElementById("toastMsg");
  let toastTimer = null;
  function showToast(msg, type) {
    if (!toast) return;
    toastMsg.textContent = msg;
    toast.className = "toast show" + (type === "error" ? " toast-error" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
  }

  /* ====================================================
     WISHLIST (session-only, in-memory)
  ==================================================== */
  const wishlist = new Set();

  /* ====================================================
     HELPERS
  ==================================================== */
  function starSvg() {
    return '<svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>';
  }
  function renderStars(rating) {
    return '<span class="stars">' + Array(5).fill(0).map((_, i) => {
      const full = i < Math.floor(rating);
      const half = !full && i < Math.round(rating);
      return '<svg viewBox="0 0 24 24" style="fill:' + (full || half ? 'currentColor' : 'none') + ';opacity:' + (full || half ? '1' : '0.3') + '"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>';
    }).join("") + '</span>';
  }
  function discountPct(price, was) { return Math.round((1 - price / was) * 100); }

  /* ====================================================
     RAZORPAY CHECKOUT FLOW
     ─────────────────────────────────────────────────
     Step 1 — Frontend calls /create-order with amount
     Step 2 — Backend creates Razorpay order, returns orderId + keyId
     Step 3 — Razorpay Checkout popup opens
     Step 4 — On success, frontend calls /verify-payment with signatures
     Step 5 — Backend verifies HMAC-SHA256 signature
     Step 6 — If verified, frontend reads pdf path from PRODUCTS/BUNDLE
              (already in memory from products-data.js) and triggers download
              — no page redirect, no download.html, immediate inline download
  ==================================================== */

  /**
   * Load the Razorpay SDK script once, lazily.
   * Returns a promise that resolves when Razorpay is available globally.
   */
  function loadRazorpaySdk() {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) { resolve(); return; }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload  = resolve;
      script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
      document.head.appendChild(script);
    });
  }

  /**
   * Trigger an anchor-based file download.
   * Works for same-origin files. For PDFs the browser will open them
   * in a new tab (PDF viewer) — this is the expected behaviour.
   */
  function triggerDownload(pdfPath, filename) {
    const a = document.createElement("a");
    a.href     = pdfPath;
    a.download = filename || "BestNotes.pdf";
    a.target   = "_blank";
    a.rel      = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /**
   * Core payment + download flow.
   * product  — PRODUCTS[i] or BUNDLE
   * lang     — "hi" | "en"
   * buyBtn   — the button element (disabled while processing)
   */
  async function initiateRazorpayCheckout(product, lang, buyBtn) {
    const pricing = product.pricing && product.pricing[lang];
    if (!pricing) {
      showToast("Pricing not found for selected language", "error");
      return;
    }

    const pdfPath = product.pdf && product.pdf[lang];
    if (!pdfPath) {
      showToast("PDF not configured — check products-data.js", "error");
      return;
    }

    // Disable button and show loading state
    if (buyBtn) {
      buyBtn.disabled = true;
      buyBtn._origText = buyBtn.textContent;
      buyBtn.textContent = "Processing…";
    }

    try {
      // ── Step 1: Load SDK ──────────────────────────────────
      await loadRazorpaySdk();

      // ── Step 2: Create Razorpay order (server-side) ───────
      const orderRes = await fetch("/.netlify/functions/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount:  pricing.price,        // in ₹ — function converts to paise
          currency: "INR",
          receipt: `${product.id}_${lang}_${Date.now()}`
        })
      });

      if (!orderRes.ok) {
        const err = await orderRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create payment order");
      }

      const { orderId, amount, currency, keyId } = await orderRes.json();

      // ── Step 3: Open Razorpay Checkout popup ──────────────
      await new Promise((resolve, reject) => {
        const options = {
          key:  keyId,
          amount,                        // paise
          currency,
          name:        "BestNotes",
          description: `${product.title} (${lang === "hi" ? "हिन्दी" : "English"})`,
          order_id:    orderId,
          theme:       { color: "#2563EB" },

          // ── Step 4: Payment success ────────────────────────
          handler: async function (response) {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = response;

            try {
              // ── Step 5: Verify signature (server-side) ─────
              if (buyBtn) buyBtn.textContent = "Verifying…";

              const verifyRes = await fetch("/.netlify/functions/verify-payment", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ razorpay_order_id, razorpay_payment_id, razorpay_signature })
              });

              const verifyData = await verifyRes.json();

              if (!verifyData.verified) {
                throw new Error(verifyData.error || "Payment verification failed");
              }

              // ── Step 6: Download PDF immediately ──────────
              // PDF path comes from products-data.js (already in memory)
              // Backend never learned the product ID or file path
              triggerDownload(pdfPath, `${product.title.replace(/\s+/g, "-")}-${lang}.pdf`);

              showToast("✅ Payment verified — your PDF is downloading!");
              resolve();

            } catch (verifyErr) {
              console.error("Verification error:", verifyErr);
              showToast("Payment received but verification failed. WhatsApp us — we'll send your PDF directly.", "error");
              reject(verifyErr);
            }
          },

          modal: {
            ondismiss: function () {
              // User closed popup without paying
              reject(new Error("Payment cancelled by user"));
            }
          }
        };

        const rzp = new window.Razorpay(options);

        rzp.on("payment.failed", function (response) {
          console.error("Razorpay payment failed:", response.error);
          showToast(response.error.description || "Payment failed. Please try again.", "error");
          reject(new Error(response.error.description));
        });

        rzp.open();
      });

    } catch (err) {
      // Only show toast for non-cancellation errors
      if (err.message !== "Payment cancelled by user") {
        console.error("Checkout error:", err);
        showToast(err.message || "Something went wrong. Please try again.", "error");
      }
    } finally {
      // Always restore button state
      if (buyBtn) {
        buyBtn.disabled  = false;
        buyBtn.textContent = buyBtn._origText || "Buy Now";
      }
    }
  }

  // Public wrappers used by card renderer and bundle card
  function buyProduct(product, lang, buyBtn) {
    initiateRazorpayCheckout(product, lang, buyBtn);
  }

  function buyBundle(lang) {
    const bundleBuyBtnEl = document.getElementById("bundleBuyBtn");
    initiateRazorpayCheckout(BUNDLE, lang, bundleBuyBtnEl);
  }

  /* ====================================================
     PRODUCT CARD RENDERER
  ==================================================== */
  // Track per-card language state
  const cardLangState = {};

  /* Subject config: icon SVG path + gradient colors per product id */
  const SUBJECT_META = {
    "group-d-haryana-gk": {
      icon: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
      color1: "#1a3a6b", color2: "#2563EB", accent: "#C9A227", label: "हरियाणा GK"
    },
    "group-d-reasoning": {
      icon: '<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/><circle cx="12" cy="12" r="10"/>',
      color1: "#1a2a5e", color2: "#1D4ED8", accent: "#60A5FA", label: "Reasoning"
    },
    "group-d-math": {
      icon: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/><line x1="5" y1="5" x2="7" y2="7"/><line x1="17" y1="17" x2="19" y2="19"/>',
      color1: "#0f2a4a", color2: "#155E75", accent: "#34D399", label: "Mathematics"
    },
    "group-d-hindi": {
      icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/>',
      color1: "#2d1a4a", color2: "#6D28D9", accent: "#F9A8D4", label: "हिन्दी व्याकरण"
    },
    "group-d-science": {
      icon: '<path d="M8.5 2v5L6 10l2.5 3v5h7v-5L18 10l-2.5-3V2"/><path d="M5 18h14"/>',
      color1: "#0a2a1a", color2: "#065F46", accent: "#6EE7B7", label: "General Science"
    },
    "group-d-current-affairs": {
      icon: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/><line x1="12" y1="2" x2="12" y2="4"/>',
      color1: "#1a0f2a", color2: "#7C3AED", accent: "#FDE68A", label: "Current Affairs"
    },
    "group-d-english": {
      icon: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
      color1: "#0a1a3a", color2: "#1E40AF", accent: "#FCA5A5", label: "English Grammar"
    },
    "group-d-computer": {
      icon: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
      color1: "#111827", color2: "#374151", accent: "#67E8F9", label: "Computer"
    }
  };

  function productCoverHTML(p) {
    const m = SUBJECT_META[p.id] || {
      icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
      color1: "#1a3a6b", color2: "#2563EB", accent: "#C9A227", label: p.title
    };
    const id = "grad-" + p.id.replace(/[^a-z0-9]/g, "");
    const radId = "rad-" + p.id.replace(/[^a-z0-9]/g, "");
    return `
    <svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" class="cover-svg" aria-hidden="true">
      <defs>
        <linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${m.color1}"/>
          <stop offset="100%" stop-color="${m.color2}"/>
        </linearGradient>
        <radialGradient id="${radId}" cx="75%" cy="25%" r="60%">
          <stop offset="0%" stop-color="${m.accent}" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="${m.accent}" stop-opacity="0"/>
        </radialGradient>
      </defs>

      <!-- Background gradient -->
      <rect width="320" height="200" rx="0" fill="url(#${id})"/>
      <!-- Radial accent glow top-right -->
      <rect width="320" height="200" fill="url(#${radId})"/>

      <!-- Subtle diagonal pattern lines -->
      <g opacity="0.05" stroke="white" stroke-width="0.7">
        <line x1="-40" y1="0" x2="200" y2="200"/>
        <line x1="40" y1="0" x2="280" y2="200"/>
        <line x1="120" y1="0" x2="360" y2="200"/>
        <line x1="200" y1="0" x2="440" y2="200"/>
      </g>

      <!-- Horizontal rule lines (notebook feel) -->
      <g opacity="0.08" stroke="white" stroke-width="0.5">
        <line x1="0" y1="55" x2="320" y2="55"/>
        <line x1="0" y1="100" x2="320" y2="100"/>
        <line x1="0" y1="145" x2="320" y2="145"/>
      </g>

      <!-- Top bar: brand strip -->
      <rect x="0" y="0" width="320" height="36" fill="black" opacity="0.22"/>

      <!-- BestNotes wordmark -->
      <rect x="12" y="10" width="22" height="22" rx="6" fill="white" opacity="0.2"/>
      <text x="23" y="25" text-anchor="middle" font-family="Georgia,serif" font-weight="800"
            font-size="12" fill="white" opacity="1">B</text>
      <text x="42" y="25" font-family="'Poppins','Arial',sans-serif" font-weight="700"
            font-size="11" fill="white" opacity="0.9" letter-spacing="0.5">BESTNOTES</text>

      <!-- Group D badge top-right -->
      <rect x="228" y="10" width="80" height="16" rx="8" fill="${m.accent}" opacity="0.92"/>
      <text x="268" y="22" text-anchor="middle" font-family="'Inter','Arial',sans-serif"
            font-weight="700" font-size="8.5" fill="white" letter-spacing="0.3">HARYANA GROUP D</text>

      <!-- Subject icon — larger, centred vertically in middle zone -->
      <g opacity="0.92">
        <svg x="130" y="44" width="60" height="60" viewBox="0 0 24 24"
             fill="none" stroke="white" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          ${m.icon}
        </svg>
      </g>

      <!-- Accent pill underline below icon -->
      <rect x="144" y="108" width="32" height="4" rx="2" fill="${m.accent}" opacity="0.9"/>

      <!-- Subject name — large, prominent -->
      <text x="160" y="130" text-anchor="middle" font-family="'Poppins','Arial',sans-serif"
            font-weight="800" font-size="17" fill="white" opacity="1" letter-spacing="-0.3">${m.label}</text>

      <!-- Edition line -->
      <text x="160" y="148" text-anchor="middle" font-family="'Inter','Arial',sans-serif"
            font-weight="500" font-size="10" fill="white" opacity="0.6">Premium Handwritten Notes • 2026</text>

      <!-- Bottom bar -->
      <rect x="0" y="166" width="320" height="34" fill="black" opacity="0.28"/>

      <!-- Updated badge bottom-left -->
      <rect x="12" y="173" width="72" height="19" rx="5" fill="${m.accent}" opacity="0.88"/>
      <text x="48" y="185" text-anchor="middle" font-family="'Inter','Arial',sans-serif"
            font-weight="700" font-size="8" fill="white" letter-spacing="0.2">UPDATED ${p.updatedDate.toUpperCase()}</text>

      <!-- PDF icon bottom-right -->
      <text x="295" y="185" text-anchor="middle" font-family="'Inter','Arial',sans-serif"
            font-weight="600" font-size="9.5" fill="white" opacity="0.55">PDF ↓</text>
    </svg>`;
  }

  function productCardHTML(p, index) {
    const defaultLang = p.languages[0]; // first supported language
    cardLangState[p.id] = defaultLang;
    const pricing = p.pricing[defaultLang];
    const pct = discountPct(pricing.price, pricing.priceWas);
    const delay = "d" + ((index % 6) + 1);

    const badgeHTML = p.bestSeller
      ? `<span class="thumb-badge badge badge-gold">Bestseller</span>`
      : p.newArrival
        ? `<span class="thumb-badge badge badge-success">New</span>`
        : p.featured
          ? `<span class="thumb-badge badge badge-primary">Popular</span>`
          : "";

    const langTabsHTML = p.languages.length > 1 ? `
      <div class="lang-radio-group" data-id="${p.id}" role="radiogroup" aria-label="Language">
        ${p.languages.map((lang, idx) => `
          <label class="lang-radio-label">
            <input type="radio" class="lang-radio" name="lang-${p.id}" data-lang="${lang}" data-id="${p.id}"
              ${idx === 0 ? "checked" : ""}
              aria-label="${lang === 'hi' ? 'हिन्दी' : 'English'}">
            <span class="lang-radio-dot"></span>
            <span class="lang-radio-text">${lang === 'hi' ? 'हिन्दी' : 'English'}</span>
          </label>`).join("")}
      </div>` : `<div class="lang-single">${p.pricing[defaultLang].label}</div>`;

    return `
    <div class="card product-card reveal ${delay}" data-id="${p.id}">
      <div class="product-thumb product-cover-thumb">

  ${badgeHTML}

  <button class="wishlist-btn" data-id="${p.id}" aria-label="Add to wishlist">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  </button>

  ${
    p.poster
      ? `
      <img
        src="${p.poster}"
        alt="${p.title}"
        class="product-poster"
        loading="lazy"
        onerror="this.onerror=null;this.src='assets/posters/default.png';"
      >
      `
      : productCoverHTML(p)
  }

</div>
      <div class="product-body">
        <div class="product-top-row">
          <div>
            <a href="product.html?id=${p.id}" class="product-title-link"><h3>${p.title}</h3></a>
            <p class="product-subtitle">${p.subtitle}</p>
          </div>
          <span class="update-badge">📅 ${p.updatedDate}</span>
        </div>
        <div class="product-meta">
          <div class="product-rating">${renderStars(p.rating)}<span>${p.rating.toFixed(1)}</span><span class="rating-count">(${p.reviews})</span></div>
        </div>
        ${langTabsHTML}
        <div class="product-footer">
          <div class="product-price">
            <span class="price-now" id="price-${p.id}">₹${pricing.price}</span>
            <span class="price-was" id="pricewas-${p.id}">₹${pricing.priceWas}</span>
            <span class="discount-badge" id="disc-${p.id}">${pct}% off</span>
          </div>
          <div class="card-btns">
            <button class="btn btn-secondary btn-sm preview-btn" data-id="${p.id}" title="Preview">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="btn btn-primary btn-sm buy-now-btn" data-id="${p.id}">Buy Now</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  /* ====================================================
     PRODUCT GRID + SEARCH + FILTER + LOAD MORE
  ==================================================== */
  const grid        = document.getElementById("productsGrid");
  const searchInput = document.getElementById("productSearch");
  const filterChips = document.getElementById("filterChips");
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  const PAGE_SIZE   = 8;

  let activeFilter = "all";
  let activeQuery  = "";
  let visibleCount = PAGE_SIZE;

  function getFiltered() {
    return PRODUCTS.filter(p => {
      const matchFilter = activeFilter === "all" || p.category === activeFilter;
      const q = activeQuery;
      const matchQuery = !q || p.title.toLowerCase().includes(q) || (p.subtitle && p.subtitle.toLowerCase().includes(q)) || p.description.toLowerCase().includes(q);
      return matchFilter && matchQuery;
    });
  }

  function renderProducts() {
    if (!grid) return;
    const filtered = getFiltered();
    const visible  = filtered.slice(0, visibleCount);

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="no-results"><p class="no-results-title">No notes found</p><p>Try a different keyword or clear the filter.</p></div>`;
      loadMoreBtn && (loadMoreBtn.style.display = "none");
      return;
    }

    grid.innerHTML = visible.map((p, i) => productCardHTML(p, i)).join("");
    observeReveal(grid);

    if (loadMoreBtn) {
      loadMoreBtn.style.display = filtered.length > visibleCount ? "flex" : "none";
    }

    // Wire language radio buttons
    grid.querySelectorAll(".lang-radio").forEach(radio => {
      radio.addEventListener("change", () => {
        const id   = radio.getAttribute("data-id");
        const lang = radio.getAttribute("data-lang");
        const product = PRODUCTS.find(p => p.id === id);
        if (!product || !product.pricing[lang]) return;
        cardLangState[id] = lang;
        const pr = product.pricing[lang];
        const pct = discountPct(pr.price, pr.priceWas);
        const priceEl  = document.getElementById("price-" + id);
        const priceWas = document.getElementById("pricewas-" + id);
        const discEl   = document.getElementById("disc-" + id);
        if (priceEl)  priceEl.textContent  = "₹" + pr.price;
        if (priceWas) priceWas.textContent = "₹" + pr.priceWas;
        if (discEl)   discEl.textContent   = pct + "% off";
      });
    });

    // Wire wishlist
    grid.querySelectorAll(".wishlist-btn").forEach(btn => {
      const id = btn.getAttribute("data-id");
      if (wishlist.has(id)) btn.classList.add("active");
      btn.addEventListener("click", e => {
        e.stopPropagation();
        wishlist.has(id) ? wishlist.delete(id) : wishlist.add(id);
        btn.classList.toggle("active");
        showToast(wishlist.has(id) ? "Added to wishlist" : "Removed from wishlist");
      });
    });

    // Wire buy buttons
    grid.querySelectorAll(".buy-now-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const product = PRODUCTS.find(p => p.id === id);
        if (!product) return;
        const lang = cardLangState[id] || product.languages[0];
        buyProduct(product, lang, btn);
      });
    });

    // Wire preview buttons
    grid.querySelectorAll(".preview-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const product = PRODUCTS.find(p => p.id === id);
        if (!product || !product.previewPDF || product.previewPDF.includes("PLACEHOLDER")) {
          showToast("Preview not available yet");
          return;
        }
        window.open(product.previewPDF, "_blank", "noopener");
      });
    });
  }

  loadMoreBtn && loadMoreBtn.addEventListener("click", () => {
    visibleCount += PAGE_SIZE;
    renderProducts();
    loadMoreBtn.blur();
  });

  searchInput && searchInput.addEventListener("input", e => {
    activeQuery = e.target.value.trim().toLowerCase();
    visibleCount = PAGE_SIZE;
    renderProducts();
  });

  filterChips && filterChips.addEventListener("click", e => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    filterChips.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    activeFilter = chip.getAttribute("data-filter");
    visibleCount = PAGE_SIZE;
    renderProducts();
  });

  renderProducts();

  /* ====================================================
     BUNDLE CARD — language toggle & buy
  ==================================================== */
  let bundleLang = "hi";
  const bundleLangTabs = document.querySelectorAll(".bundle-lang-tab");
  const bundlePriceEl  = document.getElementById("bundlePrice");
  const bundleWasEl    = document.getElementById("bundlePriceWas");
  const bundleDiscEl   = document.getElementById("bundleDiscount");
  const bundleBuyBtn   = document.getElementById("bundleBuyBtn");

  function updateBundlePrice(lang) {
    bundleLang = lang;
    if (!BUNDLE) return;
    const pr = BUNDLE.pricing[lang];
    if (!pr) return;
    const pct = discountPct(pr.price, pr.priceWas);
    if (bundlePriceEl) bundlePriceEl.textContent = "₹" + pr.price;
    if (bundleWasEl)   bundleWasEl.textContent   = "₹" + pr.priceWas;
    if (bundleDiscEl)  bundleDiscEl.textContent  = pct + "% off";
  }

  bundleLangTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      bundleLangTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      updateBundlePrice(tab.getAttribute("data-lang"));
    });
  });

  bundleBuyBtn && bundleBuyBtn.addEventListener("click", () => buyBundle(bundleLang));
  updateBundlePrice("hi");

  /* ====================================================
     SAMPLE CAROUSEL
  ==================================================== */
  const track     = document.getElementById("carouselTrack");
  const dots      = document.querySelectorAll("#carouselDots .carousel-dot");
  const prevBtn   = document.getElementById("sampleBtnPrev");
  const nextBtn   = document.getElementById("sampleBtnNext");
  let slideIndex  = 0;
  const slideCount = track ? track.children.length : 0;

  function goToSlide(i) {
    if (!track || slideCount === 0) return;
    slideIndex = (i + slideCount) % slideCount;
    track.style.transform = `translateX(-${slideIndex * 100}%)`;
    dots.forEach((d, idx) => d.classList.toggle("active", idx === slideIndex));
  }

  prevBtn && prevBtn.addEventListener("click", () => goToSlide(slideIndex - 1));
  nextBtn && nextBtn.addEventListener("click", () => goToSlide(slideIndex + 1));
  dots.forEach((d, idx) => d.addEventListener("click", () => goToSlide(idx)));

  let carouselTimer = slideCount > 1 ? setInterval(() => goToSlide(slideIndex + 1), 5000) : null;
  const carouselWrap = document.querySelector(".sample-carousel");
  carouselWrap && carouselWrap.addEventListener("mouseenter", () => clearInterval(carouselTimer));
  carouselWrap && carouselWrap.addEventListener("mouseleave", () => {
    if (slideCount > 1) carouselTimer = setInterval(() => goToSlide(slideIndex + 1), 5000);
  });

  const dlSampleBtn = document.getElementById("downloadSampleBtn");
  dlSampleBtn && dlSampleBtn.addEventListener("click", () => showToast("Sample PDF download started"));

  /* ====================================================
     FREE NOTES — render cards and wire download
  ==================================================== */
  const freeGrid = document.getElementById("freeNotesGrid");
  if (freeGrid && typeof FREE_NOTES !== "undefined") {
    freeGrid.innerHTML = FREE_NOTES.map((fn, i) => `
      <div class="card free-note-card reveal d${i + 1}">
        <div class="free-thumb">
          ${fn.accentLines.map(cls => `<div class="handwriting-line ${cls}" style="width:${90 - fn.accentLines.indexOf(cls) * 12}%;margin-bottom:12px;height:7px;"></div>`).join("")}
          <span class="free-badge">FREE</span>
        </div>
        <div class="free-body">
          <h3>${fn.title}</h3>
          <p>${fn.description}</p>
          <a href="${fn.driveLink}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm free-dl-btn"
            ${fn.driveLink.includes("PLACEHOLDER") ? 'onclick="return false;" data-placeholder="true"' : ''}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Download Free
          </a>
        </div>
      </div>`).join("");
    observeReveal(freeGrid);
    freeGrid.querySelectorAll("[data-placeholder]").forEach(btn => {
      btn.addEventListener("click", () => showToast("Free PDF link not configured yet"));
    });
  }

  /* ====================================================
     FAQ ACCORDION
  ==================================================== */
  document.querySelectorAll(".faq-item").forEach(item => {
    const q    = item.querySelector(".faq-q");
    const wrap = item.querySelector(".faq-a-wrap");
    q && q.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");
      document.querySelectorAll(".faq-item").forEach(other => {
        other.classList.remove("open");
        const w = other.querySelector(".faq-a-wrap");
        if (w) w.style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add("open");
        wrap.style.maxHeight = wrap.scrollHeight + "px";
      }
    });
  });

  /* ====================================================
     LIVE CHAT stub
  ==================================================== */
  const liveChatBtn = document.getElementById("liveChatBtn");
  liveChatBtn && liveChatBtn.addEventListener("click", () => showToast("Live chat — connect Intercom or Crisp here"));

  /* ====================================================
     NAVBAR SEARCH — real-time product filtering
  ==================================================== */
  const navSearchInput = document.getElementById("navSearchInput");
  navSearchInput && navSearchInput.addEventListener("input", e => {
    const q = e.target.value.trim();
    const mainSearch = document.getElementById("productSearch");
    if (mainSearch) {
      mainSearch.value = q;
      mainSearch.dispatchEvent(new Event("input"));
    }
    if (q) {
      const productsSection = document.getElementById("products");
      if (productsSection) productsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
  navSearchInput && navSearchInput.addEventListener("keydown", e => {
    if (e.key === "Escape") { navSearchInput.value = ""; navSearchInput.blur(); }
  });

  /* ====================================================
     SMOOTH NAV LINK ACTIVE STATE
  ==================================================== */
  const navSections = ["home", "products", "bundle", "about", "reviews", "faq", "footer"];
  const navLinks = document.querySelectorAll(".nav-links a");
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const id = e.target.id;
        navLinks.forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + id));
      }
    });
  }, { rootMargin: "-40% 0px -55% 0px" });

  navSections.forEach(id => {
    const el = document.getElementById(id);
    el && sectionObserver.observe(el);
  });

  /* ====================================================
     BUTTON RIPPLE EFFECT
  ==================================================== */
  document.addEventListener("click", e => {
    const btn = e.target.closest(".btn");
    if (!btn) return;
    const r = document.createElement("span");
    r.className = "ripple";
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size/2}px;top:${e.clientY - rect.top - size/2}px`;
    btn.appendChild(r);
    r.addEventListener("animationend", () => r.remove(), { once: true });
  });

  /* ====================================================
     EXPOSE globals for inline use
  ==================================================== */
  window.BestNotes = { buyBundle, buyProduct, showToast };
})();