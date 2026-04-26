import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseUrl = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

// Cached CSRF token. Fetched once on first mutating request and whenever
// the server rejects us with 403 (token rotated or expired).
let csrfToken = null;
let csrfTokenPromise = null;

const fetchCsrfToken = async () => {
  if (csrfTokenPromise) return csrfTokenPromise; // dedupe concurrent fetches
  csrfTokenPromise = fetch(`${baseUrl}/csrf-token`, {
    credentials: "include",
  })
    .then((r) => r.json())
    .then((d) => {
      csrfToken = d.csrfToken;
      return csrfToken;
    })
    .finally(() => {
      csrfTokenPromise = null;
    });
  return csrfTokenPromise;
};

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const rawBaseQuery = fetchBaseQuery({
  baseUrl,
  credentials: "include",
  prepareHeaders: async (
    headers,
    { type, extra, forced, endpoint, getState, ...rest },
  ) => {
    headers.set("Accept", "application/json");
    return headers;
  },
});

// Custom baseQuery that injects CSRF token for mutations and retries once on 403.
const baseQueryWithCsrf = async (args, api, extraOptions) => {
  // Normalize: args can be a string or an object
  const request = typeof args === "string" ? { url: args } : { ...args };
  const method = (request.method || "GET").toUpperCase();

  if (MUTATING_METHODS.has(method)) {
    if (!csrfToken) await fetchCsrfToken();
    request.headers = {
      ...(request.headers || {}),
      "X-CSRF-Token": csrfToken,
    };
  }

  let result = await rawBaseQuery(request, api, extraOptions);

  // If the server rejected the CSRF token (rotated, expired, or first-request race),
  // refetch the token and retry ONCE.
  if (
    result.error?.status === 403 &&
    MUTATING_METHODS.has(method) &&
    /csrf/i.test(result.error?.data?.message || "")
  ) {
    csrfToken = null;
    await fetchCsrfToken();
    request.headers = {
      ...(request.headers || {}),
      "X-CSRF-Token": csrfToken,
    };
    result = await rawBaseQuery(request, api, extraOptions);
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithCsrf,
  // Keep cached data longer to reduce redundant requests during navigation
  keepUnusedDataFor: 300, // 5 minutes (default is 60s)
  refetchOnMountOrArgChange: false,
  refetchOnReconnect: true,
  tagTypes: [
    "User",
    "Product",
    "Category",
    "Brand",
    "Cart",
    "Wishlist",
    "Order",
    "Review",
    "Address",
    "Coupon",
    "Payment",
    "Theme",
    "Analytics",
  ],
  endpoints: () => ({}),
});
