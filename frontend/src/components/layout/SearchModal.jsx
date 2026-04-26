import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Loader2 } from "lucide-react";

import { setSearchOpen } from "../../store/uiSlice.js";
import { useGetProductsQuery } from "../../store/productApi.js";
import { formatCurrency } from "../../lib/utils.js";

export default function SearchModal() {
  const open = useSelector((s) => s.ui.searchOpen);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");

  // Debounce keystrokes for live preview
  useEffect(() => {
    const id = setTimeout(() => setDebounced(term.trim()), 250);
    return () => clearTimeout(id);
  }, [term]);

  // Reset on close, focus on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setTerm("");
      setDebounced("");
    }
  }, [open]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") dispatch(setSearchOpen(false));
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, dispatch]);

  const { data, isFetching } = useGetProductsQuery(
    { search: debounced, limit: 6 },
    { skip: !debounced }
  );
  const previews = data?.products ?? [];

  const close = () => dispatch(setSearchOpen(false));

  const submit = (e) => {
    e?.preventDefault();
    const q = term.trim();
    if (!q) return;
    close();
    navigate(`/shop?search=${encodeURIComponent(q)}`);
  };

  const goTo = (slugOrId) => {
    close();
    navigate(`/product/${slugOrId}`);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-24">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-background shadow-hover"
          >
            <form onSubmit={submit} className="flex items-center gap-2 border-b border-border p-3">
              <Search className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search products, brands, categories..."
                className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
              {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <button
                type="button"
                onClick={close}
                aria-label="Close search"
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </form>

            <div className="max-h-[60vh] overflow-y-auto">
              {!debounced ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  Type to search the catalog. Press Enter to see all results.
                </p>
              ) : previews.length === 0 && !isFetching ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No products match "{debounced}".
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {previews.map((p) => (
                    <li key={p._id}>
                      <button
                        onClick={() => goTo(p.slug || p._id)}
                        className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted"
                      >
                        {p.images?.[0] && (
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            className="h-12 w-12 flex-shrink-0 rounded object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{p.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {p.brand?.name}
                          </p>
                        </div>
                        <span className="flex-shrink-0 text-sm font-semibold">
                          {formatCurrency(p.basePrice)}
                        </span>
                      </button>
                    </li>
                  ))}
                  <li>
                    <button
                      onClick={submit}
                      className="block w-full p-3 text-center text-sm font-semibold text-accent hover:bg-muted"
                    >
                      See all results for "{debounced}" →
                    </button>
                  </li>
                </ul>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
