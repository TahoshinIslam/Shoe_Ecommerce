import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, ShoppingBag, Eye } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";

import Rating from "../ui/Rating.jsx";
import Badge from "../ui/Badge.jsx";
import {
  useToggleWishlistMutation,
  useGetWishlistQuery,
} from "../../store/shopApi.js";
import { selectCurrentUser } from "../../store/authSlice.js";
import { addToCompare } from "../../store/uiSlice.js";
import { formatCurrency, cn, truncate } from "../../lib/utils.js";

export default function ProductCard({ product, className, index = 0 }) {
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const [toggleWishlist, { isLoading: wlLoading }] = useToggleWishlistMutation();
  const { data: wlData } = useGetWishlistQuery(undefined, { skip: !user });

  const isWished = !!wlData?.wishlist?.products?.some(
    (p) => (p._id || p) === product._id
  );
  const discount = product.discountPrice && product.discountPrice < product.basePrice;
  const discountPct = discount
    ? Math.round(((product.basePrice - product.discountPrice) / product.basePrice) * 100)
    : 0;

  const handleWishlist = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to add to wishlist");
      return;
    }
    try {
      const res = await toggleWishlist(product._id).unwrap();
      toast.success(res.added ? "Added to wishlist" : "Removed from wishlist");
    } catch {
      toast.error("Could not update wishlist");
    }
  };

  const handleCompare = (e) => {
    e.preventDefault();
    dispatch(addToCompare(product._id));
    toast.success("Added to compare");
  };

  return (
    <motion.article
      id={`product-${product._id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: "easeOut" }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn("group relative", className)}
    >
      <Link
        to={`/product/${product.slug || product._id}`}
        className="block overflow-hidden rounded-lg border border-border bg-background shadow-soft transition-shadow hover:shadow-hover focus-ring"
      >
        {/* Image area */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          <motion.img
            whileHover={{ scale: 1.08 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            src={product.images?.[0] || "/images/placeholder.png"}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = "/images/placeholder.png";
            }}
          />

          {/* Badges */}
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {discount && (
              <Badge variant="danger" className="font-bold">
                -{discountPct}%
              </Badge>
            )}
            {product.isFeatured && (
              <Badge variant="accent">Featured</Badge>
            )}
          </div>

          {/* Action buttons */}
          <div className="absolute right-3 top-3 flex flex-col gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <button
              onClick={handleWishlist}
              disabled={wlLoading}
              aria-label="Add to wishlist"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full bg-background shadow-card transition-transform hover:scale-110",
                isWished && "text-danger"
              )}
            >
              <Heart className={cn("h-4 w-4", isWished && "fill-danger")} />
            </button>
            <button
              onClick={handleCompare}
              aria-label="Add to compare"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-background shadow-card transition-transform hover:scale-110"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>

          {/* Quick-view hover strip */}
          <div className="absolute inset-x-0 bottom-0 translate-y-full bg-primary py-3 text-center text-sm font-semibold text-primary-foreground transition-transform duration-300 group-hover:translate-y-0">
            <ShoppingBag className="mr-2 inline h-4 w-4" />
            View Details
          </div>
        </div>

        {/* Info */}
        <div className="space-y-1.5 p-4">
          {product.brand?.name && (
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {product.brand.name}
            </p>
          )}
          <h3 className="line-clamp-1 font-heading font-semibold text-foreground">
            {truncate(product.name, 40)}
          </h3>
          <Rating value={product.rating} text={`(${product.numReviews || 0})`} />
          <div className="flex items-baseline gap-2 pt-1">
            {discount ? (
              <>
                <span className="text-lg font-bold text-foreground">
                  {formatCurrency(product.discountPrice)}
                </span>
                <span className="text-sm text-muted-foreground line-through">
                  {formatCurrency(product.basePrice)}
                </span>
              </>
            ) : (
              <span className="text-lg font-bold text-foreground">
                {formatCurrency(product.basePrice)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
