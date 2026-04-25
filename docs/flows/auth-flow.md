# Authentication Flow

## Overview

Auth.js v5 handles authentication with MongoDB-backed sessions.

## Flow

1. User navigates to `/auth/signin`
2. Auth.js presents configured providers
3. On success, session is stored in MongoDB via `@auth/mongodb-adapter`
4. HttpOnly secure cookie is set in the browser
5. Subsequent requests include the cookie
6. Server-side session validation via `packages/auth`

## Roles

| Role             | Access                    |
| ---------------- | ------------------------- |
| public           | Marketplace browsing      |
| customer         | Account, orders, wishlist |
| seller_staff     | Seller portal read        |
| seller_admin     | Seller portal full + MFA  |
| provider_support | Admin panel scoped        |
| provider_admin   | Admin panel full + MFA    |
| super_admin      | All access + MFA          |
