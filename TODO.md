# Fix Failing Tests - COMPLETED

## Root Causes

1. **CSRF + Auth logout tests fail with 500**: `errorMiddleware.js` detached pino method from `this` context → logger crashed → Express returns 500
2. **Auth logout test missing CSRF token**: Logout is a POST request that needs CSRF token
3. **Payment tests fail with ValidationError**: `payments.test.js` used `addressLine1` but Order schema requires `street`
4. **Payment amount mismatch test fails**: Controller didn't return `{ note: "amount mismatch" }` early

## Fixes Applied

- [x] `backend/middleware/errorMiddleware.js` - Fixed logger crash by calling `logger.error()`/`logger.warn()` directly instead of via detached variable
- [x] `backend/tests/auth.test.js` - Added CSRF token to logout request via `getCsrfPair`
- [x] `backend/tests/payments.test.js` - Changed `addressLine1` to `street` in `createPendingOrder`
- [x] `backend/controllers/paymentController.js` - Added early return with `{ note: "amount mismatch" }` when Stripe amount doesn't match
- [x] Removed temporary `backend/tests/csrf_debug.test.js` debug file

## Result

All 29 tests pass across 6 test files.
