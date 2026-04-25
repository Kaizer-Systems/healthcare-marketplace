# Healthcare marketplace compliance and security implementation guide

**This document provides current-as-of-April-2026 regulatory requirements and technical implementation specifications for an India-primary healthcare marketplace platform.** The platform operates a seller-of-record model with subscription monetization, handling medical devices, medicines, consumables, and buyer/patient data across three web applications. Every section maps regulatory obligations to actionable engineering decisions for a Next.js 16 + NestJS 11 + MongoDB Atlas + Auth.js v5 + Redis + BullMQ stack deployed on DigitalOcean.

The most critical near-term compliance milestone is **May 13, 2027**, when the DPDP Act's substantive provisions (consent, data principal rights, breach notification, penalties up to ₹250 crore) become fully enforceable. Until then, the IT Act's SPDI Rules 2011 remain the operative data protection framework. The platform must build for both regimes simultaneously.

---

## 1. India DPDP Act 2023 — phased enforcement demands early preparation

### Implementation status as of April 2026

The DPDP Rules 2025 were notified on **November 13, 2025**, with enforcement split across three phases:

| Phase | Date | What becomes enforceable |
|-------|------|--------------------------|
| Phase 1 | Nov 13, 2025 ✅ Done | DPBI establishment, definitions, administrative provisions |
| Phase 2 | Nov 13, 2026 | Consent Manager registration framework |
| Phase 3 | **May 13, 2027** | All substantive provisions: consent notices, data principal rights, fiduciary obligations, breach notification, retention/erasure, penalties |

The **Data Protection Board of India (DPBI)** was formally established November 13, 2025, headquartered in NCR. It operates as a digital-first adjudicatory body with civil court powers and can impose penalties up to **₹250 crore per violation**. Actual member appointments remain unconfirmed in public sources as of April 2026.

### Consent notice requirements (effective May 2027)

Every consent notice must be provided **before or at the time** consent is sought, in **English or any Eighth Schedule language**, using clear plain language. Required contents under Rule 3:

- Specific items of personal data being collected, itemized
- Specific purposes for which data will be processed, tied to data items
- Description of goods/services enabled by the processing
- Methods available for exercising data principal rights
- How to file complaints with the DPBI
- Link to website/app for consent withdrawal and rights exercise
- Contact information of the Data Fiduciary

Consent must be **free, specific, informed, unconditional, and unambiguous**. No pre-ticked checkboxes or bundled consent. Withdrawal must be as easy as granting consent. Upon withdrawal, the Data Fiduciary must stop processing and delete data unless retention is required by law.

**Implementation note:** Build separate consent notices per purpose (order processing, payment, marketing, analytics, seller data sharing). Store consent records with timestamps, version numbers, and the exact notice text shown.

### Data principal rights — 90-day response window

| Right | Description | Implementation requirement |
|-------|-------------|---------------------------|
| Access | Know what data is being processed, how, and with whom shared | Self-service data download (JSON/CSV) |
| Correction | Request correction of inaccurate/outdated data | Editable profile with propagation to processors |
| Erasure | Request deletion when purpose is fulfilled | Soft-delete with cascading erasure across collections; **48-hour pre-erasure notification** required |
| Grievance | File complaints about data handling | Published grievance procedure; respond within **≤90 days** |
| Nomination | Designate individual to exercise rights on death/incapacity | Nomination form in account settings |

**Erasure triggers:** For platforms with ≥20 million users, **3 years of inactivity** triggers mandatory erasure with 48-hour pre-erasure notification. A **minimum 1-year retention** of personal data, traffic data, and processing logs is mandatory for breach detection.

### Data fiduciary vs data processor — marketplace classification

The marketplace platform is the **primary Data Fiduciary** (determines purpose and means of processing). Individual sellers are **Data Processors** when fulfilling orders per marketplace instructions, or **independent Data Fiduciaries** if they independently determine processing purposes (e.g., their own marketing). Cloud services like MongoDB Atlas are Data Processors.

As seller-of-record, the marketplace bears **full responsibility** for compliance even when processing is done by processors. Valid contracts with all Data Processors must cover security safeguards, breach notification, data erasure, and cross-border transfer restrictions.

### Breach notification — dual-track regime

| Obligation | Timeline | Authority |
|------------|----------|-----------|
| CERT-In notification | **6 hours** from discovery | CERT-In (already in force under IT Act) |
| DPBI initial notification | **Without delay** (immediately) | Data Protection Board |
| DPBI detailed report | **Within 72 hours** | Data Protection Board |
| Data Principal notification | **Without delay** | Affected individuals |

There is **no materiality threshold** — any personal data breach must be reported regardless of severity. Penalty for notification failure: up to **₹200 crore**. Penalty for security safeguard failure: up to **₹250 crore**.

### Significant Data Fiduciary classification

The Central Government designates SDFs based on volume/sensitivity of data, risk of harm, and potential impact on sovereignty. A healthcare marketplace processing health data has a **strong possibility** of qualifying given that health-tech providers are explicitly mentioned in analyses as likely SDF candidates.

**Additional SDF obligations:** India-based DPO reporting to Board of Directors, annual DPIA, annual independent audit, algorithmic due diligence, and potential **data localization** for specified personal data categories (health data is a prime candidate). SDF non-compliance penalty: up to **₹150 crore**.

### Children's data — age threshold is 18

Anyone under **18** is a child under DPDP (stricter than GDPR's 13-16). Verifiable parental consent is required before processing any child's data. Absolute prohibitions: no tracking, behavioral monitoring, targeted advertising, or profiling of children — even with parental consent. Healthcare establishments are exempted from these requirements when processing is restricted to provision of health services to the child. Penalty: up to **₹200 crore**.

### Complete penalty schedule

| Violation | Maximum penalty |
|-----------|----------------|
| Failure to implement reasonable security safeguards | ₹250 crore (~$30M) |
| Failure to notify breach | ₹200 crore (~$24M) |
| Breach of children's data obligations | ₹200 crore (~$24M) |
| Breach of SDF obligations | ₹150 crore (~$18M) |
| Any other violation by Data Fiduciary | ₹50 crore (~$6M) |
| Non-compliance with Board orders | ₹20 crore |
| Data Principal filing false complaint | ₹10,000 |

Penalties are **per violation, per inquiry** — cumulative. No criminal penalties. No revenue percentage cap. Appeals go to TDSAT then Supreme Court.

---

## 2. GDPR and UK GDPR — conditional applicability with significant obligations

### When GDPR applies to this India-based platform

GDPR applies if the platform **offers goods/services to EU data subjects** (indicators: EU languages, euro pricing, EU marketing) or **monitors behavior of EU data subjects** (using analytics cookies, tracking, device fingerprinting on EU visitors). Even Google Analytics on a site receiving EU traffic can trigger applicability. If GDPR applies, the platform must appoint an **EU Representative** (Article 27), a separate **UK Representative** (UK GDPR Article 27), and a **DPO** (mandatory when processing health-related data at scale).

### Lawful basis for processing

Health-related purchase data (buying blood pressure monitors, diabetes supplies) may constitute **special category data** under GDPR Article 9, requiring two layers of lawful basis:

| Processing activity | Article 6 basis | Article 9 basis needed? |
|---------------------|-----------------|------------------------|
| Order fulfillment | Contract performance | If health-inferred, explicit consent |
| Account management | Contract performance | No |
| Legal/tax record-keeping | Legal obligation | No |
| Fraud prevention | Legitimate interest (requires LIA) | No |
| Marketing/recommendations | Consent | If health-inferred, explicit consent |
| Analytics cookies/tracking | Consent | If health-inferred, explicit consent |

For health-inferred purchase data, **explicit consent** (Article 9(2)(a)) is the safest basis. Lawful basis cannot be changed after selection.

### Data subject rights — 30-day response

All GDPR rights carry a **30-day response deadline** (extendable by 2 months for complex requests): access, rectification, erasure, portability (JSON/CSV), restriction, objection. Direct marketing objection must be honored **immediately**. Build a DSAR portal with data export functionality, soft-delete capabilities, and request logging with timestamps.

### Cookie consent — strict opt-in required

The ePrivacy Regulation proposal was **withdrawn February 2025**; the ePrivacy Directive remains in force. Implementation requirements:

- Cookie banner must appear **before** any non-essential cookies are set
- Prior opt-in consent required for analytics, marketing, social media, and third-party tracking cookies
- "Accept" and "Reject" buttons must have **equal visual prominence** — no dark patterns
- Granular per-purpose consent required (not just "Accept All")
- Pre-checked boxes, continued browsing, or scrolling are **invalid** consent
- Withdrawal must be as easy as granting consent
- Geo-target the GDPR-compliant banner to EU/UK visitors

### DPIA is mandatory for this platform

A DPIA is mandatory under Article 35(3)(b) because the platform processes health-related data (special category) potentially at scale. Must be conducted **before** processing begins and reviewed annually. Must contain systematic description of processing, necessity/proportionality assessment, risk assessment, and mitigation measures. Penalty for not conducting: up to **€10 million or 2% of global turnover**.

### UK GDPR differences post-Data (Use and Access) Act 2025

The DUAA received Royal Assent **June 19, 2025**. Key differences from EU GDPR: DPO replaced with less stringent **Senior Responsible Individual**; new "recognised legitimate interests" list (no balancing test required for listed purposes); expanded automated decision-making bases; some cookie tracking allowed without consent for security/fraud purposes. UK penalties: up to **£17.5 million or 4% global turnover** (Tier 1). Organizations complying with EU GDPR generally satisfy UK GDPR, but not vice versa.

### Cross-border transfer mechanisms

India does **not** have a GDPR adequacy decision and is unlikely to receive one near-term. Structural barriers include DPBI independence concerns, broad government surveillance exemptions, and limited judicial review. All EU→India transfers require **Standard Contractual Clauses** (2021 version, modular structure) supplemented by a Transfer Impact Assessment. For UK transfers, use the International Data Transfer Agreement (IDTA) or EU SCCs with ICO's UK Addendum.

---

## 3. HIPAA is not applicable to this platform

HIPAA applies **only** to covered entities (health plans, healthcare clearinghouses, healthcare providers conducting HIPAA-covered electronic transactions) and their business associates. A healthcare product marketplace is **not** a covered entity because it does not provide healthcare services, does not transmit health information in HIPAA-covered transactions, and selling healthcare products is retail commerce, not healthcare provision.

**Product purchase records for healthcare items do not constitute PHI** because the data is not created or received by a covered entity, buying a product is not provision of healthcare, and the purchase does not relate to payment for provision of healthcare. HIPAA has **no extraterritorial provision** — unlike GDPR, it does not reach an India-based platform serving Indian users with no US covered entity relationship.

**Triggers that would change this:** contracting with US hospitals/health plans to process PHI on their behalf, starting telemedicine services, operating as a pharmacy dispensing prescriptions in the US, or integrating with EHR systems.

---

## 4. India IT Act 2000 — safe harbor requires active due diligence

### Section 79 safe harbor conditions

The marketplace qualifies as an "intermediary" under Section 2(1)(w), which explicitly includes online marketplaces. To maintain safe harbor protection:

- Do not modify seller-listed content in ways that alter substance/meaning
- Do not initiate transactions on behalf of sellers independently
- Comply fully with IT Rules 2021 due diligence obligations
- Remove content within **36 hours** upon receiving court orders or government notifications (Rule 3(1)(d), as amended October 2025 — notices must come from officers not below Joint Secretary rank)
- Remove content exposing private areas/nudity/impersonation within **24 hours** of complaint
- Retain removed content for **180 days** for investigation
- Retain user registration information for **180 days** after deregistration
- Publish and enforce Terms of Service, Privacy Policy, acceptable use policies
- Appoint Grievance Officer

### IT Rules 2021 — current through February 2026 amendment

Four amendments have been made: October 2022 (Grievance Appellate Committees), April 2023 (Fact Check Unit, Online Gaming), October 2025 (strengthened takedown notice transparency, officer rank requirements), and **February 2026** (synthetically generated information labeling obligations, shortened takedown timelines to 3 hours for government-flagged content, Sahyog portal mechanism). A draft second amendment was released March 30, 2026, proposing mandatory compliance with Ministry clarifications/advisories but remains in consultation.

### Grievance Officer requirements (for all intermediaries)

Must appoint a Grievance Officer **based in India**. Name and contact details must be prominently displayed. Acknowledge complaints within **24 hours**. Resolve within **15 days** (IT Rules timeline is stricter than E-Commerce Rules' 30 days — use the stricter standard).

### SSMI classification — marketplace likely does not qualify

The SSMI threshold is **5 million registered users in India**, and applies to "social media intermediaries" whose primary function is enabling online interaction between users. A healthcare marketplace's primary function is facilitating e-commerce transactions, not social interaction. However, the Central Government can exercise discretion under Rule 6 to require any intermediary to comply with SSMI obligations if it believes the intermediary creates a "material risk of harm."

### Reasonable security practices — ISO 27001

Section 43A requires bodies corporate handling SPDI to implement reasonable security practices. The explicitly named standard is **IS/ISO/IEC 27001**. Security practices must be certified/audited **at least annually** by an independent auditor. Healthcare data (physical, physiological, mental health conditions, medical records) is explicitly classified as SPDI. The SPDI Rules 2011 **remain in force until May 13, 2027**, when they are repealed by Section 44(2) of the DPDP Act.

---

## 5. Consumer Protection E-Commerce Rules 2020 — operative with limited amendments

### Current status

The original 2020 Rules with one minor amendment (May 17, 2021) remain the operative version. The sweeping proposed 2021 amendments (DPIIT registration, fall-back liability, flash sale restrictions, CCO/nodal officer appointments) have **not been finalized** as of April 2026. Platforms should prepare for their eventual adoption.

### Mandatory seller disclosures on every listing

- **Legal name** of seller or brand name
- **Seller address** (geographic)
- **Customer care contact** details
- **Country of origin** for all goods (mandatory)
- **Expiry/best-before date** for applicable products
- **Importer details** for imported goods
- **Total price breakdown** including product price, delivery charges, taxes, handling fees
- **Return, refund, exchange, warranty, guarantee** information

### Country of origin — searchable filter required by July 2026

Under the Legal Metrology (Packaged Commodities) Amendment Rules 2026 (effective **July 1, 2026**), every e-commerce entity selling imported products must provide a **searchable and sortable filter** for country of origin. This requires architecture-level compliance — country of origin must be a queryable attribute in the product data model and exposed in the search UI.

### Grievance resolution timelines

Under E-Commerce Rules: acknowledge within **48 hours**, resolve within **1 month**. Under IT Rules: acknowledge within **24 hours**, resolve within **15 days**. The marketplace should adopt the **stricter IT Rules timelines** to ensure compliance with both regimes.

### Prohibited practices (currently in force)

Must not adopt unfair trade practices, directly or indirectly influence prices for unreasonable profit, impose cancellation charges not equally borne, manipulate reviews or post fake reviews, refuse returns for defective/mis-described products, or favor particular sellers. The CCPA has identified and prohibited **13 types of dark patterns** in e-commerce.

---

## 6. Drugs and Cosmetics Act — what the marketplace can and cannot sell

### Drug schedule classifications and online sale restrictions

| Schedule | Restriction | Online sale |
|----------|-------------|-------------|
| Non-scheduled (OTC) | No prescription required | ✅ Permitted — seller must hold valid drug license |
| Schedule H (~510 drugs) | Prescription of RMP required | ✅ With prescription verification; seller needs license + registered pharmacist |
| Schedule H1 (46 drugs) | Stricter subset — separate register | ✅ With prescription verification + separate register; higher scrutiny |
| Schedule X (~15 drugs) | Narcotics/psychotropics, strictest control | ❌ **Absolutely prohibited** from online sale |
| NDPS Act substances | Criminal penalties | ❌ **Absolutely prohibited** |

### Marketplace model — pharmacy license analysis

In a pure marketplace model where the platform only facilitates sales (does not hold inventory, does not dispense), it likely **does not need its own pharmacy license** under current law. The Madras HC Division Bench confirmed that online pharmacies/marketplaces can operate under existing D&C Act/Rules. However, the Draft E-Pharmacy Rules do not differentiate between marketplace and inventory models, creating regulatory ambiguity.

**Critical safeguard:** Ensure all sellers hold valid licenses, verify prescriptions for Schedule H/H1 drugs, and never facilitate sale of Schedule X or NDPS substances.

### Medical Devices Rules 2017 — seller license requirements

| Device class | Risk level | Examples | License required |
|-------------|-----------|----------|-----------------|
| Class A (non-sterile, non-measuring) | Low | Bandages, cotton | Exempt from MD-42 |
| Class A (sterile/measuring) | Low | Surgical masks, thermometers | MD-42 required |
| Class B | Low-moderate | BP monitors, syringes, diagnostic devices | MD-42 required |
| Class C | Moderate-high | Ventilators, implants, infusion pumps | MD-42 required |
| Class D | High | Pacemakers, MRI machines, defibrillators | MD-42 required |

**MD-42 Registration Certificate** (or existing Form 20B/21B wholesale drug license) is mandatory for all medical device sellers since September 30, 2022. Valid for 5 years (₹3,000 renewal). Amazon and Flipkart already require this from sellers.

### Mandatory seller license verification at onboarding

| Product category | Required license |
|-----------------|------------------|
| Medicines/drugs | Drug retail/wholesale license (Form 20/21 or 20B/21B) |
| Medical devices (Class A sterile/measuring, B, C, D) | MD-42 Registration Certificate or Form 20B/21B |
| Cosmetics (domestic) | Manufacturing License (Form COS-8/32) |
| Cosmetics (imported) | Import Registration (Form COS-2/43) |
| AYUSH products | AYUSH Manufacturing/Retail/Wholesale License |
| Nutraceuticals/health supplements | FSSAI License |

### Drugs and Magic Remedies Act — prohibited claims

Product listings constitute "advertisements." No listing may claim to cure, treat, or prevent any of **54 scheduled diseases** including cancer, diabetes, heart diseases, TB, epilepsy, high/low blood pressure, obesity, and AIDS. Prohibited claims include "100% safe," "free from side effects," "guaranteed treatment," or "permanent cure." First conviction: up to 6 months imprisonment and/or fine.

---

## 7. E-Pharmacy Rules — still in draft since 2018

The Draft E-Pharmacy Rules 2018 have **not been finalized or notified** as of April 2026. The government has repeatedly failed to meet Delhi HC deadlines. No specific enacted regulation for e-pharmacies exists. The sector operates under general D&C Act/Rules provisions, IT Act intermediary status, and E-Commerce Rules.

**What triggers e-pharmacy classification:** Selling any products classified as "drugs" under the D&C Act (including OTC medicines and AYUSH medicines) through electronic mode. If the marketplace completely avoids selling medicines and only sells medical devices, health supplements (FSSAI-regulated), cosmetics, and general wellness products, it would likely **not** need an e-pharmacy license.

**If/when enacted, Draft Rules would require:** registration with Central Licensing Authority (Form 18AA, ₹50,000, 3-year validity), prohibition on Schedule X/NDPS sale, prohibition on drug advertising, data localization within India, and 24/7 customer support.

---

## 8. GST compliance — TCS likely does not apply in seller-of-record model

### TCS (Section 52 CGST Act) — critical finding

Section 52(1) states TCS applies *"where the consideration with respect to such supplies is to be collected by the operator."* In a seller-of-record model where payment goes **directly to the seller** (sellers use their own payment gateways), the marketplace does not collect consideration on behalf of sellers. Multiple authoritative sources (GST Council FAQ, ClearTax, GSTHero, Cashflo) confirm: **TCS under Section 52 does not apply** when the ECO does not collect payment. GSTR-8 filing is consequently not required for TCS purposes.

**Important caveat:** This is a legally significant determination. Obtain a formal ruling or legal opinion, as GST authorities may take a broader view if the marketplace has any role in facilitating payment flow. Circular 194/06/2023-GST clarifies that the ECO that "finally releases the payment to the supplier" bears TCS responsibility.

**Current TCS rate (if applicable):** 0.5% total (reduced from 1% effective July 10, 2024, per Notification 15/2024).

### GST registration and invoicing

The marketplace **should register** under GST for charging GST on subscription fees to sellers. GST on subscription fees: **18%** (SAC code 9995 or 998319). The marketplace must issue proper tax invoices with SAC code. Sellers are responsible for issuing invoices to buyers for product sales, including HSN codes (6-digit for turnover >₹5 crore).

### GSTIN validation at onboarding

Integrate a GSTIN verification API (options: GST Portal free lookup, GSP APIs via ClearTax/Tally/MasterIndia, third-party APIs like Cashfree or gstincheck.co.in). Validate: GSTIN is active, legal name matches PAN and bank account name, business type aligns with marketplace requirements.

### E-way bill and invoicing responsibility

E-way bills are the **seller's responsibility** (required for goods transport exceeding ₹50,000). The marketplace has no e-way bill obligation unless it takes goods custody. Product sale invoices are the seller's obligation under Section 31 CGST Act.

---

## 9. RBI payment processing — PA license not needed for this model

### Payment Aggregator classification

Under the RBI PA Directions 2025 (issued September 15, 2025, superseding the 2020 guidelines), a Payment Aggregator facilitates aggregation of payment from customers on behalf of merchants. In the seller-of-record model where the marketplace **does not touch, route, hold, or settle buyer payments**, it is **not** acting as a PA. No PA license is required. The marketplace collecting its own subscription fees is simply a merchant, not a PA.

### Recurring payment compliance for subscription billing

For card-based subscriptions (e-mandate): one-time AFA (OTP) at mandate registration, **pre-debit notification at least 24 hours before debit** via SMS/email, AFA-free limit of **₹15,000** per transaction (above ₹15,000 requires OTP for each debit). Cardholders must be able to view, modify, and cancel mandates.

For UPI AutoPay: standard limit **₹15,000** without AFA, UPI PIN required for mandate creation/modification/revocation. From **April 2026**, two-factor authentication required with at least one dynamic factor.

**Pre-debit notification content:** merchant name, transaction amount, date/time of debit, mandate ID/reference number, reason for debit, and link/option to opt out or cancel mandate.

### Card data storage prohibition

Merchants and PAs (other than card issuers/networks) are **prohibited** from storing actual card data (card number, CVV, expiry). Tokenization has been mandatory since October 1, 2022. Since the marketplace uses a third-party gateway (Razorpay/Cashfree) for subscription billing, the PCI DSS burden is minimal — the gateway handles compliance. **PCI DSS v4.0.1** became fully enforceable March 31, 2025.

---

## 10. KYC and anti-money laundering — PMLA likely not directly applicable

### PMLA applicability

E-commerce marketplace operators are **not explicitly listed as reporting entities** under PMLA Section 2(wa). PMLA applies to banking companies, financial institutions, SEBI-regulated intermediaries, and designated businesses (real estate agents, VDA providers). Since the marketplace doesn't process payments, it is not a payment system operator. The PA processing subscription payments carries PMLA obligations, not the marketplace.

### Seller KYB documents to collect

**For all entity types:** PAN card, GSTIN certificate, bank account details (verified), authorized signatory identity with authority letter/Board Resolution, business address proof, contact details.

**Entity-specific additional documents:**

| Entity type | Additional documents |
|-------------|---------------------|
| Private/Public Company | Certificate of Incorporation, MOA & AOA, Board Resolution, list of directors (DIN), beneficial ownership declaration |
| LLP | LLP Agreement, Certificate of Incorporation, designated partners' details |
| Partnership Firm | Partnership Deed, Registration Certificate |
| Sole Proprietorship | Shop & Establishment Certificate / Udyam Registration / GSTIN, bank statement in business name |

### Verification APIs

- **PAN verification:** NSDL PAN Verification API via third-party providers (AuthBridge, Surepass, Setu, Perfios, Signzy). Returns name, DOB, PAN status, PAN type. Cross-validate against GSTIN legal name and bank account name.
- **GSTIN verification:** GST Portal free lookup or third-party APIs (Cashfree, Eko, MicroVista). Returns legal name, trade name, registration date, status, taxpayer type, nature of business, filing compliance.

### Record keeping

Retain all seller KYC documents and transaction records for **minimum 8 years** to satisfy overlapping requirements: PMLA (5 years), GST (72 months/6 years), Companies Act (8 years).

---

## 11. Authentication and Session Security

### 11.1 Auth.js v5 capabilities

Auth.js v5 supports the Credentials provider (email + password), Email/Magic Link provider, experimental WebAuthn/Passkeys, and OAuth 2.0/OIDC (80+ providers). The platform uses the **Credentials provider** as the initial authentication method. The architecture is built from day one to accommodate any additional provider or factor without changing the file hierarchy or restructuring existing auth code.

### 11.2 Current implementation — email + password with email OTP second factor

The initial authentication flow is:

1. User submits email and password on the sign-in form.
2. Auth.js Credentials provider validates credentials against the database (bcrypt/Argon2id hash comparison).
3. On successful credential check, Auth.js sets a partial session with `{ verified: false, method: 'credentials' }` and redirects to the OTP verification step.
4. The platform sends a time-limited OTP (6 digits, 10-minute expiry) to the user's verified email address via the configured transactional email provider.
5. The user submits the OTP on the verification screen.
6. The NestJS API validates the OTP against the stored hash in Redis (key: `otp:<userId>`, TTL: 10 minutes). On success, the session is promoted to `{ verified: true }`.
7. All protected routes check `session.verified === true` server-side. A session with `verified: false` is treated as unauthenticated for all protected resources.

OTP delivery uses the transactional email provider already configured for account verification flows. No additional provider account is required.

### 11.3 Extensible auth architecture — file hierarchy is final from day one

The auth layer is structured so that adding any new factor, provider, or method is an additive operation: add a new file inside the correct folder, register it in the index, add the corresponding env flag. No existing files are modified. No folder hierarchy changes.

**Required folder structure in `packages/auth/src/`:**

```text
packages/auth/src/
├── authjs/
│   ├── config.ts                    # Auth.js v5 config — providers array, callbacks, adapter
│   ├── adapter.ts                   # @auth/mongodb-adapter setup
│   └── index.ts
├── providers/
│   ├── credentials.provider.ts      # Email + password (ACTIVE)
│   ├── email-otp.provider.ts        # Email magic link / OTP (stub — ready to activate)
│   ├── phone-otp.provider.ts        # Phone OTP via SMS provider (stub — ready to activate)
│   ├── google.provider.ts           # Google OAuth (stub — ready to activate)
│   ├── webauthn.provider.ts         # WebAuthn / Passkeys (stub — ready to activate)
│   └── index.ts                     # Exports only active providers
├── factors/
│   ├── email-otp.factor.ts          # Email OTP second factor (ACTIVE)
│   ├── phone-otp.factor.ts          # SMS OTP second factor (stub — ready to activate)
│   ├── totp.factor.ts               # TOTP authenticator app (stub — ready to activate)
│   ├── magic-link.factor.ts         # Magic link flow (stub — ready to activate)
│   └── index.ts                     # Exports only active factors
├── session/
│   ├── session.types.ts             # Session shape including verified, method, factorUsed
│   ├── session.helpers.ts           # promote(), demote(), isVerified(), factorOf()
│   └── index.ts
├── guards/
│   ├── auth.guard.ts                # Checks session.verified === true
│   ├── role.guard.ts                # Checks session.role against required roles
│   ├── mfa.guard.ts                 # Checks session.factorUsed against required factors
│   └── index.ts
├── roles/
│   ├── roles.constants.ts           # Role enum: public, customer, doctor, seller_staff, seller_admin, provider_support, provider_admin, super_admin
│   ├── roles.helpers.ts
│   └── index.ts
├── otp/
│   ├── otp.service.ts               # generate(), hash(), verify(), expire()
│   ├── otp.store.ts                 # Redis-backed OTP store (key, TTL, attempt counter)
│   └── index.ts
├── passwords/
│   ├── hash.ts                      # Argon2id hashing with recommended parameters
│   ├── verify.ts                    # Constant-time comparison
│   └── index.ts
└── index.ts                         # Public API of packages/auth
```


**Rules that Cursor must follow:**

- The `providers/` folder contains one file per authentication entry point (how the user proves identity). Adding a new sign-in method means adding one file here and exporting it from `providers/index.ts` when active.
- The `factors/` folder contains one file per second-factor type (how the user proves it is really them). Adding a new second factor means adding one file here and exporting it from `factors/index.ts` when active.
- The `authjs/config.ts` file composes the active providers from `providers/index.ts` and registers callbacks. It never contains inline provider logic.
- The `session/session.types.ts` file defines the canonical session shape used by all apps and the API. The shape must accommodate all current and future auth states without breaking changes.
- Stub files must be real TypeScript files with the correct exported function signatures, returning `NOT_IMPLEMENTED` errors. They must not be empty files or comments. This ensures that activating a stub is a matter of implementing the body, not creating a new file.

### 11.4 Session shape — designed for all future auth states

```typescript
// packages/auth/src/session/session.types.ts

export type AuthMethod = 
  | 'credentials'        // email + password (ACTIVE)
  | 'email-otp'          // email OTP only, no password (stub)
  | 'phone-otp'          // phone OTP only (stub)
  | 'google'             // Google OAuth (stub)
  | 'webauthn'           // WebAuthn / Passkeys (stub)
  | 'magic-link'         // Magic link (stub)

export type SecondFactor =
  | 'email-otp'          // Email OTP (ACTIVE)
  | 'phone-otp'          // SMS OTP (stub)
  | 'totp'               // TOTP authenticator (stub)
  | 'none'               // No second factor required for this role/context

export interface PlatformSession {
  userId: string
  role: UserRole
  sellerId?: string          // present for seller_staff and seller_admin
  method: AuthMethod         // how the user signed in
  verified: boolean          // true only after second factor is confirmed
  factorUsed: SecondFactor   // which second factor was used
  mfaEnrolled: SecondFactor[]  // which factors the user has enrolled
  sessionId: string
  createdAt: number
  expiresAt: number
}
```

The `verified: boolean` field is the gate. All protected routes check `verified === true` server-side via `auth.guard.ts`. A session with `verified: false` is a partial session valid only for the OTP submission endpoint.

### 11.5 OTP implementation

OTPs are generated, stored, and verified entirely within `packages/auth/src/otp/`. Rules:

- Generate cryptographically random 6-digit OTPs using `crypto.randomInt(100000, 999999)`.
- Hash the OTP with Argon2id before storing. Never store the raw OTP.
- Store in Redis: key `otp:<userId>:<factor>`, value is the hash, TTL 600 seconds (10 minutes).
- Track attempt count in a separate Redis key `otp:attempts:<userId>:<factor>`, TTL 600 seconds. Invalidate the OTP after 5 failed attempts.
- Compare using constant-time comparison only.
- Delete the Redis key immediately on successful verification to prevent replay.
- Log all OTP events (generated, sent, verified, failed, expired) to the audit log with `dataCategory: 'auth'` and no OTP value in the log.

### 11.6 Password hashing — Argon2id

Use **Argon2id** (RFC 9106). Healthcare-appropriate parameters:

```typescript
// packages/auth/src/passwords/hash.ts
import argon2 from 'argon2'

export const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536,   // 64 MiB
  timeCost: 3,         // 3 iterations
  parallelism: 4,
}
```

Implement transparent rehashing on login: after successful verification, check if the stored hash was produced with the current `ARGON2_OPTIONS`. If not, rehash with current options and update. This allows parameter upgrades without forced password resets.

### 11.7 Rate limiting on auth endpoints

Use `@nestjs/throttler` with `@nest-lab/throttler-storage-redis` for distributed rate limiting across all API instances:

| Endpoint | Rate limit | Lockout behaviour |
|----------|-----------|------------------|
| `POST /auth/login` | 5 attempts / 15 min per IP + email | Hard lock 30 min after 10 total failures; notify user by email |
| `POST /auth/otp/send` | 3 sends / 10 min per userId | Prevent OTP flood |
| `POST /auth/otp/verify` | 5 attempts / 10 min per userId + factor | Invalidate OTP after 5 failures |
| `POST /auth/register` | 3 requests / hour per IP | — |
| `POST /auth/forgot-password` | 3 requests / hour per email | — |
| Authenticated API | 100 requests / min per userId | — |
| Unauthenticated public API | 30 requests / min per IP | — |

Apply progressive delay after 3 failed login attempts: 2s, 4s, 8s, 16s. Send email notification to the account on lockout.

### 11.8 Session configuration

```typescript
// packages/auth/src/authjs/config.ts (session section)
session: {
  strategy: 'database',     // Auth.js database sessions via @auth/mongodb-adapter
  maxAge: 30 * 60,          // 30 minutes for all users
  updateAge: 5 * 60,        // Slide session on activity every 5 minutes
}

cookies: {
  sessionToken: {
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    }
  }
}
```

Database sessions are stored in MongoDB Atlas via `@auth/mongodb-adapter`. Sessions are revocable instantly by deleting the session document. Support "sign out of all devices" by deleting all session documents for a userId. Track session metadata: `userId`, `sessionId`, `createdAt`, `lastActiveAt`, `userAgent`, `ip`, `role`, `verified`, `factorUsed`.

### 11.9 Suspicious session detection

Monitor and score per session or per user:

- New geographic location (country or state not seen before for this user) → flag
- Impossible travel (two sessions from distant locations within short time) → terminate older session
- Unknown device fingerprint (use FingerprintJS open-source, stored per user) → require re-verification
- IP change mid-session → flag and log
- Concurrent sessions beyond configured limit (default: 3 active sessions per user) → terminate oldest
- Multiple failed OTP attempts → alert and lock

Store known device fingerprints per userId in MongoDB. Flag unknown devices in the session record. Risk score threshold: >0.8 → terminate session and notify user; >0.5 → require re-verification at next request.

### 11.10 Activating additional providers and factors in future

When the time comes to add phone OTP, TOTP, WebAuthn, or any other method:

1. Implement the stub file in `providers/` or `factors/` — the file already exists with the correct signature.
2. Export it from the relevant `index.ts`.
3. Add the corresponding `ENABLE_AUTH_PROVIDER_*` or `ENABLE_FACTOR_*` env flag to `packages/config`.
4. Update `authjs/config.ts` to include the new provider when the flag is active.
5. No other files change. No folder hierarchy changes. No existing auth flow is disrupted.

This is the only permitted path for auth extension. Ad-hoc auth logic added directly into app routes or API controllers is not permitted.

### Database sessions strongly recommended for healthcare

| Factor | JWT sessions | Database sessions |
|--------|-------------|-------------------|
| Session revocation | Cannot revoke without blocklist | ✅ Instant revocation |
| "Sign out everywhere" | Requires blocklist | ✅ Built-in |
| Concurrent session limiting | Complex | ✅ Simple |
| Audit trail | No server-side record | ✅ Full metadata |

Configure Auth.js with `strategy: "database"`, `maxAge: 30 * 60` (30 minutes for healthcare), `updateAge: 5 * 60`. Use a **hybrid approach**: database sessions for web apps, short-lived JWTs (15 min) for API communication between Next.js and NestJS, with Redis blocklist for JWT invalidation.

### Password hashing — argon2id

Use **Argon2id** (RFC 9106, recommended by OWASP/NIST/ENISA). Healthcare-appropriate parameters: **64 MiB memory, 3 iterations, 4 parallelism** (~300-500ms hash time). Use the `argon2` npm package. Implement transparent rehashing on login for parameter upgrades. Bcrypt (cost ≥12) is acceptable if already in use — migrate to Argon2id on next password change.

### Rate limiting — Redis-backed with NestJS

Use `@nestjs/throttler` with `@nest-lab/throttler-storage-redis` for distributed rate limiting:

| Endpoint | Rate limit | Lockout |
|----------|-----------|---------|
| `/login` | 5 attempts / 15 min per IP+username | Lock 30 min after 10 failures |
| `/register` | 3 requests / hour per IP | — |
| `/forgot-password` | 3 requests / hour per email | — |
| `/verify-otp` | 5 attempts / 5 min per session | Invalidate OTP after 5 failures |
| Authenticated API | 100 requests / min per user | — |
| Unauthenticated API | 20 requests / min per IP | — |

Implement progressive delays after 3 failed login attempts (exponential backoff: 2s, 4s, 8s, 16s). Notify user via email on account lockout.

### Refresh token rotation with family tracking

Issue short-lived access tokens (15 min, JWT signed RS256) and longer-lived refresh tokens (7 days, opaque UUID, stored in MongoDB + Redis). On every refresh: issue new refresh token, invalidate old one, track token family. If a previously-invalidated token is reused, **invalidate entire token family** (theft detection). Store refresh tokens in HttpOnly, Secure, SameSite=Strict cookies.

### Suspicious session detection

Monitor and score: geographic anomaly (new country/state), impossible travel (distant locations in short time), device fingerprint change, IP change mid-session, unusual time of access, concurrent session violations, failed MFA attempts. Use FingerprintJS (open-source, ~40-60% accuracy) for device fingerprinting. Store known device fingerprints per user; flag unknown devices for step-up MFA. Risk scoring: >0.8 = terminate session, >0.5 = require step-up MFA, else allow.

---

## 12. Internal communications security — defense in depth

### Container-to-container within Docker Compose

Docker bridge networks communicate in plaintext by default. For same-droplet containers under single-tenant control, the risk is lower (attacker needs root access). **Pragmatic approach:** rely on Docker network isolation for same-host communication; add mTLS between services for full compliance posture. Use an internal CA (Smallstep step-ca) to automate certificate lifecycle. TLS 1.3 adds ~1ms per connection — negligible overhead.

### Droplet-to-droplet on DigitalOcean

DigitalOcean VPC provides network isolation (logically isolated, inaccessible from public internet and other VPCs), but **traffic within a VPC is not encrypted at the wire level**. For cross-VPC peering, MACsec encrypted backbone is used. **Recommendation:** add WireGuard for droplet-to-droplet encryption on the private network.

### MongoDB Atlas connection security

Atlas **requires TLS by default** (TLS 1.2 minimum since July 2025). Certificates auto-rotate (90-day validity). Use `mongodb+srv://` connection strings (TLS enabled by default). Add Droplet public IPs to Atlas IP Access List with narrowest CIDR (/32). Consider Private Endpoints for production. Never store connection strings with credentials in code — use environment variables or vault.

### Redis security in Docker Compose

Always set `requirepass` (32+ characters). Set `protected-mode yes`. **Never expose port 6379 to host** — omit `ports:` for internal-only access. Disable dangerous commands (FLUSHDB, FLUSHALL, CONFIG, DEBUG, KEYS). For multi-droplet Redis, enable native TLS (Redis 6+). BullMQ connects via Docker service name with password authentication.

### BullMQ job payload security

Official BullMQ guidance: "Avoid storing sensitive data in the job altogether." **Use the reference pattern:** store only IDs (orderId, userId, action) in job payloads; workers fetch sensitive data from the database at processing time. If encryption is necessary, use crypto.publicEncrypt before adding to queue. Sanitize job data in error logging by redacting sensitive fields.

### Webhook security for seller ERP integrations

Implement **HMAC-SHA256 signing** with timestamp validation and replay prevention. Sign `timestamp.body` with seller-specific webhook secret. Include headers: `X-Webhook-Signature` (with timestamp and signature), `X-Webhook-Event`, `X-Webhook-Id` (for idempotency). Verify: timestamp within 5-minute tolerance, signature match using `crypto.timingSafeEqual()`, webhook ID not previously processed (track in Redis with 24h TTL).

### Secrets management

For Docker Compose without Swarm: Phase 1 (development) uses `.env` file with `chmod 600` and `.gitignore`. Phase 2 (production) uses **HashiCorp Vault** in Docker Compose with Vault Agent sidecar pattern for runtime secret injection. For small teams, consider **Infisical** (open-source) or **Doppler** as lighter alternatives with rotation, audit logs, and Docker integration.

### DigitalOcean firewall configuration

Use free DigitalOcean Cloud Firewalls with tag-based application. Inbound: TCP 443 from all (HTTPS), TCP 80 from all (redirect to HTTPS). Restrict SSH to specific office IPs. Never expose Redis (6379), MongoDB (27017), or BullMQ dashboard ports publicly. Combine Cloud Firewalls with VPC isolation and UFW on the Droplet for defense in depth.

---

## 13. Audit logging — compliance requires tamper-evident records

### Events that must be logged

| Event category | Specific events | DPDP | IT Act | GDPR |
|---------------|-----------------|------|--------|------|
| Authentication | Login success/failure, logout, password change, MFA enable/disable | ✅ | ✅ | ✅ |
| Data access | Patient data view, order data view, PII search, data export | ✅ | ✅ | ✅ |
| Data modification | Record create/update/delete | ✅ | ✅ | ✅ |
| Consent | Consent granted/withdrawn/updated | ✅ | — | ✅ |
| Admin | Role changes, config changes, API key creation/revocation | ✅ | ✅ | ✅ |
| Breach detection | Security incidents, unauthorized access attempts | ✅ | ✅ | ✅ |

Each event should record: **Who** (user ID, role), **What** (data category accessed, fields), **When** (timestamp), **Where** (IP, service), **Why** (purpose/context), **How** (API endpoint, method).

### Log retention requirements

| Regulation | Minimum retention |
|-----------|-------------------|
| DPDP Act / Rules 2025 | **1 year** for access/audit logs |
| IT Act (CERT-In) | **180 days** for ICT system logs |
| IT Act (Intermediaries) | **180 days** after account deactivation |
| GDPR | No fixed period — retain as long as necessary |
| E-commerce (DPDP Third Schedule) | **3 years** from last interaction (for entities with ≥2 crore users) |

**Recommendation:** 1 year minimum for audit logs, 3 years for financial/transactional logs. Tiered storage: hot (90 days), warm (1 year), cold (3 years).

### Tamper-evident logging with hash chaining

Implement hash chaining: each audit log entry includes SHA-256 hash of the previous entry (blockchain-like chain). Use canonical JSON for deterministic hashing. Store audit logs in a **separate MongoDB database** with write-only service account (insert only, no update/delete). Separate read-only user for auditors. Monitor for tampering via MongoDB change streams watching for update/delete operations.

### Audit log schema for MongoDB

```
{
  _id: ObjectId,
  timestamp: Date,
  eventType: string,           // e.g., 'data.patient.view'
  eventCategory: string,       // 'auth' | 'data' | 'consent' | 'admin'
  severity: string,            // 'info' | 'warning' | 'critical'
  actor: { userId, role, ip, userAgent, sessionId },
  resource: { type, id, collection },
  action: string,              // 'create' | 'read' | 'update' | 'delete'
  details: { fieldsAccessed, changedFields, resultCount },
  request: { method, path, correlationId, service },
  previousHash: string,
  hash: string,
  dataCategory: string,        // 'personal' | 'sensitive' | 'health' | 'financial'
  legalBasis: string           // GDPR/DPDP legal basis
}
```

Index on: timestamp, actor.userId + timestamp, resource.type + resource.id, eventType, hash (unique).

### SIEM recommendation — Grafana Loki for small teams

Use the **PLG stack** (Promtail + Loki + Grafana). Loki uses ~512MB RAM vs ELK's 4GB+ minimum. Simple setup via Docker Compose. LogQL provides adequate query capability. Application logs flow through Pino → stdout → Promtail → Loki → Grafana dashboards. Use **Pino** via `nestjs-pino` for structured logging (5x faster than Winston). Configure PII redaction on sensitive fields (authorization headers, cookies, passwords, Aadhaar numbers).

---

## 14. Cross-border data transfer — no restrictions yet, but prepare for localization

### DPDP Act cross-border model

The DPDP Act follows a **"negative list" / blacklist approach**: transfers are permitted by default to any country; the Central Government may restrict transfers to specific countries via gazette notification. **No countries have been blacklisted as of April 2026.** Rule 15 operationalizes the cross-border framework effective May 2027. Even without blacklisting, platforms must disclose transfers in privacy notices, implement contractual safeguards, and maintain audit trails.

### Potential SDF data localization

SDFs may be required to keep certain "specified personal data" and its traffic data within India (Rule 13(4)). Health data is a prime candidate for mandatory localization. **Critical action:** Host MongoDB Atlas primary cluster in the **Mumbai region (ap-south-1)** to satisfy potential localization requirements and existing RBI payment data rules.

### Implications for US-based cloud services

| Service | Risk level | Mitigation |
|---------|-----------|------------|
| MongoDB Atlas | **HIGH** — stores core personal/health data | Host in Mumbai region; execute DPDP-compliant DPA |
| Cloudflare | Medium — processes traffic data, IPs | Transient processing; ensure DPA covers DPDP |
| GitHub | Low — primarily code/CI/CD | Ensure no PII/credentials in repositories |

**Practical steps:** Map all personal data flows, migrate primary database to India region, execute DPDP-compliant DPAs with all cloud providers (security safeguards, breach notification ≤72 hours pass-through, data erasure obligations, sub-processor controls, audit rights). Explicitly disclose in privacy notices that data may be processed outside India. Monitor MeitY gazette notifications for blacklisted countries and SDF designations.

### Sectoral localization mandates already in force

- **RBI:** Payment system data must be stored only in India (mandatory since October 2018)
- **Companies Act:** Electronic books of accounts must remain accessible in India

---

## 15. Implementation requirements mapping

This section maps the requirements from the compliance table to specific platform components with regulatory authority, technical approach, and priority.

### Registration and onboarding flows

**Consent notice at registration (DPDP)** → Build into buyer and seller registration flows. Present itemized consent notice before account creation listing each data item collected and its purpose. Store consent record with timestamp, notice version, and exact text. Implement granular purpose-specific consent toggles. Withdrawal mechanism must be equally accessible. Effective: May 2027, but build now.

**GSTIN validation at seller onboarding** → Integrate GSTIN verification API (Cashfree or gstincheck.co.in) into seller onboarding form. Validate: GSTIN is active, legal name matches PAN, business type aligns with healthcare product categories. Store verified GSTIN data with verification timestamp.

**Seller agreement acceptance (timestamped)** → Present comprehensive seller agreement covering IT Act intermediary terms, DPDP data processor obligations, product listing standards, prohibited products, return/refund policies. Record: agreement version, acceptance timestamp, IP address, user agent, and agreement text hash. Store in immutable audit log.

### Catalogue and moderation

**Prohibited product blocklist at moderation** → Implement automated and manual moderation pipeline. Blocklist must include: Schedule X drugs, NDPS Act substances, products claiming to cure/treat 54 diseases under Magic Remedies Act, unapproved drugs, products without required seller licenses. Use keyword matching on product titles/descriptions for automated flagging. Manual review queue for flagged items. Store moderation decisions in audit log.

**Country of origin on each listing** → Add `countryOfOrigin` as **required field** in product data model. Validate at seller product submission. Display prominently on listing page. Implement searchable/sortable filter by July 1, 2026 (Legal Metrology Amendment). For imported goods, also require importer name and details.

**Seller name and address on each listing** → Display seller legal name, geographic address, and customer care contact on every product listing page. Pull from verified seller profile data. Required by E-Commerce Rules 2020, Rule 5(3).

### Billing and payments

**GST-compliant subscription invoices** → Generate invoices with marketplace GSTIN, SAC code (9995 or 998319), 18% GST breakup (CGST + SGST for intra-state, IGST for inter-state), invoice number, date, seller details. Store invoice PDFs and structured data for minimum 72 months (GST retention requirement).

**PAN storage (encrypted) for seller payouts** → Collect PAN during onboarding, verify via NSDL PAN Verification API, store encrypted at rest using AES-256. Cross-validate PAN name against GSTIN legal name and bank account name. PAN is not subject to "no card data storage" restrictions — it is required for KYC/tax compliance.

**No card data storage** → Never store actual card data (card number, CVV, expiry) anywhere in the platform. Use a PCI DSS-compliant payment gateway (Razorpay, Cashfree) that handles tokenization. Client-side payment forms should be provided by the gateway (hosted checkout or iframes). PCI DSS v4.0.1 compliance is the gateway's responsibility.

**GSTR-8 TCS data export** → In the current seller-of-record model where marketplace doesn't collect payment, GSTR-8 TCS filing is **not required**. However, build a reporting/admin analytics module that can export transaction data grouped by seller GSTIN, product HSN codes, and tax rates — this provides readiness if the model changes or for GST audit support.

**Recurring payment pre-debit notification** → For seller subscription billing, send SMS/email notification **at least 24 hours before** each recurring debit. Include: marketplace name, debit amount, date/time, mandate reference, reason, and opt-out link. For amounts >₹15,000, include AFA (OTP) link. Log all pre-debit notifications with delivery status.

### User-facing compliance

**Grievance Officer details on platform** → Display Grievance Officer's name, contact details, and designation in footer of all three web apps, on About/Contact page, and in Terms of Service. Must be an India-based individual. Provide complaint filing mechanism with ticket numbers. Acknowledge within 24 hours, resolve within 15 days.

**Return and refund policy per seller** → Each seller must configure their return/refund/exchange/warranty policies in seller portal settings. Display prominently on each product listing before purchase. Cannot enforce blanket "no refund" policies for defective products. Include clear shipping cost allocation for returns.

**Data Principal rights portal (DPDP)** → Build self-service portal in buyer and seller account settings for: viewing all stored personal data (JSON/CSV download), requesting correction, requesting erasure (with 48-hour pre-erasure notification), submitting grievances, managing consent preferences, and designating nominees. Track all requests with timestamps. Respond within 90 days.

**Erasure-by-data_principal_id mechanism** → Implement `erasure-by-data_principal_id` across all MongoDB collections. Build a cascading erasure service that: identifies all documents linked to a data_principal_id across collections (users, orders, addresses, consents, communications), applies soft-delete or anonymization (replacing PII with anonymized tokens while preserving transaction structure for legal retention), sends 48-hour pre-erasure notification, executes final erasure, and logs the entire process in the audit trail. Retain anonymized transaction records as required by tax/legal obligations.

**Featured listing disclosure label** → Any sponsored, promoted, or featured listings in search results must display a clear **"Sponsored"** or **"Featured"** label. This is required under E-Commerce Rules (no manipulation of search results) and Consumer Protection Act (no misleading practices). Store all featured listing purchase records for audit.

### Logging infrastructure

**Audit log for personal data access** → Implement the audit logging infrastructure described in Section 13. Use a dedicated NestJS interceptor/decorator (`@AuditLog()`) to automatically capture data access events on controllers that return personal data. Store in separate MongoDB database with hash-chained, tamper-evident entries. Separate application logs (Pino → Loki) from compliance audit logs (AuditService → MongoDB audit_db). Minimum 1-year retention per DPDP Rules 2025.

---

## Key compliance deadlines at a glance

| Deadline | Obligation | Priority |
|----------|-----------|----------|
| **Now** | SPDI Rules 2011 compliance, IT Act due diligence, E-Commerce Rules 2020 disclosures, CERT-In 6-hour breach reporting | 🔴 Immediate |
| **July 1, 2026** | Country of origin searchable/sortable filter (Legal Metrology Amendment) | 🔴 High |
| **November 13, 2026** | DPDP Phase 2 — Consent Manager registration framework | 🟡 Medium |
| **May 13, 2027** | DPDP Phase 3 — Full enforcement: consent notices, data principal rights, breach notification, penalties | 🔴 Critical |
| **Ongoing** | Annual ISO 27001 audit (Section 43A), grievance resolution within 15 days, 180-day content/user data retention | 🔴 Continuous |

## Conclusion — build for May 2027 while shipping under current law

The platform's most consequential regulatory reality is this: India's healthcare marketplace sector operates in a **dual-regime transition**. The SPDI Rules 2011 govern today; the DPDP Act's substantive provisions take over May 2027. Building for both simultaneously is non-optional. The practical engineering priorities are clear. **First**, host all data in MongoDB Atlas Mumbai region to satisfy current RBI mandates and anticipated DPDP health data localization. **Second**, build the consent management system, data principal rights portal, and audit logging infrastructure now — these components are architecturally foundational and cannot be bolted on later. **Third**, implement the seller license verification pipeline at onboarding as a hard gate, not advisory — the D&C Act's license requirements are actively enforced via CDSCO show-cause notices.

Three regulatory gaps create genuine risk: the e-pharmacy rules remain in draft since 2018 (selling any "drugs" including OTC medicines exposes the platform to regulatory ambiguity), the 2021 E-Commerce Rules amendments (fall-back liability) could be finalized without notice, and SDF designation criteria are not yet published (the platform should proactively prepare for SDF-level obligations given its health data processing). The platform's seller-of-record model provides one significant advantage: by not touching buyer payments, it avoids GST TCS obligations, PA licensing requirements, and direct PMLA reporting obligations. Preserve this architecture deliberately — any future feature that routes buyer payments through the marketplace would trigger substantial regulatory overhead.