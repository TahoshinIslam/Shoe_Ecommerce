import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Heart,
  ShoppingBag,
  User as UserIcon,
  Menu,
  X,
  Moon,
  Sun,
  LogOut,
  Package,
  LayoutDashboard,
} from "lucide-react";
import toast from "react-hot-toast";

import { cn } from "../../lib/utils.js";
import { useTheme } from "../../contexts/ThemeProvider.jsx";
import {
  selectCurrentUser,
  selectIsAdmin,
  clearCredentials,
} from "../../store/authSlice.js";
import { useLogoutMutation } from "../../store/userApi.js";
import { useGetCartQuery, useGetWishlistQuery } from "../../store/shopApi.js";
import {
  toggleCart,
  toggleMobileMenu,
  toggleSearch,
  setMobileMenuOpen,
} from "../../store/uiSlice.js";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/shop?gender=men", label: "Men" },
  { to: "/shop?gender=women", label: "Women" },
  { to: "/shop?gender=kids", label: "Kids" },
];

export default function Header() {
  const { theme, isDark, toggleDark } = useTheme();
  const user = useSelector(selectCurrentUser);
  const isAdmin = useSelector(selectIsAdmin);
  const cartOpen = useSelector((s) => s.ui.cartOpen);
  const mobileMenuOpen = useSelector((s) => s.ui.mobileMenuOpen);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Only fetch cart/wishlist when signed in
  const { data: cartData } = useGetCartQuery(undefined, { skip: !user });
  const { data: wlData } = useGetWishlistQuery(undefined, { skip: !user });
  const cartCount =
    cartData?.cart?.items?.reduce((s, i) => s + i.quantity, 0) || 0;
  const wlCount = wlData?.wishlist?.products?.length || 0;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch {}
    dispatch(clearCredentials());
    setUserMenuOpen(false);
    toast.success("Signed out");
    navigate("/");
  };

  return (
    <>
      {/* Announcement bar */}
      {theme?.features?.announcementBar && (
        <div className="bg-primary py-2 text-center text-xs font-medium text-primary-foreground">
          {theme.features.announcementBar}
        </div>
      )}

      <header
        className={cn(
          "sticky top-0 z-30 w-full border-b border-border transition-all duration-300",
          scrolled ? "glass shadow-soft" : "bg-background"
        )}
      >
        <div className="container-x flex h-16 items-center justify-between gap-4">
          {/* Mobile menu btn */}
          <button
            onClick={() => dispatch(toggleMobileMenu())}
            aria-label="Open menu"
            className="rounded-md p-2 text-foreground transition-colors hover:bg-muted lg:hidden focus-ring"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 focus-ring rounded-md">
            {theme?.logoUrl ? (
              <img
                src={isDark && theme.logoDarkUrl ? theme.logoDarkUrl : theme.logoUrl}
                alt={theme.siteName}
                className="h-8 w-auto"
              />
            ) : (
              <span className="font-heading text-xl font-black tracking-tight">
                {theme?.siteName || "ShoeStore"}
                <span className="text-accent">.</span>
              </span>
            )}
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "relative rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "text-accent"
                      : "text-foreground/80 hover:text-foreground"
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => dispatch(toggleSearch())}
              aria-label="Search"
              className="rounded-md p-2 text-foreground transition-colors hover:bg-muted focus-ring"
            >
              <Search className="h-5 w-5" />
            </button>

            {theme?.features?.enableDarkMode !== false && (
              <button
                onClick={toggleDark}
                aria-label="Toggle dark mode"
                className="rounded-md p-2 text-foreground transition-colors hover:bg-muted focus-ring"
              >
                <AnimatePresence mode="wait">
                  <motion.span
                    key={isDark ? "moon" : "sun"}
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="block"
                  >
                    {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  </motion.span>
                </AnimatePresence>
              </button>
            )}

            {theme?.features?.enableWishlist !== false && (
              <Link
                to={user ? "/wishlist" : "/login?redirect=/wishlist"}
                aria-label="Wishlist"
                className="relative rounded-md p-2 text-foreground transition-colors hover:bg-muted focus-ring"
              >
                <Heart className="h-5 w-5" />
                {wlCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                    {wlCount}
                  </span>
                )}
              </Link>
            )}

            <button
              onClick={() => dispatch(toggleCart())}
              aria-label="Cart"
              className="relative rounded-md p-2 text-foreground transition-colors hover:bg-muted focus-ring"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <motion.span
                  key={cartCount}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500 }}
                  className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground"
                >
                  {cartCount}
                </motion.span>
              )}
            </button>

            {/* User menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground transition-colors hover:bg-muted-foreground/20 focus-ring"
                  aria-label="User menu"
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    user.name?.[0]?.toUpperCase()
                  )}
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setUserMenuOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-md border border-border bg-background shadow-hover"
                      >
                        <div className="border-b border-border p-3">
                          <p className="text-sm font-semibold truncate">{user.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                        <div className="p-1">
                          <MenuItem to="/profile" icon={UserIcon} onClick={() => setUserMenuOpen(false)}>
                            Profile
                          </MenuItem>
                          <MenuItem to="/orders" icon={Package} onClick={() => setUserMenuOpen(false)}>
                            My Orders
                          </MenuItem>
                          {isAdmin && (
                            <MenuItem to="/admin" icon={LayoutDashboard} onClick={() => setUserMenuOpen(false)}>
                              Admin Dashboard
                            </MenuItem>
                          )}
                          <button
                            onClick={handleLogout}
                            className="flex w-full items-center gap-3 rounded px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                          >
                            <LogOut className="h-4 w-4 text-muted-foreground" />
                            Sign out
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:inline-flex focus-ring"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile menu drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => dispatch(setMobileMenuOpen(false))}
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 250 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-background lg:hidden"
            >
              <div className="flex items-center justify-between border-b border-border p-4">
                <span className="font-heading text-lg font-bold">Menu</span>
                <button
                  onClick={() => dispatch(setMobileMenuOpen(false))}
                  className="rounded-md p-2 hover:bg-muted"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex flex-col p-2">
                {navLinks.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end={l.to === "/"}
                    onClick={() => dispatch(setMobileMenuOpen(false))}
                    className={({ isActive }) =>
                      cn(
                        "rounded-md px-4 py-3 text-base font-medium transition-colors",
                        isActive
                          ? "bg-muted text-accent"
                          : "text-foreground hover:bg-muted"
                      )
                    }
                  >
                    {l.label}
                  </NavLink>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function MenuItem({ to, icon: Icon, children, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-3 rounded px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {children}
    </Link>
  );
}
