# RUDEBOY Website

- Static PWA with offline support via `sw.js`
- Pages: `index.html`, `shop.html`, `collections.html`, `contact.html`, `checkout.html`

Setup
- Serve from the root so paths like `/sw.js` and `/manifest.json` resolve.
- Optional: set `window.SHOPIFY_DOMAIN` and `window.SHOPIFY_ACCESS_TOKEN` before loading `collections.html` when integrating Shopify Buy Button.

Development
- Update cache version in `sw.js` when changing core assets.
- `offline.html` is used as an offline fallback.
