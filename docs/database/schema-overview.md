# Database Schema Overview

All schemas are defined in `packages/database/src/schemas/`.

## Collections

| Collection | Description                |
| ---------- | -------------------------- |
| users      | User accounts and profiles |
| products   | Product catalog            |
| categories | Product categories         |
| orders     | Customer orders            |
| sellers    | Seller profiles            |
| sessions   | Auth.js sessions           |
| carts      | Shopping carts             |
| consents   | Consent records            |

## Access Patterns

- Mongoose for standard CRUD
- Native MongoDB driver for aggregation pipelines
- Pipeline builders in `packages/database/src/pipelines/`
