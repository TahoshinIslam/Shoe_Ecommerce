import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import Header from "./components/layout/Header.jsx";
import Footer from "./components/layout/Footer.jsx";
import CartDrawer from "./components/layout/CartDrawer.jsx";
import { PrivateRoute, AdminRoute } from "./components/auth/RouteGuards.jsx";

import HomePage from "./pages/HomePage.jsx";
import ShopPage from "./pages/ShopPage.jsx";
import ProductDetailPage from "./pages/ProductDetailPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import WishlistPage from "./pages/WishlistPage.jsx";
import {
  CheckoutPage,
  ProfilePage,
  OrdersPage,
  OrderDetailPage,
  AdminDashboardPage,
  NotFoundPage,
} from "./pages/StubPages.jsx";

import useAuthBoot from "./hooks/useAuthBoot.js";

export default function App() {
  useAuthBoot();
  const location = useLocation();

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

              {/* Protected */}
              <Route element={<PrivateRoute />}>
                <Route path="/wishlist" element={<WishlistPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/order/:id" element={<OrderDetailPage />} />
              </Route>

              {/* Admin */}
              <Route element={<AdminRoute />}>
                <Route path="/admin/*" element={<AdminDashboardPage />} />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
