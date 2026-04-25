# Healthcare Marketplace Platform — SEO Implementation Plan

## 1. Purpose

This document is the final SEO implementation plan for the public-facing marketplace application. It is written for implementation inside the approved architecture: `apps/web/web-marketplace` as a Next.js 16 App Router application backed by `apps/api` and `apps/worker`, with MongoDB Atlas, Atlas Search, Redis, BullMQ, Auth.js database sessions, and shared packages. The marketplace business goal is to make public product pages, category pages, seller pages, and informational pages fully indexable while preserving hyperlocal relevance, seller-aware discovery, and compliance boundaries.

---

## 2. Non-Negotiable SEO Principles

### 2.1 Separate SEO content from pincode personalization

The single most important rule for this marketplace is that search engine crawlability must never depend on pincode input, login, cookies, localStorage, or client-only personalization. Public product, category, seller, and informational pages must render useful, indexable HTML without any user action. Google processes JavaScript-powered pages but relying on client-side rendering or delayed JavaScript execution for critical primary content is an unnecessary risk for a marketplace that wants reliable indexing. All public read-heavy pages must use Next.js Server Components and server-rendered metadata as the default strategy.

### 2.2 Two truths that must not conflict

The marketplace needs:

- a **global SEO truth** — for indexing, discovery, and structured data
- a **local transactional truth** — for pincode-aware seller ranking, availability, ETA, and checkout

The global SEO truth is not fake. It is a legitimate marketplace-level representation of the product, category, or seller page. The local transactional truth is the user-specific version that appears after pincode resolution. The SEO layer shows product identity, standardized description, attributes, images, trust signals, brand and canonical information, and a representative marketplace price signal such as a price range or "starting from" price. The local transactional layer replaces or refines seller order, delivery promise, stock, and exact offer details after pincode input or geolocation-assisted lookup.

### 2.3 No cloaking, no hidden structured data, no bot-only fake pages

Structured data must describe the visible content of the page it appears on. Rules:

- Never serve a special bot-only version with extra price fields that humans cannot see.
- Never emit structured data for seller offers that the rendered page does not surface in some user-visible form.
- Never block the visible page and keep only JSON-LD as the "real" product content.

Everything needed for search visibility must be present in the rendered public page in a crawlable way.

---

## 3. SEO Architecture

### 3.1 Public SEO surfaces that must exist

The following routes must be public, server-rendered, and fully indexable:

- homepage
- category landing pages
- subcategory landing pages
- brand landing pages
- canonical product detail pages
- seller public profile pages
- seller storefront pages when enabled
- comparison and substitute product editorial pages where content quality justifies indexing
- informational healthcare buying guides
- FAQ, help, policy, and trust pages
- disease, support, and care-path content pages only where legally and medically appropriate and not misleading
- location-neutral marketplace search landing pages for major head terms when they are stable, indexable, and content-rich

Protected routes must never be indexed: account, cart, checkout, order history, document downloads, seller portal, admin, and raw search result pages with arbitrary query strings.

### 3.2 SEO data flow architecture

**Layer A — Canonical SEO projection** (owned by `apps/api`, with helpers in `packages/database`, `packages/contracts`, `packages/search`):

Returns canonical product identity, canonical category identity, canonical seller identity, normalized product title, normalized brand and attributes, public-safe description, public-safe FAQ blocks, review summary when eligible and policy-safe, marketplace trust signals, representative price signal, representative availability signal, structured-data-ready payload, canonical URLs, hreflang alternates for multilingual future use, and indexability directives.

**Layer B — Hyperlocal personalization projection** (owned by `apps/api`, accelerated by Redis and `apps/worker`):

Returns pincode-resolved nearby sellers, real buybox or recommended seller, exact local offer price, stock status, delivery promise, serviceability flags, and sponsored ranking adjustments where allowed.

**Layer C — Search index projection** (owned by Atlas Search, maintained by async projection jobs in `apps/worker`):

Supports search-as-you-type, typo tolerance, synonym handling, attribute faceting, seller-aware ranking, category-aware ranking, substitute and related product retrieval, future sponsored placement, and hyperlocal weighting after pincode is known.

Public SEO pages must remain renderable from Layer A alone. They must never block on Layer B or Layer C being incomplete at request time.

---

## 4. URL Strategy

### 4.1 Canonical route patterns

Use stable, descriptive, clean URLs with one canonical route per entity. Use lowercase, hyphenated slugs. Include the product name and key differentiator in the slug if needed. Keep internal IDs out of the canonical path unless collision handling requires an appended stable suffix. URLs follow the marketplace's standardized canonical identity, not seller SKU naming.

```
/
/categories/[category-slug]
/categories/[category-slug]/[sub-category-slug]
/brands/[brand-slug]
/products/[product-slug]
/sellers/[seller-slug]
/store/[seller-storefront-slug]
/guides/[guide-slug]
/faq/[topic-slug]
/compare/[product-a]-vs-[product-b]
/substitutes/[product-slug]
/related/[product-slug]
```

### 4.2 What must not become canonical

Apply `noindex, follow` or treat as parameterized non-canonical:

```
/search?q=...
/products/[slug]?pincode=...
/categories/[slug]?sort=...&page=...
/products/[slug]?seller=...
/products/[slug]?utm_...
/products/[slug]?ref=...
/cart
/checkout
/account/*
/orders/*
/seller/*
/admin/*
```

Use canonical tags consistently on filtered, sorted, or parameterized variants where the canonical target is clear.

### 4.3 Query-parameter policy

- **Tracking parameters** — strip or canonicalize away; never index
- **State parameters** — preserve for UX, not for indexing
- **Sort and filter parameters** — allow crawl only for carefully selected high-value combinations that deserve standalone SEO; otherwise noindex or canonical back to the base page
- **Pincode parameters** — never canonicalize to pincode-specific URLs; treat pincode as personalization state, not canonical page identity

---

## 5. Indexability Matrix

### 5.1 Indexable by default

- homepage
- category pages with meaningful copy and product sets
- major subcategory pages
- product detail pages
- seller public pages
- opted-in seller storefront pages
- brand pages if meaningful and content-rich
- healthcare buying guides
- comparison pages with genuine unique editorial content
- FAQ and help pages
- return, shipping, and trust pages where useful
- top curated collection pages built intentionally for search demand

### 5.2 Conditionally indexable

- faceted category pages only if curated and demand-backed
- internal search landing pages only when transformed into proper SEO landing pages with unique intro copy, curated facets, and stable intent
- substitute pages only when medically and commercially safe and not misleading
- rental pages only when inventory model is stable and page quality is strong
- wholesale pages only if those terms represent public-intent pages that are legally and commercially appropriate

### 5.3 Must not be indexable

- account, cart, checkout, order history, document download URLs
- internal moderation, seller backoffice, admin
- raw search result pages with arbitrary query strings
- thin pincode-only variations
- temporary campaign pages with no lasting search value
- pages containing sensitive, compliance-sensitive, or healthcare-protected records

---

## 6. Keyword Strategy

### 6.1 Five-layer keyword framework

**Layer 1 — Head commercial terms:** map mainly to category and high-value product pages. Examples: oxygen concentrator, wheelchair, blood pressure monitor, glucometer strips, nebulizer, hospital bed, adult diapers.

**Layer 2 — Mid-tail product-intent terms:** map to product pages, curated collections, and rich category pages. Examples: foldable wheelchair with commode, 5 litre oxygen concentrator, hospital bed on rent, diabetic test strips 50 pack, anti-bedsore mattress.

**Layer 3 — Trust and comparison terms:** map to guides, comparisons, and educational collection pages. Examples: best oxygen concentrator brand, wheelchair rental vs purchase, hospital bed on rent price, compare glucometer brands, best nebulizer for home use.

**Layer 4 — Problem and use-case terms:** map to guide pages and curated category hubs. Examples: mobility support for elderly at home, patient care products after surgery, respiratory care equipment for home, diabetic home care essentials.

**Layer 5 — Brand, seller, and marketplace intent:** map to seller pages, brand pages, and branded collections.

### 6.2 Keyword ownership by page type

Map one primary keyword cluster to one primary page type to reduce cannibalization:

- category-intent → category page
- exact-product-intent → product page
- brand-intent → brand page
- seller-intent → seller page
- informational intent → guide page
- versus-intent → comparison page

### 6.3 Differentiation strategy

Do not try to out-rank general marketplaces on head terms in the first phase. Win instead on healthcare-specific terminology, use-case clusters, product plus condition plus care-setting combinations, rental-intent terms, trust and authenticity queries, seller-trust and support-led journeys, medical equipment comparison journeys, and post-operative and home-care journeys. This matches the business goal of being a healthcare-specialized marketplace with stronger trust than general marketplaces.

---

## 7. Content Strategy

### 7.1 Product pages

Every canonical product page must include: H1 with standardized product identity, short hero summary above the fold, primary image and additional views, brand or manufacturer where relevant, structured attribute grid, pack size or size or color or model or rental-plan information as applicable, representative marketplace price block, pincode checker as progressive enhancement only, seller summary or seller count, trust and ratings summary where valid, replacement and substitute suggestions, related products, FAQs, usage and care and buying guidance, delivery and return and trust blocks, and structured data block.

Avoid thin PDPs. Public product pages must be content-rich enough to rank. Content must reflect the canonical catalog owned by the marketplace rather than ad-hoc seller feed text.

### 7.2 Category pages

Every important category page must include: unique H1, 150–300 words of intro copy above or near the grid written for users first, meaningful filterable product set, subcategory links, featured brands, trust or why-buy-from-us block, category FAQ, guide links, internal links to major products and subcategories, and a product grid with crawlable product links.

Do not leave category pages as only a faceted grid with no descriptive content.

### 7.3 Seller pages

Seller public pages must include: seller name and description, service capability summary, trust statistics, rating and review summary if valid, seller location or service-region summary without exposing sensitive personal data, product assortment preview, policy summary, brand and store media, FAQ if meaningful, and structured data using Organization or LocalBusiness where appropriate.

### 7.4 Guide and editorial content

Build a long-term content library for: how-to-choose product guides, rental vs purchase comparisons, brand comparisons, home care checklists, post-surgery essentials, diabetic care product stacks, respiratory care setup guides, and elderly care mobility guides.

Every guide must link into product, category, and seller pages. Every key category must link back into guides. This creates an SEO content cluster, not isolated blog posts.

---

## 8. FAQ Strategy

Implement FAQ in three layers:

**Layer 1 — On-page user FAQ:** Use on product, category, seller, and trust or policy pages where real user questions exist.

**Layer 2 — Structured FAQ eligibility:** Google's FAQ rich result is limited to well-known, authoritative sites, particularly those that are government-focused or health-focused. Because this project is health-focused, FAQPage markup is worth implementing on strong, authoritative public pages, but appearance is not guaranteed and must not be assumed for every page.

**Layer 3 — Internal search and support reuse:** The same FAQ content feeds on-page accordions, help center surfaces, support tooling, and structured data generation when eligible. FAQ content must be original, short, useful, medically safe, and not spammy.

---

## 9. Pincode, Pricing, and Availability SEO

### 9.1 Core rule

Do not block public pages behind pincode. The page must render without pincode. The pincode module is a progressive enhancement layer delivered via client-side hydration only.

### 9.2 What to show before pincode

For product pages: price range `₹X – ₹Y` or "starting from ₹X", generic availability statement, seller count or "offered by multiple sellers", generic shipping or delivery statement, and trust statement.

For category pages: crawlable product cards with representative prices; no hard pincode gate before products are visible.

### 9.3 Computing the SEO price range

For each canonical product maintain in the Atlas Search projection: `minPublicPrice`, `maxPublicPrice`, optionally `medianPublicPrice`, optionally `offerCount`. Generate from eligible active seller offers filtered by public visibility rules, compliance, and seller status. A public-safe flag controls whether to show as range or as "starting from" depending on how wide the spread is.

### 9.4 Structured data implication of multi-seller model

For the canonical marketplace PDP: use `Product` + `AggregateOffer` when representing the marketplace-wide range across sellers.

For seller-specific landing pages or storefront PDPs where a single seller is the visible merchant: use `Product` + `Offer`. These are the landing pages for merchant feeds and merchant-listing eligibility. This cleanly reconciles a multi-seller marketplace with Google's structured-data requirements.

---

## 10. Structured Data and JSON-LD

### 10.1 General rule

Use JSON-LD emitted server-side from `apps/web/web-marketplace` using typed data from `apps/api`. All structured data must describe content that is actually visible on the page.

### 10.2 Structured data types to implement

**Site-wide on every page:** `Organization`, `WebSite`, optionally `SearchAction`, `BreadcrumbList`.

**Product detail pages:** `Product`, `AggregateOffer` for canonical marketplace PDP, `Review` and `AggregateRating` only when valid and policy-safe and based on real visible review data, `MerchantReturnPolicy` where applicable, shipping structured data where appropriate.

**Seller public pages:** `Organization`, `LocalBusiness` where branch or store presence fits, ratings and reviews only when policy-compliant and real.

**Category pages:** `BreadcrumbList`, optionally `ItemList` for curated lists only when the page truly represents a visible ordered list.

**FAQ and help pages:** `FAQPage` where the page genuinely contains those questions and answers.

**Guide pages:** `Article` or `BlogPosting` where sections are genuinely article-like.

### 10.3 Canonical PDP JSON-LD payload structure

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{{canonical product name}}",
  "image": ["{{image URLs from CDN}}"],
  "description": "{{public-safe canonical description}}",
  "brand": { "@type": "Brand", "name": "{{brand name}}" },
  "offers": {
    "@type": "AggregateOffer",
    "lowPrice": "{{minPublicPrice}}",
    "highPrice": "{{maxPublicPrice}}",
    "priceCurrency": "INR",
    "offerCount": "{{offerCount}}"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "{{rating}}",
    "reviewCount": "{{count}}"
  }
}
```

Emit `aggregateRating` only when a real, visible review system exists and the data is accurate. Do not self-invent stars.

### 10.4 Seller storefront PDP JSON-LD payload structure

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{{canonical product name}}",
  "image": ["{{image URLs}}"],
  "description": "{{canonical description}}",
  "brand": { "@type": "Brand", "name": "{{brand name}}" },
  "offers": {
    "@type": "Offer",
    "seller": { "@type": "Organization", "name": "{{seller legal name}}" },
    "price": "{{exact seller price}}",
    "priceCurrency": "INR",
    "availability": "https://schema.org/InStock",
    "hasMerchantReturnPolicy": {
      "@type": "MerchantReturnPolicy",
      "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
      "merchantReturnDays": "{{seller return days}}"
    }
  }
}
```

### 10.5 Review and ratings rules

Only emit review markup when there is a real, visible review system and the ratings comply with Google's review snippet rules. Never self-generate stars. Review snippets may appear in search but markup does not guarantee display.

### 10.6 Carousel and rich result expectations

Do not architect the marketplace assuming guaranteed product carousels above first organic result. Carousel eligibility is a bonus described in beta documentation and is not guaranteed. Focus on valid Product, Merchant, Review, FAQ, and LocalBusiness rich-result eligibility and strong organic ranking. Report on impressions, CTR, non-brand clicks, rich-result eligibility counts, and conversion-assisted organic sessions — not on carousel placement.

---

## 11. Google Shopping and Merchant Center Strategy

### 11.1 Objective

Pursue two separate commerce search surfaces: organic product visibility through product structured data and strong SEO pages, and Google Merchant Center shopping surfaces where operationally feasible.

### 11.2 Two-phase approach

**Phase A — Canonical marketplace PDPs for organic SEO:** Use marketplace PDPs with `AggregateOffer`. These rank in organic results and contribute to product snippet eligibility.

**Phase B — Seller-specific merchant-eligible landing pages:** For opted-in sellers, generate seller-specific product landing pages or storefront PDPs with `Offer`, not `AggregateOffer`. Ensure price, availability, shipping, and return information are visible and consistent. Use those URLs as landing pages in Merchant Center feeds. This avoids feed and landing-page mismatch risk.

### 11.3 Codebase support required

- seller feed generation jobs in `apps/worker`
- feed DTOs in `packages/contracts`
- landing-page payload generation in `apps/api`
- seller storefront product URLs in `apps/web/web-marketplace`
- validation jobs for landing-page and feed parity
- disapproval monitoring and retry logs in admin tooling

### 11.4 What not to promise

Do not promise or report against: top carousel placement, shopping knowledge panel appearance, price drop badge, or review stars. All are eligibility-based, not guaranteed.

---

## 12. Rendering and Metadata Strategy

### 12.1 Rendering model

Use Server Components by default for all public read-heavy routes. Server-render: title, meta description, canonical, robots directive, Open Graph and Twitter Card metadata, breadcrumb data, primary content, visible price range, FAQ blocks, trust blocks, JSON-LD.

Reserve client-side hydration for: pincode checker, seller offer drawer or widget, sort and filter interaction, add-to-cart, wishlist, dynamic personalized recommendations, recently viewed, and account-aware CTA changes.

### 12.2 Metadata generation rules

Every indexable route in `apps/web/web-marketplace` must have a typed metadata builder using Next.js `generateMetadata()` that returns: title, description, canonical, alternates when relevant, robots directive, Open Graph, Twitter Card, and JSON-LD payload. Metadata comes from the canonical SEO projection returned by `apps/api` and is never handwritten per page.

### 12.3 Title and description templates

```
Product page:   {Product Name} | Price, Sellers & Delivery | {Marketplace Brand}
Category page:  {Category Name} Online | Trusted Sellers, Prices & Options | {Marketplace Brand}
Seller page:    {Seller Name} | Products, Trust Info & Store | {Marketplace Brand}
Brand page:     {Brand Name} Healthcare Products | {Marketplace Brand}
Guide page:     {Guide Title} | Healthcare Buying Guide | {Marketplace Brand}
```

Descriptions must be unique, useful, and generated from real canonical data, not generic boilerplate.

---

## 13. Sitemap Strategy

### 13.1 Segmented sitemaps

Generate a sitemap index with separate shards. Max 50,000 URLs per shard.

```
sitemap-index.xml
sitemap-products-[n].xml
sitemap-categories.xml
sitemap-sellers.xml
sitemap-guides.xml
sitemap-brands.xml
sitemap-storefronts.xml       (when storefront feature is enabled)
```

Never include noindex or protected URLs in sitemaps.

### 13.2 Update triggers via `apps/worker`

Trigger sitemap shard regeneration when: a new product is published, a product is deindexed or removed, the category taxonomy changes, a seller page is published or unpublished, a storefront is enabled or disabled, a guide page is published.

### 13.3 Freshness fields

Use `lastmod` based on the last meaningful content change, not every background database touch. Setting `lastmod` on unchanged pages dilutes its signal.

---

## 14. Robots and Crawl Budget

### 14.1 robots.txt rules

Allow crawling of: all public pages, CSS, JavaScript, images, JSON data required for rendering. Disallow: `/account`, `/cart`, `/checkout`, `/orders`, `/api` internal routes, `/seller`, `/admin`, and parameterized URL patterns that generate crawl traps.

### 14.2 Robots meta directives

- `index, follow` — on all public canonical pages
- `noindex, follow` — on filtered, search result, and state pages that should pass link equity but not rank
- `noindex, nofollow` — only for genuinely private or irrelevant pages where links must not flow

### 14.3 Server-side redirects only

Use server-side 301 redirects in Next.js or nginx for all permanent canonical changes. Never use JavaScript redirects for SEO-relevant URL changes.

---

## 15. Internal Linking Structure

### 15.1 Marketplace link graph

Design the internal link graph so every major page type links meaningfully to others:

- homepage → top categories, brands, sellers, guides
- category → subcategories, brands, guides, top products
- product → category, brand, substitutes, related products, seller pages, relevant guides
- seller → products, categories, trust pages
- guides → categories, products, sellers
- FAQ and trust pages → relevant commercial pages where helpful

### 15.2 Anchor text rules

Use descriptive anchor text. Never use "click here" in key SEO modules. Product links use the product name. Category links use the category name. Guide links use the guide title.

### 15.3 Orphan-page prevention

Every indexable page must have at least one crawlable internal link arriving from a higher-level page. New products without category placement or guide linkage must be caught before publishing via admin tooling.

---

## 16. Facets, Search Results, and Atlas Search SEO

### 16.1 User search vs public SEO

Atlas Search powers user discovery inside the marketplace, but not every Atlas Search result URL becomes indexable. Maintain a clear distinction between UX search pages for arbitrary queries (noindex) and SEO landing pages for chosen high-value query clusters (indexable with full content).

### 16.2 Facet indexability policy

Create a whitelist of facet combinations eligible for indexing, such as: category plus high-value brand, category plus rental-intent, category plus major attribute cluster. Everything else either canonicalizes back to the base category page or is noindexed. Never allow unlimited facet URL combinations to be crawled.

### 16.3 Search-to-landing-page pipeline

Use search-log analysis via the worker to identify recurring high-value queries that deserve permanent landing pages. Build those landing pages with intro copy, curated product selection, and editorial content — not as raw search result pages.

---

## 17. Seller Storefront SEO

When seller storefronts are enabled, they must support: seller-branded home page, seller product listings, seller-specific PDPs, seller trust content, brand story, and seller FAQs. These pages must remain connected to marketplace governance, canonical product mapping, and structured data rules.

Seller storefront PDPs are the strongest candidate for merchant-eligible shopping surfaces because they can truthfully represent a single seller `Offer`. Seller storefront URLs must use the canonical product name from the marketplace catalog, not seller internal SKU names.

---

## 18. Healthcare Compliance and Trust Constraints in SEO

### 18.1 Public SEO must stay in the public-commerce data lane

Public commerce data must remain separate from account and order data and sensitive healthcare protected data. PHI and sensitive data must never leak into public search, logs, caches, or browser storage. Rules:

- Never expose customer-specific "recommended for condition X" pages publicly.
- Never publish pages based on private health data.
- Never allow sensitive healthcare documents to become crawlable.
- Never bake sensitive medical attributes into public schema unless they are genuinely public product attributes.
- Keep disease, support, and care-path content informational and non-diagnostic unless legally reviewed.

### 18.2 Drugs and Magic Remedies Act — listing content rules

Product listings constitute advertisements under the Drugs and Magic Remedies (Objectionable Advertisements) Act 1954. No product listing may claim to cure, treat, or prevent any of the 54 scheduled diseases including cancer, diabetes, heart diseases, tuberculosis, epilepsy, hypertension, obesity, and AIDS. Prohibited claim patterns: "100% safe", "free from side effects", "guaranteed treatment", "permanent cure", "clinically proven to treat [disease]". The content moderation pipeline must flag these patterns before a listing goes live and before SEO content is published.

### 18.3 Reviews and claims moderation policy

Because this is healthcare-adjacent commerce, review moderation must be stricter than general retail. Flag for manual review: medically risky claims, "best for disease X" statements, overclaiming cure or treatment language in product Q&A and FAQs. All public content must be medically safe.

### 18.4 Cookie consent and SEO analytics

Analytics and marketing scripts must not fire before consent is given. SEO measurement must distinguish:

- essential server logs and Search Console data, which remain available without consent
- consented client analytics such as Google Analytics, which may be partial depending on user consent rates

Design SEO dashboards with this data limitation in mind. Use server-side analytics event logging for conversion tracking as a consent-independent fallback where feasible.

---

## 19. Rich Snippet Strategy by Page Type

| Page type | Primary target rich results |
|-----------|---------------------------|
| Product detail pages | Product snippets, price and availability signals, merchant listings on seller storefronts, ratings where valid |
| Seller pages | Organization or LocalBusiness knowledge graph signals, review visibility where valid |
| FAQ pages | FAQ rich result eligibility on authoritative health-focused content |
| Guide pages | Article understanding, strong snippet quality |
| Category pages | Breadcrumb display, ItemList for curated collections only |
| Comparison pages | Structured content signals |

All rich result appearances are eligibility-based outcomes, not guaranteed outputs.

---

## 20. Performance and Technical SEO

### 20.1 Core Web Vitals

Public pages must aim for: minimal client JavaScript on first load via Server Components, optimized image delivery via `next/image` and CDN-backed URLs, route-level code splitting via App Router segment boundaries, stable layout shells without layout shift from late-loading content, SSR-first critical content, and cache invalidation on content changes rather than blind long-lived stale caching.

### 20.2 Image SEO

Every product image must have: descriptive file names at upload time where feasible, alt text based on canonical product identity, multiple responsive sizes, optimized dimensions for the display surface, and public CDN delivery via CloudFront or Cloudflare.

### 20.3 Broken-link and deindex management

Implement BullMQ worker jobs for: 404 monitoring and alerting, redirect recommendation logs for removed product URLs, deindex queue processing for unpublished or removed products, stale sitemap cleanup, structured-data validation alerts for malformed JSON-LD, and canonical mismatch alerts.

---

## 21. Repository-Level Implementation Plan

### 21.1 `apps/web/web-marketplace`

- public route groups for homepage, categories, products, sellers, brands, guides, FAQs
- server metadata builders using `generateMetadata()` per route, typed via `packages/contracts`
- server-rendered JSON-LD emitters using typed payloads from the API
- `robots.ts` and canonical components via Next.js metadata API
- breadcrumb rendering with `BreadcrumbList` JSON-LD on all public pages
- pincode widget as client-side enhancement only — no SSR dependency
- seller offer widget as client-side enhancement only
- SSR-first PDP, category, and seller page templates
- noindex handling for filtered, search result, and account flows
- cookie consent banner gating analytics scripts before consent is given

### 21.2 `apps/api`

- canonical SEO projection endpoints per entity type (product, category, seller, brand)
- public-safe field filtering in projections — no internal pricing logic, seller internal data, or sensitive fields
- seller-specific offer endpoints for storefront and merchant feed use
- sitemap data feeder endpoints
- metadata DTO builders per page type
- structured-data DTO builders per schema type
- canonical URL generation logic
- review and trust summary projections with eligibility gates
- price-range aggregation endpoints returning `minPrice`, `maxPrice`, `offerCount`
- indexability flag logic per product and category

### 21.3 `apps/worker`

- product SEO projection rebuild jobs triggered by product or seller changes
- sitemap shard regeneration jobs
- price-range recomputation jobs triggered by offer changes
- seller Merchant Center feed generation jobs for opted-in sellers
- structured-data validation check jobs
- stale-canonical detection for removed or unpublished content
- deindex queue processing for removed products
- redirect map generation for URL structure changes
- search-log mining jobs identifying high-value query clusters for SEO landing pages

### 21.4 `packages/database`

- canonical product collections with Atlas Search index fields aligned to SEO projection needs
- seller offer collections with price aggregation support
- SEO projection aggregation pipelines
- `minPrice`, `maxPrice`, `offerCount` aggregation pipelines per canonical product
- seller trust summary aggregations
- category intro and FAQ storage models
- guide content models
- SEO projection cache collections for high-traffic reads

### 21.5 `packages/search`

- Atlas Search query builders for marketplace search
- synonym sets for healthcare terminology
- search suggestion builders for autocomplete
- typed filter parsing for faceted search
- result shaping for UX search including seller-aware ranking
- search-log export contracts for SEO mining jobs

### 21.6 `packages/contracts`

- SEO projection DTOs per page type
- structured data DTOs matching schema.org types: Product, AggregateOffer, Offer, Organization, LocalBusiness, FAQPage, Article, BreadcrumbList, MerchantReturnPolicy
- sitemap entry DTOs
- merchant feed DTOs
- canonical metadata DTOs

### 21.7 `packages/cache`

- versioned cache keys for all SEO projections
- cache invalidation triggers on product, category, and seller publish changes
- short-lived cache for high-traffic PDP and category reads
- canonical projection cache invalidation fanout via BullMQ jobs

### 21.8 `packages/security`

- noindex enforcement helpers for protected zones to prevent accidental indexing
- consent-aware analytics gating that blocks analytics and marketing scripts before consent is stored
- public-data whitelist rules preventing sensitive data from appearing in SEO API payloads

---

## 22. Structured Data Templates Summary

| Page type | Primary schema | Secondary schema |
|-----------|--------------|----------------|
| Canonical marketplace PDP | `Product` + `AggregateOffer` | `AggregateRating`, `BreadcrumbList` |
| Seller storefront PDP | `Product` + `Offer` | `MerchantReturnPolicy`, `BreadcrumbList` |
| Seller public profile | `Organization` or `LocalBusiness` | `AggregateRating` where valid |
| Homepage | `Organization`, `WebSite` | `SearchAction` |
| Category page | `BreadcrumbList` | `ItemList` for curated collections only |
| FAQ page | `FAQPage` | `BreadcrumbList` |
| Guide or article | `Article` or `BlogPosting` | `BreadcrumbList` |
| Brand page | `Organization` or `Brand` | `BreadcrumbList` |

---

## 23. SEO Measurement and Operations

### 23.1 Search Console configuration

Verify ownership via DNS TXT record. Submit all sitemap shards. Monitor: indexed page counts by template, rich-result eligibility reports, merchant listing reports, product snippet reports, FAQ rich-result reports, impressions and clicks and CTR and average position by page type.

### 23.2 KPI layers

**Crawl and index KPIs:** crawlable public pages count, valid canonical count, sitemap coverage percentage, indexation rate by template.

**Visibility KPIs:** non-brand impressions, keyword footprint by category cluster, product page impressions, seller page impressions, guide page impressions, rich-result impression share.

**Quality KPIs:** CTR by template, unique content coverage, orphan-page count, structured-data error rate, Core Web Vitals pass rate by template.

**Commercial KPIs:** organic add-to-cart events via consented analytics, organic buy-now events, organic assisted conversions, organic revenue by category, merchant-feed seller performance where enabled.

---

## 24. Rollout Phases

### Phase 1 — Foundation

Build: SSR templates for all public page types, metadata builders, canonical routes, robots and canonical meta controls, sitemap engine with all shards, base Product JSON-LD with AggregateOffer, seller page Organization and LocalBusiness markup, BreadcrumbList markup on all pages, noindex controls for filtered and search result and account flows.

### Phase 2 — Content depth

Build: category intro copy system, product FAQ blocks, seller trust modules, guide library, internal-link modules per page type, comparison and substitute pages.

### Phase 3 — Merchant surfaces

Build: seller storefront product pages with single-seller Offer markup, Merchant Center feed generation in `apps/worker`, landing-page and feed consistency checks, shipping and return structured data.

### Phase 4 — SEO operations maturity

Build: search-log mining pipeline, landing-page generation program from high-value query clusters, structured-data regression tests in Vitest, SEO alerting for critical pages, redirect governance for URL changes, deindex queue and 404 monitoring.
