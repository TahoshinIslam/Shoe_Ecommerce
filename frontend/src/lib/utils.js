import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Merge Tailwind classes safely (resolves conflicts like "p-2 p-4" → "p-4")
export const cn = (...inputs) => twMerge(clsx(inputs));

export const formatCurrency = (value, currency = "USD") =>
  new Intl.NumberFormat(currency === "BDT" ? "bn-BD" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

export const formatDate = (date) =>
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));

export const formatDateTime = (date) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));

// Resolve a product image path — handles both local (/images/1.png) and absolute URLs
export const resolveImage = (src) => {
  if (!src) return "/images/placeholder.png";
  if (src.startsWith("http") || src.startsWith("data:")) return src;
  return src;
};

// Gender → emoji (for display variety)
export const genderIcon = (g) =>
  ({ men: "♂", women: "♀", kids: "★", unisex: "⚡" }[g] || "");

// Truncate long strings
export const truncate = (s, n = 60) =>
  String(s || "").length > n ? String(s).slice(0, n - 1) + "…" : String(s || "");

// Classname helper for active route
export const activeClass = (isActive, base, active) =>
  cn(base, isActive && active);
