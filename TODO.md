# Implementation Plan — Admin Features

## Feature 1: Admin can add category

- [x] `backend/models/categoryModel.js` — Add `isUserGenerated: Boolean` field
- [x] `backend/controllers/categoryController.js` — Block delete if products reference category
- [x] `backend/seeder.js` — Set `isUserGenerated: false` on seeded categories
- [x] `frontend/src/pages/admin/CategoriesPage.jsx` — New page (table, add modal, delete)
- [x] `frontend/src/components/admin/AdminLayout.jsx` — Add Categories nav item
- [x] `frontend/src/App.jsx` — Register `/admin/categories` route

## Feature 2: Admin notifications

- [x] `backend/models/notificationModel.js` — New model
- [x] `backend/controllers/notificationController.js` — CRUD + helper
- [x] `backend/routes/notificationRoutes.js` — New routes
- [x] `backend/app.js` — Wire notification model & routes
- [x] `backend/controllers/orderController.js` — Create notification on new order
- [x] `backend/controllers/reviewController.js` — Create notification on new review
- [x] `frontend/src/store/shopApi.js` — Add notification RTK endpoints
- [x] `frontend/src/components/admin/NotificationsDropdown.jsx` — New bell dropdown
- [x] `frontend/src/components/admin/AdminLayout.jsx` — Mount dropdown in header

## Feature 3: Role-based access

- [x] `backend/models/userModel.js` — Add `employee` to role enum, add `permissions: [String]`
- [x] `backend/middleware/authMiddleware.js` — Add `authorize(permission)` middleware
- [x] `backend/routes/*` — Replace `admin` with `authorize(...)` on relevant routes
- [x] `backend/controllers/userController.js` — Allow `permissions` update, block self-role-edit, add employee validation
- [x] `frontend/src/store/authSlice.js` — Add `selectCanAccessAdmin`, `selectHasPermission`
- [x] `frontend/src/components/auth/RouteGuards.jsx` — Use `selectCanAccessAdmin`
- [x] `frontend/src/pages/admin/UsersPage.jsx` — Employee role + permission checkboxes, block self-edit
- [x] `frontend/src/components/admin/AdminLayout.jsx` — Filter nav by permission
- [x] `frontend/src/components/layout/Header.jsx` — Use `selectCanAccessAdmin`

## Follow-up

- [x] Run backend tests — 33/33 passing
- [x] Run frontend build — clean
- [ ] Smoke-test in a browser (login as admin → grant employee permissions → log in as employee → verify only allowed nav items appear and bell shows new orders)
