import { apiSlice } from "./apiSlice.js";

// Convert params object to a URLSearchParams-friendly object, handling nested
// price[gte]/price[lte] bracket syntax
const buildQuery = (params = {}) => {
  const q = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val === undefined || val === null || val === "") continue;
    if (typeof val === "object" && !Array.isArray(val)) {
      for (const [op, v] of Object.entries(val)) {
        if (v !== undefined && v !== "") q.append(`${key}[${op}]`, v);
      }
    } else {
      q.append(key, val);
    }
  }
  return q.toString();
};

export const productApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    getProducts: b.query({
      query: (params = {}) => `/products?${buildQuery(params)}`,
      providesTags: (result) =>
        result?.products
          ? [
              ...result.products.map(({ _id }) => ({ type: "Product", id: _id })),
              { type: "Product", id: "LIST" },
            ]
          : [{ type: "Product", id: "LIST" }],
    }),
    getFeaturedProducts: b.query({
      query: () => "/products/featured",
      providesTags: [{ type: "Product", id: "FEATURED" }],
    }),
    getProduct: b.query({
      query: (idOrSlug) => `/products/${idOrSlug}`,
      providesTags: (result, err, arg) => [{ type: "Product", id: arg }],
    }),
    getRelatedProducts: b.query({
      query: (id) => `/products/${id}/related`,
    }),
    createProduct: b.mutation({
      query: (body) => ({ url: "/products", method: "POST", body }),
      invalidatesTags: [{ type: "Product", id: "LIST" }],
    }),
    updateProduct: b.mutation({
      query: ({ id, ...body }) => ({ url: `/products/${id}`, method: "PUT", body }),
      invalidatesTags: (r, e, a) => [
        { type: "Product", id: a.id },
        { type: "Product", id: "LIST" },
      ],
    }),
    deleteProduct: b.mutation({
      query: (id) => ({ url: `/products/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Product", id: "LIST" }],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetFeaturedProductsQuery,
  useGetProductQuery,
  useGetRelatedProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productApi;
