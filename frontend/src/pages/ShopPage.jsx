import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, X, AlertCircle } from "lucide-react";

import ProductCard from "../components/product/ProductCard.jsx";
import ProductCardSkeleton from "../components/product/ProductCardSkeleton.jsx";
import Button from "../components/ui/Button.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { useGetProductsQuery } from "../store/productApi.js";
import { useGetBrandsQuery, useGetCategoriesQuery } from "../store/shopApi.js";
import { cn } from "../lib/utils.js";

const SORTS = [
  { value: "-createdAt", label: "Newest" },
  { value: "basePrice", label: "Price: Low → High" },
  { value: "-basePrice", label: "Price: High → Low" },
  { value: "-rating", label: "Top rated" },
  { value: "name", label: "Name A-Z" },
];

const GENDERS = ["men", "women", "kids", "unisex"];
const PAGE_SIZE = 12;

const computeTitle = (sp) => {
  if (sp.get("featured") === "true") return "Featured picks";
  const search = sp.get("search");
  if (search) return `Results for "${search}"`;
  const onlySort = sp.get("sort") === "-createdAt";
  const noOtherFilters = !sp.get("gender") && !sp.get("brand") && !sp.get("category") && !sp.get("priceMin") && !sp.get("priceMax");
  if (onlySort && noOtherFilters) return "Fresh arrivals";
  const gender = sp.get("gender");
  if (gender) return `${gender.charAt(0).toUpperCase()}${gender.slice(1)}'s shoes`;
  return "Shop all shoes";
};

export default function ShopPage() {
  const [sp, setSp] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset visible count when filters/sort change (anything except `limit` itself)
  const filterKey = useMemo(() => {
    const next = new URLSearchParams(sp);
    next.delete("limit");
    return next.toString();
  }, [sp]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filterKey]);

  const query = useMemo(() => {
    const o = {};
    for (const [k, v] of sp.entries()) {
      if (k === "priceMin") {
        o.basePrice = { ...(o.basePrice || {}), gte: v };
      } else if (k === "priceMax") {
        o.basePrice = { ...(o.basePrice || {}), lte: v };
      } else if (k === "page") {
        // ignore — using show-more instead of pagination
      } else {
        o[k] = v;
      }
    }
    o.limit = visibleCount;
    return o;
  }, [sp, visibleCount]);

  const { data, isLoading, isFetching, isError, error } = useGetProductsQuery(query);
  const { data: brandsData } = useGetBrandsQuery();
  const { data: catsData } = useGetCategoriesQuery();

  const setParam = (key, value) => {
    const next = new URLSearchParams(sp);
    if (!value) next.delete(key);
    else next.set(key, value);
    next.delete("page");
    setSp(next);
  };

  const clearAll = () => setSp(new URLSearchParams());

  // Defensive: use empty array if data is undefined
  const products = data?.products ?? [];
  const total = data?.total ?? 0;
  const hasMore = products.length < total;
  const title = computeTitle(sp);

  return (
    <div className="container-x py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {total} products
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sp.get("sort") || "-createdAt"}
            onChange={(e) => setParam("sort", e.target.value)}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm focus-ring"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            onClick={() => setFiltersOpen((v) => !v)}
            className="lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Filter sidebar */}
        <aside
          className={cn(
            "fixed inset-0 z-40 lg:static lg:z-auto",
            !filtersOpen && "hidden lg:block"
          )}
        >
          <div
            className="absolute inset-0 bg-black/40 lg:hidden"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="relative h-full w-72 max-w-full overflow-y-auto border-r border-border bg-background p-5 lg:sticky lg:top-20 lg:h-auto lg:w-full lg:rounded-lg lg:border">
            <div className="mb-4 flex items-center justify-between lg:hidden">
              <h3 className="font-heading text-lg font-bold">Filters</h3>
              <button
                onClick={() => setFiltersOpen(false)}
                className="rounded-md p-1 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <FilterGroup title="Gender">
              {GENDERS.map((g) => (
                <CheckBox
                  key={g}
                  label={g}
                  checked={sp.get("gender") === g}
                  onChange={(v) => setParam("gender", v ? g : "")}
                />
              ))}
            </FilterGroup>

            {brandsData?.brands?.length > 0 && (
              <FilterGroup title="Brand">
                {brandsData.brands.map((b) => (
                  <CheckBox
                    key={b._id}
                    label={b.name}
                    checked={sp.get("brand") === b._id}
                    onChange={(v) => setParam("brand", v ? b._id : "")}
                  />
                ))}
              </FilterGroup>
            )}

            {catsData?.categories?.length > 0 && (
              <FilterGroup title="Category">
                {catsData.categories.map((c) => (
                  <CheckBox
                    key={c._id}
                    label={c.name}
                    checked={sp.get("category") === c._id}
                    onChange={(v) => setParam("category", v ? c._id : "")}
                  />
                ))}
              </FilterGroup>
            )}

            <FilterGroup title="Price">
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  defaultValue={sp.get("priceMin") || ""}
                  onBlur={(e) => setParam("priceMin", e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-ring"
                />
                <input
                  type="number"
                  placeholder="Max"
                  defaultValue={sp.get("priceMax") || ""}
                  onBlur={(e) => setParam("priceMax", e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-ring"
                />
              </div>
            </FilterGroup>

            <Button variant="outline" size="sm" onClick={clearAll} className="w-full">
              Clear all
            </Button>
          </div>
        </aside>

        {/* Product grid */}
        <div>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : isError ? (
            <EmptyState
              icon={AlertCircle}
              title="Couldn't load products"
              message={error?.data?.message || "The server returned an error. Check your backend logs."}
              action={
                <Button onClick={() => window.location.reload()}>Try again</Button>
              }
            />
          ) : products.length === 0 ? (
            <EmptyState
              icon={SlidersHorizontal}
              title="No products match"
              message="Try adjusting your filters."
              action={<Button onClick={clearAll}>Clear filters</Button>}
            />
          ) : (
            <>
              <div
                className={cn(
                  "grid grid-cols-2 gap-4 md:grid-cols-3 transition-opacity",
                  isFetching && "opacity-60"
                )}
              >
                {products.map((p, i) => (
                  <ProductCard key={p._id} product={p} index={i} />
                ))}
              </div>

              {/* Show more */}
              {hasMore && (
                <div className="mt-10 flex flex-col items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    Showing {products.length} of {total}
                  </p>
                  <Button
                    variant="outline"
                    disabled={isFetching}
                    onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                  >
                    {isFetching ? "Loading..." : "Show more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }) {
  return (
    <div className="mb-5 border-b border-border pb-5 last:border-0 last:pb-0">
      <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function CheckBox({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm capitalize text-foreground hover:text-accent">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-accent"
      />
      {label}
    </label>
  );
}
