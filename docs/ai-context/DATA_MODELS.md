# Healthcare Marketplace Platform — Data Models Reference

## 1. Purpose and Conventions

This document defines every MongoDB collection in the platform, including field names, types, indexes, relationships, and the reasoning behind structural decisions. It is the single source of truth for all schema work in `packages/database/src/schemas/`, all seed data in `packages/database/src/seeds/`, all DTO contracts in `packages/contracts/src/dto/`, and all Atlas Search index definitions in `packages/search/src/atlas-search/`.

Every seed file in `packages/database/src/seeds/` must mirror the exact shape defined here. The seed data is the source for `dev:lite` mode and for Atlas M0 test data. If a schema changes, the seed files change at the same time.

### 1.1 Global field conventions

Every document in every collection carries these base fields unless explicitly noted otherwise:

```typescript
_id: ObjectId               // MongoDB ObjectId, auto-generated
createdAt: Date             // Set on insert, never updated
updatedAt: Date             // Set on every update via Mongoose timestamps
createdBy: ObjectId | null  // userId of actor, null for system operations
updatedBy: ObjectId | null  // userId of last actor
isDeleted: boolean          // Soft-delete flag, default false
deletedAt: Date | null      // Set when isDeleted becomes true
deletedBy: ObjectId | null  // userId who soft-deleted
version: number             // Optimistic concurrency version, incremented on every update
```

### 1.2 Localisation convention

Any user-facing string that must be available in multiple languages is stored as a localised string object rather than a plain string:

```typescript
interface LocalisedString {
  en: string           // English (always required, canonical fallback)
  hi?: string          // Hindi
  bn?: string          // Bengali
  ta?: string          // Tamil
  te?: string          // Telugu
  mr?: string          // Marathi
  gu?: string          // Gujarati
  kn?: string          // Kannada
  ml?: string          // Malayalam
  pa?: string          // Punjabi
  [isoCode: string]: string | undefined  // Any additional language by ISO 639-1 code
}
```

Adding a new language requires populating a new key on existing documents. No schema migration is needed.

### 1.3 Money convention

All monetary amounts are stored as integers in the smallest currency unit (paise for INR) to avoid floating-point precision errors. Display formatting uses `packages/utils/src/formatting/currency.ts`.

```typescript
interface MoneyAmount {
  value: number         // Amount in smallest unit (paise for INR = value / 100 = rupees)
  currency: string      // ISO 4217 currency code, e.g. "INR"
}
```

### 1.4 Address convention

Reused across sellers, customers, and order fulfillment:

```typescript
interface Address {
  line1: string
  line2?: string
  city: string
  state: string          // Full state name
  stateCode: string      // ISO 3166-2 subdivision code, e.g. "IN-WB"
  pincode: string        // 6-digit Indian postal code
  country: string        // "India" at launch
  countryCode: string    // "IN"
  latitude?: number
  longitude?: number
}
```

### 1.5 Database separation

The platform uses two MongoDB Atlas databases:

- **`marketplace_db`** — all primary business collections described in sections 2–16
- **`audit_db`** — all audit, changelog, and compliance log collections described in section 17

The `audit_db` database uses a write-only service account for all application writes. Reads are restricted to a separate read-only auditor account. No application code may issue `update`, `findOneAndUpdate`, `replaceOne`, or `deleteOne` operations against `audit_db` collections. This enforces tamper-evidence at the access-control layer.

---

## 2. Identity and Authentication Collections

These collections are owned and managed by Auth.js v5 via `@auth/mongodb-adapter`. Cursor must not redesign their structure. Custom platform fields are added via the `metadata` extension pattern or by extending the user document directly as described below.

### 2.1 Collection: `auth_users`

The Auth.js user document extended with platform-specific identity fields.

```typescript
interface AuthUserDocument {
  _id: ObjectId
  email: string                        // Unique, lowercase-normalised
  emailVerified: Date | null           // Set by Auth.js on first verified sign-in
  image?: string                       // Profile image URL
  name?: string                        // Display name
  createdAt: Date
  updatedAt: Date

  // Platform extensions — added alongside Auth.js fields
  role: UserRole                       // See roles enum below
  isActive: boolean                    // false = account suspended
  suspendedAt?: Date
  suspendedReason?: string
  passwordHash: string | null          // Argon2id hash; null for OAuth-only users
  otpSecret?: string                   // Encrypted TOTP secret for future TOTP factor
  mfaEnrolled: SecondFactor[]          // Currently enrolled second factors
  sellerId?: ObjectId                  // Present for seller_staff and seller_admin
  sellerIds?: ObjectId[]               // If a user manages multiple seller entities
  locale: string                       // Preferred language, e.g. "en", "hi"
  preferredCurrency: string            // "INR" at launch
  phone?: string                       // E.164 format, e.g. "+919876543210"
  phoneVerified: boolean
  isDoctorVerified: boolean            // Set true after doctor credential review
  doctorRegistrationNumber?: string
  lastLoginAt?: Date
  lastLoginIp?: string
  loginCount: number
  failedLoginAttempts: number          // Reset on successful login
  lockedUntil?: Date                   // Set on account lockout
  dataRetentionExpiresAt?: Date        // DPDP — calculated from last activity
  nomineeUserId?: ObjectId             // DPDP right of nomination
}

type UserRole =
  | 'public'
  | 'customer'
  | 'doctor'
  | 'seller_staff'
  | 'seller_admin'
  | 'provider_support'
  | 'provider_admin'
  | 'super_admin'

type SecondFactor = 'email-otp' | 'phone-otp' | 'totp' | 'none'
```

**Indexes:**
- `{ email: 1 }` unique
- `{ role: 1, isActive: 1 }`
- `{ sellerId: 1 }` sparse
- `{ phone: 1 }` sparse unique
- `{ dataRetentionExpiresAt: 1 }` sparse — used by retention purge job

### 2.2 Collection: `auth_sessions`

Auth.js database session documents extended with platform session metadata.

```typescript
interface AuthSessionDocument {
  _id: ObjectId
  sessionToken: string       // Unique opaque token stored in HttpOnly cookie
  userId: ObjectId           // Ref: auth_users._id
  expires: Date              // Auth.js expiry

  // Platform extensions
  role: UserRole
  verified: boolean          // true only after second factor confirmed
  factorUsed: SecondFactor
  sellerId?: ObjectId
  createdAt: Date
  lastActiveAt: Date
  userAgent: string
  ip: string
  deviceFingerprint?: string
  riskScore?: number         // 0–1, computed by suspicious session detector
  flaggedForReview: boolean
}
```

**Indexes:**
- `{ sessionToken: 1 }` unique
- `{ userId: 1 }`
- `{ expires: 1 }` TTL index (Auth.js uses this for automatic expiry)

### 2.3 Collection: `auth_accounts`

Auth.js OAuth account links. Used when a user connects a social provider.

```typescript
interface AuthAccountDocument {
  _id: ObjectId
  userId: ObjectId           // Ref: auth_users._id
  type: string               // "oauth" | "email" | "credentials"
  provider: string           // "google" | "credentials" | "email"
  providerAccountId: string
  refresh_token?: string
  access_token?: string
  expires_at?: number
  token_type?: string
  scope?: string
  id_token?: string
  session_state?: string
}
```

**Indexes:**
- `{ provider: 1, providerAccountId: 1 }` unique
- `{ userId: 1 }`

### 2.4 Collection: `auth_verification_tokens`

Auth.js email verification and magic link tokens.

```typescript
interface AuthVerificationTokenDocument {
  identifier: string    // Email address
  token: string         // Hashed token
  expires: Date
}
```

**Indexes:**
- `{ identifier: 1, token: 1 }` unique
- `{ expires: 1 }` TTL index

### 2.5 Collection: `otp_records`

Platform OTP records for email and SMS second-factor verification. Not managed by Auth.js.

```typescript
interface OtpRecordDocument {
  _id: ObjectId
  userId: ObjectId
  factor: 'email-otp' | 'phone-otp'
  otpHash: string          // Argon2id hash of the OTP — never store raw OTP
  attempts: number         // Failed attempts counter
  maxAttempts: number      // Default 5
  createdAt: Date
  expiresAt: Date          // 10 minutes from creation
  usedAt?: Date            // Set on successful use
  isConsumed: boolean      // true after successful use or expiry
  deliveryAddress: string  // Hashed/partial email or phone for log reference
  purpose: 'login' | 'register' | 'password-reset' | 'email-verify' | 'phone-verify'
}
```

**Indexes:**
- `{ userId: 1, factor: 1, isConsumed: 1 }`
- `{ expiresAt: 1 }` TTL index for automatic cleanup

---

## 3. Seller and Entity Collections

### 3.1 Collection: `sellers`

The central seller entity. One seller may have multiple branches.

```typescript
interface SellerDocument {
  _id: ObjectId
  sellerCode: string              // Human-readable unique code, e.g. "SEL-00042"

  // Legal identity
  legalName: string               // Exact legal name matching PAN and GST registration
  tradeName?: string              // Trade/brand name if different
  entityType: EntityType          // See enum below
  pan: string                     // Encrypted PAN number
  panVerified: boolean
  panVerifiedAt?: Date
  cin?: string                    // Company Identification Number (companies only)

  // GST
  gstin: string                   // GST Identification Number
  gstinVerified: boolean
  gstinVerifiedAt?: Date
  gstRegistrationState: string    // State of GST registration

  // Contact
  primaryEmail: string
  primaryPhone: string            // E.164
  website?: string
  registeredAddress: Address
  operationalAddress?: Address

  // Marketplace status
  status: SellerStatus
  onboardedAt?: Date
  suspendedAt?: Date
  suspendedReason?: string
  inviteToken?: string            // Used during invite-only onboarding

  // Capabilities — which product categories and operational modes are approved
  approvedCategories: ObjectId[]          // Ref: categories._id
  approvedProductTypes: ProductType[]     // 'retail' | 'wholesale' | 'rental'
  requiresPrescriptionHandling: boolean   // True if seller sells Schedule H/H1 drugs
  licenseVerificationStatus: LicenseVerificationStatus

  // Subscription
  currentSubscriptionId?: ObjectId  // Ref: seller_subscriptions._id
  subscriptionTier: SubscriptionTier

  // Trust and scoring
  trustScore?: number              // 0–100, computed by worker projection
  trustScoreUpdatedAt?: Date
  totalOrders: number              // Denormalised counter
  successfulOrders: number
  returnRate: number               // 0–1
  cancellationRate: number         // 0–1

  // DPDP / compliance
  dpdpObligationAcceptedAt?: Date  // Timestamp of DPDP data fiduciary acceptance
  sellerAgreementAcceptedAt?: Date
  sellerAgreementVersion: string

  ...baseFields
}

type EntityType =
  | 'private_limited'
  | 'public_limited'
  | 'llp'
  | 'partnership'
  | 'sole_proprietorship'
  | 'trust'
  | 'other'

type SellerStatus =
  | 'invited'
  | 'onboarding'
  | 'pending_verification'
  | 'active'
  | 'suspended'
  | 'terminated'

type SubscriptionTier = 'starter' | 'growth' | 'professional' | 'enterprise'

type LicenseVerificationStatus = 'not_started' | 'in_progress' | 'verified' | 'rejected' | 'expired'
```

**Indexes:**
- `{ sellerCode: 1 }` unique
- `{ gstin: 1 }` unique
- `{ pan: 1 }` unique
- `{ status: 1 }`
- `{ approvedCategories: 1 }`
- `{ trustScore: -1 }`

### 3.2 Collection: `seller_licenses`

All regulatory licenses held by a seller. One seller may have multiple licenses of different types.

```typescript
interface SellerLicenseDocument {
  _id: ObjectId
  sellerId: ObjectId              // Ref: sellers._id
  branchId?: ObjectId             // Ref: seller_branches._id — null means head office

  licenseType: LicenseType
  licenseNumber: string
  issuingAuthority: string        // e.g. "CDSCO" / "State Drug Controller, West Bengal"
  issuedAt: Date
  expiresAt: Date
  status: 'active' | 'expired' | 'suspended' | 'cancelled'
  documentUrl: string             // Signed URL to stored license document
  documentStorageKey: string      // Object storage key
  verifiedByAdminId?: ObjectId
  verifiedAt?: Date
  rejectionReason?: string

  // License-specific metadata
  allowedSchedules?: DrugSchedule[]   // For drug licenses: which schedules are covered
  deviceClasses?: DeviceClass[]       // For MD-42: which device classes
  productCategories?: string[]        // What product categories this license covers

  ...baseFields
}

type LicenseType =
  | 'drug_retail_form20'           // Form 20 — retail drug license
  | 'drug_retail_form21'           // Form 21 — restricted drugs
  | 'drug_wholesale_form20b'       // Form 20B — wholesale drug license
  | 'drug_wholesale_form21b'       // Form 21B — restricted wholesale
  | 'medical_device_md42'          // MD-42 CDSCO registration certificate
  | 'medical_device_form20b'       // Old Form 20B/21B covering devices
  | 'fssai_basic'                  // FSSAI basic registration
  | 'fssai_state'                  // FSSAI state license
  | 'fssai_central'                // FSSAI central license
  | 'ayush_manufacturing'          // AYUSH manufacturing license
  | 'ayush_retail'                 // AYUSH retail license
  | 'pharmacy_registration'        // Pharmacist registration (if applicable)
  | 'gst_registration'             // GST certificate (also stored in sellers doc)
  | 'shop_establishment'           // Shops and Establishments Act

type DrugSchedule = 'OTC' | 'H' | 'H1' | 'X' | 'G' | 'J' | 'P'
type DeviceClass = 'A' | 'B' | 'C' | 'D'
```

**Indexes:**
- `{ sellerId: 1, licenseType: 1 }`
- `{ licenseNumber: 1 }` unique
- `{ expiresAt: 1 }` — used by license expiry alert jobs
- `{ status: 1, expiresAt: 1 }`

### 3.3 Collection: `seller_branches`

Individual physical or operational branches of a seller entity.

```typescript
interface SellerBranchDocument {
  _id: ObjectId
  sellerId: ObjectId
  branchCode: string              // e.g. "SEL-00042-BR-001"
  branchName: string
  address: Address
  isHeadOffice: boolean
  isActive: boolean
  pincodesServed: string[]        // Pincodes this branch can serve for delivery
  citiesServed: string[]
  statesServed: string[]
  warehouseType: 'owned' | 'rented' | 'third_party'
  contactPhone: string
  contactEmail: string
  managerId?: ObjectId            // Ref: auth_users._id
  operationalHours?: {
    [day: string]: { open: string; close: string; isOpen: boolean }
  }
  ...baseFields
}
```

**Indexes:**
- `{ sellerId: 1 }`
- `{ pincodesServed: 1 }` — used for seller discovery by pincode
- `{ branchCode: 1 }` unique

### 3.4 Collection: `seller_bank_accounts`

Bank account details for seller payouts, stored with encryption on sensitive fields.

```typescript
interface SellerBankAccountDocument {
  _id: ObjectId
  sellerId: ObjectId
  accountHolderName: string
  bankName: string
  ifscCode: string
  accountNumberEncrypted: string  // AES-256 encrypted
  accountNumberLast4: string      // Last 4 digits for display
  accountType: 'current' | 'savings'
  isPrimary: boolean
  isVerified: boolean
  verifiedAt?: Date
  verificationMethod?: 'penny_drop' | 'manual_verification'
  ...baseFields
}
```

**Indexes:**
- `{ sellerId: 1, isPrimary: 1 }`

---

## 4. Product Catalog Collections

The catalog follows a three-layer model: **canonical products** (marketplace-owned identity) → **product variants** (purchasable SKUs) → **seller listings** (seller-specific price and stock layered on top of a variant).

### 4.1 Collection: `categories`

Hierarchical product category tree. Supports unlimited depth.

```typescript
interface CategoryDocument {
  _id: ObjectId
  slug: string                    // URL-safe slug, unique, e.g. "orthopedic-supports"
  name: LocalisedString
  description: LocalisedString
  parentId: ObjectId | null       // Null for root categories
  ancestors: ObjectId[]           // Full ancestor path for efficient tree queries
  depth: number                   // 0 = root, 1 = second level, etc.
  isActive: boolean
  isFeatured: boolean
  displayOrder: number
  imageUrl?: string
  iconUrl?: string
  bannerUrl?: string
  seoTitle?: LocalisedString
  seoDescription?: LocalisedString
  seoIntroContent?: LocalisedString   // Category intro copy for SEO pages

  // Regulatory metadata for this category
  requiresSellerLicense: boolean
  requiredLicenseTypes?: LicenseType[]
  requiresPrescription: boolean       // If true, products in this category need prescription
  restrictedSchedules?: DrugSchedule[]  // Schedules allowed in this category (X is never allowed)
  hsnCodeDefault?: string             // Default HSN code for products in this category
  gstRateDefault?: number             // Default GST rate percentage

  // Atlas Search boosting signal
  searchBoostScore: number            // 0–10, operator-configurable for ranking

  ...baseFields
}
```

**Indexes:**
- `{ slug: 1 }` unique
- `{ parentId: 1, displayOrder: 1 }`
- `{ ancestors: 1 }`
- `{ isActive: 1, isFeatured: 1 }`

**Atlas Search index fields:** `name.en`, `name.hi`, `description.en`, `slug`

### 4.2 Collection: `brands`

Brand entities referenced by products.

```typescript
interface BrandDocument {
  _id: ObjectId
  slug: string
  name: LocalisedString
  description?: LocalisedString
  logoUrl?: string
  websiteUrl?: string
  countryOfOrigin: string           // ISO 3166-1 alpha-2, e.g. "IN", "DE"
  isVerified: boolean               // Marketplace has verified brand authenticity
  parentBrandId?: ObjectId          // For sub-brands
  isActive: boolean
  isFeatured: boolean
  searchBoostScore: number
  ...baseFields
}
```

**Indexes:**
- `{ slug: 1 }` unique
- `{ isActive: 1, isFeatured: 1 }`

### 4.3 Collection: `canonical_products`

The marketplace-owned canonical product catalog. This is the master product identity. Sellers map their own SKUs to documents in this collection. No seller owns or can modify canonical product documents.

```typescript
interface CanonicalProductDocument {
  _id: ObjectId
  sku: string                         // Marketplace canonical SKU, e.g. "MKT-OXY-001"
  slug: string                        // URL slug, unique, e.g. "philips-respironics-everflo-5l"
  productType: ProductType            // See enum
  status: ProductStatus

  // Catalog identity
  name: LocalisedString               // Marketplace-standardised product name
  shortDescription: LocalisedString
  fullDescription: LocalisedString
  categoryId: ObjectId                // Primary category
  categoryPath: ObjectId[]            // Full ancestor path for filtering
  brandId?: ObjectId
  genericName?: LocalisedString       // For drugs: generic/INN name
  manufacturer?: LocalisedString      // Manufacturer name
  countryOfOrigin: string             // Required by Legal Metrology Amendment 2026

  // Regulatory classification
  regulatoryClass: RegulatoryClass    // See below
  requiresPrescription: boolean
  drugSchedule?: DrugSchedule         // If drug
  cdscoRegistrationNumber?: string    // For medical devices
  deviceClass?: DeviceClass           // For medical devices: A/B/C/D
  fssaiLicenseNumber?: string         // For food/nutraceutical products
  ayushLicenseNumber?: string
  prohibitedClaims?: string[]         // Claims that must never appear in listings

  // Variant structure — defines the axes of variation for this product
  hasVariants: boolean
  variantAxes: VariantAxis[]          // Which axes are used to differentiate variants

  // SEO and search
  searchTags: string[]                // Additional keywords for Atlas Search
  searchBoostScore: number
  seoTitle?: LocalisedString
  seoDescription?: LocalisedString
  faqs?: ProductFaq[]

  // Substitutes and related
  substituteProductIds: ObjectId[]    // Products that can substitute this one
  relatedProductIds: ObjectId[]
  bundleComponentIds?: ObjectId[]     // If this is a bundle/kit

  // Pricing signals (computed, refreshed by worker)
  priceSummary?: {
    minPrice: MoneyAmount
    maxPrice: MoneyAmount
    offerCount: number
    currency: string
    lastComputedAt: Date
  }

  // Images and media (canonical marketplace images)
  images: ProductImage[]
  videos?: ProductVideo[]

  // Indexability
  isIndexable: boolean                // For SEO noindex control
  isPublic: boolean                   // Visible in public catalog

  ...baseFields
}

type ProductType = 'retail' | 'wholesale' | 'rental' | 'bundle' | 'service'

type ProductStatus = 'draft' | 'pending_review' | 'active' | 'archived' | 'rejected'

type RegulatoryClass =
  | 'non_regulated'          // General wellness, no special restrictions
  | 'food_fssai'             // FSSAI-regulated food/nutraceutical
  | 'ayush'                  // AYUSH (Ayurveda, Yoga, Unani, Siddha, Homeopathy)
  | 'otc_drug'               // Over-the-counter, no prescription
  | 'schedule_h_drug'        // Prescription required
  | 'schedule_h1_drug'       // Stricter prescription + separate register
  | 'medical_device_a'       // Class A non-sterile, non-measuring
  | 'medical_device_a_sterile' // Class A sterile or measuring
  | 'medical_device_b'       // Class B
  | 'medical_device_c'       // Class C
  | 'medical_device_d'       // Class D
  | 'cosmetic'

interface VariantAxis {
  axisKey: string            // e.g. "strength", "packSize", "size", "color", "rentalPeriod"
  axisLabel: LocalisedString
  valueType: 'string' | 'number' | 'unit_quantity'
  unit?: string              // e.g. "mg", "ml", "strips", "days"
}

interface ProductFaq {
  question: LocalisedString
  answer: LocalisedString
  isVisible: boolean
}

interface ProductImage {
  url: string                // CDN URL
  storageKey: string         // Object storage key
  altText: LocalisedString
  isPrimary: boolean
  sortOrder: number
  width: number
  height: number
}

interface ProductVideo {
  url: string
  storageKey: string
  thumbnailUrl: string
  title: LocalisedString
}
```

**Indexes:**
- `{ slug: 1 }` unique
- `{ sku: 1 }` unique
- `{ categoryId: 1, status: 1 }`
- `{ categoryPath: 1 }`
- `{ brandId: 1 }`
- `{ status: 1, isPublic: 1 }`
- `{ requiresPrescription: 1 }`
- `{ drugSchedule: 1 }` sparse
- `{ deviceClass: 1 }` sparse

**Atlas Search index fields:** `name.en`, `name.hi`, `shortDescription.en`, `genericName.en`, `searchTags`, `slug`, `brandId`, `categoryId`, `regulatoryClass`, `requiresPrescription`, `priceSummary.minPrice.value`, `searchBoostScore`

### 4.4 Collection: `product_variants`

Individual purchasable SKUs. Every item added to a cart is a product variant, not a canonical product.

```typescript
interface ProductVariantDocument {
  _id: ObjectId
  canonicalProductId: ObjectId        // Parent canonical product
  variantSku: string                  // Marketplace variant SKU, e.g. "MKT-OXY-001-5L-W"
  slug: string                        // URL slug for variant-specific PDP if needed
  status: ProductStatus
  isDefault: boolean                  // The default variant shown on PDP

  // Variant dimension values — matches variantAxes defined on the parent product
  // For a drug: { strength: "500mg", formulation: "tablet", packSize: "10 strips" }
  // For a device: { size: "L", color: "grey" }
  // For a rental: { rentalPeriod: "monthly", plan: "standard" }
  // For a wholesale item: { packSize: "box of 100" }
  variantAttributes: {
    [axisKey: string]: {
      value: string | number
      unit?: string
      displayLabel: LocalisedString
    }
  }

  // Drug-specific fields (populated when parent is a drug product)
  drugComposition?: DrugComposition[]    // Active ingredients
  formulation?: DrugFormulation
  routeOfAdministration?: string         // oral, topical, intravenous, etc.
  dosageStrength?: string                // e.g. "500 mg"
  quantityPerUnit?: number               // e.g. 10 tablets per strip
  unitsPerPack?: number                  // e.g. 3 strips per pack
  storageConditions?: LocalisedString    // e.g. "Store below 25°C"

  // Medical device-specific fields
  deviceRegistrationNumber?: string      // CDSCO registration
  sterilisationType?: string             // gamma/EO gas/steam/non-sterile
  isSingleUse: boolean
  intendedUse?: LocalisedString

  // Rental-specific fields
  rentalPeriodType?: 'daily' | 'weekly' | 'monthly' | 'custom'
  rentalPeriodDays?: number             // For custom periods
  depositAmount?: MoneyAmount
  damagePolicyNote?: LocalisedString

  // GST and pricing metadata
  hsnCode: string                       // 6-digit HSN code for this variant
  gstRate: number                       // Percentage: 0, 5, 12, 18, or 28
  mrp?: MoneyAmount                     // Maximum retail price (if applicable)
  minimumSellingPrice?: MoneyAmount     // Floor price if marketplace enforces one

  // Product attributes (non-variant dimensions — spec grid on PDP)
  specifications: ProductSpecification[]

  // Images for this specific variant (overrides canonical product images if present)
  images?: ProductImage[]

  // Seller offer summary (computed projection refreshed by worker)
  offerSummary?: {
    activeSellerCount: number
    minPrice: MoneyAmount
    maxPrice: MoneyAmount
    inStockSellerCount: number
    lastComputedAt: Date
  }

  // Atlas Search projection copy of key parent fields (denormalised for search)
  _search: {
    productName: string            // canonical product name in English
    categorySlug: string
    brandName?: string
    regulatoryClass: string
    requiresPrescription: boolean
  }

  ...baseFields
}

interface DrugComposition {
  saltName: LocalisedString       // Generic/INN name of the active ingredient
  strength: string                // e.g. "500 mg"
  unit: string                    // e.g. "mg", "mcg", "mg/ml"
}

type DrugFormulation =
  | 'tablet' | 'capsule' | 'syrup' | 'suspension' | 'solution'
  | 'injection' | 'cream' | 'ointment' | 'gel' | 'lotion' | 'patch'
  | 'drops' | 'inhaler' | 'powder' | 'granules' | 'suppository' | 'other'

interface ProductSpecification {
  key: LocalisedString
  value: LocalisedString
  unit?: string
  sortOrder: number
}
```

**Indexes:**
- `{ canonicalProductId: 1, status: 1 }`
- `{ variantSku: 1 }` unique
- `{ hsnCode: 1 }`
- `{ canonicalProductId: 1, isDefault: 1 }`
- `{ "offerSummary.minPrice.value": 1 }` — for price-range faceting

**Atlas Search index fields:** `_search.productName`, `_search.categorySlug`, `_search.brandName`, `_search.regulatoryClass`, `_search.requiresPrescription`, `variantSku`, `hsnCode`, `drugComposition.saltName.en`, `specifications.value.en`

### 4.5 Collection: `seller_listings`

A seller listing is the seller's specific offer on a canonical product variant. This is the layer where seller-specific price, stock, images, and offer terms live.

```typescript
interface SellerListingDocument {
  _id: ObjectId
  sellerId: ObjectId
  branchId: ObjectId                    // Which seller branch is fulfilling
  canonicalProductId: ObjectId
  variantId: ObjectId                   // Ref: product_variants._id
  sellerSku: string                     // Seller's own internal SKU
  status: SellerListingStatus

  // Pricing — stored in paise
  mrp: MoneyAmount                      // Maximum retail price (regulatory requirement)
  sellingPrice: MoneyAmount             // Current selling price (must be ≤ MRP)
  costPrice?: MoneyAmount               // Seller's cost (optional, internal use)

  // Zone-based pricing — different prices for different geographic areas
  zonePricing?: ZonePrice[]

  // Wholesale tier pricing (applicable when productType is 'wholesale')
  bulkTiers?: BulkPricingTier[]

  // Rental pricing (applicable when productType is 'rental')
  rentalPricing?: RentalPricingStructure

  // Stock
  stockQuantity: number
  stockStatus: StockStatus
  stockThresholdAlert: number           // Alert admin/seller when stock falls below this
  isUnlimitedStock: boolean             // For services or always-available products

  // Batch and regulatory tracking (healthcare compliance requirement)
  batches?: ProductBatch[]             // Active batches in stock

  // Delivery
  handlingTime: number                  // Days to prepare for dispatch
  deliveryEstimateDays?: { min: number; max: number }
  isCODAvailable: boolean
  returnPolicyDays: number
  returnPolicy: LocalisedString

  // Seller-specific images (if seller wants different images than canonical)
  sellerImages?: ProductImage[]

  // Prescription handling
  prescriptionRequired: boolean         // Inherited from product, can be overridden upward only
  prescriptionHandlingNote?: LocalisedString

  // Offer metadata
  activeOfferTag?: LocalisedString      // e.g. "10% off" — display label
  offerExpiresAt?: Date

  // Computed projection for Atlas Search and public catalog
  _listingProjection: {
    sellerName: string
    sellerTrustScore: number
    pincodes: string[]
    cities: string[]
    inStock: boolean
    price: number                       // In paise for range filtering
    currency: string
  }

  ...baseFields
}

type SellerListingStatus =
  | 'draft'
  | 'pending_approval'
  | 'active'
  | 'out_of_stock'
  | 'paused'
  | 'rejected'
  | 'delisted'

type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'pre_order'

interface ZonePrice {
  pincodes?: string[]          // Specific pincodes or null for a region
  states?: string[]
  price: MoneyAmount
  validFrom: Date
  validUntil?: Date
}

interface BulkPricingTier {
  minQuantity: number
  maxQuantity?: number
  price: MoneyAmount            // Per unit price at this tier
  tierLabel?: LocalisedString   // e.g. "Carton of 50"
}

interface RentalPricingStructure {
  dailyRate?: MoneyAmount
  weeklyRate?: MoneyAmount
  monthlyRate?: MoneyAmount
  customRates?: { periodDays: number; price: MoneyAmount }[]
  depositAmount: MoneyAmount
  depositRefundPolicy: LocalisedString
  minimumPeriod: number              // Minimum rental days
  deliveryCharge?: MoneyAmount
  pickupCharge?: MoneyAmount
}

interface ProductBatch {
  batchNumber: string
  manufacturingDate?: Date
  expiryDate: Date
  quantity: number
  storageConditions?: string
  cdscoBatchApprovalNumber?: string  // For drugs requiring CDSCO batch testing
}
```

**Indexes:**
- `{ sellerId: 1, status: 1 }`
- `{ variantId: 1, status: 1 }`
- `{ canonicalProductId: 1, status: 1 }`
- `{ sellerId: 1, variantId: 1 }` unique — one listing per seller per variant
- `{ "_listingProjection.pincodes": 1 }`
- `{ "_listingProjection.price": 1 }`
- `{ "batches.expiryDate": 1 }` — for expiry monitoring jobs
- `{ stockStatus: 1, stockQuantity: 1 }`

### 4.6 Collection: `seller_sku_mappings`

Maps a seller's internal SKU to a marketplace canonical variant. Used during onboarding and ongoing catalog sync.

```typescript
interface SellerSkuMappingDocument {
  _id: ObjectId
  sellerId: ObjectId
  sellerSku: string                   // Seller's own product identifier
  sellerProductName: string           // Seller's own product name (before mapping)
  canonicalProductId?: ObjectId       // Null if not yet mapped
  variantId?: ObjectId                // Null if not yet mapped
  mappingStatus: MappingStatus
  mappingConfidenceScore?: number     // 0–1, set by auto-matching algorithm
  mappingSuggestedByAlgorithm: boolean
  mappingConfirmedByAdminId?: ObjectId
  mappingConfirmedAt?: Date
  rejectionReason?: string
  sellerRawData?: Record<string, unknown>  // Original data from seller feed/ERP
  ...baseFields
}

type MappingStatus =
  | 'unmapped'
  | 'auto_suggested'
  | 'pending_admin_review'
  | 'mapped'
  | 'rejected'
  | 'new_product_request'     // Seller says this is a product not in the catalog yet
```

**Indexes:**
- `{ sellerId: 1, sellerSku: 1 }` unique
- `{ mappingStatus: 1 }`
- `{ canonicalProductId: 1 }` sparse
- `{ variantId: 1 }` sparse

---

## 5. Customer and Account Collections

### 5.1 Collection: `customer_profiles`

Extended profile for customer-role users. Linked 1:1 to `auth_users`.

```typescript
interface CustomerProfileDocument {
  _id: ObjectId
  userId: ObjectId              // Ref: auth_users._id, unique
  displayName: string
  avatarUrl?: string
  dateOfBirth?: Date
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say'
  bloodGroup?: string
  medicalConditions?: string[]  // Optional self-reported, stored with consent flag
  medicalConditionsConsentId?: ObjectId  // Ref: consent_records._id
  preferredLanguage: string     // ISO 639-1
  preferredCurrency: string     // ISO 4217
  loyaltyAccountId?: ObjectId   // Ref: loyalty_accounts._id
  defaultAddressId?: ObjectId   // Ref: addresses._id
  ...baseFields
}
```

**Indexes:**
- `{ userId: 1 }` unique

### 5.2 Collection: `doctor_profiles`

Additional data for doctor-classified users. Linked 1:1 to `auth_users` where `role === 'doctor'`.

```typescript
interface DoctorProfileDocument {
  _id: ObjectId
  userId: ObjectId
  registrationNumber: string           // Medical Council registration number
  registrationCouncil: string          // e.g. "Medical Council of India" or state body
  registrationVerified: boolean
  verifiedAt?: Date
  verifiedByAdminId?: ObjectId
  qualification: string                // e.g. "MBBS", "MD"
  specialisation?: string
  clinicName?: string
  clinicAddress?: Address
  referralEligible: boolean            // Phase 2+ — set by admin after compliance review
  referralProgramActive: boolean       // Phase 2+ — actual activation gate
  ...baseFields
}
```

**Indexes:**
- `{ userId: 1 }` unique
- `{ registrationNumber: 1 }` unique sparse

### 5.3 Collection: `addresses`

Customer and seller delivery or registered addresses.

```typescript
interface AddressDocument {
  _id: ObjectId
  userId: ObjectId              // Owner of this address
  type: 'home' | 'work' | 'other'
  label?: string                // User-given label, e.g. "Mom's house"
  fullName: string              // Recipient name
  phone: string
  address: Address
  isDefault: boolean
  isVerified: boolean           // Address verified via pincode lookup
  gstin?: string                // If this is a GST billing address
  ...baseFields
}
```

**Indexes:**
- `{ userId: 1, isDeleted: 1 }`
- `{ userId: 1, isDefault: 1 }`
- `{ "address.pincode": 1 }`

### 5.4 Collection: `wishlists`

One wishlist per user. Items are product variants.

```typescript
interface WishlistDocument {
  _id: ObjectId
  userId: ObjectId              // Unique per user
  items: WishlistItem[]
  updatedAt: Date
}

interface WishlistItem {
  variantId: ObjectId
  canonicalProductId: ObjectId
  addedAt: Date
  note?: string
}
```

**Indexes:**
- `{ userId: 1 }` unique
- `{ "items.variantId": 1 }`

### 5.5 Collection: `carts`

One cart document per user. Persists across sessions.

```typescript
interface CartDocument {
  _id: ObjectId
  userId?: ObjectId             // Null for guest carts
  guestToken?: string           // For unauthenticated browsing
  items: CartItem[]
  appliedCouponCode?: string
  appliedLoyaltyPoints?: number
  pricingSnapshot?: CartPricingSnapshot  // Last computed pricing
  pricingSnapshotComputedAt?: Date
  expiresAt?: Date              // For guest carts
  updatedAt: Date
}

interface CartItem {
  variantId: ObjectId
  canonicalProductId: ObjectId
  sellerListingId: ObjectId     // Specific seller chosen
  sellerId: ObjectId
  quantity: number
  addedAt: Date
  priceAtAdd: MoneyAmount       // Price when item was added (for stale price detection)
  rentalDetails?: {
    rentalPeriodDays: number
    rentalStartDate?: Date
  }
  prescriptionId?: ObjectId    // Ref: prescriptions._id if prescription was uploaded
}

interface CartPricingSnapshot {
  subtotal: MoneyAmount
  gstBreakup: GstBreakup[]
  deliveryCharges: MoneyAmount
  discount: MoneyAmount
  loyaltyDiscount: MoneyAmount
  total: MoneyAmount
  currency: string
}

interface GstBreakup {
  hsnCode: string
  taxableAmount: MoneyAmount
  gstRate: number
  cgst?: MoneyAmount
  sgst?: MoneyAmount
  igst?: MoneyAmount
  isInterState: boolean
}
```

**Indexes:**
- `{ userId: 1 }` unique sparse
- `{ guestToken: 1 }` unique sparse
- `{ expiresAt: 1 }` TTL index sparse

---

## 6. Order Collections

### 6.1 Collection: `orders`

The parent order document created at checkout. A single customer order may be fulfilled by multiple sellers.

```typescript
interface OrderDocument {
  _id: ObjectId
  orderNumber: string                   // Human-readable, e.g. "ORD-2026-00142"
  customerId: ObjectId                  // Ref: auth_users._id
  status: OrderStatus
  type: 'retail' | 'wholesale' | 'rental'

  // Pricing
  pricing: {
    subtotal: MoneyAmount
    gstBreakup: GstBreakup[]
    deliveryCharges: MoneyAmount
    discount: MoneyAmount
    loyaltyDiscount: MoneyAmount
    total: MoneyAmount
    currency: string
    priceSnapshotAt: Date              // Time at which pricing was finalised
  }

  // Loyalty
  loyaltyPointsEarned: number
  loyaltyPointsRedeemed: number

  // Addresses
  deliveryAddress: Address             // Snapshot of address at order time
  billingAddress?: Address

  // Split fulfillment groups — one per seller
  fulfillmentGroups: OrderFulfillmentGroup[]

  // Documents
  marketplaceReceiptUrl?: string        // Marketplace-generated order receipt
  marketplaceReceiptStorageKey?: string

  // Referral tracking
  referralCode?: string
  referralId?: ObjectId

  // Order source
  source: 'web' | 'pwa' | 'admin_manual'

  // Timeline
  placedAt: Date
  confirmedAt?: Date
  completedAt?: Date
  cancelledAt?: Date
  cancellationReason?: string

  ...baseFields
}

type OrderStatus =
  | 'pending'              // Created, awaiting payment confirmation from seller
  | 'confirmed'            // All seller groups confirmed
  | 'partially_confirmed'  // Some groups confirmed, others pending
  | 'processing'           // Being prepared for dispatch
  | 'partially_shipped'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'partially_delivered'
  | 'return_requested'
  | 'return_in_transit'
  | 'returned'
  | 'completed'            // Delivered and return window passed
  | 'cancelled'
  | 'refund_initiated'
  | 'refunded'

interface OrderFulfillmentGroup {
  groupId: string                      // UUID within the order
  sellerId: ObjectId
  branchId: ObjectId
  status: FulfillmentGroupStatus
  items: OrderLineItem[]
  shipping: ShippingDetails
  sellerInvoiceUrl?: string
  sellerInvoiceStorageKey?: string
  sellerInvoiceNumber?: string
  sellerGstin?: string
  dispatchedAt?: Date
  deliveredAt?: Date
  cancelledAt?: Date
  cancellationReason?: string
}

type FulfillmentGroupStatus =
  | 'pending' | 'confirmed' | 'processing' | 'shipped'
  | 'out_for_delivery' | 'delivered' | 'cancelled' | 'return_requested'
  | 'return_in_transit' | 'returned'

interface OrderLineItem {
  lineItemId: string
  variantId: ObjectId
  canonicalProductId: ObjectId
  sellerListingId: ObjectId
  sellerSku: string
  productNameSnapshot: string          // Name at time of order (immutable)
  variantAttributesSnapshot: Record<string, unknown>
  hsnCode: string
  quantity: number
  unitPrice: MoneyAmount               // Price per unit at order time
  mrpSnapshot: MoneyAmount
  gstRate: number
  gstAmount: MoneyAmount
  lineTotal: MoneyAmount               // quantity × unitPrice + gst
  batchNumber?: string                 // Batch number of the dispatched item
  expiryDate?: Date                    // Expiry of the batch dispatched
  prescriptionId?: ObjectId
  isReturnEligible: boolean
  returnWindowDays: number
  returnWindowExpiresAt: Date
  rentalDetails?: {
    rentalPeriodDays: number
    rentalStartDate: Date
    rentalEndDate: Date
    depositPaid: MoneyAmount
    depositRefundStatus?: 'pending' | 'refunded' | 'forfeited'
  }
}

interface ShippingDetails {
  carrierName?: string
  trackingNumber?: string
  trackingUrl?: string
  shippingCharge: MoneyAmount
  estimatedDeliveryDate?: Date
  actualDeliveryDate?: Date
}
```

**Indexes:**
- `{ orderNumber: 1 }` unique
- `{ customerId: 1, placedAt: -1 }`
- `{ "fulfillmentGroups.sellerId": 1, placedAt: -1 }`
- `{ status: 1 }`
- `{ placedAt: -1 }`
- `{ "fulfillmentGroups.items.variantId": 1 }`

### 6.2 Collection: `order_status_history`

Append-only log of every status change for an order or fulfillment group.

```typescript
interface OrderStatusHistoryDocument {
  _id: ObjectId
  orderId: ObjectId
  fulfillmentGroupId?: string          // Null for order-level changes
  lineItemId?: string
  fromStatus: string
  toStatus: string
  changedAt: Date
  changedByUserId?: ObjectId
  changedByRole?: UserRole
  changedBySystem: boolean             // True for automated status changes
  note?: string
  metadata?: Record<string, unknown>   // Extra context (carrier info, reason codes)
}
```

**Indexes:**
- `{ orderId: 1, changedAt: -1 }`
- `{ changedAt: -1 }`

### 6.3 Collection: `returns`

Return requests against order line items.

```typescript
interface ReturnDocument {
  _id: ObjectId
  returnNumber: string
  orderId: ObjectId
  customerId: ObjectId
  sellerId: ObjectId
  fulfillmentGroupId: string
  lineItems: ReturnLineItem[]
  reason: ReturnReason
  reasonNote?: string
  status: ReturnStatus
  requestedAt: Date
  approvedAt?: Date
  approvedByAdminId?: ObjectId
  pickupScheduledAt?: Date
  returnReceivedAt?: Date
  refundId?: ObjectId
  returnShippingLabel?: string
  customerImages?: string[]            // Evidence images uploaded by customer
  ...baseFields
}

type ReturnReason =
  | 'defective_product' | 'wrong_product' | 'product_not_as_described'
  | 'damaged_in_transit' | 'quality_issue' | 'expired_product'
  | 'changed_mind' | 'other'

type ReturnStatus =
  | 'requested' | 'seller_approved' | 'seller_rejected' | 'admin_overridden_approved'
  | 'pickup_scheduled' | 'return_in_transit' | 'received_by_seller'
  | 'refund_initiated' | 'completed' | 'cancelled'

interface ReturnLineItem {
  lineItemId: string
  variantId: ObjectId
  quantity: number
  returnReason: ReturnReason
  condition?: 'unopened' | 'opened_not_used' | 'partially_used' | 'defective'
}
```

**Indexes:**
- `{ orderId: 1 }`
- `{ customerId: 1 }`
- `{ sellerId: 1 }`
- `{ status: 1 }`

### 6.4 Collection: `refunds`

Financial refund records.

```typescript
interface RefundDocument {
  _id: ObjectId
  refundNumber: string
  orderId: ObjectId
  returnId?: ObjectId
  customerId: ObjectId
  sellerId: ObjectId
  amount: MoneyAmount
  gstRefundBreakup?: GstBreakup[]
  reason: string
  status: RefundStatus
  method: 'original_payment_method' | 'loyalty_points' | 'store_credit'
  initiatedAt: Date
  processedAt?: Date
  failureReason?: string
  referenceNumber?: string             // Payment gateway reference
  initiatedByAdminId?: ObjectId
  ...baseFields
}

type RefundStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
```

**Indexes:**
- `{ orderId: 1 }`
- `{ customerId: 1 }`
- `{ status: 1 }`

---

## 7. Documents and Prescriptions

### 7.1 Collection: `order_documents`

Metadata for all documents attached to an order: marketplace receipts, seller GST invoices, warranty certificates, product certificates.

```typescript
interface OrderDocumentDocument {
  _id: ObjectId
  orderId: ObjectId
  fulfillmentGroupId?: string
  customerId: ObjectId
  sellerId?: ObjectId
  documentType: OrderDocumentType
  documentNumber?: string             // Invoice number, receipt number
  issuerName: string                  // Marketplace name or seller name
  issuerGstin?: string
  documentDate: Date
  storageKey: string                  // Object storage key
  fileUrl: string                     // Signed URL (regenerated on access)
  fileName: string
  mimeType: string
  fileSizeBytes: number
  accessLevel: 'customer' | 'seller' | 'admin' | 'all'
  isDownloadable: boolean
  ...baseFields
}

type OrderDocumentType =
  | 'marketplace_receipt'
  | 'seller_gst_invoice'
  | 'warranty_certificate'
  | 'product_certificate'
  | 'delivery_challan'
  | 'return_receipt'
  | 'refund_confirmation'
```

**Indexes:**
- `{ orderId: 1 }`
- `{ customerId: 1 }`
- `{ sellerId: 1 }` sparse

### 7.2 Collection: `prescriptions`

Prescription uploads by customers for Schedule H/H1 drug purchases.

```typescript
interface PrescriptionDocument {
  _id: ObjectId
  customerId: ObjectId
  uploadedAt: Date
  storageKey: string
  fileUrl: string
  mimeType: string
  status: 'uploaded' | 'verified' | 'rejected' | 'expired'
  verifiedByAdminId?: ObjectId
  verifiedAt?: Date
  rejectionReason?: string
  expiresAt?: Date                    // 6 months from upload date
  prescribedBy?: string               // Doctor name
  prescribedOn?: Date
  linkedOrderIds: ObjectId[]          // Orders that used this prescription
  linkedCartItemIds: string[]
  ...baseFields
}
```

**Indexes:**
- `{ customerId: 1, status: 1 }`
- `{ expiresAt: 1 }`

---

## 8. Loyalty and Referrals

### 8.1 Collection: `loyalty_accounts`

One loyalty account per customer.

```typescript
interface LoyaltyAccountDocument {
  _id: ObjectId
  userId: ObjectId
  currentBalance: number              // Points balance
  lifetimeEarned: number
  lifetimeRedeemed: number
  lifetimeExpired: number
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  tierUpdatedAt: Date
  nextTierThreshold?: number
  updatedAt: Date
}
```

**Indexes:**
- `{ userId: 1 }` unique

### 8.2 Collection: `loyalty_ledger`

Double-entry style ledger — append-only. Every point movement has an entry. Balance is always recomputable from the ledger.

```typescript
interface LoyaltyLedgerDocument {
  _id: ObjectId
  userId: ObjectId
  loyaltyAccountId: ObjectId
  transactionType: LoyaltyTransactionType
  points: number                      // Positive for credit, negative for debit
  balanceAfter: number                // Running balance after this entry
  referenceId?: ObjectId              // orderId, returnId, etc.
  referenceType?: string              // 'order' | 'return' | 'referral' | 'admin_adjustment'
  note?: LocalisedString
  expiresAt?: Date                    // When these points expire
  isExpired: boolean
  createdAt: Date
  createdBySystem: boolean
  createdByAdminId?: ObjectId
}

type LoyaltyTransactionType =
  | 'order_earn'           // Points earned on purchase
  | 'order_redeem'         // Points used to pay for order
  | 'return_deduction'     // Points deducted when order is returned
  | 'referral_earn'        // Points earned for successful referral
  | 'referral_referred_earn'  // Points earned by the referred user
  | 'expiry_deduction'     // Points expired
  | 'admin_credit'
  | 'admin_debit'
  | 'tier_bonus'
```

**Indexes:**
- `{ userId: 1, createdAt: -1 }`
- `{ loyaltyAccountId: 1 }`
- `{ referenceId: 1 }` sparse
- `{ expiresAt: 1, isExpired: 1 }` — for expiry jobs

### 8.3 Collection: `referrals`

Referral program tracking.

```typescript
interface ReferralDocument {
  _id: ObjectId
  referrerId: ObjectId                // User who shared the link
  referrerRole: 'customer' | 'doctor'
  referralCode: string                // Unique code in the share link
  referredUserId?: ObjectId           // Set when a user registers with this code
  referredAt?: Date
  orderId?: ObjectId                  // Qualifying order that triggered reward
  status: ReferralStatus
  rewardForReferrer?: number          // Points awarded to referrer
  rewardForReferred?: number          // Points awarded to referred user
  rewardedAt?: Date
  expiresAt?: Date
  ...baseFields
}

type ReferralStatus =
  | 'created'         // Link shared, no one clicked yet
  | 'clicked'         // Link clicked, no registration yet
  | 'registered'      // Referred user registered
  | 'converted'       // Qualifying purchase made
  | 'rewarded'        // Rewards disbursed
  | 'expired'
  | 'fraud_flagged'
```

**Indexes:**
- `{ referralCode: 1 }` unique
- `{ referrerId: 1 }`
- `{ referredUserId: 1 }` sparse
- `{ status: 1 }`

---

## 9. Subscription and Billing Collections

### 9.1 Collection: `subscription_plans`

Available seller subscription plans. Managed by admin.

```typescript
interface SubscriptionPlanDocument {
  _id: ObjectId
  planCode: string
  name: LocalisedString
  description: LocalisedString
  tier: SubscriptionTier
  billingPeriod: 'monthly' | 'quarterly' | 'annual'
  price: MoneyAmount
  features: SubscriptionFeature[]
  maxProductListings: number | null    // null = unlimited
  maxBranches: number
  featuredListingCredits: number       // Number of free featured listings per period
  isActive: boolean
  isPubliclyVisible: boolean
  ...baseFields
}

interface SubscriptionFeature {
  featureKey: string
  featureLabel: LocalisedString
  isIncluded: boolean
  limitValue?: number
}
```

**Indexes:**
- `{ planCode: 1 }` unique
- `{ tier: 1, isActive: 1 }`

### 9.2 Collection: `seller_subscriptions`

Active and historical subscriptions for each seller.

```typescript
interface SellerSubscriptionDocument {
  _id: ObjectId
  sellerId: ObjectId
  planId: ObjectId
  status: SubscriptionStatus
  currentPeriodStart: Date
  currentPeriodEnd: Date
  billingPeriod: 'monthly' | 'quarterly' | 'annual'
  price: MoneyAmount
  autoRenew: boolean
  cancelledAt?: Date
  cancellationReason?: string
  paymentMandateId?: string           // RBI e-mandate reference for recurring
  preBillingNotificationSentAt?: Date // MUST be sent ≥24 hours before debit
  nextBillingDate?: Date
  ...baseFields
}

type SubscriptionStatus =
  | 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'expired'
```

**Indexes:**
- `{ sellerId: 1, status: 1 }`
- `{ nextBillingDate: 1, status: 1 }` — for pre-debit notification job
- `{ currentPeriodEnd: 1, status: 1 }` — for renewal job

### 9.3 Collection: `subscription_invoices`

GST-compliant invoices for seller subscription payments.

```typescript
interface SubscriptionInvoiceDocument {
  _id: ObjectId
  invoiceNumber: string               // GST-compliant invoice number series
  sellerId: ObjectId
  subscriptionId: ObjectId
  planId: ObjectId
  billingPeriodStart: Date
  billingPeriodEnd: Date
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'void'

  // GST fields (marketplace charges GST on subscription)
  marketplaceGstin: string
  sellerGstin: string
  sellerStateCode: string
  placeOfSupply: string              // State code for GST

  subtotalAmount: MoneyAmount
  gstRate: number                    // 18% (SAC code 9995 or 998319)
  isInterState: boolean
  cgstAmount?: MoneyAmount
  sgstAmount?: MoneyAmount
  igstAmount?: MoneyAmount
  totalAmount: MoneyAmount
  sacCode: string                    // SAC code for subscription services

  issuedAt: Date
  dueDate: Date
  paidAt?: Date
  paymentReference?: string
  storageKey?: string                // PDF stored in object storage
  fileUrl?: string

  ...baseFields
}
```

**Indexes:**
- `{ invoiceNumber: 1 }` unique
- `{ sellerId: 1, issuedAt: -1 }`
- `{ status: 1 }`

---

## 10. Sponsored Placements

### 10.1 Collection: `sponsored_placements`

Operator-managed sponsored slots for sellers and products.

```typescript
interface SponsoredPlacementDocument {
  _id: ObjectId
  placementType: PlacementType
  sellerId: ObjectId
  variantId?: ObjectId
  canonicalProductId?: ObjectId
  categoryId?: ObjectId               // If placement is category-level
  status: 'draft' | 'pending_approval' | 'active' | 'paused' | 'expired' | 'cancelled'
  approvedByAdminId?: ObjectId
  approvedAt?: Date

  // Billing
  billingModel: 'flat_fee' | 'cpm' | 'cpc'
  budgetTotal?: MoneyAmount
  budgetSpent: MoneyAmount
  pricePerUnit?: MoneyAmount          // Per impression or per click
  invoiceIds: ObjectId[]

  // Scheduling
  startDate: Date
  endDate?: Date

  // Performance
  impressions: number
  clicks: number
  lastServedAt?: Date

  // Display
  rank: number                        // Lower = higher priority
  disclosureLabel: LocalisedString    // REQUIRED by E-Commerce Rules: "Sponsored" label

  ...baseFields
}

type PlacementType =
  | 'search_result_boost'
  | 'category_page_banner'
  | 'homepage_featured'
  | 'product_page_related'
  | 'seller_highlight'
```

**Indexes:**
- `{ status: 1, startDate: 1, endDate: 1 }`
- `{ sellerId: 1 }`
- `{ categoryId: 1, status: 1 }` sparse
- `{ rank: 1, status: 1 }`

---

## 11. Sync and ERP Integration Collections

### 11.1 Collection: `sync_events`

Every push or pull event between the marketplace and a seller's ERP system. This is the active sync log.

```typescript
interface SyncEventDocument {
  _id: ObjectId
  sellerId: ObjectId
  branchId?: ObjectId
  direction: 'marketplace_to_seller' | 'seller_to_marketplace'
  eventType: SyncEventType
  status: SyncEventStatus
  payload: Record<string, unknown>     // The data being synced (sanitised, no PII)
  payloadHash: string                  // SHA-256 hash of payload for deduplication
  referenceId?: ObjectId               // orderId, inventoryId, etc.
  referenceType?: string
  attemptCount: number
  maxAttempts: number
  nextRetryAt?: Date
  lastAttemptAt?: Date
  completedAt?: Date
  failureReason?: string
  errorCode?: string
  webhookDeliveryId?: ObjectId
  createdAt: Date
}

type SyncEventType =
  | 'order_created'
  | 'order_status_updated'
  | 'order_cancelled'
  | 'return_requested'
  | 'refund_processed'
  | 'inventory_update'
  | 'price_update'
  | 'invoice_received'
  | 'fulfillment_status_update'
  | 'catalog_update'

type SyncEventStatus =
  | 'queued' | 'processing' | 'completed' | 'failed' | 'dead_letter'
```

**Indexes:**
- `{ sellerId: 1, createdAt: -1 }`
- `{ status: 1, nextRetryAt: 1 }` — for retry job
- `{ status: 1, createdAt: -1 }` — for admin monitoring
- `{ referenceId: 1 }` sparse
- `{ payloadHash: 1 }` — for deduplication

### 11.2 Collection: `webhook_delivery_logs`

Log of every webhook sent to or received from a seller ERP.

```typescript
interface WebhookDeliveryLogDocument {
  _id: ObjectId
  sellerId: ObjectId
  syncEventId?: ObjectId
  direction: 'outbound' | 'inbound'
  webhookUrl?: string                  // For outbound
  httpMethod: string
  requestHeaders: Record<string, string>
  requestBodyHash: string              // SHA-256 of request body, not the body itself
  responseStatusCode?: number
  responseBodyHash?: string
  responseTimeMs?: number
  success: boolean
  failureReason?: string
  signature: string                    // HMAC-SHA256 signature
  deliveredAt: Date
  retryNumber: number
}
```

**Indexes:**
- `{ sellerId: 1, deliveredAt: -1 }`
- `{ syncEventId: 1 }` sparse
- `{ success: 1 }`

### 11.3 Collection: `reconciliation_logs`

Records of periodic reconciliation runs comparing marketplace state with seller ERP state.

```typescript
interface ReconciliationLogDocument {
  _id: ObjectId
  sellerId: ObjectId
  reconciliationType: 'inventory' | 'orders' | 'pricing' | 'returns'
  runAt: Date
  periodStart: Date
  periodEnd: Date
  totalRecordsChecked: number
  discrepanciesFound: number
  discrepanciesResolved: number
  discrepanciesPendingReview: number
  status: 'running' | 'completed' | 'failed' | 'partial'
  discrepancyDetails?: ReconciliationDiscrepancy[]
  resolvedByAdminId?: ObjectId
  resolvedAt?: Date
}

interface ReconciliationDiscrepancy {
  recordType: string
  recordId: ObjectId
  field: string
  marketplaceValue: unknown
  sellerValue: unknown
  resolutionAction?: 'use_marketplace' | 'use_seller' | 'manual_review' | 'ignored'
}
```

**Indexes:**
- `{ sellerId: 1, runAt: -1 }`
- `{ status: 1 }`

---

## 12. Notifications

### 12.1 Collection: `notifications`

In-app notification records per user.

```typescript
interface NotificationDocument {
  _id: ObjectId
  userId: ObjectId
  type: NotificationType
  title: LocalisedString
  body: LocalisedString
  metadata?: Record<string, unknown>   // Deep link data, related IDs
  isRead: boolean
  readAt?: Date
  actionUrl?: string
  imageUrl?: string
  expiresAt?: Date
  createdAt: Date
}

type NotificationType =
  | 'order_confirmed' | 'order_shipped' | 'order_delivered' | 'order_cancelled'
  | 'return_approved' | 'return_rejected' | 'refund_processed'
  | 'loyalty_points_earned' | 'loyalty_points_expiring'
  | 'referral_converted' | 'referral_rewarded'
  | 'prescription_expiring' | 'prescription_verified'
  | 'subscription_renewal_upcoming' | 'subscription_renewed' | 'subscription_expired'
  | 'admin_message' | 'system_announcement'
  | 'dsr_request_update' | 'consent_withdrawal_confirmed'
```

**Indexes:**
- `{ userId: 1, isRead: 1, createdAt: -1 }`
- `{ expiresAt: 1 }` TTL sparse

### 12.2 Collection: `notification_preferences`

Per-user notification channel preferences.

```typescript
interface NotificationPreferencesDocument {
  _id: ObjectId
  userId: ObjectId
  channels: {
    inApp: { enabled: boolean; types: NotificationType[] }
    email: { enabled: boolean; types: NotificationType[] }
    sms: { enabled: boolean; types: NotificationType[] }
    push: { enabled: boolean; types: NotificationType[] }
  }
  updatedAt: Date
}
```

**Indexes:**
- `{ userId: 1 }` unique

---

## 13. Reviews and Trust

### 13.1 Collection: `reviews`

Customer reviews on canonical products and sellers.

```typescript
interface ReviewDocument {
  _id: ObjectId
  reviewType: 'product' | 'seller'
  canonicalProductId?: ObjectId
  sellerId?: ObjectId
  customerId: ObjectId
  orderId: ObjectId                    // Review must be linked to a verified purchase
  lineItemId?: string
  rating: number                       // 1–5
  title?: LocalisedString
  body?: LocalisedString
  images?: string[]
  status: ReviewStatus
  isVerifiedPurchase: boolean          // Always true for marketplace reviews
  moderatedByAdminId?: ObjectId
  moderatedAt?: Date
  moderationNote?: string
  flaggedForMedicalClaims: boolean     // Set by moderation pipeline
  helpfulCount: number
  reportCount: number
  publishedAt?: Date
  ...baseFields
}

type ReviewStatus = 'pending_moderation' | 'published' | 'rejected' | 'removed_by_admin'
```

**Indexes:**
- `{ canonicalProductId: 1, status: 1 }` sparse
- `{ sellerId: 1, status: 1 }` sparse
- `{ customerId: 1 }`
- `{ orderId: 1 }`
- `{ status: 1 }`

### 13.2 Collection: `seller_trust_summaries`

Materialised projection of seller trust signals. Refreshed by worker jobs.

```typescript
interface SellerTrustSummaryDocument {
  _id: ObjectId
  sellerId: ObjectId                  // Unique
  overallScore: number                // 0–100, composite
  averageRating: number               // 1.0–5.0
  reviewCount: number
  totalOrders: number
  orderSuccessRate: number            // 0–1
  returnRate: number                  // 0–1
  cancellationRate: number            // 0–1
  onTimeDeliveryRate: number          // 0–1
  responseTime: number                // Average hours to respond to issues
  memberSince: Date
  badges: TrustBadge[]
  lastComputedAt: Date
  syncCompletionRate?: number         // Data quality signal: 0–1 (how complete sync data is)
}

type TrustBadge = 'verified_seller' | 'fast_dispatch' | 'high_rating' | 'trusted_pharmacy' | 'licensed_device_seller'
```

**Indexes:**
- `{ sellerId: 1 }` unique
- `{ overallScore: -1 }`

---

## 14. Disputes and Moderation

### 14.1 Collection: `disputes`

Dispute cases raised by customers or flagged by the operator.

```typescript
interface DisputeDocument {
  _id: ObjectId
  disputeNumber: string
  type: DisputeType
  status: DisputeStatus
  raisedByUserId: ObjectId
  raisedAgainstSellerId?: ObjectId
  orderId?: ObjectId
  returnId?: ObjectId
  description: string
  evidenceUrls?: string[]
  assignedToAdminId?: ObjectId
  resolution?: string
  resolutionType?: 'seller_favour' | 'customer_favour' | 'mutual_settlement' | 'dismissed'
  resolvedAt?: Date
  resolvedByAdminId?: ObjectId
  escalatedAt?: Date
  notes: DisputeNote[]
  ...baseFields
}

type DisputeType =
  | 'product_quality' | 'wrong_product' | 'non_delivery' | 'return_rejected'
  | 'refund_delayed' | 'seller_misconduct' | 'fraud_suspected' | 'policy_violation'

type DisputeStatus =
  | 'open' | 'under_review' | 'awaiting_seller_response' | 'awaiting_customer_response'
  | 'escalated' | 'resolved' | 'closed'

interface DisputeNote {
  noteId: string
  authorId: ObjectId
  authorRole: UserRole
  content: string
  createdAt: Date
}
```

**Indexes:**
- `{ status: 1, createdAt: -1 }`
- `{ raisedByUserId: 1 }`
- `{ raisedAgainstSellerId: 1 }` sparse
- `{ orderId: 1 }` sparse

### 14.2 Collection: `moderation_queue`

Items requiring operator review: new listings, edited listings, reviews, user reports.

```typescript
interface ModerationQueueDocument {
  _id: ObjectId
  itemType: 'product_listing' | 'review' | 'seller_profile' | 'user_report' | 'document'
  itemId: ObjectId
  reason: string
  flaggedBySystem: boolean
  flaggedByUserId?: ObjectId
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'escalated'
  assignedToAdminId?: ObjectId
  reviewedAt?: Date
  reviewedByAdminId?: ObjectId
  decision?: string
  decisionNote?: string
  ...baseFields
}
```

**Indexes:**
- `{ status: 1, priority: -1, createdAt: 1 }`
- `{ itemId: 1, itemType: 1 }`

---

## 15. Compliance Collections

All collections in this section live in `marketplace_db`. The audit log collections in section 17 live in the separate `audit_db`.

### 15.1 Collection: `consent_records`

One document per data principal per consent purpose. Updated on grant, withdrawal, or version change.

```typescript
interface ConsentRecordDocument {
  _id: ObjectId
  userId: ObjectId
  consentType: ConsentType
  purposeCode: string                  // e.g. "order_processing", "marketing", "analytics"
  purposeDescription: LocalisedString
  legalBasis: LegalBasis               // GDPR lawful basis
  dataCategories: string[]             // What personal data this consent covers
  status: 'granted' | 'withdrawn' | 'expired'
  grantedAt?: Date
  withdrawnAt?: Date
  expiresAt?: Date
  consentNoticeVersion: string         // Version of the notice shown when consent was given
  consentNoticeText: string            // Exact text of the notice shown (stored for evidence)
  captureMethod: 'registration_form' | 'preference_center' | 'api' | 'admin_import'
  captureIp?: string                   // Pseudonymised IP hash, not raw IP
  captureUserAgent?: string
  propagationStatus?: 'pending' | 'propagated' | 'failed'  // For withdrawal propagation
  propagatedAt?: Date
  ...baseFields
}

type ConsentType = 'data_processing' | 'marketing' | 'analytics' | 'cookie' | 'seller_data_sharing' | 'doctor_referral_program'

type LegalBasis = 'consent' | 'contract' | 'legal_obligation' | 'legitimate_interest' | 'vital_interest' | 'public_task'
```

**Indexes:**
- `{ userId: 1, purposeCode: 1 }` unique
- `{ userId: 1, status: 1 }`
- `{ consentType: 1, status: 1 }`
- `{ expiresAt: 1 }` — for consent expiry jobs
- `{ propagationStatus: 1 }` — for propagation jobs

### 15.2 Collection: `dsr_requests`

Data Subject Requests (GDPR) and Data Principal Requests (DPDP Act). All privacy rights requests.

```typescript
interface DsrRequestDocument {
  _id: ObjectId
  requestNumber: string               // e.g. "DSR-2026-00042"
  userId: ObjectId
  requestType: DsrRequestType
  status: DsrRequestStatus
  submittedAt: Date
  acknowledgedAt?: Date
  dueDate: Date                        // submittedAt + 30 days (GDPR) / 90 days (DPDP)
  resolvedAt?: Date
  resolvedByAdminId?: ObjectId
  notes: string
  userNote?: string                    // User's description of the request
  exportFileUrl?: string               // For portability requests: data export download
  exportFileStorageKey?: string
  exportFileExpiresAt?: Date           // 7 days from generation
  legalRetentionHold?: boolean         // If true, erasure cannot proceed until hold is lifted
  legalRetentionNote?: string
  nomineeUserId?: ObjectId             // If request is by nominee (DPDP nomination right)
  grievanceTrackingId?: string         // For DPDP grievance requests
  ...baseFields
}

type DsrRequestType =
  | 'access'               // Download all my data (GDPR Art 15 / DPDP Sec 11)
  | 'rectification'        // Correct inaccurate data (GDPR Art 16 / DPDP Sec 12)
  | 'erasure'              // Delete my data (GDPR Art 17 / DPDP Sec 12)
  | 'portability'          // Export my data in machine-readable format (GDPR Art 20)
  | 'restriction'          // Pause processing (GDPR Art 18)
  | 'objection'            // Object to processing (GDPR Art 21)
  | 'grievance'            // File a grievance (DPDP Sec 13)
  | 'nomination'           // Register a nominee (DPDP Sec 14)

type DsrRequestStatus =
  | 'submitted'
  | 'acknowledged'
  | 'in_progress'
  | 'pending_verification'   // Identity verification needed
  | 'completed'
  | 'rejected'
  | 'on_legal_hold'
  | 'referred_to_dpb'        // Referred to Data Protection Board of India
```

**Indexes:**
- `{ userId: 1, createdAt: -1 }`
- `{ status: 1, dueDate: 1 }` — for SLA monitoring
- `{ requestNumber: 1 }` unique

### 15.3 Collection: `breach_incidents`

Data breach incident log for regulatory notification compliance.

```typescript
interface BreachIncidentDocument {
  _id: ObjectId
  incidentNumber: string
  discoveredAt: Date
  reportedByUserId?: ObjectId
  severity: 'low' | 'medium' | 'high' | 'critical'
  breachType: string[]                 // e.g. ['unauthorised_access', 'data_exfiltration']
  affectedDataCategories: string[]     // e.g. ['contact_details', 'order_history', 'health_data']
  estimatedAffectedCount: number
  actualAffectedCount?: number
  dataProcessingActivitiesAffected: string[]
  containedAt?: Date
  containmentActions?: string
  rootCause?: string

  // Notification tracking
  certInNotifiedAt?: Date              // IT Act: CERT-In within 6 hours
  dpbNotifiedAt?: Date                 // DPDP: Data Protection Board without delay
  gdprDpaNotifiedAt?: Date             // GDPR: Lead DPA within 72 hours
  icoNotifiedAt?: Date                 // UK GDPR: ICO within 72 hours
  affectedUsersNotifiedAt?: Date
  notificationStatus: 'pending' | 'partial' | 'completed' | 'not_required'

  status: 'active' | 'contained' | 'closed' | 'under_investigation'
  closedAt?: Date
  closedByAdminId?: ObjectId
  postIncidentReviewNotes?: string
  ...baseFields
}
```

**Indexes:**
- `{ incidentNumber: 1 }` unique
- `{ severity: 1, status: 1 }`
- `{ discoveredAt: -1 }`

### 15.4 Collection: `ropa_records`

Records of Processing Activities for GDPR Article 30 compliance.

```typescript
interface RopaRecordDocument {
  _id: ObjectId
  processingActivityName: string
  description: string
  dataController: string               // Marketplace legal entity name
  dataCategories: string[]
  dataSubjectCategories: string[]      // e.g. 'customers', 'sellers', 'doctors'
  purposeOfProcessing: string[]
  legalBasis: LegalBasis
  recipients: string[]                 // Who receives this data (processors, third parties)
  internationalTransfers?: string[]    // Countries data may be transferred to
  retentionPeriod: string
  securityMeasures: string[]
  isActive: boolean
  lastReviewedAt: Date
  lastReviewedByAdminId?: ObjectId
  ...baseFields
}
```

**Indexes:**
- `{ isActive: 1 }`

### 15.5 Collection: `data_retention_schedules`

Defines retention windows per data category. Used by the retention purge job.

```typescript
interface DataRetentionScheduleDocument {
  _id: ObjectId
  collectionName: string               // MongoDB collection name
  dataCategory: string                 // Human-readable category
  retentionPeriodDays: number
  retentionBasis: string               // Legal or business reason
  purgeMethod: 'hard_delete' | 'anonymise' | 'pseudonymise'
  fieldsToAnonymise?: string[]         // If method is anonymise
  isActive: boolean
  lastPurgeRunAt?: Date
  nextPurgeScheduledAt?: Date
  regulatoryReference: string[]        // e.g. ['DPDP_2023', 'GDPR_Art5', 'GST_Act']
  ...baseFields
}
```

**Indexes:**
- `{ collectionName: 1 }` unique
- `{ nextPurgeScheduledAt: 1, isActive: 1 }`

---

## 16. Platform Settings and Configuration

### 16.1 Collection: `platform_settings`

Global marketplace configuration. One document per setting group.

```typescript
interface PlatformSettingsDocument {
  _id: ObjectId
  settingGroup: string                 // e.g. "marketplace", "compliance", "loyalty"
  settings: Record<string, unknown>
  updatedByAdminId: ObjectId
  updatedAt: Date
  version: number
}
```

**Indexes:**
- `{ settingGroup: 1 }` unique

---

## 17. Audit and Changelog Collections (audit_db)

These collections reside in a **separate `audit_db` database** with write-only application access and read-only auditor access. No `update`, `findOneAndUpdate`, `replaceOne`, or `deleteOne` operations are permitted on any collection in this database. All records are append-only.

### 17.1 Hash chaining algorithm

Every document in `audit_db` includes a `hash` field and a `previousHash` field. The hash is computed as:

```
SHA-256(canonical_json(document_without_hash_field) + previousHash)
```

The very first document in a collection has `previousHash: "GENESIS"`. This creates a tamper-evident chain: any modification to a historical record breaks the hash chain, which is detectable by the chain validation job that runs nightly.

### 17.2 Collection: `audit_logs`

The primary compliance audit trail. Records every security-sensitive action.

```typescript
interface AuditLogDocument {
  _id: ObjectId

  // Who performed the action
  actor: {
    userId: ObjectId | null      // Null for unauthenticated or system actions
    role: UserRole | 'system' | 'worker'
    ip: string                   // SHA-256 hash of IP for pseudonymisation
    userAgent: string
    sessionId?: string
    service: string              // e.g. "api", "worker", "admin"
  }

  // What action was performed
  eventType: AuditEventType
  eventCategory: AuditEventCategory
  action: 'create' | 'read' | 'update' | 'delete' | 'export' | 'login' | 'logout' | 'grant' | 'revoke'
  description: string

  // What resource was affected
  resource: {
    collection: string
    documentId: ObjectId | null
    documentType: string
    fieldsAccessed?: string[]   // For read events: which fields were accessed
  }

  // Context
  request: {
    method: string              // HTTP method
    path: string
    correlationId: string       // UUID for tracing across services
    service: string
  }

  // Data classification
  dataCategory: 'personal' | 'sensitive_personal' | 'health' | 'financial' | 'operational' | 'system'
  containsPersonalData: boolean
  legalBasis?: string          // GDPR/DPDP lawful basis for the processing

  // Outcome
  success: boolean
  failureReason?: string
  httpStatusCode?: number

  // Severity
  severity: 'info' | 'warning' | 'critical'

  // Timestamp
  timestamp: Date              // UTC, millisecond precision

  // Tamper evidence
  previousHash: string
  hash: string
}

type AuditEventType =
  // Authentication
  | 'auth.login.success' | 'auth.login.failure' | 'auth.logout'
  | 'auth.otp.generated' | 'auth.otp.verified' | 'auth.otp.failed'
  | 'auth.password.changed' | 'auth.password.reset'
  | 'auth.account.locked' | 'auth.account.unlocked'
  | 'auth.session.revoked' | 'auth.mfa.enrolled' | 'auth.mfa.disabled'
  // Personal data access
  | 'data.personal.read' | 'data.health.read' | 'data.financial.read'
  | 'data.personal.export' | 'data.personal.updated' | 'data.personal.deleted'
  // Consent
  | 'consent.granted' | 'consent.withdrawn' | 'consent.expired' | 'consent.updated'
  // DSR
  | 'dsr.submitted' | 'dsr.acknowledged' | 'dsr.completed' | 'dsr.rejected'
  | 'dsr.erasure.executed' | 'dsr.export.generated'
  // Admin actions
  | 'admin.user.role_changed' | 'admin.user.suspended' | 'admin.user.reactivated'
  | 'admin.seller.approved' | 'admin.seller.suspended' | 'admin.seller.terminated'
  | 'admin.listing.approved' | 'admin.listing.rejected' | 'admin.listing.removed'
  | 'admin.order.manual_intervention' | 'admin.dispute.resolved'
  | 'admin.config.changed' | 'admin.compliance.action'
  // Financial
  | 'finance.subscription.created' | 'finance.subscription.cancelled'
  | 'finance.invoice.issued' | 'finance.refund.processed'
  | 'finance.prebilling.notification_sent'
  // Breach
  | 'breach.incident.created' | 'breach.notification.sent'
  // Security
  | 'security.suspicious_session' | 'security.api_abuse_detected'
  | 'security.rate_limit_exceeded' | 'security.ip_blocked'

type AuditEventCategory =
  | 'authentication' | 'data_access' | 'consent' | 'dsr'
  | 'admin_action' | 'financial' | 'security' | 'compliance' | 'breach'
```

**Indexes (audit_db.audit_logs):**
- `{ timestamp: -1 }`
- `{ "actor.userId": 1, timestamp: -1 }`
- `{ eventCategory: 1, timestamp: -1 }`
- `{ "resource.collection": 1, "resource.documentId": 1, timestamp: -1 }`
- `{ hash: 1 }` unique — for chain validation
- `{ severity: 1, timestamp: -1 }`

**Retention:** Minimum 1 year (DPDP Rules 2025). 3 years recommended for financial and compliance events.

### 17.3 Collection: `changelog_logs`

Field-level change tracking. Every time a document in a significant collection is updated, a changelog entry records what changed, from what value, to what value.

```typescript
interface ChangelogLogDocument {
  _id: ObjectId
  timestamp: Date
  correlationId: string               // Links to audit_log entry
  actorUserId?: ObjectId
  actorRole?: UserRole | 'system'
  service: string

  // Which document changed
  targetCollection: string
  targetDocumentId: ObjectId

  // The set of field changes
  changes: FieldChange[]

  // Tamper evidence
  previousHash: string
  hash: string
}

interface FieldChange {
  fieldPath: string                   // Dot-notation path, e.g. "pricing.sellingPrice.value"
  previousValue: unknown              // Value before change (null for new fields)
  newValue: unknown                   // Value after change (null for deleted fields)
  changeType: 'set' | 'unset' | 'increment' | 'push' | 'pull'
  isPii: boolean                      // Flag fields that contain personal data
  isSensitive: boolean                // Flag particularly sensitive fields
}
```

**Significant collections that must generate changelog entries:** `sellers`, `seller_listings`, `canonical_products`, `product_variants`, `orders`, `returns`, `refunds`, `subscription_invoices`, `auth_users` (role and status changes only), `consent_records`, `seller_licenses`.

**Indexes (audit_db.changelog_logs):**
- `{ targetCollection: 1, targetDocumentId: 1, timestamp: -1 }`
- `{ actorUserId: 1, timestamp: -1 }` sparse
- `{ correlationId: 1 }`
- `{ hash: 1 }` unique

**Retention:** Same as the retention period of the parent collection, or minimum 3 years for financial records and order records.

### 17.4 Collection: `financial_audit_logs`

Dedicated financial event audit trail for GST, subscription billing, and refund events. This is a more detailed layer on top of the general audit log, oriented toward potential third-party financial audits, GST officer review, and RBI compliance.

```typescript
interface FinancialAuditLogDocument {
  _id: ObjectId
  timestamp: Date
  eventType: FinancialAuditEventType
  correlationId: string

  // Parties
  marketplaceGstin: string
  sellerGstin?: string
  customerId?: ObjectId
  sellerId?: ObjectId

  // Transaction
  referenceType: 'subscription_invoice' | 'order' | 'refund' | 'loyalty_redemption'
  referenceId: ObjectId
  referenceNumber: string             // Human-readable invoice/order number

  // Amounts
  amount: MoneyAmount
  gstBreakup?: GstBreakup[]
  isInterState?: boolean

  // GST filing reference
  gstr8Period?: string               // e.g. "2026-03" — if TCS applicable in future
  sacCode?: string
  hsnCode?: string

  actorUserId?: ObjectId
  actorRole?: string
  notes?: string

  previousHash: string
  hash: string
}

type FinancialAuditEventType =
  | 'subscription_invoice_issued'
  | 'subscription_payment_received'
  | 'subscription_cancelled'
  | 'order_placed'
  | 'order_amount_snapshot'           // Price locked at checkout
  | 'refund_initiated'
  | 'refund_completed'
  | 'loyalty_points_redeemed'
  | 'loyalty_points_earned'
  | 'prebilling_notification_sent'    // RBI e-mandate: 24-hour pre-debit notification
```

**Indexes (audit_db.financial_audit_logs):**
- `{ timestamp: -1 }`
- `{ referenceId: 1 }`
- `{ sellerId: 1, timestamp: -1 }` sparse
- `{ eventType: 1, timestamp: -1 }`
- `{ hash: 1 }` unique

**Retention:** Minimum 6 years (GST Act Section 36 requires 72 months). The `data_retention_schedules` entry for this collection should reflect this.

### 17.5 Collection: `access_logs`

Granular log of every access to personal or sensitive data fields. More detailed than the general audit log — records exactly which fields were accessed on which documents.

```typescript
interface AccessLogDocument {
  _id: ObjectId
  timestamp: Date
  actorUserId: ObjectId | null
  actorRole: string
  sessionId?: string
  service: string
  correlationId: string

  targetCollection: string
  targetDocumentId: ObjectId
  targetUserId?: ObjectId             // The data subject/principal whose data was accessed
  fieldsAccessed: string[]
  accessPurpose: string               // Why this access happened (API endpoint / business reason)
  containsHealthData: boolean
  containsFinancialData: boolean
  wasExported: boolean                // True if data was exported/sent outside the system
  exportDestination?: string          // Where data was sent if exported

  previousHash: string
  hash: string
}
```

**Indexes (audit_db.access_logs):**
- `{ targetUserId: 1, timestamp: -1 }` sparse
- `{ actorUserId: 1, timestamp: -1 }` sparse
- `{ timestamp: -1 }`
- `{ hash: 1 }` unique

---

## 18. Atlas Search Index Definitions

The following Atlas Search indexes must be created on the Atlas cluster. These are defined as configuration in `packages/search/src/atlas-search/`.

### 18.1 Index: `product_search` on `canonical_products`

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "name.en": [
        { "type": "string", "analyzer": "lucene.standard" },
        { "type": "autocomplete", "analyzer": "lucene.standard", "maxGrams": 7, "minGrams": 2 }
      ],
      "name.hi": { "type": "string", "analyzer": "lucene.standard" },
      "shortDescription.en": { "type": "string", "analyzer": "lucene.standard" },
      "genericName.en": { "type": "string", "analyzer": "lucene.standard" },
      "searchTags": { "type": "string", "analyzer": "lucene.standard" },
      "slug": { "type": "string" },
      "status": { "type": "token" },
      "isPublic": { "type": "boolean" },
      "regulatoryClass": { "type": "token" },
      "requiresPrescription": { "type": "boolean" },
      "categoryId": { "type": "objectId" },
      "brandId": { "type": "objectId" },
      "searchBoostScore": { "type": "number" }
    }
  },
  "synonyms": [
    {
      "name": "healthcare_synonyms",
      "analyzer": "lucene.standard",
      "source": { "collection": "search_synonyms" }
    }
  ]
}
```

### 18.2 Index: `variant_search` on `product_variants`

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "_search.productName": [
        { "type": "string", "analyzer": "lucene.standard" },
        { "type": "autocomplete", "minGrams": 2, "maxGrams": 7 }
      ],
      "_search.brandName": { "type": "string", "analyzer": "lucene.standard" },
      "_search.categorySlug": { "type": "string" },
      "_search.requiresPrescription": { "type": "boolean" },
      "drugComposition.saltName.en": { "type": "string", "analyzer": "lucene.standard" },
      "hsnCode": { "type": "string" },
      "variantSku": { "type": "string" },
      "status": { "type": "token" },
      "offerSummary.minPrice.value": { "type": "number" },
      "offerSummary.maxPrice.value": { "type": "number" },
      "offerSummary.activeSellerCount": { "type": "number" }
    }
  }
}
```

### 18.3 Index: `seller_listing_search` on `seller_listings`

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "_listingProjection.sellerName": { "type": "string" },
      "_listingProjection.pincodes": { "type": "string" },
      "_listingProjection.cities": { "type": "string" },
      "_listingProjection.inStock": { "type": "boolean" },
      "_listingProjection.price": { "type": "number" },
      "_listingProjection.sellerTrustScore": { "type": "number" },
      "status": { "type": "token" },
      "sellerId": { "type": "objectId" },
      "variantId": { "type": "objectId" },
      "canonicalProductId": { "type": "objectId" }
    }
  }
}
```

---

## 19. Seed Data Strategy

### 19.1 Seed file structure

All seed files live in `packages/database/src/seeds/`. Each file exports a typed array matching the collection's document interface. Seed files are loaded by `pnpm db:seed` which calls `packages/database/src/seeds/runner.ts`.

The runner inserts all seed documents using `insertMany` with `ordered: false` and `upsert` on the `_id` field so that re-running seeds is idempotent.

```
packages/database/src/seeds/
├── categories.seed.ts
├── brands.seed.ts
├── canonical-products.seed.ts
├── product-variants.seed.ts
├── sellers.seed.ts
├── seller-licenses.seed.ts
├── seller-listings.seed.ts
├── users.seed.ts
├── auth-sessions.seed.ts
├── orders.seed.ts
├── loyalty-accounts.seed.ts
├── loyalty-ledger.seed.ts
├── subscription-plans.seed.ts
├── platform-settings.seed.ts
├── search-synonyms.seed.ts
└── runner.ts
```

### 19.2 Seed data requirements

Seed data must mirror the exact collection shape defined in this document. No shortened fields, no fake field names, no inconsistent IDs. Each seed file must contain at minimum:

- At least 3 categories with valid parentId hierarchy (root → sub → sub-sub).
- At least 2 brands.
- At least 5 canonical products with realistic healthcare data: one oxygen concentrator (medical device class B), one blood pressure monitor (class B), one OTC drug (non-regulated), one Schedule H drug with composition, one rental product (hospital bed).
- At least 10 product variants covering multi-pack, multi-strength, and rental period variants.
- At least 2 sellers with licenses.
- At least 8 seller listings across the variants.
- At least 5 users covering all roles: customer, doctor, seller_staff, seller_admin, provider_admin.
- At least 3 orders including one split order with two fulfillment groups.
- At least 2 subscription plans and 1 active seller subscription.
- At least 10 loyalty ledger entries.

All seeded ObjectIds must be stable (hardcoded UUID-derived ObjectIds, not random) so that cross-collection references remain consistent across seed runs and `dev:lite` mode.

---

## 20. Mongoose Schema Layer vs Native Driver Rules

Following the agreed architecture in `TECH_STACK.md` section 2.4, apply these rules consistently:

Use **Mongoose** for: all standard CRUD operations, entity creation, entity reads by known IDs, status updates, soft deletes, simple population, and standard business record management on all collections in sections 2–16.

Use the **native MongoDB driver** via explicitly named helpers in `packages/database/src/pipelines/` for: Atlas Search aggregation pipelines, price range aggregation (`$group` + `$min` + `$max` for `priceSummary`), seller trust score computation pipelines, order analytics materialization, loyalty ledger balance recomputation, search projection refresh pipelines, and any aggregation stage that cannot be cleanly expressed through Mongoose populate.

Pipeline files are named descriptively and exported individually. Examples: `product-price-summary.pipeline.ts`, `seller-trust-score.pipeline.ts`, `loyalty-balance-recompute.pipeline.ts`, `seo-projection-refresh.pipeline.ts`.

No raw aggregation fragments are scattered in controller or service files. All aggregations live in `packages/database/src/pipelines/`.
