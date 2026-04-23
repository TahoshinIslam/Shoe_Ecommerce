import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  MapPin,
  CreditCard,
  Tag,
  ShoppingBag,
  Check,
  Loader2,
  Smartphone,
  Banknote,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import Input from "../components/ui/Input.jsx";
import Select from "../components/ui/Select.jsx";
import Textarea from "../components/ui/Textarea.jsx";
import Button from "../components/ui/Button.jsx";
import Badge from "../components/ui/Badge.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";

import {
  useGetCartQuery,
  useGetMyAddressesQuery,
  useCreateAddressMutation,
  useValidateCouponMutation,
  useCreateOrderMutation,
  useStripeCheckoutMutation,
  useBkashCreateMutation,
  useNagadCreateMutation,
  useCodCreateMutation,
} from "../store/shopApi.js";
import { selectCurrentUser } from "../store/authSlice.js";
import { formatCurrency, cn } from "../lib/utils.js";

const addressSchema = z.object({
  fullName: z.string().min(2, "Required"),
  phone: z.string().min(6, "Required"),
  street: z.string().min(3, "Required"),
  city: z.string().min(2, "Required"),
  state: z.string().optional(),
  postalCode: z.string().min(2, "Required"),
  country: z.string().min(2, "Required"),
  label: z.enum(["home", "work", "other"]).default("home"),
});

const PAYMENT_METHODS = [
  {
    id: "stripe",
    label: "Credit/Debit Card",
    desc: "Secure checkout via Stripe",
    icon: CreditCard,
    currency: "USD",
  },
  {
    id: "bkash",
    label: "bKash",
    desc: "Pay with bKash mobile banking",
    icon: Smartphone,
    currency: "BDT",
    color: "text-pink-600",
  },
  {
    id: "nagad",
    label: "Nagad",
    desc: "Pay with Nagad mobile banking",
    icon: Smartphone,
    currency: "BDT",
    color: "text-orange-600",
  },
  {
    id: "cod",
    label: "Cash on Delivery",
    desc: "Pay when your order arrives",
    icon: Banknote,
  },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);

  const { data: cartData, isLoading: cartLoading } = useGetCartQuery();
  const { data: addrData, isLoading: addrLoading } = useGetMyAddressesQuery();

  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const [createAddress, { isLoading: addrCreating }] = useCreateAddressMutation();
  const [validateCoupon, { isLoading: couponValidating }] = useValidateCouponMutation();
  const [createOrder, { isLoading: orderCreating }] = useCreateOrderMutation();
  const [stripeCheckout, { isLoading: stripeCreating }] = useStripeCheckoutMutation();
  const [bkashCreate, { isLoading: bkashCreating }] = useBkashCreateMutation();
  const [nagadCreate, { isLoading: nagadCreating }] = useNagadCreateMutation();
  const [codCreate, { isLoading: codCreating }] = useCodCreateMutation();

  const placing =
    orderCreating ||
    stripeCreating ||
    bkashCreating ||
    nagadCreating ||
    codCreating;

  // Auto-select default/first address
  useEffect(() => {
    if (!selectedAddressId && addrData?.addresses?.length > 0) {
      const def = addrData.addresses.find((a) => a.isDefault) || addrData.addresses[0];
      setSelectedAddressId(def._id);
    }
  }, [addrData, selectedAddressId]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      fullName: user?.name || "",
      phone: user?.phone || "",
      country: "Bangladesh",
      label: "home",
    },
  });

  // Totals (mirrors backend calc so user sees accurate preview)
  const items = cartData?.cart?.items ?? [];
  const totals = useMemo(() => {
    let subtotal = 0;
    for (const it of items) {
      const p = it.product;
      if (!p) continue;
      const price = p.discountPrice ?? p.basePrice;
      subtotal += price * it.quantity;
    }
    const shippingCost = subtotal > 200 || subtotal === 0 ? 0 : 10;
    let discount = 0;
    if (appliedCoupon) {
      if (appliedCoupon.coupon.discountType === "percentage") {
        discount = Math.round((subtotal * appliedCoupon.coupon.discountValue) / 100);
      } else {
        discount = appliedCoupon.coupon.discountValue;
      }
      if (appliedCoupon.coupon.maxDiscount) {
        discount = Math.min(discount, appliedCoupon.coupon.maxDiscount);
      }
    }
    const total = Math.max(0, subtotal + shippingCost - discount);
    return { subtotal, shippingCost, discount, total };
  }, [items, appliedCoupon]);

  const handleNewAddress = async (data) => {
    try {
      const res = await createAddress(data).unwrap();
      setSelectedAddressId(res.address._id);
      setAddingAddress(false);
      reset();
      toast.success("Address added");
    } catch (e) {
      toast.error(e?.data?.message || "Could not save address");
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const res = await validateCoupon({
        code: couponCode.trim(),
        subtotal: totals.subtotal,
      }).unwrap();
      setAppliedCoupon(res);
      toast.success(`Coupon applied: -${formatCurrency(res.discount)}`);
    } catch (e) {
      setAppliedCoupon(null);
      toast.error(e?.data?.message || "Invalid coupon");
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error("Please select a shipping address");
      return;
    }
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    const address = addrData.addresses.find((a) => a._id === selectedAddressId);
    if (!address) {
      toast.error("Invalid address");
      return;
    }

    try {
      // 1. Create order on backend (server re-verifies totals/stock)
      const orderRes = await createOrder({
        items: items.map((i) => ({
          product: i.product._id,
          size: i.size,
          quantity: i.quantity,
        })),
        shippingAddress: {
          fullName: address.fullName,
          phone: address.phone,
          street: address.street,
          city: address.city,
          state: address.state || "",
          postalCode: address.postalCode,
          country: address.country,
        },
        couponCode: appliedCoupon?.coupon?.code,
      }).unwrap();

      const orderId = orderRes.order._id;

      // 2. Initiate payment for selected method
      if (paymentMethod === "stripe") {
        const res = await stripeCheckout(orderId).unwrap();
        // Redirect to Stripe Checkout
        window.location.href = res.url;
      } else if (paymentMethod === "bkash") {
        const res = await bkashCreate(orderId).unwrap();
        // Save paymentID to session storage so the callback page can use it
        sessionStorage.setItem(
          "bkash:pending",
          JSON.stringify({ paymentID: res.paymentID, orderId })
        );
        window.location.href = res.url;
      } else if (paymentMethod === "nagad") {
        // Nagad requires decrypting the init response with your private key
        // (a backend step). For now, we just show a friendly message.
        await nagadCreate(orderId).unwrap();
        toast.success("Nagad payment initialized. Complete the flow in your Nagad app.");
        navigate(`/order/${orderId}`);
      } else if (paymentMethod === "cod") {
        await codCreate(orderId).unwrap();
        toast.success("Order placed! Pay in cash on delivery.");
        navigate(`/order/${orderId}`);
      }
    } catch (e) {
      toast.error(e?.data?.message || "Could not place order");
    }
  };

  if (cartLoading) {
    return (
      <div className="container-x py-16 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-x py-10">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          message="Add something before checking out."
          action={<Button onClick={() => navigate("/shop")}>Shop shoes</Button>}
        />
      </div>
    );
  }

  return (
    <div className="container-x py-10">
      <h1 className="mb-8 font-heading text-3xl font-black">Checkout</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* LEFT: form sections */}
        <div className="space-y-6">
          {/* Address */}
          <Section icon={MapPin} title="Shipping address">
            {addrLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <>
                {addrData?.addresses?.length > 0 && !addingAddress && (
                  <div className="space-y-2">
                    {addrData.addresses.map((a) => (
                      <AddressCard
                        key={a._id}
                        address={a}
                        selected={selectedAddressId === a._id}
                        onSelect={() => setSelectedAddressId(a._id)}
                      />
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => setAddingAddress(true)}
                      className="w-full"
                    >
                      + Add new address
                    </Button>
                  </div>
                )}

                {(addingAddress || addrData?.addresses?.length === 0) && (
                  <form
                    onSubmit={handleSubmit(handleNewAddress)}
                    className="space-y-3"
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        label="Full name"
                        error={errors.fullName?.message}
                        {...register("fullName")}
                      />
                      <Input
                        label="Phone"
                        error={errors.phone?.message}
                        {...register("phone")}
                      />
                    </div>
                    <Input
                      label="Street address"
                      error={errors.street?.message}
                      {...register("street")}
                    />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Input
                        label="City"
                        error={errors.city?.message}
                        {...register("city")}
                      />
                      <Input label="State / Division" {...register("state")} />
                      <Input
                        label="Postal code"
                        error={errors.postalCode?.message}
                        {...register("postalCode")}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        label="Country"
                        error={errors.country?.message}
                        {...register("country")}
                      />
                      <Select label="Label" {...register("label")}>
                        <option value="home">Home</option>
                        <option value="work">Work</option>
                        <option value="other">Other</option>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" loading={addrCreating}>
                        Save address
                      </Button>
                      {addrData?.addresses?.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setAddingAddress(false)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                )}
              </>
            )}
          </Section>

          {/* Payment */}
          <Section icon={CreditCard} title="Payment method">
            <div className="space-y-2">
              {PAYMENT_METHODS.map((m) => (
                <PaymentOption
                  key={m.id}
                  method={m}
                  selected={paymentMethod === m.id}
                  onSelect={() => setPaymentMethod(m.id)}
                />
              ))}
            </div>
            {(paymentMethod === "bkash" || paymentMethod === "nagad") && (
              <div className="mt-3 flex gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p>
                  Amount will be charged in BDT. Exchange rate applies if your cart is in a different currency.
                </p>
              </div>
            )}
          </Section>

          {/* Coupon */}
          <Section icon={Tag} title="Coupon code">
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-md border border-success/30 bg-success/10 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success" />
                  <span className="font-semibold">{appliedCoupon.coupon.code}</span>
                  <span className="text-muted-foreground">
                    -{formatCurrency(appliedCoupon.discount)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setAppliedCoupon(null);
                    setCouponCode("");
                  }}
                  className="text-xs text-danger hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter code (try WELCOME10)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleApplyCoupon}
                  loading={couponValidating}
                >
                  Apply
                </Button>
              </div>
            )}
          </Section>
        </div>

        {/* RIGHT: order summary (sticky) */}
        <motion.aside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:sticky lg:top-24 lg:self-start"
        >
          <div className="rounded-lg border border-border bg-muted/20 p-5">
            <h2 className="mb-4 font-heading text-lg font-bold">Order summary</h2>

            <ul className="space-y-3">
              {items.map((it) => {
                const p = it.product;
                if (!p) return null;
                const price = p.discountPrice ?? p.basePrice;
                return (
                  <li key={`${p._id}-${it.size}`} className="flex gap-3">
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-background">
                      <img
                        src={p.images?.[0]}
                        alt={p.name}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-bold text-background">
                        {it.quantity}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <p className="line-clamp-1 text-sm font-semibold">
                          {p.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Size {it.size}
                        </p>
                      </div>
                      <p className="text-sm font-bold">
                        {formatCurrency(price * it.quantity)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
              <Row label="Subtotal" value={formatCurrency(totals.subtotal)} />
              <Row
                label="Shipping"
                value={
                  totals.shippingCost === 0 ? (
                    <span className="text-success font-semibold">Free</span>
                  ) : (
                    formatCurrency(totals.shippingCost)
                  )
                }
              />
              {totals.discount > 0 && (
                <Row
                  label={`Discount`}
                  value={`-${formatCurrency(totals.discount)}`}
                  valueClass="text-success"
                />
              )}
              <Row
                label="Total"
                value={formatCurrency(totals.total)}
                className="border-t border-border pt-3 text-base font-bold"
              />
            </div>

            <Button
              onClick={handlePlaceOrder}
              loading={placing}
              disabled={!selectedAddressId || items.length === 0}
              size="lg"
              className="mt-5 w-full"
            >
              Place order — {formatCurrency(totals.total)}
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              By placing your order you agree to our Terms.
            </p>
          </div>
        </motion.aside>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent" />
        <h2 className="font-heading text-lg font-bold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function AddressCard({ address, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-md border p-3 text-left transition-all",
        selected
          ? "border-accent bg-accent/5 ring-1 ring-accent"
          : "border-border hover:border-foreground/40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm flex items-center gap-2">
            {address.fullName}
            {address.isDefault && <Badge variant="accent">Default</Badge>}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {address.street}, {address.city}
            {address.state && `, ${address.state}`} {address.postalCode}
          </p>
          <p className="text-xs text-muted-foreground">
            {address.country} · {address.phone}
          </p>
        </div>
        {selected && (
          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Check className="h-3 w-3" />
          </div>
        )}
      </div>
    </button>
  );
}

function PaymentOption({ method, selected, onSelect }) {
  const Icon = method.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-md border p-3 text-left transition-all",
        selected
          ? "border-accent bg-accent/5 ring-1 ring-accent"
          : "border-border hover:border-foreground/40"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-muted",
          method.color
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">{method.label}</p>
        <p className="text-xs text-muted-foreground">{method.desc}</p>
      </div>
      {selected && (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Check className="h-3 w-3" />
        </div>
      )}
    </button>
  );
}

function Row({ label, value, valueClass, className }) {
  return (
    <div className={cn("flex justify-between", className)}>
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", valueClass)}>{value}</span>
    </div>
  );
}