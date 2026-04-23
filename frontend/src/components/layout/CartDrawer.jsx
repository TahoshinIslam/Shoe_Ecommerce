import { useSelector, useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import toast from "react-hot-toast";

import Drawer from "../ui/Drawer.jsx";
import Button from "../ui/Button.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import { setCartOpen } from "../../store/uiSlice.js";
import { selectCurrentUser } from "../../store/authSlice.js";
import {
  useGetCartQuery,
  useUpdateCartItemMutation,
  useRemoveFromCartMutation,
} from "../../store/shopApi.js";
import { formatCurrency } from "../../lib/utils.js";

export default function CartDrawer() {
  const open = useSelector((s) => s.ui.cartOpen);
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data, isLoading } = useGetCartQuery(undefined, { skip: !user });
  const [updateItem] = useUpdateCartItemMutation();
  const [removeItem] = useRemoveFromCartMutation();

  const items = data?.cart?.items || [];
  const subtotal = items.reduce((sum, i) => {
    const p = i.product;
    if (!p) return sum;
    const price = p.discountPrice ?? p.basePrice;
    return sum + price * i.quantity;
  }, 0);

  const handleQty = async (productId, size, newQty) => {
    try {
      await updateItem({ productId, size, quantity: newQty }).unwrap();
    } catch (e) {
      toast.error(e?.data?.message || "Could not update");
    }
  };

  const handleRemove = async (productId, size) => {
    try {
      await removeItem({ productId, size }).unwrap();
    } catch {
      toast.error("Could not remove");
    }
  };

  const close = () => dispatch(setCartOpen(false));
  const goCheckout = () => {
    close();
    navigate("/checkout");
  };

  return (
    <Drawer open={open} onClose={close} title="Your cart">
      {!user ? (
        <EmptyState
          icon={ShoppingBag}
          title="Sign in to view your cart"
          message="Your cart is synced across devices once you sign in."
          action={
            <Button onClick={() => { close(); navigate("/login"); }}>
              Sign in
            </Button>
          }
        />
      ) : isLoading ? (
        <div className="space-y-4 p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-20 w-20 rounded-md bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          message="Browse our collection and find your next pair."
          action={
            <Button onClick={() => { close(); navigate("/shop"); }}>
              Start shopping
            </Button>
          }
        />
      ) : (
        <>
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const p = item.product;
              if (!p) return null;
              const price = p.discountPrice ?? p.basePrice;
              return (
                <li key={`${p._id}-${item.size}`} className="flex gap-3 p-4">
                  <Link
                    to={`/product/${p.slug || p._id}`}
                    onClick={close}
                    className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-muted"
                  >
                    <img
                      src={p.images?.[0]}
                      alt={p.name}
                      className="h-full w-full object-cover"
                    />
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <Link
                      to={`/product/${p.slug || p._id}`}
                      onClick={close}
                      className="line-clamp-1 text-sm font-semibold text-foreground hover:text-accent"
                    >
                      {p.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Size {item.size}
                    </p>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center rounded-md border border-border">
                        <button
                          onClick={() =>
                            handleQty(p._id, item.size, Math.max(0, item.quantity - 1))
                          }
                          className="px-2 py-1 text-muted-foreground hover:text-foreground"
                          aria-label="Decrease"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2 text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => handleQty(p._id, item.size, item.quantity + 1)}
                          className="px-2 py-1 text-muted-foreground hover:text-foreground"
                          aria-label="Increase"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">
                          {formatCurrency(price * item.quantity)}
                        </span>
                        <button
                          onClick={() => handleRemove(p._id, item.size)}
                          aria-label="Remove"
                          className="rounded p-1 text-muted-foreground hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="sticky bottom-0 border-t border-border bg-background p-4">
            <div className="mb-3 flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-bold">{formatCurrency(subtotal)}</span>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Shipping & taxes calculated at checkout.
            </p>
            <Button onClick={goCheckout} size="lg" className="w-full">
              Checkout — {formatCurrency(subtotal)}
            </Button>
          </div>
        </>
      )}
    </Drawer>
  );
}
