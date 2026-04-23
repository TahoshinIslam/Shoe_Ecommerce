import { configureStore } from "@reduxjs/toolkit";
import { apiSlice } from "./apiSlice.js";
// Importing these ensures injectEndpoints runs
import "./userApi.js";
import "./productApi.js";
import "./themeApi.js";
import "./shopApi.js";

import authReducer from "./authSlice.js";
import uiReducer from "./uiSlice.js";

const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefault) =>
    getDefault({ serializableCheck: { ignoredActions: [] } }).concat(apiSlice.middleware),
  devTools: import.meta.env.DEV,
});

export default store;
