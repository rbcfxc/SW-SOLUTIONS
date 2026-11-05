# Metsing.store — Technical SEO & GitHub Pages Setup Guide

This guide covers the GitHub Pages configuration, DNS records, HTTPS enforcement, Google Search Console / Bing Webmaster verification, and ongoing maintenance for **https://metsing.store**.

---

## 1. GitHub Pages Constraints & Headers

Because the site is hosted on **GitHub Pages**, server configuration files (`_headers`, `_redirects`, `.htaccess`) are **not supported** and have intentionally not been generated.

### Not Available on GitHub Pages (Optional Later via Cloudflare)
GitHub Pages does not allow custom HTTP response headers or custom server-side `301` redirect rules. The following headers are **not available on GitHub Pages** directly (they can be added later if you place Cloudflare in front of `metsing.store`):
- `Strict-Transport-Security` (HSTS)
- HTTP-header `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options` / `Permissions-Policy`
- Custom `Cache-Control` lifetimes per file type
- Server-side `301` redirects from `/index.html` to `/` (handled instead via `<link rel="canonical">`)

### What IS Set in HTML & Repo Root
- **`.nojekyll`**: Present at the repository root so GitHub Pages serves all files and folders unmodified without running Jekyll.
- **`CNAME`**: Present at the repository root containing `metsing.store` (required when publishing from a branch; if you ever switch to a custom GitHub Actions workflow, the `CNAME` file is not needed).
- **Clean folder URLs**:
  - `/` → `index.html`
  - `/store-niches/` → `store-niches/index.html`
  - `/add-ons/` → `add-ons/index.html`
  - `/company-consultation/` → `company-consultation/index.html`
  - `/404.html` → served automatically by GitHub Pages for missing routes (marked `noindex, follow`).
- **Legacy hash link shim**: `script.js` / `script.min.js` includes a lightweight `window.location.replace()` redirect so old bookmarked or shared hash links (`#niches`, `#addons`, `#services`, `#consultation`, `#tender-bundle`) immediately send visitors to the new clean folder URLs.
- **HTML security meta tags**:
  - `<meta name="referrer" content="strict-origin-when-cross-origin" />` is active on all pages.
  - An optional `<meta http-equiv="Content-Security-Policy" ...>` tag is included in the `<head>` of every page, **commented out by default**.
    > **Warning:** A too-strict CSP can break external fonts, scripts, or browser extensions. Test thoroughly in a staging branch before uncommenting it in production.

---

## 2. DNS Configuration & HTTPS Enforcement on GitHub Pages

To serve the site from the apex domain **`https://metsing.store`** and automatically redirect `http://` and `www.metsing.store` to `https://metsing.store`:

### Step A: Configure DNS Records at Your Domain Registrar
1. **Apex domain (`@` / `metsing.store`) — `A` records** pointing to GitHub Pages IPs:
   - `185.199.108.153`
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`
2. **Apex domain (`@` / `metsing.store`) — `AAAA` records (IPv6, optional but recommended)**:
   - `2606:50c0:8000::153`
   - `2606:50c0:8001::153`
   - `2606:50c0:8002::153`
   - `2606:50c0:8003::153`
3. **`www` subdomain (`www.metsing.store`) — `CNAME` record**:
   - Host/Name: `www`
   - Target/Value: `rbcfxc.github.io.`
   - *(When both the apex `A` records and the `www` `CNAME` record are configured and `metsing.store` is set as the custom domain in GitHub, GitHub Pages automatically redirects `www.metsing.store` → `https://metsing.store` at the edge—no JavaScript redirect needed.)*

### Step B: Enforce HTTPS in GitHub Repository Settings
1. Open your repository on GitHub (`https://github.com/rbcfxc/SW-SOLUTIONS`).
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, ensure **Source** is set to **Deploy from a branch** (`main` / `/ (root)`).
4. Under **Custom domain**, confirm `metsing.store` is saved and DNS check passes.
5. Tick **Enforce HTTPS**. (If the Let's Encrypt certificate is still provisioning, wait 10–30 minutes after DNS propagation and tick it once available.)

---

## 3. Google Search Console & Bing Webmaster Tools

### Step A: Verify Ownership in Google Search Console
Go to [Google Search Console](https://search.google.com/search-console) and click **Add property**:

- **Option 1 (Preferred): Domain Property (`metsing.store`)**
  1. Enter `metsing.store` under **Domain**.
  2. Copy the `TXT` record Google provides (`google-site-verification=...`).
  3. Add that `TXT` record at your DNS registrar for `@` (`metsing.store`), wait a few minutes, and click **Verify**. No HTML changes needed.

- **Option 2 (Alternative): URL-Prefix Property (`https://metsing.store/`)**
  - **HTML file method (recommended for URL-prefix on GitHub Pages):** Download the `googleXXXX.html` verification file from Search Console, place it in the root of this repository, commit, and push to `main`.
  - **HTML meta tag method:** Copy the token from Search Console, open `index.html` (and optionally the sub-pages), replace `PASTE_TOKEN_HERE` in:
    ```html
    <meta name="google-site-verification" content="PASTE_TOKEN_HERE" />
    ```
    uncomment the tag, commit, and push.

### Step B: Submit `sitemap.xml`
1. In Google Search Console, open **Sitemaps** in the left menu.
2. Enter `https://metsing.store/sitemap.xml` and click **Submit**.
3. Whenever you update content or prices on any page, update the `<lastmod>YYYY-MM-DD</lastmod>` date in `sitemap.xml`.

### Step C: Request Indexing for All 4 Canonical URLs
Use the **URL Inspection** bar at the top of Google Search Console to inspect each of the 4 canonical URLs and click **Request Indexing**:
1. `https://metsing.store/`
2. `https://metsing.store/store-niches/`
3. `https://metsing.store/add-ons/`
4. `https://metsing.store/company-consultation/`

### Step D: Bing Webmaster Tools
1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters).
2. Choose **Import from Google Search Console** (fastest—imports your verified property and sitemap automatically), or verify via DNS `CNAME`/`TXT` or the `<meta name="msvalidate.01" content="PASTE_TOKEN_HERE" />` placeholder in `<head>`.

---

## 4. Image Assets & Compression Guide

### Included Brand & Social Assets
- `/og-image.jpg` (1200×630, ~95 KB — well under the 200 KB limit) and its editable vector source `/og-image.svg`
- `/logo.svg` (220×44 vector wordmark)
- `/favicon.svg` (64×64 vector mark)
- `/apple-touch-icon.png` (180×180 PNG)
- `/icon-192.png` (192×192 PNG) and `/icon-512.png` (512×512 PNG)
- `/site.webmanifest`

### Exporting `/og-image.svg` or Compressing Future Raster Images
- **Re-exporting `og-image.svg` to `og-image.jpg` (1200×630)**:
  - Using [Squoosh.app](https://squoosh.app): drag `og-image.svg` into Squoosh, resize to `1200 × 630`, select **MozJPEG** at quality `80`, and save as `og-image.jpg`.
  - Using CLI (`sharp` / `cwebp` / ImageMagick):
    ```bash
    # Convert to WebP under 100 KB:
    cwebp -q 80 input.jpg -o output.webp
    ```
- **Adding new `<picture>` raster illustrations**:
  - Keep every hero or niche illustration under **100 KB**.
  - Always include explicit `width` and `height` attributes, descriptive `alt` text (`alt=""` if purely decorative), and `loading="lazy" decoding="async"` for below-the-fold images:
    ```html
    <picture>
      <source srcset="image.avif" type="image/avif" />
      <source srcset="image.webp" type="image/webp" />
      <img src="image.jpg" alt="Descriptive alt text" width="800" height="600" loading="lazy" decoding="async" />
    </picture>
    ```
