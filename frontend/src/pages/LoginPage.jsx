import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Mail, Lock, LogIn } from "lucide-react";
import toast from "react-hot-toast";

import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import { useLoginMutation } from "../store/userApi.js";
import { setCredentials } from "../store/authSlice.js";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const redirect = sp.get("redirect") || "/";
  const [login, { isLoading }] = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    try {
      const res = await login(data).unwrap();
      dispatch(setCredentials(res.user));
      toast.success(`Welcome back, ${res.user.name.split(" ")[0]}`);
      navigate(redirect);
    } catch (err) {
      toast.error(err?.data?.message || "Login failed");
    }
  };

  return (
    <div className="container-x flex min-h-[calc(100vh-200px)] items-center justify-center py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-lg border border-border bg-background p-8 shadow-card"
      >
        <h1 className="font-heading text-2xl font-black">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to continue shopping.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <Input
            label="Email"
            type="email"
            icon={Mail}
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="Password"
            type="password"
            icon={Lock}
            placeholder="••••••••"
            error={errors.password?.message}
            {...register("password")}
          />
          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-accent hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Button type="submit" loading={isLoading} size="lg" className="w-full">
            <LogIn className="h-4 w-4" />
            Sign in
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/register" className="font-semibold text-accent hover:underline">
            Create one
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
