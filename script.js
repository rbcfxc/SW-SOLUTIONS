/* =========================================================
   Metsing.store | Main script
   Vanilla JS: product rendering, cart, checkout, UI
   ========================================================= */

/* ---------------------------------------------------------
   1. CONFIG: edit these values to update the site
   --------------------------------------------------------- */
const CONFIG = {
  whatsappNumber: '27644997135',          // International format, no "+" or spaces
  whatsappDisplay: '+27 64 499 7135',     // How the number is shown on the site
  currency: 'R',
  storageKey: 'metsing-cart-v1',
  themeKey: 'metsing-theme',
};

/* ---------------------------------------------------------
   1b. COMPANY CONSULTATION SERVICE FEES (in Rand).
   IMPORTANT: these are OUR service fees only. Government /
   statutory fees (CIPC, CIDB, SARS, COIDA/Compensation Fund)
   are separate and paid directly to the relevant authority.
   --------------------------------------------------------- */
const SERVICE_PRICES = {
  // Core registrations & related
  companyReg: 350,
  csd: 350,
  csdUpdate: 150,
  coida: 250,
  coidaRoe: 250,
  coidaLogs: 200,
  cidbGrade1: 300,
  cidbGrades2to4: 500,
  cidbUpdate: 200,
  // Other key services
  beneficialOwnership: 200,
  annualReturn: 200,
  sarsTcs: 200,
  sarsUpdate: 200,
  // Additional CIPC services
  directorChanges: 250,
  addressChange: 150,
  contactUpdate: 100,
  fyeChange: 150,
  nameReservation: 100,
  nameChange: 250,
  deregistration: 300,
  reinstatement: 500,
  // Business support services
  companyProfile: 500,
  businessPlan: 800,
  tenderReadiness: 200,
  tenderDocAssist: 350,
  quotationTemplate: 150,
  invoiceTemplate: 150,
  companyLetterhead: 150,
};

/** Note shown on the Company Consultation view, the cart and the WhatsApp order */
const GOV_FEES_NOTE = 'Government/statutory fees are separate from our service fees unless specifically stated and are paid directly to the relevant authority.';

/* ---------------------------------------------------------
   2. PRODUCTS: every product & price lives here.
   category: 'package' | 'niche' | 'addon'
   unit (optional): shown after the price, e.g. '/month'
   --------------------------------------------------------- */
const PRODUCTS = [
  /* ----- Packages ----- */
  {
    id: 'pkg-store',
    category: 'package',
    name: 'Dropshipping Store',
    price: 1000,
    icon: '🛍️',
    description: 'A complete, ready-to-launch online store. Start selling the day you get it.',
    features: [
      'Professional, mobile-friendly design',
      'Homepage & product pages',
      'Cart and checkout',
      'About, Contact, Shipping & Refund pages',
      '10 starter products loaded',
      'Quick handover guide to start selling immediately',
    ],
  },
  {
    id: 'pkg-bundle',
    category: 'package',
    name: 'Launch Bundle',
    price: 1500,
    compareAt: 1900,
    badge: 'Best value',
    featured: true,
    icon: '🚀',
    description: 'Everything you need to launch with confidence: store, brand and payments.',
    features: [
      'Everything in the Dropshipping Store',
      'Custom logo for your brand',
      'Payment gateway setup (PayFast, Yoco or Ozow)',
      '10 starter products loaded',
      'Quick handover guide',
      'Save R400 vs buying separately',
    ],
  },
  {
    id: 'pkg-website',
    category: 'package',
    name: 'Business Website',
    price: 2000,
    icon: '💼',
    description: 'A custom website for any business: salons, plumbers, caterers, consultants and more.',
    features: [
      'Up to 5 pages: Home, About, Services, Gallery, Contact',
      'Contact form',
      'WhatsApp chat button',
      'Mobile-friendly design',
      'Basic SEO setup',
    ],
  },

  /* ----- Ready-made store niches (each = a Dropshipping Store) ----- */
  { id: 'niche-pet',     category: 'niche', label: 'Pet Supplies',          name: 'Dropshipping Store: Pet Supplies',          price: 1000, emoji: '🐾', mini: ['🦴', '🐱', '🎾'], bg: '#FDEBD3', ink: '#8A4B12' },
  { id: 'niche-beauty',  category: 'niche', label: 'Beauty & Skincare',     name: 'Dropshipping Store: Beauty & Skincare',     price: 1000, emoji: '🧴', mini: ['💄', '🌸', '✨'], bg: '#FBE3EA', ink: '#9C2F55' },
  { id: 'niche-fitness', category: 'niche', label: 'Fitness & Activewear',  name: 'Dropshipping Store: Fitness & Activewear',  price: 1000, emoji: '🏋️', mini: ['👟', '🧘', '💪'], bg: '#E2F0FF', ink: '#1C4E8A' },
  { id: 'niche-home',    category: 'niche', label: 'Home & Kitchen',        name: 'Dropshipping Store: Home & Kitchen',        price: 1000, emoji: '🍳', mini: ['🪴', '🕯️', '☕'], bg: '#EDE8DC', ink: '#5B4A2E' },
  { id: 'niche-tech',    category: 'niche', label: 'Tech Gadgets',          name: 'Dropshipping Store: Tech Gadgets',          price: 1000, emoji: '🎧', mini: ['⌚', '🔌', '📱'], bg: '#E4E6F2', ink: '#262B4A' },
  { id: 'niche-baby',    category: 'niche', label: 'Baby & Kids',           name: 'Dropshipping Store: Baby & Kids',           price: 1000, emoji: '🧸', mini: ['🍼', '🧩', '🎈'], bg: '#E6F6F1', ink: '#1E6B57' },
  { id: 'niche-fashion', category: 'niche', label: 'Fashion & Accessories', name: 'Dropshipping Store: Fashion & Accessories', price: 1000, emoji: '👜', mini: ['🕶️', '👗', '💍'], bg: '#F1E6F7', ink: '#5E2A7A' },
  { id: 'niche-car',     category: 'niche', label: 'Car Accessories',       name: 'Dropshipping Store: Car Accessories',       price: 1000, emoji: '🚗', mini: ['🔦', '🧽', '🔧'], bg: '#E5ECE8', ink: '#0B3D2E' },

  /* ----- Add-ons ----- */
  { id: 'add-logo',     category: 'addon', name: 'Logo & Branding Pack',        price: 500, icon: '🎨', description: 'A custom logo, colour palette and fonts so your brand looks pro.' },
  { id: 'add-research', category: 'addon', name: 'Product Research List',       price: 300, icon: '🔍', description: 'A list of trending, high-margin products for your niche.' },
  { id: 'add-supplier', category: 'addon', name: 'SA Supplier Guide',           price: 400, icon: '📦', description: 'Trusted local suppliers for faster delivery to SA customers.' },
  { id: 'add-social',   category: 'addon', name: 'Social Media Setup',          price: 600, icon: '📣', description: 'Branded Facebook, Instagram and TikTok business profiles.' },
  { id: 'add-copy',     category: 'addon', name: 'Product Copy & Creatives',    price: 100, unit: '/product', icon: '✍️', description: 'Persuasive descriptions and polished images that sell.' },
  { id: 'add-payments', category: 'addon', name: 'Payment Gateway Setup',       price: 400, icon: '💳', description: 'Accept card & instant EFT with PayFast, Yoco or Ozow.' },
  { id: 'add-care',     category: 'addon', name: 'Store Maintenance',           price: 300, unit: '/month', icon: '🛠️', description: 'Updates, fixes and small changes handled for you monthly.' },
  { id: 'add-seo',      category: 'addon', name: 'SEO & Google Business',       price: 800, icon: '📈', description: 'Get found on Google Search and Maps by local customers.' },
  { id: 'add-guide',    category: 'addon', name: 'Starter Guide',               price: 250, icon: '📘', description: 'A step-by-step playbook to get your first sales.' },

  /* ----- Company Consultation services (category: 'service') -----
     Prices come from SERVICE_PRICES above (service fees only).
     group: 'core' | 'related' | 'cidb-option' | 'key' | 'cipc' | 'support'
     from: true when the price is a starting ("From") price */

  // Group: "core" (4 main registration cards + their related items & CIDB options)
  {
    id: 'svc-company-reg',
    category: 'service',
    group: 'core',
    name: 'Company Registration',
    price: SERVICE_PRICES.companyReg,
    icon: '🏢',
    features: [
      'CIPC company registration',
      'Registration documents',
      'SARS income tax registration / details',
      'Bank account opening assistance (optional)',
    ],
  },
  {
    id: 'svc-csd',
    category: 'service',
    group: 'core',
    name: 'CSD Registration',
    price: SERVICE_PRICES.csd,
    icon: '🏛️',
    features: [
      'Complete CSD registration',
      'Supplier registration document',
    ],
    relatedIds: ['svc-csd-update'],
  },
  {
    id: 'svc-csd-update',
    category: 'service',
    group: 'related',
    name: 'CSD Update',
    price: SERVICE_PRICES.csdUpdate,
    description: 'Banking details, contact details, addresses, commodities and company information.',
  },
  {
    id: 'svc-coida',
    category: 'service',
    group: 'core',
    name: 'COIDA Registration',
    price: SERVICE_PRICES.coida,
    icon: '🦺',
    features: [
      'We assist with COIDA registration',
      'We do the annual calculations (Return of Earnings)',
      'We advise you of the amount payable',
      'You pay directly to the Compensation Fund',
      'We retrieve and send your registration certificate',
    ],
    relatedIds: ['svc-coida-roe', 'svc-coida-logs'],
  },
  {
    id: 'svc-coida-roe',
    category: 'service',
    group: 'related',
    name: 'Return of Earnings (ROE)',
    price: SERVICE_PRICES.coidaRoe,
  },
  {
    id: 'svc-coida-logs',
    category: 'service',
    group: 'related',
    name: 'Letter of Good Standing',
    price: SERVICE_PRICES.coidaLogs,
  },
  {
    id: 'svc-cidb-g1',
    category: 'service',
    group: 'core',
    cidbCard: true,
    cardTitle: 'CIDB Registration',
    name: 'CIDB Registration (Grade 1)',
    optionLabel: 'Grade 1',
    price: SERVICE_PRICES.cidbGrade1,
    statFeeNote: 'service fee + R450 paid directly to CIDB',
    icon: '🏗️',
    features: [
      'Contractor registration application with the CIDB',
      'Guidance on required supporting documents',
      'CIDB statutory fees are paid directly to CIDB',
    ],
    optionIds: ['svc-cidb-g1', 'svc-cidb-g24'],
    relatedIds: ['svc-cidb-update'],
  },
  {
    id: 'svc-cidb-g24',
    category: 'service',
    group: 'cidb-option',
    name: 'CIDB Registration (Grades 2 to 4)',
    optionLabel: 'Grades 2 to 4',
    price: SERVICE_PRICES.cidbGrades2to4,
    statFeeNote: 'service fee + applicable CIDB fee paid directly to CIDB',
  },
  {
    id: 'svc-cidb-update',
    category: 'service',
    group: 'related',
    name: 'CIDB Profile Update',
    price: SERVICE_PRICES.cidbUpdate,
  },

  // Group: "key" (4 compact cards)
  {
    id: 'svc-bo-filing',
    category: 'service',
    group: 'key',
    name: 'Beneficial Ownership Filing',
    price: SERVICE_PRICES.beneficialOwnership,
    icon: '🔐',
    description: 'CIPC beneficial ownership declaration and filing.',
  },
  {
    id: 'svc-annual-return',
    category: 'service',
    group: 'key',
    name: 'CIPC Annual Return Filing',
    price: SERVICE_PRICES.annualReturn,
    from: true,
    icon: '📅',
    description: 'Keep your company active by filing annual returns on time.',
  },
  {
    id: 'svc-sars-tcs',
    category: 'service',
    group: 'key',
    name: 'SARS Tax Compliance Status (TCS)',
    price: SERVICE_PRICES.sarsTcs,
    icon: '🧾',
    description: 'Tax compliance status PIN request and verification setup.',
  },
  {
    id: 'svc-sars-update',
    category: 'service',
    group: 'key',
    name: 'SARS Company Details Update',
    price: SERVICE_PRICES.sarsUpdate,
    from: true,
    icon: '🔄',
    description: 'Update registered representative, banking or contact details.',
  },

  // Group: "cipc" (Additional CIPC Services price-list rows)
  { id: 'svc-cipc-director',  category: 'service', group: 'cipc', name: 'Director Changes',                 price: SERVICE_PRICES.directorChanges },
  { id: 'svc-cipc-address',   category: 'service', group: 'cipc', name: 'Company Address Change',           price: SERVICE_PRICES.addressChange },
  { id: 'svc-cipc-contact',   category: 'service', group: 'cipc', name: 'Contact Details Update',           price: SERVICE_PRICES.contactUpdate },
  { id: 'svc-cipc-fye',       category: 'service', group: 'cipc', name: 'Financial Year-End Change',        price: SERVICE_PRICES.fyeChange },
  { id: 'svc-cipc-nameres',   category: 'service', group: 'cipc', name: 'Company Name Reservation',         price: SERVICE_PRICES.nameReservation },
  { id: 'svc-cipc-namechg',   category: 'service', group: 'cipc', name: 'Company Name Change',              price: SERVICE_PRICES.nameChange },
  { id: 'svc-cipc-dereg',     category: 'service', group: 'cipc', name: 'Company Deregistration Assistance', price: SERVICE_PRICES.deregistration },
  { id: 'svc-cipc-reinstate', category: 'service', group: 'cipc', name: 'Company Reinstatement Assistance', price: SERVICE_PRICES.reinstatement, from: true },

  // Group: "support" (Business Support Services price-list rows)
  { id: 'svc-sup-profile',    category: 'service', group: 'support', name: 'Professional Company Profile', price: SERVICE_PRICES.companyProfile, from: true },
  { id: 'svc-sup-plan',       category: 'service', group: 'support', name: 'Business Plan',                price: SERVICE_PRICES.businessPlan, from: true },
  { id: 'svc-tender-check',   category: 'service', group: 'support', name: 'Tender Readiness Check',       price: SERVICE_PRICES.tenderReadiness },
  { id: 'svc-sup-tenderdoc',  category: 'service', group: 'support', name: 'Tender Document Assistance',   price: SERVICE_PRICES.tenderDocAssist, from: true },
  { id: 'svc-sup-quote',      category: 'service', group: 'support', name: 'Quotation Template',           price: SERVICE_PRICES.quotationTemplate },
  { id: 'svc-sup-invoice',    category: 'service', group: 'support', name: 'Invoice Template',             price: SERVICE_PRICES.invoiceTemplate },
  { id: 'svc-sup-letterhead', category: 'service', group: 'support', name: 'Company Letterhead',           price: SERVICE_PRICES.companyLetterhead },
];

/* ---------------------------------------------------------
   3. Helpers
   --------------------------------------------------------- */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const findProduct = (id) => PRODUCTS.find((p) => p.id === id);

/** Format a number as ZAR, e.g. 1500 -> "R1,500" */
function formatZAR(amount) {
  return CONFIG.currency + Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Escape text before injecting into HTML */
function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Build a wa.me link with a pre-filled message */
function whatsappLink(message) {
  return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

/* ---------------------------------------------------------
   4. Render products from the PRODUCTS array
   --------------------------------------------------------- */
function renderPackages() {
  const grid = $('#packages-grid');
  if (!grid) return;
  grid.innerHTML = PRODUCTS.filter((p) => p.category === 'package').map((p, i) => `
    <article class="package ${p.featured ? 'featured' : ''} reveal" style="--d:${i * 100}ms" aria-labelledby="${p.id}-title">
      ${p.badge ? `<span class="package-badge">${esc(p.badge)}</span>` : ''}
      <div class="package-icon" aria-hidden="true">${p.icon}</div>
      <h3 id="${p.id}-title">${esc(p.name)}</h3>
      <p class="package-desc">${esc(p.description)}</p>
      <div class="package-price">
        <strong>${formatZAR(p.price)}</strong>
        ${p.compareAt ? `<s aria-label="Worth ${formatZAR(p.compareAt)}">${formatZAR(p.compareAt)}</s>` : ''}
        <small>once-off</small>
      </div>
      <ul class="package-features">
        ${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}
      </ul>
      <button class="btn ${p.featured ? 'btn-accent' : 'btn-primary'} btn-block btn-lg" data-add="${p.id}" aria-label="Add ${esc(p.name)} to cart">
        Add to Cart
      </button>
    </article>`).join('');
}

function renderNiches() {
  const grid = $('#niches-grid');
  if (!grid) return;
  grid.innerHTML = PRODUCTS.filter((p) => p.category === 'niche').map((p, i) => `
    <button class="niche reveal" style="--d:${(i % 4) * 80}ms; --niche-bg:${p.bg}; --niche-ink:${p.ink}"
            data-add="${p.id}" aria-label="Add ${esc(p.name)} to cart, ${formatZAR(p.price)}">
      <div class="niche-mock" aria-hidden="true">
        <div class="nm-bar"><i></i><span></span><span></span><span></span></div>
        <div class="nm-hero"><div><b></b><small></small></div><em>${p.emoji}</em></div>
        <div class="nm-grid">${p.mini.map((m) => `<span>${m}</span>`).join('')}</div>
      </div>
      <div class="niche-info">
        <h3>${esc(p.label)}</h3>
        <p>Starting at <strong>${formatZAR(p.price)}</strong></p>
        <span class="niche-cta">Add to cart</span>
      </div>
    </button>`).join('');
}

function renderAddons() {
  const grid = $('#addons-grid');
  if (!grid) return;
  grid.innerHTML = PRODUCTS.filter((p) => p.category === 'addon').map((p, i) => `
    <article class="addon reveal" style="--d:${(i % 3) * 80}ms">
      <div class="addon-top">
        <span class="addon-icon" aria-hidden="true">${p.icon}</span>
        <div>
          <h3>${esc(p.name)}</h3>
          <p>${esc(p.description)}</p>
        </div>
      </div>
      <div class="addon-bottom">
        <span class="addon-price">${formatZAR(p.price)}${p.unit ? `<small>${esc(p.unit)}</small>` : ''}</span>
        <button class="btn btn-outline" data-add="${p.id}" aria-label="Add ${esc(p.name)} to cart">Add to Cart</button>
      </div>
    </article>`).join('');
}

function renderServices() {
  const grid = $('#services-grid');
  if (!grid) return;

  const coreServices = PRODUCTS.filter((p) => p.category === 'service' && p.group === 'core');
  const keyServices = PRODUCTS.filter((p) => p.category === 'service' && p.group === 'key');
  const cipcServices = PRODUCTS.filter((p) => p.category === 'service' && p.group === 'cipc');
  const supportServices = PRODUCTS.filter((p) => p.category === 'service' && p.group === 'support');

  const renderRelated = (relatedIds = []) => {
    if (!relatedIds.length) return '';
    const rows = relatedIds.map((id) => findProduct(id)).filter(Boolean).map((rel) => `
      <li class="service-related-row">
        <div>
          <span class="service-related-name">${esc(rel.name)}</span>
          ${rel.description ? `<small class="service-related-desc">${esc(rel.description)}</small>` : ''}
        </div>
        <div class="service-related-right">
          <strong class="service-related-price">${rel.from ? 'From ' : ''}${formatZAR(rel.price)}</strong>
          <button type="button" class="btn btn-outline btn-xs" data-add="${rel.id}" aria-label="Add ${esc(rel.name)} to cart">+ Add</button>
        </div>
      </li>`).join('');
    return `
      <div class="service-related">
        <p class="service-related-label">Related services</p>
        <ul class="service-related-list">${rows}</ul>
      </div>`;
  };

  const coreHtml = coreServices.map((p, i) => {
    if (p.cidbCard) {
      const options = (p.optionIds || []).map((id) => findProduct(id)).filter(Boolean);
      return `
      <article class="service service-core reveal" style="--d:${(i % 4) * 80}ms" aria-labelledby="${p.id}-title">
        <div class="service-main">
          <div class="service-head">
            <span class="service-icon" aria-hidden="true">${p.icon}</span>
            <div>
              <h4 id="${p.id}-title">${esc(p.cardTitle || p.name)}</h4>
              <div class="service-price">
                <span class="price-from">From</span>
                <strong>${formatZAR(p.price)}</strong>
                <small class="gov-fees">service fee</small>
              </div>
            </div>
          </div>
          <p class="service-label">What we do</p>
          <ul class="service-features">
            ${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}
          </ul>
          <div class="cidb-options" role="group" aria-label="CIDB grade options">
            ${options.map((opt) => `
              <div class="cidb-option">
                <div>
                  <strong class="cidb-grade">${esc(opt.optionLabel)}: ${formatZAR(opt.price)}</strong>
                  <small class="cidb-note">${esc(opt.statFeeNote)}</small>
                </div>
                <button type="button" class="btn btn-primary btn-xs" data-add="${opt.id}" aria-label="Add ${esc(opt.name)} to cart">Add</button>
              </div>`).join('')}
          </div>
        </div>
        <div class="service-side">
          ${renderRelated(p.relatedIds)}
        </div>
      </article>`;
    }

    return `
    <article class="service service-core reveal" style="--d:${(i % 4) * 80}ms" aria-labelledby="${p.id}-title">
      <div class="service-main">
        <div class="service-head">
          <span class="service-icon" aria-hidden="true">${p.icon}</span>
          <div>
            <h4 id="${p.id}-title">${esc(p.name)}</h4>
            <div class="service-price">
              ${p.from ? '<span class="price-from">From</span>' : ''}
              <strong>${formatZAR(p.price)}</strong>
              <small class="gov-fees">service fee</small>
            </div>
          </div>
        </div>
        <p class="service-label">What we do</p>
        <ul class="service-features">
          ${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}
        </ul>
      </div>
      <div class="service-side">
        <button type="button" class="btn btn-primary btn-block" data-add="${p.id}" aria-label="Add ${esc(p.name)} to cart">
          Add to Cart
        </button>
        ${renderRelated(p.relatedIds)}
      </div>
    </article>`;
  }).join('');

  const keyHtml = keyServices.map((p, i) => `
    <article class="service service-key reveal" style="--d:${(i % 4) * 70}ms" aria-labelledby="${p.id}-title">
      <div class="service-key-top">
        <span class="service-icon" aria-hidden="true">${p.icon}</span>
        <div>
          <h4 id="${p.id}-title">${esc(p.name)}</h4>
          ${p.description ? `<p class="service-desc">${esc(p.description)}</p>` : ''}
        </div>
      </div>
      <div class="service-key-bottom">
        <div class="service-price">
          ${p.from ? '<span class="price-from">From</span>' : ''}
          <strong>${formatZAR(p.price)}</strong>
        </div>
        <button type="button" class="btn btn-outline" data-add="${p.id}" aria-label="Add ${esc(p.name)} to cart">Add to Cart</button>
      </div>
    </article>`).join('');

  const renderPriceRow = (p) => `
    <li class="price-row">
      <span class="price-row-name">${esc(p.name)}</span>
      <span class="price-row-dots" aria-hidden="true"></span>
      <span class="price-row-val">${p.from ? '<small>from</small> ' : ''}${formatZAR(p.price)}</span>
      <button type="button" class="price-row-add" data-add="${p.id}" aria-label="Add ${esc(p.name)} to cart">+</button>
    </li>`;

  const askMoreHref = whatsappLink("Hi Metsing.store! I'd like to ask about a company consultation or business service not listed on your site.");

  grid.innerHTML = `
    <div class="services-block">
      <h3 class="services-subhead reveal">Core registrations</h3>
      <div class="services-core-grid">${coreHtml}</div>
    </div>

    <div class="services-block">
      <h3 class="services-subhead reveal">Other key services</h3>
      <div class="services-key-grid">${keyHtml}</div>
    </div>

    <div class="services-lists-grid">
      <section class="price-panel reveal" aria-labelledby="cipc-list-title">
        <h3 id="cipc-list-title">Additional CIPC Services</h3>
        <ul class="price-list">
          ${cipcServices.map(renderPriceRow).join('')}
        </ul>
        <p class="price-footnote">*Applicable CIPC fees are separate.</p>
      </section>

      <section class="price-panel reveal" style="--d:100ms" aria-labelledby="support-list-title">
        <h3 id="support-list-title">Business Support Services</h3>
        <ul class="price-list">
          ${supportServices.map(renderPriceRow).join('')}
        </ul>
        <div class="price-more">
          <p>And many more business services!</p>
          <a href="${askMoreHref}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Ask about another service</a>
        </div>
      </section>
    </div>`;
}

/* ---------------------------------------------------------
   5. Cart state (persisted in localStorage)
   Cart format: [{ id: 'pkg-store', qty: 1 }, ...]
   Names/prices are always read from PRODUCTS, so editing
   a price updates existing carts automatically.
   --------------------------------------------------------- */
let cart = loadCart();

function loadCart() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    // Drop anything that no longer exists in PRODUCTS
    return Array.isArray(parsed)
      ? parsed.filter((i) => findProduct(i.id) && Number.isInteger(i.qty) && i.qty > 0)
      : [];
  } catch (err) {
    console.warn('Could not load cart:', err);
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(cart));
  } catch (err) {
    console.warn('Could not save cart:', err);
  }
}

function addToCart(id) {
  const product = findProduct(id);
  if (!product) return;
  const existing = cart.find((i) => i.id === id);
  if (existing) existing.qty += 1;
  else cart.push({ id, qty: 1 });
  saveCart();
  renderCart();
  bumpCount();
  showToast(`✓ ${product.name} added to cart`, true);
}

function changeQty(id, delta) {
  const item = cart.find((i) => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter((i) => i.id !== id);
  saveCart();
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter((i) => i.id !== id);
  saveCart();
  renderCart();
  // Keep keyboard focus inside the drawer after removing
  ($('.ci-remove') || $('#cart-close')).focus();
}

const cartCount = () => cart.reduce((sum, i) => sum + i.qty, 0);
const cartTotal = () => cart.reduce((sum, i) => sum + findProduct(i.id).price * i.qty, 0);
const isService = (id) => findProduct(id).category === 'service';
const cartHasServices = () => cart.some((i) => isService(i.id));
const cartHasFromItems = () => cart.some((i) => !!findProduct(i.id).from);

/* ---------------------------------------------------------
   6. Cart UI
   --------------------------------------------------------- */
const drawer = $('#cart-drawer');
const overlay = $('#overlay');
const cartOpenBtn = $('#cart-open');
let lastFocused = null;

function renderCart() {
  const list = $('#cart-items');
  const count = cartCount();
  const hasServices = cartHasServices();
  const hasFrom = cartHasFromItems();

  list.innerHTML = cart.map(({ id, qty }) => {
    const p = findProduct(id);
    const prefix = p.from ? 'From ' : '';
    return `
      <li class="cart-item">
        <div>
          <div class="ci-name">${esc(p.name)}</div>
          <div class="ci-unit">${prefix}${formatZAR(p.price)}${p.unit ? esc(p.unit) : ''} each</div>
        </div>
        <div class="ci-line">${prefix}${formatZAR(p.price * qty)}</div>
        <div class="qty" role="group" aria-label="Quantity for ${esc(p.name)}">
          <button type="button" data-qty="-1" data-id="${id}" aria-label="Decrease quantity">−</button>
          <span aria-live="polite">${qty}</span>
          <button type="button" data-qty="1" data-id="${id}" aria-label="Increase quantity">+</button>
        </div>
        <button type="button" class="ci-remove" data-remove="${id}" aria-label="Remove ${esc(p.name)} from cart">Remove</button>
      </li>`;
  }).join('');

  const totalLabelEl = $('#cart-total-label');
  if (totalLabelEl) {
    totalLabelEl.textContent = hasServices ? 'Total (our service fees)' : 'Total';
  }
  $('#cart-total').textContent = formatZAR(cartTotal());
  $('#cart-count').textContent = count;
  const fromNoteEl = $('#cart-from-note');
  if (fromNoteEl) fromNoteEl.hidden = !hasFrom;
  $('#cart-service-note').hidden = !hasServices;
  cartOpenBtn.setAttribute('aria-label', `Open cart, ${count} item${count === 1 ? '' : 's'}`);
  drawer.classList.toggle('is-empty', count === 0);
}

function bumpCount() {
  const el = $('#cart-count');
  el.classList.remove('bump');
  void el.offsetWidth; // restart animation
  el.classList.add('bump');
}

function openCart() {
  lastFocused = document.activeElement;
  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add('show'));
  drawer.classList.add('open');
  drawer.removeAttribute('inert');
  drawer.setAttribute('aria-hidden', 'false');
  cartOpenBtn.setAttribute('aria-expanded', 'true');
  document.body.classList.add('no-scroll');
  setTimeout(() => $('#cart-close').focus(), 50);
}

function closeCart({ restoreFocus = true } = {}) {
  overlay.classList.remove('show');
  drawer.classList.remove('open');
  drawer.setAttribute('inert', '');
  drawer.setAttribute('aria-hidden', 'true');
  cartOpenBtn.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('no-scroll');
  setTimeout(() => { overlay.hidden = true; }, 300);
  if (restoreFocus && lastFocused) lastFocused.focus();
}

/** Keep Tab focus inside the open drawer */
function trapFocus(e) {
  if (e.key !== 'Tab' || !drawer.classList.contains('open')) return;
  const focusable = $$('button, a[href], input, textarea, select, [tabindex]:not([tabindex="-1"])', drawer)
    .filter((el) => !el.disabled && el.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

/* ---------------------------------------------------------
   7. Checkout
   --------------------------------------------------------- */
function getFormData() {
  const f = $('#checkout-form').elements;
  return {
    name: f.namedItem('name').value.trim(),
    email: f.namedItem('email').value.trim(),
    phone: f.namedItem('phone').value.trim(),
    business: f.namedItem('business').value.trim(),
    notes: f.namedItem('notes').value.trim(),
  };
}

/** Validate required fields; returns true if valid */
function validateForm() {
  const f = $('#checkout-form').elements;
  const data = getFormData();
  const errors = [];
  const checks = [
    [f.namedItem('name'), data.name.length >= 2, 'your name'],
    [f.namedItem('email'), /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email), 'a valid email'],
    [f.namedItem('phone'), data.phone.replace(/\D/g, '').length >= 9, 'a valid phone number'],
  ];
  checks.forEach(([input, ok, label]) => {
    input.setAttribute('aria-invalid', ok ? 'false' : 'true');
    if (!ok) errors.push(label);
  });

  const errorEl = $('#form-error');
  if (errors.length) {
    errorEl.textContent = `Please enter ${errors.join(', ')}.`;
    checks.find(([, ok]) => !ok)[0].focus();
    return false;
  }
  errorEl.textContent = '';
  return true;
}

/** Build the pre-filled WhatsApp order message */
function buildOrderMessage() {
  const d = getFormData();
  const toLine = ({ id, qty }) => {
    const p = findProduct(id);
    const fromTag = p.from ? ' (from)' : '';
    const unitTag = p.unit ? ` (${p.unit.replace('/', 'per ')})` : '';
    return `• ${p.name} x${qty}: ${p.from ? 'From ' : ''}${formatZAR(p.price * qty)}${fromTag}${unitTag}`;
  };

  // Group items when the cart contains both stores/websites and Company Consultation services
  const storeItems = cart.filter((i) => !isService(i.id));
  const serviceItems = cart.filter((i) => isService(i.id));
  const hasServices = serviceItems.length > 0;
  const hasFrom = cartHasFromItems();
  const itemSection = (storeItems.length && hasServices)
    ? ['*Websites & Stores:*', ...storeItems.map(toLine), '', '*Company Consultation:*', ...serviceItems.map(toLine)]
    : ['*Items:*', ...cart.map(toLine)];

  return [
    '🛍️ *New order: Metsing.store*',
    '',
    ...itemSection,
    '',
    `*${hasServices ? 'Total (our service fees)' : 'Total'}: ${formatZAR(cartTotal())}*`,
    hasFrom ? "_'From' prices are confirmed on WhatsApp once we know the details._" : null,
    hasServices ? `_${GOV_FEES_NOTE}_` : null,
    '',
    '*My details:*',
    `Name: ${d.name}`,
    `Email: ${d.email}`,
    `Phone: ${d.phone}`,
    d.business ? `Business/Niche: ${d.business}` : null,
    d.notes ? `Notes: ${d.notes}` : null,
    '',
    hasServices ? '📎 For Company Consultation services, I\'ll have my ID copy and proof of address ready.' : null,
    hasServices ? '' : null,
    'Please confirm my order and send payment details. Thank you!',
  ].filter((l) => l !== null).join('\n');
}

function orderOnWhatsApp(e) {
  e.preventDefault();
  if (!cart.length) return;
  if (!validateForm()) return;
  window.open(whatsappLink(buildOrderMessage()), '_blank', 'noopener');
  showToast('Opening WhatsApp… we\'ll reply shortly! 🎉');
}

/**
 * Optional: PayFast checkout (placeholder)
 * -------------------------------------------------------
 * To enable, create a PayFast merchant account, then replace the
 * placeholder below. NEVER expose your passphrase in front-end code:
 * generate the signature on a server.
 *
 * const PAYFAST = {
 *   url: 'https://www.payfast.co.za/eng/process', // sandbox: https://sandbox.payfast.co.za/eng/process
 *   merchant_id: 'YOUR_MERCHANT_ID',
 *   merchant_key: 'YOUR_MERCHANT_KEY',
 *   return_url: 'https://metsing.store/thank-you.html',
 *   cancel_url: 'https://metsing.store/',
 *   notify_url: 'https://metsing.store/api/payfast-notify',
 * };
 *
 * const d = getFormData();
 * const fields = {
 *   merchant_id: PAYFAST.merchant_id,
 *   merchant_key: PAYFAST.merchant_key,
 *   return_url: PAYFAST.return_url,
 *   cancel_url: PAYFAST.cancel_url,
 *   notify_url: PAYFAST.notify_url,
 *   name_first: d.name,
 *   email_address: d.email,
 *   amount: cartTotal().toFixed(2),
 *   item_name: 'Metsing.store order',
 *   // signature: '...generated server-side...'
 * };
 * const form = document.createElement('form');
 * form.method = 'POST';
 * form.action = PAYFAST.url;
 * Object.entries(fields).forEach(([k, v]) => {
 *   const input = document.createElement('input');
 *   input.type = 'hidden'; input.name = k; input.value = v;
 *   form.appendChild(input);
 * });
 * document.body.appendChild(form);
 * form.submit();
 */
function payWithPayFast() {
  if (!cart.length) return;
  if (!validateForm()) return;
  // Placeholder until PayFast is configured (see comment above)
  showToast('Online card payments are coming soon. Please order on WhatsApp for now.');
}

/* ---------------------------------------------------------
   8. Toast
   --------------------------------------------------------- */
let toastTimer;
function showToast(message, withCartLink = false) {
  const toast = $('#toast');
  toast.innerHTML = `<span>${esc(message)}</span>${withCartLink ? '<button type="button" id="toast-view">View cart</button>' : ''}`;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

/* ---------------------------------------------------------
   9. Theme (light / dark)
   --------------------------------------------------------- */
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  $('#theme-toggle').setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  $('meta[name="theme-color"]').setAttribute('content', theme === 'dark' ? '#07130E' : '#0B3D2E');
  try { localStorage.setItem(CONFIG.themeKey, theme); } catch (e) { /* storage unavailable */ }
}

/* ---------------------------------------------------------
   10. Mobile menu
   --------------------------------------------------------- */
function toggleMenu(force) {
  const links = $('#nav-links');
  const btn = $('#menu-toggle');
  const open = typeof force === 'boolean' ? force : !links.classList.contains('open');
  links.classList.toggle('open', open);
  btn.setAttribute('aria-expanded', String(open));
  btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}

/* ---------------------------------------------------------
   11. FAQ accordion (one open at a time)
   --------------------------------------------------------- */
function initFAQ() {
  $$('.faq-q').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      $$('.faq-item.open').forEach((el) => {
        el.classList.remove('open');
        $('.faq-q', el).setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/* ---------------------------------------------------------
   12. Scroll reveal
   --------------------------------------------------------- */
let revealObserver = null;

function initReveal() {
  const els = $$('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('visible'));
    return;
  }
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach((el) => revealObserver.observe(el));
}

function revealViewElements(viewEl) {
  if (!viewEl) return;
  const hiddenEls = $$('.reveal:not(.visible)', viewEl);
  if (!hiddenEls.length) return;
  if (!revealObserver) {
    hiddenEls.forEach((el) => el.classList.add('visible'));
    return;
  }
  hiddenEls.forEach((el) => {
    revealObserver.unobserve(el);
    revealObserver.observe(el);
  });
  // Ensure elements already within the viewport become visible immediately after un-hiding
  requestAnimationFrame(() => {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    hiddenEls.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < vh && rect.bottom > 0) {
        el.classList.add('visible');
        revealObserver.unobserve(el);
      }
    });
  });
}

/* ---------------------------------------------------------
   12b. View controller (hash-based tab routing)
   --------------------------------------------------------- */
const HOME_TITLE = document.title;
const VIEW_TITLES = {
  home: HOME_TITLE,
  niches: 'Store Niches | Metsing.store',
  addons: 'Add-ons | Metsing.store',
  services: 'Company Consultation | Metsing.store',
};
const HOME_ANCHORS = new Set(['packages', 'how', 'testimonials', 'faq', 'top']);

function getScrollBehavior() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

function updateNavCurrent(viewName, hashId) {
  let activeHref = '';
  if (viewName === 'niches' || viewName === 'addons' || viewName === 'services') {
    activeHref = `#${viewName}`;
  } else if (hashId === 'packages' || hashId === 'faq') {
    activeHref = `#${hashId}`;
  }
  $$('#nav-links a').forEach((a) => {
    if (a.getAttribute('href') === activeHref) {
      a.setAttribute('aria-current', 'page');
    } else {
      a.removeAttribute('aria-current');
    }
  });
}

function showView(name) {
  const targetName = VIEW_TITLES[name] ? name : 'home';
  let activeWrapper = null;

  $$('[data-view]').forEach((wrapper) => {
    const isTarget = wrapper.dataset.view === targetName;
    wrapper.classList.toggle('is-active', isTarget);
    if (isTarget) {
      wrapper.removeAttribute('hidden');
      activeWrapper = wrapper;
    } else {
      wrapper.setAttribute('hidden', '');
    }
  });

  toggleMenu(false);
  document.title = VIEW_TITLES[targetName] || HOME_TITLE;

  if (activeWrapper) {
    revealViewElements(activeWrapper);
    const heading = $('h2', activeWrapper);
    if (heading) {
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      try {
        heading.focus({ preventScroll: true });
      } catch (err) {
        heading.focus();
      }
    }
  }
  return activeWrapper;
}

function routeFromHash({ isInitial = false } = {}) {
  const rawHash = (window.location.hash || '').replace(/^#/, '');
  const behavior = isInitial ? 'auto' : getScrollBehavior();

  if (rawHash === 'niches' || rawHash === 'addons' || rawHash === 'services' || rawHash === 'consultation') {
    const viewName = rawHash === 'consultation' ? 'services' : rawHash;
    showView(viewName);
    updateNavCurrent(viewName, viewName);
    window.scrollTo({ top: 0, behavior });
    return;
  }

  if (rawHash === 'tender-bundle') {
    showView('services');
    updateNavCurrent('services', 'tender-bundle');
    requestAnimationFrame(() => {
      const bundleEl = $('#tender-bundle');
      if (bundleEl) bundleEl.scrollIntoView({ behavior, block: 'start' });
    });
    return;
  }

  // Home view (default for #packages, #how, #testimonials, #faq, #top, empty, or unknown hash)
  const isKnownHomeAnchor = HOME_ANCHORS.has(rawHash);
  showView('home');
  updateNavCurrent('home', isKnownHomeAnchor ? rawHash : '');

  if (!rawHash || rawHash === 'top' || !isKnownHomeAnchor) {
    if (!isInitial || rawHash === 'top') {
      window.scrollTo({ top: 0, behavior });
    }
    return;
  }

  requestAnimationFrame(() => {
    const targetEl = document.getElementById(rawHash);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior, block: 'start' });
      const sectionHeading = $('h2', targetEl);
      if (sectionHeading) {
        if (!sectionHeading.hasAttribute('tabindex')) sectionHeading.setAttribute('tabindex', '-1');
        try { sectionHeading.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      }
    }
  });
}

function initViews() {
  routeFromHash({ isInitial: true });
  window.addEventListener('hashchange', () => routeFromHash({ isInitial: false }));

  // Handle clicks on hash links even when the hash is already active (e.g. clicking an already-open tab)
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link || link.classList.contains('js-whatsapp') || link.classList.contains('skip-link')) return;
    const href = link.getAttribute('href');
    if (!href || href === '#') return;
    if (drawer.classList.contains('open')) closeCart({ restoreFocus: false });
    if (window.location.hash === href) {
      e.preventDefault();
      routeFromHash({ isInitial: false });
    }
  });
}

/* ---------------------------------------------------------
   13. Init & event wiring
   --------------------------------------------------------- */
function init() {
  renderPackages();
  renderNiches();
  renderAddons();
  renderServices();
  renderCart();
  initFAQ();
  initReveal();
  initViews();

  // Theme toggle
  setTheme(document.documentElement.getAttribute('data-theme') || 'light');
  $('#theme-toggle').addEventListener('click', () => {
    setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  // All WhatsApp links: set real href from config
  $$('.js-whatsapp').forEach((a) => {
    a.href = whatsappLink(a.dataset.msg || 'Hi Metsing.store!');
    a.target = '_blank';
    a.rel = 'noopener';
  });
  $$('.js-phone-display').forEach((el) => { el.textContent = CONFIG.whatsappDisplay; });
  $('#year').textContent = new Date().getFullYear();

  // Add to cart (event delegation covers packages, niches & add-ons)
  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-add]');
    if (addBtn) {
      addToCart(addBtn.dataset.add);
      if (addBtn.classList.contains('btn')) {
        const original = addBtn.textContent;
        addBtn.classList.add('added');
        addBtn.textContent = '✓ Added';
        setTimeout(() => { addBtn.classList.remove('added'); addBtn.textContent = original; }, 1400);
      }
      return;
    }
    if (e.target.closest('#toast-view') || e.target.closest('.js-open-cart')) {
      $('#toast').classList.remove('show');
      openCart();
    }
  });

  // Cart drawer controls
  cartOpenBtn.addEventListener('click', openCart);
  $('#cart-close').addEventListener('click', () => closeCart());
  overlay.addEventListener('click', () => closeCart());
  $('#cart-browse').addEventListener('click', () => closeCart({ restoreFocus: false }));
  $('#cart-items').addEventListener('click', (e) => {
    const qtyBtn = e.target.closest('[data-qty]');
    if (qtyBtn) {
      const id = qtyBtn.dataset.id;
      const delta = Number(qtyBtn.dataset.qty);
      changeQty(id, delta);
      // Restore focus to the same button after re-render
      const again = $(`[data-qty="${delta}"][data-id="${id}"]`);
      (again || $('#cart-close')).focus();
      return;
    }
    const removeBtn = e.target.closest('[data-remove]');
    if (removeBtn) removeFromCart(removeBtn.dataset.remove);
  });

  // Checkout
  $('#checkout-form').addEventListener('submit', orderOnWhatsApp);
  $('#checkout-payfast').addEventListener('click', payWithPayFast);
  $$('#checkout-form input').forEach((input) => {
    input.addEventListener('input', () => input.removeAttribute('aria-invalid'));
  });

  // Mobile menu
  $('#menu-toggle').addEventListener('click', () => toggleMenu());
  $$('#nav-links a').forEach((a) => a.addEventListener('click', () => toggleMenu(false)));

  // Keyboard: Escape closes cart/menu, Tab trapped in drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (drawer.classList.contains('open')) closeCart();
      else if ($('#nav-links').classList.contains('open')) { toggleMenu(false); $('#menu-toggle').focus(); }
    }
    trapFocus(e);
  });

  // Navbar shadow on scroll
  const navbar = $('#navbar');
  const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Keep cart in sync across browser tabs
  window.addEventListener('storage', (e) => {
    if (e.key === CONFIG.storageKey) { cart = loadCart(); renderCart(); }
  });
}

document.addEventListener('DOMContentLoaded', init);
