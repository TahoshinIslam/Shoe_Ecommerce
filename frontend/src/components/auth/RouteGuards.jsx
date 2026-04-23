import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectCurrentUser, selectIsAdmin } from "../../store/authSlice.js";

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
  const isAdmin = useSelector(selectIsAdmin);
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}
