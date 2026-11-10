/* =========================================================
   Metsing.store | Node.js Server + Stitch Money API Integration
   Zero-dependency server using Node 18+ built-in http & fetch
   ========================================================= */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_DIR = __dirname;

/* ---------------------------------------------------------
   0. Load local .env file if present (no external packages)
   --------------------------------------------------------- */
(function loadDotEnv() {
  const envPath = path.join(ROOT_DIR, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
})();

const PORT = Number(process.env.PORT) || 3000;
const STITCH_TOKEN_URL = process.env.STITCH_TOKEN_URL || 'https://secure.stitch.money/connect/token';
const STITCH_GRAPHQL_URL = process.env.STITCH_GRAPHQL_URL || 'https://api.stitch.money/graphql';

/* ---------------------------------------------------------
   1. Server-side Product & Service Price Catalog (ZAR)
   Prevents client-side price tampering. Matches PRODUCTS in script.js.
   --------------------------------------------------------- */
const CATALOG = {
  // Packages
  'pkg-store':         { name: 'Dropshipping Store', price: 1000 },
  'pkg-bundle':        { name: 'Launch Bundle', price: 1500 },
  'pkg-website':       { name: 'Business Website', price: 2000 },

  // Store Niches
  'niche-food':        { name: 'Dropshipping Store: Food & Restaurant', price: 1000 },
  'niche-beauty':      { name: 'Dropshipping Store: Beauty & Skincare', price: 1000 },
  'niche-fitness':     { name: 'Dropshipping Store: Fitness & Activewear', price: 1000 },
  'niche-home':        { name: 'Dropshipping Store: Home & Kitchen', price: 1000 },
  'niche-tech':        { name: 'Dropshipping Store: Tech Gadgets', price: 1000 },
  'niche-baby':        { name: 'Dropshipping Store: Baby & Kids', price: 1000 },
  'niche-fashion':     { name: 'Dropshipping Store: Fashion & Accessories', price: 1000 },
  'niche-car':         { name: 'Dropshipping Store: Car Accessories', price: 1000 },

  // Add-ons
  'add-logo':          { name: 'Logo & Branding Pack', price: 500 },
  'add-research':      { name: 'Product Research List', price: 300 },
  'add-supplier':      { name: 'SA Supplier Guide', price: 400 },
  'add-social':        { name: 'Social Media Setup', price: 600 },
  'add-copy':          { name: 'Product Copy & Creatives', price: 100 },
  'add-payments':      { name: 'Payment Gateway Setup', price: 400 },
  'add-care':          { name: 'Store Maintenance', price: 300 },
  'add-seo':           { name: 'SEO & Google Business', price: 800 },
  'add-guide':         { name: 'Starter Guide', price: 250 },

  // Company Consultation Services
  'svc-company-reg':   { name: 'Company Registration', price: 350 },
  'svc-csd':           { name: 'CSD Registration', price: 350 },
  'svc-csd-update':    { name: 'CSD Update', price: 150 },
  'svc-coida':         { name: 'COIDA Registration', price: 250 },
  'svc-coida-roe':     { name: 'Return of Earnings (ROE)', price: 250 },
  'svc-coida-logs':    { name: 'Letter of Good Standing', price: 200 },
  'svc-cidb-g1':       { name: 'CIDB Registration (Grade 1)', price: 300 },
  'svc-cidb-g24':      { name: 'CIDB Registration (Grades 2 to 4)', price: 500 },
  'svc-cidb-update':   { name: 'CIDB Profile Update', price: 200 },
  'svc-bo-filing':     { name: 'Beneficial Ownership Filing', price: 200 },
  'svc-annual-return': { name: 'CIPC Annual Return Filing', price: 200 },
  'svc-sars-tcs':      { name: 'SARS Tax Compliance Status (TCS)', price: 200 },
  'svc-sars-update':   { name: 'SARS Company Details Update', price: 200 },
  'svc-cipc-director': { name: 'Director Changes', price: 250 },
  'svc-cipc-address':  { name: 'Company Address Change', price: 150 },
  'svc-cipc-contact':  { name: 'Contact Details Update', price: 100 },
  'svc-cipc-fye':      { name: 'Financial Year-End Change', price: 150 },
  'svc-cipc-nameres':  { name: 'Company Name Reservation', price: 100 },
  'svc-cipc-namechg':  { name: 'Company Name Change', price: 250 },
  'svc-cipc-dereg':    { name: 'Company Deregistration Assistance', price: 300 },
  'svc-cipc-reinstate':{ name: 'Company Reinstatement Assistance', price: 500 },
  'svc-sup-profile':   { name: 'Professional Company Profile', price: 500 },
  'svc-sup-plan':      { name: 'Business Plan', price: 800 },
  'svc-tender-check':  { name: 'Tender Readiness Check', price: 200 },
  'svc-sup-tenderdoc': { name: 'Tender Document Assistance', price: 350 },
  'svc-sup-quote':     { name: 'Quotation Template', price: 150 },
  'svc-sup-invoice':   { name: 'Invoice Template', price: 150 },
  'svc-sup-letterhead':{ name: 'Company Letterhead', price: 150 },
};

/* ---------------------------------------------------------
   2. Stitch OAuth2 Client Token helper (cached in memory)
   --------------------------------------------------------- */
let cachedToken = null;
let cachedTokenExpiresAt = 0;

function isStitchConfigured() {
  const cid = process.env.STITCH_CLIENT_ID;
  const secret = process.env.STITCH_CLIENT_SECRET;
  const acc = process.env.STITCH_BENEFICIARY_ACCOUNT_NUMBER;
  return Boolean(
    cid && cid !== 'your_stitch_client_id_here' &&
    secret && secret !== 'your_stitch_client_secret_here' &&
    acc && acc !== '00000000000'
  );
}

async function getStitchClientToken() {
  if (cachedToken && Date.now() < cachedTokenExpiresAt - 30000) {
    return cachedToken;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.STITCH_CLIENT_ID,
    client_secret: process.env.STITCH_CLIENT_SECRET,
    scope: 'client_paymentrequest',
    audience: STITCH_TOKEN_URL,
  });

  const res = await fetch(STITCH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || `Failed to obtain Stitch token (HTTP ${res.status})`);
  }

  cachedToken = data.access_token;
  cachedTokenExpiresAt = Date.now() + (Number(data.expires_in) || 900) * 1000;
  return cachedToken;
}

/* ---------------------------------------------------------
   3. Stitch GraphQL API helpers
   --------------------------------------------------------- */
function sanitizeReference(str, maxLen) {
  const cleaned = String(str || '').replace(/[^a-zA-Z0-9 -]/g, '').trim();
  return (cleaned || 'Metsing').slice(0, maxLen);
}

async function createStitchPaymentRequest({ totalZAR, customer, externalReference }) {
  const accessToken = await getStitchClientToken();

  const query = `
    mutation CreatePaymentRequest(
      $amount: MoneyInput!,
      $payerReference: String!,
      $beneficiaryReference: String!,
      $externalReference: String,
      $beneficiaryName: String!,
      $beneficiaryBankId: BankBeneficiaryBankId!,
      $beneficiaryAccountNumber: String!
    ) {
      clientPaymentInitiationRequestCreate(input: {
        amount: $amount,
        payerReference: $payerReference,
        beneficiaryReference: $beneficiaryReference,
        externalReference: $externalReference,
        beneficiary: {
          bankAccount: {
            name: $beneficiaryName,
            bankId: $beneficiaryBankId,
            accountNumber: $beneficiaryAccountNumber
          }
        }
      }) {
        paymentInitiationRequest {
          id
          url
          state {
            __typename
          }
        }
      }
    }
  `;

  const shortRef = externalReference.slice(-8).toUpperCase();
  const variables = {
    amount: {
      quantity: totalZAR.toFixed(2),
      currency: 'ZAR',
    },
    payerReference: sanitizeReference('MetsingStore', 12),
    beneficiaryReference: sanitizeReference(`MS-${shortRef}-${customer.name}`, 20),
    externalReference,
    beneficiaryName: process.env.STITCH_BENEFICIARY_NAME || 'Metsing Store',
    beneficiaryBankId: process.env.STITCH_BENEFICIARY_BANK_ID || 'fnb',
    beneficiaryAccountNumber: process.env.STITCH_BENEFICIARY_ACCOUNT_NUMBER,
  };

  const res = await fetch(STITCH_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok || (payload.errors && payload.errors.length)) {
    const errMsg = payload.errors?.[0]?.message || `Stitch GraphQL error (HTTP ${res.status})`;
    throw new Error(errMsg);
  }

  const requestNode = payload.data?.clientPaymentInitiationRequestCreate?.paymentInitiationRequest;
  if (!requestNode || !requestNode.url) {
    throw new Error('Stitch did not return a payment URL.');
  }

  return requestNode;
}

async function getStitchPaymentStatus(paymentId) {
  const accessToken = await getStitchClientToken();

  const query = `
    query GetPaymentRequestStatus($id: ID!) {
      node(id: $id) {
        ... on PaymentInitiationRequest {
          id
          externalReference
          amount {
            quantity
            currency
          }
          state {
            __typename
            ... on PaymentInitiationRequestCompleted {
              date
              amount {
                quantity
                currency
              }
            }
            ... on PaymentInitiationRequestCancelled {
              date
              reason
            }
            ... on PaymentInitiationRequestExpired {
              date
            }
          }
        }
      }
    }
  `;

  const res = await fetch(STITCH_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query, variables: { id: paymentId } }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok || (payload.errors && payload.errors.length)) {
    const errMsg = payload.errors?.[0]?.message || `Stitch status error (HTTP ${res.status})`;
    throw new Error(errMsg);
  }

  return payload.data?.node || null;
}

/* ---------------------------------------------------------
   4. HTTP JSON & Body Helpers
   --------------------------------------------------------- */
function sendJson(res, statusCode, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

function readJsonBody(req, maxBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

/* ---------------------------------------------------------
   5. Static File Server
   --------------------------------------------------------- */
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
};

const BLOCKED_FILES = new Set([
  '/server.js',
  '/package.json',
  '/package-lock.json',
  '/.env',
  '/.env.example',
  '/.gitignore',
  '/SEO-SETUP.md',
]);

function serveStaticFile(req, res, pathname) {
  if (BLOCKED_FILES.has(pathname) || pathname.startsWith('/.')) {
    return serve404(res);
  }

  let safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  let fullPath = path.join(ROOT_DIR, safePath);

  if (!fullPath.startsWith(ROOT_DIR)) {
    return serve404(res);
  }

  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    if (!pathname.endsWith('/')) {
      res.writeHead(301, { Location: pathname + '/' });
      return res.end();
    }
    fullPath = path.join(fullPath, 'index.html');
  }

  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    return serve404(res);
  }

  const ext = path.extname(fullPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const cacheControl = (ext === '.html' || ext === '.xml' || ext === '.txt')
    ? 'public, max-age=0, must-revalidate'
    : 'public, max-age=604800';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': cacheControl,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'SAMEORIGIN',
  });
  fs.createReadStream(fullPath).pipe(res);
}

function serve404(res) {
  const notFoundPath = path.join(ROOT_DIR, '404.html');
  res.writeHead(404, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  if (fs.existsSync(notFoundPath)) {
    fs.createReadStream(notFoundPath).pipe(res);
  } else {
    res.end('<h1>404 Not Found</h1>');
  }
}

/* ---------------------------------------------------------
   6. Main HTTP Request Router
   --------------------------------------------------------- */
const server = http.createServer(async (req, res) => {
  const host = req.headers.host || `localhost:${PORT}`;
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const urlObj = new URL(req.url, `${proto}://${host}`);
  const { pathname } = urlObj;

  // --- API: Create Stitch Payment Initiation Request ---
  if (pathname === '/api/stitch/create-payment' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const items = Array.isArray(body.items) ? body.items : [];
      const customer = body.customer || {};

      // Validate cart items against server-side CATALOG
      let totalZAR = 0;
      const verifiedItems = [];
      for (const item of items) {
        const entry = CATALOG[item.id];
        const qty = Number(item.qty);
        if (!entry || !Number.isInteger(qty) || qty <= 0 || qty > 50) continue;
        totalZAR += entry.price * qty;
        verifiedItems.push({ id: item.id, name: entry.name, qty, lineTotal: entry.price * qty });
      }

      if (!verifiedItems.length || totalZAR <= 0) {
        return sendJson(res, 400, { ok: false, error: 'Your cart is empty or contains invalid items.' });
      }

      if (!customer.name || String(customer.name).trim().length < 2) {
        return sendJson(res, 400, { ok: false, error: 'Please enter your full name.' });
      }
      if (!customer.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(customer.email).trim())) {
        return sendJson(res, 400, { ok: false, error: 'Please enter a valid email address.' });
      }
      if (!customer.phone || String(customer.phone).replace(/\D/g, '').length < 9) {
        return sendJson(res, 400, { ok: false, error: 'Please enter a valid phone number.' });
      }

      if (!isStitchConfigured()) {
        return sendJson(res, 503, {
          ok: false,
          code: 'STITCH_NOT_CONFIGURED',
          error: 'Stitch Money API credentials are not configured on the server yet. Please use Order on WhatsApp or add STITCH_CLIENT_ID and STITCH_CLIENT_SECRET in Render Environment Variables.',
        });
      }

      const externalReference = `ms-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      const paymentRequest = await createStitchPaymentRequest({
        totalZAR,
        customer,
        externalReference,
      });

      const baseUrl = (process.env.PUBLIC_BASE_URL || `${proto}://${host}`).replace(/\/+$/, '');
      const returnPath = typeof body.returnPath === 'string' && body.returnPath.startsWith('/')
        ? body.returnPath
        : '/';
      const redirectUri = `${baseUrl}${returnPath}?stitch_return=1&ref=${encodeURIComponent(externalReference)}`;

      const sep = paymentRequest.url.includes('?') ? '&' : '?';
      const paymentUrl = `${paymentRequest.url}${sep}redirect_uri=${encodeURIComponent(redirectUri)}`;

      return sendJson(res, 200, {
        ok: true,
        id: paymentRequest.id,
        externalReference,
        totalZAR,
        paymentUrl,
      });
    } catch (err) {
      console.error('[Stitch create-payment error]:', err.message);
      return sendJson(res, 500, {
        ok: false,
        error: err.message || 'Could not initiate Stitch payment. Please try again or order on WhatsApp.',
      });
    }
  }

  // --- API: Verify Stitch Payment Status ---
  if (pathname === '/api/stitch/status' && req.method === 'GET') {
    const id = urlObj.searchParams.get('id');
    if (!id) {
      return sendJson(res, 400, { ok: false, error: 'Missing payment id parameter.' });
    }
    if (!isStitchConfigured()) {
      return sendJson(res, 503, { ok: false, error: 'Stitch Money API is not configured.' });
    }
    try {
      const node = await getStitchPaymentStatus(id);
      if (!node) {
        return sendJson(res, 404, { ok: false, error: 'Payment request not found.' });
      }
      return sendJson(res, 200, {
        ok: true,
        id: node.id,
        externalReference: node.externalReference,
        amount: node.amount,
        state: node.state?.__typename || 'Unknown',
        details: node.state,
      });
    } catch (err) {
      console.error('[Stitch status error]:', err.message);
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  // --- API: Stitch Webhook Receiver ---
  if (pathname === '/api/stitch/webhook' && req.method === 'POST') {
    try {
      const event = await readJsonBody(req);
      console.log('[Stitch webhook received]:', JSON.stringify(event));
      return sendJson(res, 200, { received: true });
    } catch (err) {
      return sendJson(res, 400, { error: 'Invalid webhook payload' });
    }
  }

  // --- Static site files ---
  if (req.method === 'GET' || req.method === 'HEAD') {
    return serveStaticFile(req, res, pathname);
  }

  sendJson(res, 405, { error: 'Method not allowed' });
});

server.listen(PORT, () => {
  console.log(`Metsing.store server running on http://localhost:${PORT}`);
  console.log(`Stitch API configured: ${isStitchConfigured() ? 'YES' : 'NO (set STITCH_CLIENT_ID, STITCH_CLIENT_SECRET, STITCH_BENEFICIARY_ACCOUNT_NUMBER)'}`);
});
