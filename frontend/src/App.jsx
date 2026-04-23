import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import Header from "./components/layout/Header.jsx";
import Footer from "./components/layout/Footer.jsx";
import CartDrawer from "./components/layout/CartDrawer.jsx";
import { PrivateRoute, AdminRoute } from "./components/auth/RouteGuards.jsx";

// Public pages
import HomePage from "./pages/HomePage.jsx";
import ShopPage from "./pages/ShopPage.jsx";
import ProductDetailPage from "./pages/ProductDetailPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import WishlistPage from "./pages/WishlistPage.jsx";

// Customer pages
import CheckoutPage from "./pages/CheckoutPage.jsx";
import OrdersPage from "./pages/OrdersPage.jsx";
import OrderDetailPage from "./pages/OrderDetailPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";

// Admin
import AdminLayout from "./components/admin/AdminLayout.jsx";
import AdminOverviewPage from "./pages/admin/OverviewPage.jsx";
import AdminProductsPage from "./pages/admin/ProductsPage.jsx";
import AdminOrdersPage from "./pages/admin/OrdersPage.jsx";
import AdminUsersPage from "./pages/admin/UsersPage.jsx";
import AdminCouponsPage from "./pages/admin/CouponsPage.jsx";
import AdminThemesPage from "./pages/admin/ThemesPage.jsx";

// 404
import { NotFoundPage } from "./pages/StubPages.jsx";

import useAuthBoot from "./hooks/useAuthBoot.js";

export default function App() {
  useAuthBoot();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <CartDrawer />

      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Routes location={location}>
              {/* Public */}
              <Route path="/" element={<HomePage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/product/:idOrSlug" element={<ProductDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected customer routes */}
              <Route element={<PrivateRoute />}>
                <Route path="/wishlist" element={<WishlistPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/order/:id" element={<OrderDetailPage />} />
              </Route>

              {/* Admin — uses a dedicated layout */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminOverviewPage />} />
                  <Route path="products" element={<AdminProductsPage />} />
                  <Route path="orders" element={<AdminOrdersPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                  <Route path="coupons" element={<AdminCouponsPage />} />
                  <Route path="themes" element={<AdminThemesPage />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Hide footer inside the admin dashboard — it has its own layout */}
      {!isAdminRoute && <Footer />}
    </div>
  );
}