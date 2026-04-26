import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  selectCurrentUser,
  selectCanAccessAdmin,
} from "../../store/authSlice.js";

export function PrivateRoute() {
  const user = useSelector(selectCurrentUser);
  const loc = useLocation();
  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(loc.pathname)}`} replace />;
  }
  return <Outlet />;
}

export function AdminRoute() {
  const user = useSelector(selectCurrentUser);
  const canAccess = useSelector(selectCanAccessAdmin);
  if (!user) return <Navigate to="/login" replace />;
  if (!canAccess) return <Navigate to="/" replace />;
  return <Outlet />;
}
