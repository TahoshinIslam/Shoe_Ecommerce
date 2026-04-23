import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  cartOpen: false,
  searchOpen: false,
  mobileMenuOpen: false,
  compareList: JSON.parse(localStorage.getItem("ss:compare") || "[]"),
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleCart: (s) => {
      s.cartOpen = !s.cartOpen;
    },
    setCartOpen: (s, { payload }) => {
      s.cartOpen = payload;
    },
    toggleSearch: (s) => {
      s.searchOpen = !s.searchOpen;
    },
    setSearchOpen: (s, { payload }) => {
      s.searchOpen = payload;
    },
    toggleMobileMenu: (s) => {
      s.mobileMenuOpen = !s.mobileMenuOpen;
    },
    setMobileMenuOpen: (s, { payload }) => {
      s.mobileMenuOpen = payload;
    },
    addToCompare: (s, { payload }) => {
      if (s.compareList.includes(payload)) return;
      if (s.compareList.length >= 4) s.compareList.shift();
      s.compareList.push(payload);
      localStorage.setItem("ss:compare", JSON.stringify(s.compareList));
    },
    removeFromCompare: (s, { payload }) => {
      s.compareList = s.compareList.filter((id) => id !== payload);
      localStorage.setItem("ss:compare", JSON.stringify(s.compareList));
    },
    clearCompare: (s) => {
      s.compareList = [];
      localStorage.removeItem("ss:compare");
    },
  },
});

export const {
  toggleCart,
  setCartOpen,
  toggleSearch,
  setSearchOpen,
  toggleMobileMenu,
  setMobileMenuOpen,
  addToCompare,
  removeFromCompare,
  clearCompare,
} = uiSlice.actions;

export default uiSlice.reducer;
