import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  ShoppingBag,
  Minus,
  Plus,
  Truck,
  RefreshCw,
  Shield,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";

import Button from "../components/ui/Button.jsx";
import Badge from "../components/ui/Badge.jsx";
import Rating from "../components/ui/Rating.jsx";
import Skeleton from "../components/ui/Skeleton.jsx";
import ProductCard from "../components/product/ProductCard.jsx";

import {
  useGetProductQuery,
  useGetRelatedProductsQuery,
} from "../store/productApi.js";
import {
  useAddToCartMutation,
  useToggleWishlistMutation,
  useGetWishlistQuery,
} from "../store/shopApi.js";
import { selectCurrentUser } from "../store/authSlice.js";
import { setCartOpen } from "../store/uiSlice.js";
import { formatCurrency, cn } from "../lib/utils.js";

export default function ProductDetailPage() {
  const { idOrSlug } = useParams();
  const { data, isLoading } = useGetProductQuery(idOrSlug);
  const product = data?.product;
  const { data: relatedData } = useGetRelatedProductsQuery(product?._id, {
    skip: !product?._id,
  });

  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const [addToCart, { isLoading: adding }] = useAddToCartMutation();
  const [toggleWishlist] = useToggleWishlistMutation();
  const { data: wlData } = useGetWishlistQuery(undefined, { skip: !user });

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);

  if (isLoading) {
    return (
      <div className="container-x py-10">
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-square w-full" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container-x py-20 text-center">
        <h2 className="font-heading text-2xl font-bold">Product not found</h2>
        <Link to="/shop" className="mt-4 inline-block text-accent hover:underline">
          ← Back to shop
        </Link>
      </div>
    );
  }

  const images =
    product.images?.length > 0 ? product.images : ["/images/placeholder.png"];
  const price = product.discountPrice ?? product.basePrice;
  const hasDiscount =
    product.discountPrice && product.discountPrice < product.basePrice;
  const isWished = !!wlData?.wishlist?.products?.some(
    (p) => (p._id || p) === product._id
  );
  const selectedSizeStock = product.sizes.find((s) => s.size === selectedSize);
  const inStock = selectedSizeStock ? selectedSizeStock.stock > 0 : true;
  const maxQty = selectedSizeStock?.stock || 0;

  const handleAdd = async () => {
    if (!user) {
      toast.error("Please sign in to add items to cart");
      return;
    }
    if (!selectedSize) {
      toast.error("Please select a size");
      return;
    }
    try {
      await addToCart({
        productId: product._id,
        size: selectedSize,
        quantity,
      }).unwrap();
      toast.success("Added to cart");
      dispatch(setCartOpen(true));
    } catch (e) {
      toast.error(e?.data?.message || "Could not add to cart");
    }
  };

  const handleWishlist = async () => {
    if (!user) {
      toast.error("Please sign in");
      return;
    }
    try {
      const r = await toggleWishlist(product._id).unwrap();
      toast.success(r.added ? "Added to wishlist" : "Removed from wishlist");
    } catch {
      toast.error("Could not update wishlist");
    }
  };

  return (
    <div className="container-x py-10">
      {/* Breadcrumbs */}
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <span className="mx-2">/</span>
        <Link to="/shop" className="hover:text-foreground">Shop</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-4">
          <motion.div
            key={selectedImage}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="aspect-square overflow-hidden rounded-lg bg-muted"
          >
            <img
              src={images[selectedImage]}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </motion.div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={cn(
                    "h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border-2 transition-colors",
                    i === selectedImage ? "border-accent" : "border-transparent"
                  )}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <div>
              {product.brand?.name && (
                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {product.brand.name}
                </p>
              )}
              <h1 className="mt-1 font-heading text-3xl font-black lg:text-4xl">
                {product.name}
              </h1>
            </div>
            {product.isFeatured && <Badge variant="accent">Featured</Badge>}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <Rating value={product.rating} size={16} showValue />
            <span className="text-sm text-muted-foreground">
              ({product.numReviews} {product.numReviews === 1 ? "review" : "reviews"})
            </span>
          </div>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="font-heading text-4xl font-black">
              {formatCurrency(price)}
            </span>
            {hasDiscount && (
              <>
                <span className="text-xl text-muted-foreground line-through">
                  {formatCurrency(product.basePrice)}
                </span>
                <Badge variant="danger">
                  -{Math.round(((product.basePrice - product.discountPrice) / product.basePrice) * 100)}%
                </Badge>
              </>
            )}
          </div>

          <p className="mt-5 text-foreground/80 text-pretty">
            {product.description}
          </p>

          {/* Metadata chips */}
          <div className="mt-5 flex flex-wrap gap-2">
            {product.color && <Badge variant="outline">Color: {product.color}</Badge>}
            {product.material && <Badge variant="outline">Material: {product.material}</Badge>}
            <Badge variant="outline" className="capitalize">Gender: {product.gender}</Badge>
          </div>

          {/* Sizes */}
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold uppercase tracking-wider">Size</span>
              <button className="text-xs text-muted-foreground hover:text-accent">
                Size guide
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
              {product.sizes.map((s) => {
                const disabled = s.stock === 0;
                const active = selectedSize === s.size;
                return (
                  <button
                    key={s.size}
                    disabled={disabled}
                    onClick={() => {
                      setSelectedSize(s.size);
                      setQuantity(1);
                    }}
                    className={cn(
                      "flex h-12 items-center justify-center rounded-md border text-sm font-semibold transition-all",
                      active && "border-accent bg-accent text-accent-foreground shadow-card",
                      !active && !disabled && "border-border hover:border-foreground",
                      disabled && "cursor-not-allowed border-border bg-muted/30 text-muted-foreground/50 line-through"
                    )}
                  >
                    {s.size}
                  </button>
                );
              })}
            </div>
            {selectedSize && selectedSizeStock && (
              <p className="mt-2 text-xs text-muted-foreground">
                {selectedSizeStock.stock} in stock
              </p>
            )}
          </div>

          {/* Quantity + actions */}
          <div className="mt-6 flex gap-3">
            <div className="flex items-center rounded-md border border-border">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="px-3 py-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                aria-label="Decrease"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm font-bold">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(maxQty || 99, q + 1))}
                className="px-3 py-2 text-muted-foreground hover:text-foreground"
                aria-label="Increase"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button
              size="lg"
              onClick={handleAdd}
              loading={adding}
              disabled={!inStock}
              className="flex-1"
            >
              <ShoppingBag className="h-4 w-4" />
              {inStock ? "Add to cart" : "Out of stock"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleWishlist}
              aria-label="Wishlist"
            >
              <Heart className={cn("h-4 w-4", isWished && "fill-danger text-danger")} />
            </Button>
          </div>

          {/* Perks */}
          <div className="mt-8 grid grid-cols-3 gap-3 border-t border-border pt-6">
            <Perk icon={Truck} title="Free shipping" desc="Over $200" />
            <Perk icon={RefreshCw} title="30-day returns" desc="Easy & free" />
            <Perk icon={Shield} title="Secure checkout" desc="Stripe, bKash, Nagad" />
          </div>
        </div>
      </div>

      {/* Related */}
      {relatedData?.products?.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 font-heading text-2xl font-bold">You may also like</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {relatedData.products.slice(0, 4).map((p, i) => (
              <ProductCard key={p._id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Perk({ icon: Icon, title, desc }) {
  return (
    <div className="flex flex-col items-center text-center">
      <Icon className="mb-1 h-5 w-5 text-accent" />
      <p className="text-xs font-bold">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}
