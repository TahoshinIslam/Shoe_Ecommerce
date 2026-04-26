# Cart Race Condition & Abuse Protection Fix

## Steps

- [x] 1. Update `frontend/src/components/layout/CartDrawer.jsx` — track pending updates per item, disable +/- buttons during mutation
- [x] 2. Update `backend/controllers/cartController.js` — make `updateCartItem` idempotent when removing already-removed items
- [x] 3. Update `backend/middleware/rateLimiter.js` — add `cartMutationLimiter` (30 req/min)
- [x] 4. Update `backend/routes/cartRoutes.js` — apply `cartMutationLimiter` to write routes
- [x] 5. Test rapid clicking in cart drawer
