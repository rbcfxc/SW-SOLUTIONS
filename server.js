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

const STITCH_CLIENT_ID = (process.env.STITCH_CLIENT_ID || 'test-bd36d70d-7cad-4f1c-bd11-978996e001c3').trim();
const STITCH_EXPRESS_BASE = process.env.STITCH_EXPRESS_URL || 'https://express.stitch.money/api/v1';

function getCleanSecret() {
  return (process.env.STITCH_CLIENT_SECRET || '').trim().replace(/^['"]|['"]$/g, '');
}

function isStitchConfigured() {
  const secret = getCleanSecret();
  return Boolean(
    STITCH_CLIENT_ID &&
    STITCH_CLIENT_ID !== 'your_stitch_client_id_here' &&
    secret &&
    secret !== 'your_stitch_client_secret_here'
  );
}

/** Build an RS256 signed JWT assertion if STITCH_CLIENT_SECRET is a PEM private key */
function buildPrivateKeyJwt(clientId, pemKey, audience) {
  const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientId,
    sub: clientId,
    aud: audience,
    iat: now,
    nbf: now,
    exp: now + 300,
    jti: crypto.randomUUID(),
  };
  const unsigned = `${b64url(header)}.${b64url(payload)}`;
  const normalizedPem = pemKey.replace(/\\n/g, '\n');
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), normalizedPem).toString('base64url');
  return `${unsigned}.${signature}`;
}

async function getStitchClientToken() {
  if (cachedToken && Date.now() < cachedTokenExpiresAt - 30000) {
    return cachedToken;
  }

  const secret = getCleanSecret();
  if (secret === STITCH_CLIENT_ID) {
    throw new Error('STITCH_CLIENT_SECRET is set to the same value as STITCH_CLIENT_ID. Please paste your actual Client Secret (not the Client ID) in Render -> Environment.');
  }

  // 1. Try Stitch Express API token endpoint first (https://api.express.stitch.money/api/v1/token)
  try {
    const expRes = await fetch(`${STITCH_EXPRESS_BASE}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        clientId: STITCH_CLIENT_ID,
        clientSecret: secret,
        scope: 'client_paymentrequest',
      }),
    });
    const expData = await expRes.json().catch(() => ({}));
    const expToken = expData.data?.accessToken || expData.data?.token || expData.access_token || expData.accessToken || expData.token;
    if (expRes.ok && expToken) {
      cachedToken = { token: expToken, mode: 'express' };
      cachedTokenExpiresAt = Date.now() + 10 * 60 * 1000;
      return cachedToken;
    }
  } catch (e) { /* continue to OAuth2 connect/token */ }

  // 2. If secret is a PEM private key, use private_key_jwt on secure.stitch.money/connect/token
  if (secret.includes('BEGIN') && secret.includes('PRIVATE KEY')) {
    const jwt = buildPrivateKeyJwt(STITCH_CLIENT_ID, secret, STITCH_TOKEN_URL);
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: STITCH_CLIENT_ID,
      scope: 'client_paymentrequest',
      audience: STITCH_TOKEN_URL,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: jwt,
    });
    const res = await fetch(STITCH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
      throw new Error(data.error_description || data.error || `Stitch JWT auth failed (HTTP ${res.status})`);
    }
    cachedToken = { token: data.access_token, mode: 'graphql' };
    cachedTokenExpiresAt = Date.now() + (Number(data.expires_in) || 900) * 1000;
    return cachedToken;
  }

  // 3. Standard OAuth2 client_secret_post on secure.stitch.money/connect/token
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: STITCH_CLIENT_ID,
    client_secret: secret,
    scope: 'client_paymentrequest',
  });

  const res = await fetch(STITCH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(
      `${data.error_description || data.error || 'invalid_client'} — Check that STITCH_CLIENT_ID (${STITCH_CLIENT_ID}) and STITCH_CLIENT_SECRET in Render match your Stitch API credentials.`
    );
  }

  cachedToken = { token: data.access_token, mode: 'graphql' };
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
  const auth = await getStitchClientToken();
  const shortRef = externalReference.slice(-8).toUpperCase();

  // If authenticated via Stitch Express API (api.express.stitch.money/api/v1)
  if (auth.mode === 'express') {
    const expRes = await fetch(`${STITCH_EXPRESS_BASE}/payment-links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({
        amount: Math.round(totalZAR * 100), // cents
        merchantReference: `MS-${shortRef}`,
        payerName: sanitizeReference(customer.name, 40),
        payerEmailAddress: customer.email,
        payerPhoneNumber: customer.phone,
      }),
    });
    const expData = await expRes.json().catch(() => ({}));
    const linkObj = expData.data?.payment || expData.data || expData;
    const linkUrl = linkObj?.link || linkObj?.url || linkObj?.paymentUrl;
    if (expRes.ok && linkUrl) {
      return { id: linkObj.id || externalReference, url: linkUrl, isExpress: true };
    }
    const expErr = (Array.isArray(expData.generalErrors) && expData.generalErrors.join(', '))
      || (expData.fieldErrors && Object.keys(expData.fieldErrors).length && JSON.stringify(expData.fieldErrors))
      || expData.error?.message
      || expData.message
      || `Stitch Express error (HTTP ${expRes.status})`;
    throw new Error(expErr);
  }

  // Otherwise use Stitch GraphQL API (api.stitch.money/graphql)
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
    beneficiaryAccountNumber: process.env.STITCH_BENEFICIARY_ACCOUNT_NUMBER || '62000000000',
  };

  const res = await fetch(STITCH_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.token}`,
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

function mapExpressStatus(status) {
  const map = {
    paid: 'PaymentInitiationRequestCompleted',
    completed: 'PaymentInitiationRequestCompleted',
    complete: 'PaymentInitiationRequestCompleted',
    success: 'PaymentInitiationRequestCompleted',
    successful: 'PaymentInitiationRequestCompleted',
    cancelled: 'PaymentInitiationRequestCancelled',
    canceled: 'PaymentInitiationRequestCancelled',
    expired: 'PaymentInitiationRequestExpired',
    failed: 'PaymentInitiationRequestFailed',
    declined: 'PaymentInitiationRequestFailed',
    error: 'PaymentInitiationRequestFailed',
  };
  const key = String(status || '').toLowerCase();
  return map[key] || (key ? 'Pending:' + key : 'Pending');
}

async function getStitchPaymentStatus(paymentId) {
  const auth = await getStitchClientToken();
  if (auth.mode === 'express') {
    const expRes = await fetch(`${STITCH_EXPRESS_BASE}/payment-links/${encodeURIComponent(paymentId)}`, {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: `Bearer ${auth.token}` },
    });
    const expData = await expRes.json().catch(() => ({}));
    const p = expData.data?.payment || expData.data || expData;
    return {
      id: p.id || paymentId,
      externalReference: p.merchantReference,
      amount: p.amount,
      state: { __typename: mapExpressStatus(p.status) },
    };
  }

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
      Authorization: `Bearer ${auth.token}`,
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

/* ---------------------------------------------------------
   5b. Live Site Content & Admin Auth Helpers
   --------------------------------------------------------- */
const DEFAULT_SITE_DATA_FILE = path.join(ROOT_DIR, 'data', 'site-content.json');
const SITE_DATA_FILE = process.env.SITE_DATA_FILE || DEFAULT_SITE_DATA_FILE;
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || 'metsing2026').trim();
const USING_DEFAULT_ADMIN_PASSWORD = !process.env.ADMIN_PASSWORD;
const ADMIN_COOKIE_NAME = 'metsing_admin_session';

function ensureSiteDataFile() {
  try {
    const dir = path.dirname(SITE_DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(SITE_DATA_FILE) && fs.existsSync(DEFAULT_SITE_DATA_FILE)) {
      fs.copyFileSync(DEFAULT_SITE_DATA_FILE, SITE_DATA_FILE);
    }
  } catch (err) {
    console.error('[SiteData init error]:', err.message);
  }
}

function loadSiteContent() {
  ensureSiteDataFile();
  try {
    const raw = fs.readFileSync(SITE_DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[SiteData load error]:', err.message);
    try {
      return JSON.parse(fs.readFileSync(DEFAULT_SITE_DATA_FILE, 'utf8'));
    } catch (e) {
      return { products: [] };
    }
  }
}

function saveSiteContent(content) {
  ensureSiteDataFile();
  content.updatedAt = new Date().toISOString();
  fs.writeFileSync(SITE_DATA_FILE, JSON.stringify(content, null, 2), 'utf8');
  return content;
}

function getLiveCatalog() {
  const map = { ...CATALOG };
  const content = loadSiteContent();
  if (content && Array.isArray(content.products)) {
    for (const p of content.products) {
      if (!p || !p.id || p.hidden) continue;
      const price = Number(p.price);
      if (!Number.isFinite(price) || price < 0) continue;
      map[p.id] = { name: String(p.name || p.id), price };
    }
  }
  return map;
}

function getAdminSessionSecret() {
  return crypto
    .createHash('sha256')
    .update(`metsing-admin:${ADMIN_PASSWORD}:${process.env.STITCH_CLIENT_SECRET || 'local-salt'}`)
    .digest('hex');
}

function signAdminToken(expiresAt) {
  const payload = String(expiresAt);
  const sig = crypto.createHmac('sha256', getAdminSessionSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const exp = Number(payload);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = crypto.createHmac('sha256', getAdminSessionSecret()).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  for (const pair of raw.split(';')) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function isAdminAuthenticated(req) {
  const cookies = parseCookies(req);
  return verifyAdminToken(cookies[ADMIN_COOKIE_NAME]);
}

const GITHUB_TOKEN = (process.env.GITHUB_TOKEN || '').trim();
const GITHUB_REPO = (process.env.GITHUB_REPO || 'rbcfxc/SW-SOLUTIONS').trim();
const GITHUB_BRANCH = (process.env.GITHUB_BRANCH || 'main').trim();
const GITHUB_FILE_PATH = (process.env.GITHUB_FILE_PATH || 'data/site-content.json').trim();

async function syncContentToGitHub(content) {
  if (!GITHUB_TOKEN) return { synced: false, reason: 'GITHUB_TOKEN not set' };
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;
  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Metsing-Store-Admin/1.0',
  };

  let sha = null;
  const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(GITHUB_BRANCH)}`, { headers });
  if (getRes.ok) {
    const getJson = await getRes.json().catch(() => ({}));
    sha = getJson.sha || null;
  }

  const encoded = Buffer.from(JSON.stringify(content, null, 2), 'utf8').toString('base64');
  const putBody = {
    message: `Update live site content via Admin (${new Date().toISOString()}) [skip ci]`,
    content: encoded,
    branch: GITHUB_BRANCH,
  };
  if (sha) putBody.sha = sha;

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(putBody),
  });
  if (!putRes.ok) {
    const errData = await putRes.json().catch(() => ({}));
    throw new Error(errData.message || `GitHub sync failed (HTTP ${putRes.status})`);
  }
  return { synced: true };
}

async function syncFromGitHubOnBoot() {
  if (!GITHUB_TOKEN) return;
  try {
    const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}?ref=${encodeURIComponent(GITHUB_BRANCH)}`;
    const res = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Metsing-Store-Admin/1.0',
      },
    });
    if (!res.ok) return;
    const data = await res.json().catch(() => ({}));
    if (!data.content) return;
    const remote = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
    const local = loadSiteContent();
    const remoteTime = remote.updatedAt ? Date.parse(remote.updatedAt) : 0;
    const localTime = local.updatedAt ? Date.parse(local.updatedAt) : 0;
    if (remoteTime > localTime) {
      fs.writeFileSync(SITE_DATA_FILE, JSON.stringify(remote, null, 2), 'utf8');
      console.log('[SiteData] Synced newer content from GitHub on startup.');
    }
  } catch (err) {
    console.warn('[SiteData boot sync skipped]:', err.message);
  }
}

function serveStaticFile(req, res, pathname) {
  if (BLOCKED_FILES.has(pathname) || pathname.startsWith('/.') || pathname.startsWith('/data/')) {
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
  const cacheControl = (ext === '.html' || ext === '.css' || ext === '.js' || ext === '.xml' || ext === '.txt')
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
const RECENT_ORDERS = new Map();

function saveRecentOrder(order) {
  if (RECENT_ORDERS.size > 200) {
    const oldestKey = RECENT_ORDERS.keys().next().value;
    if (oldestKey) RECENT_ORDERS.delete(oldestKey);
  }
  if (order.externalReference) RECENT_ORDERS.set(order.externalReference, order);
  if (order.id) RECENT_ORDERS.set(order.id, order);
}

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

      // Validate cart items against live catalog (site-content.json + fallback CATALOG)
      const liveCatalog = getLiveCatalog();
      let totalZAR = 0;
      const verifiedItems = [];
      for (const item of items) {
        const entry = liveCatalog[item.id];
        const qty = Number(item.qty);
        if (!entry || !Number.isInteger(qty) || qty <= 0 || qty > 50) continue;
        totalZAR += entry.price * qty;
        verifiedItems.push({ id: item.id, name: entry.name, qty, price: entry.price, lineTotal: entry.price * qty });
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

      saveRecentOrder({
        id: paymentRequest.id,
        externalReference,
        totalZAR,
        items: verifiedItems,
        customer: {
          name: String(customer.name).trim(),
          email: String(customer.email).trim(),
          phone: String(customer.phone).trim(),
          business: String(customer.business || '').trim(),
          notes: String(customer.notes || '').trim(),
        },
        createdAt: new Date().toISOString(),
      });

      const baseUrl = (process.env.PUBLIC_BASE_URL || `${proto}://${host}`).replace(/\/+$/, '');
      const redirectUri = `${baseUrl}/payment-success/?stitch_return=1&ref=${encodeURIComponent(externalReference)}&id=${encodeURIComponent(paymentRequest.id)}&amount=${encodeURIComponent(totalZAR)}`;

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
    const qid = urlObj.searchParams.get('id') || '';
    const ref = urlObj.searchParams.get('ref') || '';
    const cachedOrder = RECENT_ORDERS.get(qid) || RECENT_ORDERS.get(ref) || null;
    const id = qid || (cachedOrder && cachedOrder.id) || '';
    if (!id) {
      return sendJson(res, 400, { ok: false, error: 'Missing payment id or ref parameter.' });
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
        externalReference: node.externalReference || (cachedOrder && cachedOrder.externalReference) || ref,
        amount: node.amount,
        state: (node.state && node.state.__typename) || 'Unknown',
        details: node.state,
        order: cachedOrder,
      });
    } catch (err) {
      console.error('[Stitch status error]:', err.message);
      // Never claim success when verification fails
      return sendJson(res, 200, { ok: true, id, state: 'Unknown', verifyError: true, order: cachedOrder });
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

  // --- API: Public Live Site Content ---
  if (pathname === '/api/site-content' && req.method === 'GET') {
    const content = loadSiteContent();
    return sendJson(res, 200, content);
  }

  // --- API: Admin Session Check ---
  if (pathname === '/api/admin/session' && req.method === 'GET') {
    return sendJson(res, 200, {
      ok: true,
      authenticated: isAdminAuthenticated(req),
      usingDefaultPassword: USING_DEFAULT_ADMIN_PASSWORD,
    });
  }

  // --- API: Admin Login ---
  if (pathname === '/api/admin/login' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const pw = String(body.password || '');
      const a = Buffer.from(pw);
      const b = Buffer.from(ADMIN_PASSWORD);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return sendJson(res, 401, { ok: false, error: 'Incorrect admin password.' });
      }
      const maxAgeSec = 7 * 24 * 60 * 60;
      const token = signAdminToken(Date.now() + maxAgeSec * 1000);
      const secureFlag = proto === 'https' ? '; Secure' : '';
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Set-Cookie': `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${secureFlag}`,
      });
      return res.end(JSON.stringify({ ok: true, usingDefaultPassword: USING_DEFAULT_ADMIN_PASSWORD }));
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: 'Invalid request.' });
    }
  }

  // --- API: Admin Logout ---
  if (pathname === '/api/admin/logout' && req.method === 'POST') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': `${ADMIN_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`,
    });
    return res.end(JSON.stringify({ ok: true }));
  }

  // --- API: Admin Get Full Content & Recent Orders ---
  if (pathname === '/api/admin/content' && req.method === 'GET') {
    if (!isAdminAuthenticated(req)) {
      return sendJson(res, 401, { ok: false, error: 'Unauthorized. Please sign in.' });
    }
    const seen = new Set();
    const recentOrders = [];
    for (const order of RECENT_ORDERS.values()) {
      const key = order.externalReference || order.id;
      if (seen.has(key)) continue;
      seen.add(key);
      recentOrders.unshift(order);
    }
    return sendJson(res, 200, {
      ok: true,
      content: loadSiteContent(),
      recentOrders: recentOrders.slice(0, 50),
      stitchConfigured: isStitchConfigured(),
      usingDefaultPassword: USING_DEFAULT_ADMIN_PASSWORD,
      githubConfigured: Boolean(GITHUB_TOKEN),
      hasPersistentDisk: Boolean(process.env.SITE_DATA_FILE),
      dataFile: SITE_DATA_FILE,
    });
  }

  // --- API: Admin Save Live Content ---
  if (pathname === '/api/admin/content' && req.method === 'PUT') {
    if (!isAdminAuthenticated(req)) {
      return sendJson(res, 401, { ok: false, error: 'Unauthorized. Please sign in.' });
    }
    try {
      const body = await readJsonBody(req, 512 * 1024);
      if (!body || typeof body !== 'object' || !Array.isArray(body.products)) {
        return sendJson(res, 400, { ok: false, error: 'Invalid site content payload (missing products array).' });
      }
      const saved = saveSiteContent(body);
      let persistedToGitHub = false;
      let githubError = null;
      if (GITHUB_TOKEN) {
        try {
          await syncContentToGitHub(saved);
          persistedToGitHub = true;
        } catch (ghErr) {
          console.error('[GitHub sync error]:', ghErr.message);
          githubError = ghErr.message;
        }
      }
      return sendJson(res, 200, {
        ok: true,
        content: saved,
        persistedToGitHub,
        hasPersistentDisk: Boolean(process.env.SITE_DATA_FILE),
        githubError,
      });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message || 'Could not save site content.' });
    }
  }

  // --- API: Admin Reset to Bundled Defaults ---
  if (pathname === '/api/admin/reset' && req.method === 'POST') {
    if (!isAdminAuthenticated(req)) {
      return sendJson(res, 401, { ok: false, error: 'Unauthorized. Please sign in.' });
    }
    try {
      const defaults = JSON.parse(fs.readFileSync(DEFAULT_SITE_DATA_FILE, 'utf8'));
      const saved = saveSiteContent(defaults);
      let persistedToGitHub = false;
      if (GITHUB_TOKEN) {
        try {
          await syncContentToGitHub(saved);
          persistedToGitHub = true;
        } catch (ghErr) {
          console.error('[GitHub reset sync error]:', ghErr.message);
        }
      }
      return sendJson(res, 200, { ok: true, content: saved, persistedToGitHub });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
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
  syncFromGitHubOnBoot();
});
