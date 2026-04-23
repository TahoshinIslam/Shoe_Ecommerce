import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Base URL: in dev, Vite proxies /api to backend. In prod, set VITE_API_URL.
const baseUrl = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl,
    credentials: "include", // send httpOnly JWT cookie with every request
    prepareHeaders: (headers) => {
      headers.set("Accept", "application/json");
      return headers;
    },
  }),
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
