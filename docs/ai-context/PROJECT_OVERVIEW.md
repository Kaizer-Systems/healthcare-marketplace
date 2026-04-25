# Healthcare Marketplace Platform — Project Overview

## 1. What This Platform Is

This project is a **healthcare-focused, multi-seller, invite-only marketplace platform** that sits as a central marketplace layer above participating sellers' own backend systems. It is not a SaaS product that sellers self-serve and auto-onboard onto. It is an operator-governed, invite-only marketplace where the operator controls who gets in, what gets listed, and how the platform behaves.

The marketplace owns the customer-facing experience: unified catalog, search and ranking, seller visibility and trust systems, loyalty and referrals, customer accounts, and the operator control panel. Sellers continue to own their own business operations, billing, inventory management, invoicing, and payment settlement in their own internal ERP or backend systems.

The end result is a serious commercial ecosystem, not a simple catalog website.

---

## 2. Core Business Vision

The marketplace exists to:

- give customers a single place to search for and buy healthcare and medical products across multiple participating sellers
- give sellers additional marketplace visibility and sales volume without replacing their existing operational systems
- standardize product discovery and customer experience across all sellers
- allow operators to monetize through seller subscriptions, add-ons, advertising, and sponsored placements
- eventually support per-order fee structures once the payment settlement model evolves

---

## 3. Seller-of-Record Model

The actual participating seller remains the **seller of record** for every transaction.

This means:

- the seller's own legal entity is the merchant for the transaction
- the seller's own GST and tax identity applies
- the seller's own payment gateway is used at checkout; money goes directly to the seller
- refund and return liability remains with the seller
- seller-side invoice generation is seller-controlled

The marketplace acts as a discovery platform, search and ranking engine, product normalization layer, order orchestration layer, customer account and loyalty layer, seller comparison and trust layer, and provider-controlled governance layer.

The marketplace may generate a marketplace-branded order receipt alongside the seller-generated invoice in the customer's order documents area.

---

## 4. Monetization

Primary monetization at launch is **subscription fees charged to sellers** for marketplace participation. This may include:

- base subscription tiers
- paid add-ons (e.g. storefront add-on, advanced placement)
- sponsored seller placement billing
- sponsored product/listing billing
- promotional slot billing

Per-order fee models are deferred to a future phase because the marketplace does not sit in the payment settlement flow at launch. Sellers use their own gateways. Per-order monetization would require a different payment architecture and will be a deliberate future decision.

---

## 5. Entity Model and Seller Types

The marketplace must support multiple types of participating entities:

- retail-only sellers
- wholesale sellers
- rental providers
- hybrid sellers with any combination of retail, wholesale, and rental capability

Each seller may have:

- one or more legal entities
- one or more branches
- one or more operational modes (retail, wholesale, rental)
- different product eligibility based on capability approval

The platform must be designed to support multi-branch, multi-city, multi-state, and eventually multi-country operations as the business expands.

---

## 6. Seller Backend Integration and Sync Model

Each seller runs their own internal backend platform. The marketplace does not replace it.

The marketplace maintains a separate central marketplace operational data layer. Communication between seller backends and the marketplace happens through **active, event-driven synchronization via background workers** — not passive polling and not tightly coupled direct database access.

The sync model works as follows:

- when a meaningful operation occurs in the marketplace (e.g. an order is placed, a status changes, a cancellation is initiated), the marketplace worker actively pushes that update to the relevant seller's backend without waiting for the seller to poll
- when a meaningful operation occurs in a seller's internal ERP (e.g. inventory changes, invoice generated, status update), the seller's system actively pushes that update to the marketplace via a defined integration point, which the marketplace worker processes and applies
- retries, reconciliation, and failure recovery must be built into the worker infrastructure
- some objects may be near-real-time (orders, status changes), others may be batched (inventory, invoices); exact frequency is per object type

This is not a one-fixed-sync-interval system. It is an intelligent, event-aware synchronization model.

---

## 7. Product Types Supported

The platform supports the following product types:

**Outright Sale Products** — medical consumables, healthcare accessories, equipment, supplies, packaged items, regulated and non-regulated categories subject to seller eligibility and marketplace approval. These may have variants, pack sizes, color/size options, brand-level distinctions, and category-specific attributes.

**Rental Products** — configurable commercial models including prepaid, postpaid, daily, weekly, monthly, custom recurring schemes, and seller-approved rental packages. Only marketplace-approved rental schemes are shown.

**Wholesale Products** — wholesale-oriented product structures and pricing where applicable.

**Hybrid Products** — sellers may offer any combination of retail, wholesale, and rental from a single seller account.

---

## 8. Catalog Strategy

The marketplace owns the **canonical master catalog**. The marketplace controls the standard product name, standardized description, structure, attributes, and global product identity. Seller-provided product naming is not the customer-facing standard.

The catalog supports:

- product families
- product variants (size, color, packaging)
- structured attribute systems
- related products
- replacement and substitute products
- rental product structures

Each seller maintains their own SKU naming internally. The marketplace maintains a mapping between seller-specific products and marketplace canonical product records. Seller onboarding includes a product mapping step.

A large foundational seller catalog may be used as the initial base for creating the marketplace's standardized product catalog. Normalization, expansion, and refinement happen over time.

---

## 9. Customer-Facing Features

### 9.1 Public Marketplace (No Login Required)
- browse homepage, categories, product pages, seller pages
- use search with typo tolerance, filters, facets
- view seller trust information and compare sellers
- view related and substitute products
- view sponsored and promoted results

### 9.2 Customer Accounts
- create account, log in, manage profile and addresses
- wishlist, cart, buy now
- order history, order documents (marketplace receipt + seller invoice + warranty)
- loyalty points — earn and redeem
- referral links — share and track conversions

### 9.3 Doctor Accounts
Doctor accounts are a special customer class with an additional verified classification field. They may, subject to legal and compliance approval, receive a different referral reward scheme than standard customers. This feature must remain fully configurable and must not bypass legal or compliance governance. Doctor-specific reward logic is deferred to Phase 2 — the role type and tracking infrastructure will be built, but the reward activation requires compliance sign-off before shipping.

### 9.4 Seller Visibility
Customers can see which seller is offering a product, inspect seller details, view trust and reputation information, and choose a preferred seller where the platform allows explicit selection.

---

## 10. Search and Discovery

Search and discovery are a central capability of the marketplace. Required search capabilities include:

- search-as-you-type autocomplete
- typo tolerance and fuzzy matching
- exact and close-match retrieval
- synonym-aware retrieval
- brand, category, and related product suggestions
- substitute product suggestions
- advanced filters and facets
- seller-aware result shaping
- sponsored ranking inputs
- hyperlocal relevance inputs (pincode-aware)

Search must feel rich, fast, and intuitive — not like a basic internal catalog lookup.

---

## 11. Buybox and Seller Selection Logic

Where multiple sellers serve the same product, the marketplace determines the recommended seller through configurable ranking logic. Factors may include:

- pincode relevance and serviceability
- stock availability
- distance and proximity
- delivery promise and service level
- return and cancellation history
- seller trust score
- sponsored priority
- marketplace operator preferences

This logic is configurable over time and must not be hardcoded.

---

## 12. Hyperlocal Delivery and Split Shipments

The marketplace should attempt to keep orders hyperlocal and fast-delivery-friendly wherever business logic allows. Customer pincode awareness, location-based seller prioritization, and configurable geographic grouping are required.

The platform must support **split shipments** — a single customer order fulfilled by multiple sellers or branches. Order documents, statuses, logistics tracking, and downstream synchronization must account for this. The customer experience remains unified regardless of split fulfillment internally.

---

## 13. Loyalty and Referrals

**Loyalty Program:** customers earn loyalty points through platform-defined actions and redeem them according to configurable rules. The specific earn and redeem logic is operator-configured.

**Referral Rewards:** customers can share product links. If a referred visit converts into a qualifying purchase, the referring customer may receive loyalty benefits. The reward logic is configurable.

**Doctor Referral Logic:** see Section 9.3. Deferred to Phase 2.

---

## 14. Seller Trust and Reputation

The marketplace maintains seller trust information visible to customers, including ratings, review volumes, service performance, historical reliability, order success patterns, return and cancellation behavior, and future scoring signals. Trust score quality depends on sync completeness from seller backends — the platform must account for the possibility of lag between a real-world event and its reflection in trust data.

---

## 15. Optional Seller Storefront

Sellers may optionally opt into a seller-specific storefront. Storefront pages remain connected to the marketplace catalog, governance system, and seller backend. Possible forms include subdomain storefronts and seller brand pages. Custom-domain storefronts are a future decision.

---

## 16. Provider Admin and Operator Controls

The marketplace operator has a dedicated internal control panel that supports:

- seller onboarding and offboarding (invite-only, assisted)
- subscription management and billing
- catalog moderation and mapping oversight
- sponsored placement management and ad billing
- seller suspensions, corrective actions, and dispute handling
- fraud flagging, order anomaly review, and abuse management
- manual order intervention
- sync failure monitoring and reconciliation
- document oversight
- moderation workflows
- policy enforcement
- role and user management across all zones
- compliance operation hooks (consent audit, DSR fulfilment tracking, RoPA maintenance, breach incident management)

---

## 17. Role Types and Access Zones

**Roles:** Public users, Customers, Doctors, Seller Users, Seller Managers/Admins, Provider Support/Admin Team, Super Admin/Founding Operator.

**Access Zones:**

- **Public Zone** — homepage, product pages, category pages, seller pages, public search, public info pages. No login required.
- **Customer Zone** — wishlist, cart, orders, loyalty, account, referrals. Login required.
- **Seller Zone** — seller tools, listing management, order management, inventory visibility, seller settings. Seller login required.
- **Provider Admin Zone** — all operator controls, moderation, billing, monitoring, fraud. Internal team login required with elevated security.

---

## 18. Multi-Language and Multi-Currency

The platform must be built with **multi-language support baked in from day one**. The initial launch will operate in English, but the architecture must support additional languages (including regional Indian languages) without code rewrites. All user-facing strings must be managed through an internationalisation layer from the start.

**Multi-currency** must be architecturally supported from day one — currency configuration, display formatting, and pricing storage must be designed to accommodate multiple currencies even though the initial launch operates in INR only. Adding a new supported currency must require configuration, not code changes.

---

## 19. SEO and Discoverability

The marketplace must be built with strong search engine visibility. Public product pages, category pages, seller pages, and informational pages must be fully indexable. The detailed SEO implementation is documented separately in `SEO_IMPLEMENTATION.md`.

---

## 20. Security Requirements

The platform is a security-first system. It must be hardened against broken access control, injection risks, security misconfiguration, weak authentication, insecure design patterns, logging gaps, data integrity failures, and API misuse.

Security principles include least privilege, strict permission boundaries, secure session handling, MFA for privileged roles, HttpOnly secure cookies, audit trails for all critical actions, and controlled internal access. High-privilege admin accounts must have stronger authentication and stronger session governance than standard customer accounts.

---

## 21. Compliance Overview

This platform operates under multiple overlapping compliance obligations from day one. The full technical and operational compliance implementation is documented in `COMPLIANCE.md`. The following frameworks apply at minimum:

- **India DPDP Act 2023** — primary data privacy obligation for all personal data of Indian users
- **GDPR (EU)** — applies where personal data of EU residents is processed
- **UK GDPR** — applies where personal data of UK residents is processed
- **HIPAA-aligned requirements** — applies where regulated healthcare or patient-related sensitive information falls within scope
- **IT Act 2000** — intermediary liability, data protection, and cybersecurity obligations under Indian law
- **Consumer Protection (E-Commerce) Rules 2020** — disclosure, grievance redressal, and seller information requirements for Indian e-commerce platforms
- **Drug and Cosmetics Act 1940 and related rules** — Schedule H, H1, and X product regulations, e-pharmacy rules, medical device rules; scope of regulated categories in v1 requires legal review before those categories go live
- **GST Compliance** — marketplace operator GST obligations, tax invoice requirements, e-way bill obligations where applicable, HSN/SAC code requirements on product catalog
- **RBI and Payment Processing Compliance** — payment aggregator and payment gateway regulations; the seller-of-record model means sellers use their own gateways, but the marketplace's interaction with those flows must be compliant
- **KYC and Anti-Money Laundering** — applicable where the marketplace handles financial flows or seller onboarding with monetary components
- **Pharmacy Act and Healthcare Product Licensing** — any seller dealing in scheduled drugs, medical devices, or licensed healthcare products must provide valid license information as part of onboarding
- **Terms of Service, Privacy Policy, and Seller Agreement** — legally reviewed documents that must be version-controlled, linked at all relevant points, and accepted as part of user and seller onboarding

All compliance obligations are treated as foundational design requirements affecting every module, not as post-build additions.

---

## 22. Sensitive Data Segregation

Clear separation must exist between:

- **Public commerce data** — product descriptions, category content, seller pages, public catalog content
- **Account and order data** — customer profiles, addresses, order history, loyalty data, returns
- **Sensitive healthcare and protected data** — any regulated healthcare-context records, compliance-sensitive documents, protected personal information

Sensitive data must not leak into public search, public pages, analytics pipelines, logs, or exports beyond what is strictly necessary.

---

## 23. Auditability and Traceability

The system must support complete traceability for critical actions: who performed an action, when, what changed, which entity was affected, whether manual intervention occurred, whether a sync failed and how it was handled, and whether sensitive operations were accessed.

This applies especially to admin actions, order interventions, disputes, billing changes, catalog moderation, seller suspensions, sync failures, and all security-sensitive operations.

---

## 24. Fraud, Abuse, and Moderation

The marketplace must support fraud and abuse management including suspicious seller and customer behavior review, order anomaly review, misuse of referral and loyalty systems, manual fraud flags, moderation intervention, and seller suspension and corrective action workflows.

---

## 25. Backup, Recovery, and Continuity

Regular backups, recoverability of critical records, retention policies, restore capability, and protection against accidental or malicious data loss are business-critical requirements. Compliance-related backups must be handled with appropriate sensitivity and access controls.

---

## 26. Future Expandability

The system must accommodate future expansion without changing the core business model: more sellers, more branches, more cities and countries, deeper advertising, richer trust scoring, broader category coverage, enhanced compliance workflows, custom storefronts, and more operational controls.

---

## 27. Out of Scope for This Document

This document covers business use case, features, and requirements. Technical stack, infrastructure, data models, implementation sequence, environment configuration, CI/CD, deployment, and compliance implementation details are documented in the dedicated files for those concerns.

Seed catalog strategy and data migration from an existing seller's catalog into the marketplace canonical schema is a known future workstream that requires separate planning and is not part of the initial implementation scope.
