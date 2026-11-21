# Aadya website optimization guide

## Included in this ZIP
- WebP copies of large images, with HTML/CSS references updated for the public site.
- Existing responsive layout and reveal animations retained.
- Admin panel demo for editing selected homepage copy, SEO preview and contact information locally.

## Before production
1. Replace placeholder email/phone details with official company information.
2. Check the WebP variants visually on desktop and mobile.
3. Run Google PageSpeed Insights and fix the highest-impact issues first.
4. Configure HTTPS, Brotli/Gzip compression, and caching headers at the hosting layer.
5. Create `sitemap.xml` and `robots.txt`, then configure Google Search Console.
6. Use unique titles/descriptions, canonical URLs and accurate structured data.
7. Connect forms and admin updates to a secure server-side backend/CMS.

## Security
The included admin login is for demonstration only. Do not expose a real admin route protected only by client-side JavaScript. Production authentication and authorization must be enforced on the server.
