AADYA ENGINEERING EQUIPMENT — WEBSITE + ADMIN PANEL STARTER

WHAT'S INCLUDED
- Existing Aadya public business website (index.html, styles.css, script.js).
- Product catalogue with part-number and description cards, separate in-site KAESER and EVEREST spare-parts catalogues, full part-detail pages, search, filters and enquiry links. EVEREST entries are based on the supplied ESPH parts list; part numbers were not provided and are shown as unavailable.
- Annual Maintenance Contract (AMC) service card and a dedicated in-site information page with typical scope, example service levels, proposal steps, FAQs and enquiry links. Final inclusions and terms remain subject to a written proposal.
- Air Compressor Sales, Spare Parts and Service & Repairs service cards each open a dedicated in-site detail page with scope, process, FAQs and enquiry links; the Services dropdown links to all four service pages including AMC.
- The About dropdown includes About Us, Our Team, Our Office and Contact Us. Our Team opens an in-site careers page with career areas and a general-interest enquiry; career areas are not statements of current vacancies.
- The Products catalogue is hidden from the homepage and opens as a dedicated in-site page from the Services dropdown. KAESER and EVEREST spare-parts catalogue links are also available there.
- PHP/MySQL-backed /admin/ panel with text/media editing, section visibility and ordering, custom content blocks, global colors/sizing/motion controls, SEO settings, enquiries and company settings.
- Separate stock portal at inventory.html: existing backoffice Admin/Managing Director accounts (created through the Admin page) sign in with username/password and email one-time code. There is no separate inventory registration, and inventory endpoints reject non-backoffice roles. Includes dashboard, stock search/editing, inward/outward/dispatch ledger, date-filtered reports, print/PDF and .xlsx exports; it does not expose the website Admin panel.
- The /admin/ panel also retains its authenticated inventory dashboard.
- Optimized WebP copies for large website images.
- website-admin.js reads published content, image choices, layout and appearance settings from the API, with browser-local fallback.
- Original assets are retained for backup/reference.

RUN LOCALLY
1. Start MySQL/MariaDB and create a local database.
2. Import api/database.sql into that database.
3. Copy api/config.sample.php to api/config.local.php and enter the local database credentials.
4. Configure SMTP, app_url and a random app_key in api/config.local.php or the AADYA_SMTP_* / AADYA_APP_* environment variables. For Gmail, use smtp.gmail.com, port 587, starttls, your Gmail address as SMTP username/sender, and a Google App Password as smtp_pass (not your regular Gmail password).
5. Create the initial account from the project folder: php api/create_admin.php admin. Choose a unique password of at least 12 characters.
6. Configure its email and bootstrap the first Managing Director from the project folder: php api/bootstrap_md.php admin owner@example.com. The existing account password is retained. Enter the real owner email locally; do not send credentials by email/chat.
7. Start PHP's development server from the project folder: php -S 127.0.0.1:8000 -t .
   With XAMPP on Windows, use C:\xampp\php\php.exe instead of php if PHP is not on PATH.
8. Open http://127.0.0.1:8000/admin/ for website administration or http://127.0.0.1:8000/inventory.html for the stock portal. Both use the existing team accounts and email one-time codes, which require reachable SMTP settings.
9. The MD can invite Admin or MD accounts under Team access. Public sign-up creates Admin accounts only.

IMPORTANT LIMITATIONS
The PHP development server and default XAMPP database settings are for local development only. Do not expose them publicly. Production use requires PHP 8.1+, MySQL/MariaDB, HTTPS, secure database/SMTP credentials, backups and server-level rate limiting. The project includes password hashing, email verification, email OTP login, role checks and CSRF checks; follow PRODUCTION_SETUP.txt before deployment.
The admin saves content and enquiries to MySQL. The public site reads content through the API when served from the configured PHP host; it does not rewrite the static HTML files.

UPGRADING AN EXISTING DATABASE
Back up first, check which migrations have already been applied, and run only missing files from api/migrations/ in numeric order (001 through 005), once each. Do not import api/database.sql into an existing database. New databases should use api/database.sql only; it already contains the current schema. Existing users are disabled for login until an MD runs api/bootstrap_md.php to assign and verify the first owner email. Set SMTP before using sign-up or login.

BEFORE PUBLISHING
- Replace info@yourcompany.com and +91 XXXXX XXXXX with official contact details.
- Confirm all partner authorization claims and company details.
- Confirm KAESER image-use authorization covers the published website; spare-part images are representative and are not verified photos of each individual part.
- Confirm EVEREST spare part numbers and model compatibility before supplying quotations; the supplied list contains descriptions only. EVEREST catalogue art is original component-type illustration, not a photograph of the exact branded spare.
- Test image appearance after WebP conversion.
- Run PageSpeed Insights and validate on mobile.
- Configure HTTPS, compression and cache headers on the hosting/server.
- Add sitemap.xml, robots.txt, canonical URLs, and structured data where appropriate.
- Back up the original website and deploy to staging before production.

FOLDER STRUCTURE
index.html, styles.css, script.js       Public website
inventory.html                          Public-site stock portal
inventory-portal.css/.js                Stock portal presentation and behavior
website-admin.js                       Public website content/API layer
admin/index.html                       Admin panel
admin/admin.css                        Admin panel design
admin/admin.js                         Admin panel behavior
assets/                                Original and optimized image assets
OPTIMIZATION_GUIDE.md                  Checklist


PHP/MYSQL BACKEND STARTER ADDED. Read PRODUCTION_SETUP.txt before deployment. This requires PHP/MySQL hosting; it does not run on static-only hosting.
