// ============================================================
// BestNotes — Product Database
//
// HOW TO ADD A NEW PRODUCT:
// 1. Copy poster to:  assets/posters/{id}.png
// 2. Copy PDFs to:    assets/pdfs/{id}/hi.pdf  and  /en.pdf
// 3. Add one object below in PRODUCTS array.
// 4. Deploy. Done — no backend changes needed.
//
// RAZORPAY SETUP:
// Set in Netlify dashboard → Site settings → Environment variables:
//   RAZORPAY_KEY_ID      = rzp_live_xxxxxxxxxxxx
//   RAZORPAY_KEY_SECRET  = your_secret_here
//
// PDF paths are relative to site root.
// They are never exposed in HTML — only sent to the browser
// AFTER the backend verifies the Razorpay payment signature.
// ============================================================

const PRODUCTS = [
  {
    id: "group-d-haryana-gk",
    title: "Haryana GK Notes",
    poster: "assets/posters/haryana-gk.png",
    subtitle: "Districts · History · Culture · Schemes",
    category: "group-d",
    description: "Complete Haryana GK for Group D — all 22 districts, historical timelines, government schemes, cultural facts and PYQs mapped to the HSSC pattern.",
    coverColor: "#1a3a6b",
    accentLines: ["hl-gold", "hl-dark", "hl-blue", "hl-dark", "hl-green"],
    rating: 4.9,
    reviews: 1284,
    updatedDate: "Jun 2026",
    languages: ["hi", "en"],
    pricing: {
      hi: { price: 79, priceWas: 299, label: "हिन्दी" },
      en: { price: 79, priceWas: 299, label: "English" }
    },
    // PDF paths — served from your Netlify site's /assets/pdfs/ folder
    // Never exposed in source HTML; only revealed after payment verification
    pdf: {
      hi: "assets/pdfs/group-d-haryana-gk/hi.pdf",
      en: "assets/pdfs/group-d-haryana-gk/en.pdf"
    },
    previewPDF: "assets/pdfs/group-d-haryana-gk/preview.pdf",
    bundleIncluded: true,
    featured: true,
    bestSeller: true,
    newArrival: false
  },
  {
    id: "group-d-reasoning",
    title: "Reasoning Notes",
    poster: "assets/posters/reasoning.png",
    subtitle: "Series · Coding · Blood Relations · Puzzles",
    category: "group-d",
    description: "Organised by question type — not chapter — so you build pattern recognition fast. Series, coding-decoding, blood relations, directions and ranking.",
    coverColor: "#1a3a6b",
    accentLines: ["hl-blue", "hl-dark", "hl-gold", "hl-dark", "hl-green"],
    rating: 4.8,
    reviews: 962,
    updatedDate: "Jun 2026",
    languages: ["hi", "en"],
    pricing: {
      hi: { price: 49, priceWas: 299, label: "हिन्दी" },
      en: { price: 49, priceWas: 299, label: "English" }
    },
    pdf: {
      hi: "assets/pdfs/group-d-reasoning/hi.pdf",
      en: "assets/pdfs/group-d-reasoning/en.pdf"
    },
    previewPDF: "assets/pdfs/group-d-reasoning/preview.pdf",
    bundleIncluded: true,
    featured: true,
    bestSeller: false,
    newArrival: false
  },
  {
    id: "group-d-math",
    title: "Mathematics Notes",
    poster: "assets/posters/maths.png",
    subtitle: "Arithmetic · Percentage · Ratio · Geometry",
    category: "group-d",
    description: "All HSSC Group D maths topics — arithmetic, percentage, profit/loss, ratio, time-work, and basic geometry — with shortcut techniques for each.",
    coverColor: "#1a3a6b",
    accentLines: ["hl-green", "hl-dark", "hl-blue", "hl-gold", "hl-dark"],
    rating: 4.7,
    reviews: 731,
    updatedDate: "May 2026",
    languages: ["hi", "en"],
    pricing: {
      hi: { price: 49, priceWas: 299, label: "हिन्दी" },
      en: { price: 49, priceWas: 299, label: "English" }
    },
    pdf: {
      hi: "assets/pdfs/group-d-math/hi.pdf",
      en: "assets/pdfs/group-d-math/en.pdf"
    },
    previewPDF: "assets/pdfs/group-d-math/preview.pdf",
    bundleIncluded: true,
    featured: false,
    bestSeller: false,
    newArrival: false
  },
  {
    id: "group-d-hindi",
    title: "Hindi Grammar Notes",
    poster: "assets/posters/hindi.png",
    subtitle: "संधि · समास · रस · अलंकार · मुहावरे",
    category: "group-d",
    description: "Complete Hindi grammar for Group D — Sandhi, Samas, Ras, Alankar, Muhavare and Lokoktiyan with examples and PYQs for each topic.",
    coverColor: "#1a3a6b",
    accentLines: ["hl-gold", "hl-dark", "hl-green", "hl-dark", "hl-blue"],
    rating: 4.8,
    reviews: 845,
    updatedDate: "Jun 2026",
    languages: ["hi"],
    pricing: {
      hi: { price: 49, priceWas: 299, label: "हिन्दी" }
    },
    pdf: {
      hi: "assets/pdfs/group-d-hindi/hi.pdf"
    },
    previewPDF: "assets/pdfs/group-d-hindi/preview.pdf",
    bundleIncluded: true,
    featured: false,
    bestSeller: true,
    newArrival: false
  },
  {
    id: "group-d-science",
    title: "General Science Notes",
    poster: "assets/posters/genralscience.png",
    subtitle: "Physics · Chemistry · Biology · Environment",
    category: "group-d",
    description: "Exam-targeted science for Group D — Physics (motion, force, electricity), Chemistry (elements, acids, reactions), Biology (cells, diseases) and Environment.",
    coverColor: "#1a3a6b",
    accentLines: ["hl-blue", "hl-gold", "hl-dark", "hl-green", "hl-dark"],
    rating: 4.7,
    reviews: 658,
    updatedDate: "Jun 2026",
    languages: ["hi", "en"],
    pricing: {
      hi: { price: 49, priceWas: 299, label: "हिन्दी" },
      en: { price: 49, priceWas: 299, label: "English" }
    },
    pdf: {
      hi: "assets/pdfs/group-d-science/hi.pdf",
      en: "assets/pdfs/group-d-science/en.pdf"
    },
    previewPDF: "assets/pdfs/group-d-science/preview.pdf",
    bundleIncluded: true,
    featured: false,
    bestSeller: false,
    newArrival: true
  },
  {
    id: "group-d-current-affairs",
    title: "Current Affairs 2026",
    poster: "assets/posters/current-affairs.png",
    subtitle: "Monthly Updated · National · International · Haryana",
    category: "group-d",
    description: "Monthly-updated current affairs digest — exam-relevant only, filtered for Group D pattern. National, international, sports, awards and Haryana-specific events.",
    coverColor: "#1a3a6b",
    accentLines: ["hl-dark", "hl-blue", "hl-gold", "hl-green", "hl-dark"],
    rating: 4.6,
    reviews: 543,
    updatedDate: "Jul 2026",
    languages: ["hi", "en"],
    pricing: {
      hi: { price: 49, priceWas: 299, label: "हिन्दी" },
      en: { price: 49, priceWas: 299, label: "English" }
    },
    pdf: {
      hi: "assets/pdfs/group-d-current-affairs/hi.pdf",
      en: "assets/pdfs/group-d-current-affairs/en.pdf"
    },
    previewPDF: "assets/pdfs/group-d-current-affairs/preview.pdf",
    bundleIncluded: true,
    featured: false,
    bestSeller: false,
    newArrival: true
  },
  {
    id: "group-d-english",
    title: "English Grammar Notes",
    poster: "assets/posters/english.png",
    subtitle: "Tenses · Comprehension · Vocabulary · Errors",
    category: "group-d",
    description: "Tenses, comprehension, vocabulary and error-spotting mapped to Group D and SSC patterns. Common error types highlighted with PYQ examples.",
    coverColor: "#1a3a6b",
    accentLines: ["hl-green", "hl-dark", "hl-blue", "hl-gold", "hl-dark"],
    rating: 4.7,
    reviews: 489,
    updatedDate: "May 2026",
    languages: ["en"],
    pricing: {
      en: { price: 49, priceWas: 299, label: "English" }
    },
    pdf: {
      en: "assets/pdfs/group-d-english/en.pdf"
    },
    previewPDF: "assets/pdfs/group-d-english/preview.pdf",
    bundleIncluded: false,
    featured: false,
    bestSeller: false,
    newArrival: false
  },
  {
    id: "group-d-computer",
    title: "Computer Awareness Notes",
    poster: "assets/posters/computer.png",
    subtitle: "Basics · MS Office · Internet · OS",
    category: "group-d",
    description: "Computer fundamentals, MS Office (Word, Excel, PowerPoint), Internet basics and OS concepts — all mapped to the HSSC Group D computer section.",
    coverColor: "#1a3a6b",
    accentLines: ["hl-blue", "hl-dark", "hl-gold", "hl-dark", "hl-green"],
    rating: 4.6,
    reviews: 412,
    updatedDate: "May 2026",
    languages: ["hi", "en"],
    pricing: {
      hi: { price: 49, priceWas: 299, label: "हिन्दी" },
      en: { price: 49, priceWas: 299, label: "English" }
    },
    pdf: {
      hi: "assets/pdfs/group-d-computer/hi.pdf",
      en: "assets/pdfs/group-d-computer/en.pdf"
    },
    previewPDF: "assets/pdfs/group-d-computer/preview.pdf",
    bundleIncluded: false,
    featured: false,
    bestSeller: false,
    newArrival: false
  }
];

// ============================================================
// BUNDLE
// ============================================================
const BUNDLE = {
  id: "group-d-complete-bundle",
  title: "Haryana Group D Complete Bundle",
  poster: "assets/posters/bundle.png",
  subtitle: "सभी नोट्स — एक कीमत में",
  description: "All 7 core subjects in one bundle — Haryana GK, Reasoning, Maths, Hindi Grammar, Science, and Current Affairs. Save ₹700 vs buying separately.",
  includedProducts: [
    "group-d-haryana-gk",
    "group-d-reasoning",
    "group-d-math",
    "group-d-hindi",
    "group-d-english",
    "group-d-science",
    "group-d-current-affairs"
  ],
  languages: ["hi", "en"],
  pricing: {
    hi: { price: 179, priceWas: 999, label: "हिन्दी" },
    en: { price: 179, priceWas: 999, label: "English" }
  },
  // Bundle PDF = a single combined PDF or a ZIP.
  // Point this to whichever file you want delivered.
  pdf: {
    hi: "assets/pdfs/group-d-complete-bundle/hi.pdf",
    en: "assets/pdfs/group-d-complete-bundle/en.pdf"
  },
  accentLines: ["hl-blue", "hl-gold", "hl-dark", "hl-green", "hl-dark"]
};

// ============================================================
// FREE NOTES
// ============================================================
const FREE_NOTES = [
  {
    id: "free-haryana-districts",
    title: "Haryana Districts Map Notes",
    poster: "assets/posters/free-haryana-districts.png",
    description: "Complete one-page summary of all 22 Haryana districts with headquarters, famous for, and year formed.",
    // Free notes use direct links — no payment gate needed
    driveLink: "assets/pdfs/free/haryana-districts.pdf",
    accentLines: ["hl-gold", "hl-dark", "hl-blue"]
  },
  {
    id: "free-reasoning-shortcuts",
    title: "Reasoning Shortcuts Sheet",
    poster: "assets/posters/free-reasoning-shortcuts.png",
    description: "One-page quick-reference for number series, coding patterns and blood relation shortcuts.",
    driveLink: "assets/pdfs/free/reasoning-shortcuts.pdf",
    accentLines: ["hl-blue", "hl-dark", "hl-green"]
  },
  {
    id: "free-current-affairs-june",
    title: "Current Affairs — June 2026",
    poster: "assets/posters/free-current-affairs-june.png",
    description: "Free sample from our monthly current affairs digest — national, Haryana and sports.",
    driveLink: "assets/pdfs/free/current-affairs-june-2026.pdf",
    accentLines: ["hl-green", "hl-gold", "hl-dark"]
  }
];