import { createSlice } from "@reduxjs/toolkit";

// Minimal auth state — the JWT itself lives in an httpOnly cookie. This
// slice just caches the user object for fast UI reads (avatar, role, etc.)
// and persists it to localStorage so the header shows the user instantly
// on page refresh while RTK Query revalidates in the background.
const loadUser = () => {
  try {
    const raw = localStorage.getItem("ss:user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const initialState = {
  user: loadUser(),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, { payload }) => {
      state.user = payload;
      localStorage.setItem("ss:user", JSON.stringify(payload));
    },
    clearCredentials: (state) => {
      state.user = null;
      localStorage.removeItem("ss:user");
    },
  },
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export default authSlice.reducer;

// Selectors
export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => !!state.auth.user;
export const selectIsAdmin = (state) => state.auth.user?.role === "admin";
