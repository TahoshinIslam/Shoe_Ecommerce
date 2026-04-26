import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Truck, ShieldCheck, RefreshCw, Sparkles, AlertCircle } from "lucide-react";

import Button from "../components/ui/Button.jsx";
import ProductCard from "../components/product/ProductCard.jsx";
import ProductCardSkeleton from "../components/product/ProductCardSkeleton.jsx";
import { useGetFeaturedProductsQuery, useGetProductsQuery } from "../store/productApi.js";
import { useTheme } from "../contexts/ThemeProvider.jsx";
import { slideUp, staggerContainer, staggerItem } from "../lib/animations.js";

export default function HomePage() {
  const { theme } = useTheme();
  const {
    data: featured,
    isLoading: loadingFeatured,
    isError: featuredError,
  } = useGetFeaturedProductsQuery();
  const {
    data: newest,
    isLoading: loadingNewest,
    isError: newestError,
  } = useGetProductsQuery({ limit: 9, sort: "-createdAt" });

  // Defensive: default to empty arrays so rendering never blows up
  const featuredProducts = featured?.products ?? [];
  const newestProducts = newest?.products ?? [];
  const anyError = featuredError || newestError;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container-x grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
          <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="space-y-6"
          >
            <motion.div variants={staggerItem}>
              <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                <Sparkles className="h-3 w-3" />
                New Season 2026
              </span>
            </motion.div>
            <motion.h1
              variants={staggerItem}
              className="font-heading text-4xl font-black leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            >
              Step into{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-accent">something new</span>
                <span className="absolute inset-x-0 bottom-1 h-3 bg-accent/20" />
              </span>
              .
            </motion.h1>
            <motion.p
              variants={staggerItem}
              className="max-w-md text-lg text-muted-foreground text-pretty"
            >
              {theme?.tagline ||
                "Premium shoes engineered for performance, designed for the streets."}
            </motion.p>
            <motion.div variants={staggerItem} className="flex flex-wrap gap-3">
              <Link to="/shop">
                <Button size="lg" variant="primary">
                  Shop collection
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/shop?featured=true">
                <Button size="lg" variant="outline">
                  View featured
                </Button>
              </Link>
            </motion.div>

            <motion.div
              variants={staggerItem}
              className="flex flex-wrap gap-6 pt-4 text-sm text-muted-foreground"
            >
              <Feature icon={Truck} label="Free shipping $200+" />
              <Feature icon={ShieldCheck} label="Secure checkout" />
              <Feature icon={RefreshCw} label="30-day returns" />
            </motion.div>
          </motion.div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative h-[400px] lg:h-[500px]"
          >
            <HeroCollage featured={featuredProducts} loading={loadingFeatured} />
          </motion.div>
        </div>

        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        </div>
      </section>

      {/* Error banner */}
      {anyError && (
        <div className="container-x py-4">
          <div className="flex items-center gap-3 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Couldn't load products from the server.</p>
              <p className="text-xs opacity-90">
                Check that your backend is running on the port configured in
                vite.config.js, and check the backend terminal for the real error.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Category cards */}
      <section className="container-x py-16">
        <motion.div {...slideUp} className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-heading text-3xl font-bold">Shop by style</h2>
            <p className="mt-1 text-sm text-muted-foreground">Find your fit.</p>
          </div>
        </motion.div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Men", to: "/shop?gender=men", emoji: "👟" },
            { label: "Women", to: "/shop?gender=women", emoji: "👠" },
            { label: "Kids", to: "/shop?gender=kids", emoji: "🎈" },
            { label: "Unisex", to: "/shop?gender=unisex", emoji: "⚡" },
          ].map((cat, i) => (
            <motion.div
              key={cat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <Link
                to={cat.to}
                className="group relative block overflow-hidden rounded-lg border border-border bg-gradient-to-br from-muted to-muted/30 p-8 transition-all hover:border-accent hover:shadow-card"
              >
                <div className="flex items-center justify-between">
                  <span className="font-heading text-xl font-bold">{cat.label}</span>
                  <span className="text-4xl">{cat.emoji}</span>
                </div>
                <div className="mt-8 flex items-center text-sm text-accent opacity-0 transition-opacity group-hover:opacity-100">
                  Shop now
                  <ArrowRight className="ml-1 h-3 w-3" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured */}
      {(loadingFeatured || featuredProducts.length > 0) && (
        <section className="container-x py-16">
          <motion.div {...slideUp} className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="font-heading text-3xl font-bold">Featured picks</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Hand-picked from our collection.
              </p>
            </div>
            <Link
              to="/shop?featured=true"
              className="text-sm font-semibold text-accent hover:underline whitespace-nowrap"
            >
              View all →
            </Link>
          </motion.div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {loadingFeatured
              ? Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : featuredProducts.slice(0, 9).map((p, i) => (
                  <ProductCard key={p._id} product={p} index={i} />
                ))}
          </div>
        </section>
      )}

      {/* Newest */}
      {(loadingNewest || newestProducts.length > 0) && (
        <section className="container-x py-16">
          <motion.div {...slideUp} className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="font-heading text-3xl font-bold">Fresh arrivals</h2>
              <p className="mt-1 text-sm text-muted-foreground">Just in.</p>
            </div>
            <Link
              to="/shop?sort=-createdAt"
              className="text-sm font-semibold text-accent hover:underline whitespace-nowrap"
            >
              View all →
            </Link>
          </motion.div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {loadingNewest
              ? Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : newestProducts.slice(0, 9).map((p, i) => (
                  <ProductCard key={p._id} product={p} index={i} />
                ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="container-x py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-lg bg-primary p-10 text-primary-foreground lg:p-16"
        >
          <div className="relative z-10 max-w-xl">
            <h3 className="font-heading text-3xl font-black lg:text-4xl">
              Get 10% off your first order
            </h3>
            <p className="mt-3 text-primary-foreground/80">
              Sign up, grab code <strong className="text-accent">WELCOME10</strong>, and
              unlock free shipping on orders over $200.
            </p>
            <Link to="/register" className="mt-6 inline-block">
              <Button size="lg" variant="accent">
                Create account
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
        </motion.div>
      </section>
    </div>
  );
}

function Feature({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-accent" />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}

function HeroCollage({ featured = [], loading = false }) {
  const picks = featured.slice(0, 3);
  if (loading || picks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg bg-muted">
        <div className="skeleton h-4/5 w-4/5 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {picks.map((p, i) => {
        const positions = [
          { top: "5%", left: "10%", rotate: -8, delay: 0 },
          { top: "15%", right: "5%", rotate: 6, delay: 0.15 },
          { bottom: "0%", left: "25%", rotate: -3, delay: 0.3 },
        ];
        const pos = positions[i];
        return (
          <motion.div
            key={p._id}
            initial={{ opacity: 0, y: 40, rotate: 0 }}
            animate={{
              opacity: 1,
              y: 0,
              rotate: pos.rotate,
              transition: { delay: pos.delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] },
            }}
            whileHover={{ scale: 1.05, rotate: 0, zIndex: 10 }}
            className="absolute w-2/3 overflow-hidden rounded-lg bg-background shadow-hover"
            style={{
              top: pos.top,
              left: pos.left,
              right: pos.right,
              bottom: pos.bottom,
              aspectRatio: "1",
            }}
          >
            <Link to={`/product/${p.slug || p._id}`}>
              <img
                src={p.images?.[0]}
                alt={p.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white">
                <p className="text-xs font-semibold uppercase tracking-wide">
                  {p.brand?.name}
                </p>
                <p className="line-clamp-1 text-sm font-bold">{p.name}</p>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
