import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils.js";

const variants = {
  primary:
    "bg-primary text-primary-foreground hover:opacity-90 shadow-soft",
  accent:
    "bg-accent text-accent-foreground hover:opacity-90 shadow-soft",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-muted",
  ghost: "bg-transparent text-foreground hover:bg-muted",
  danger: "bg-danger text-white hover:opacity-90",
  success: "bg-success text-white hover:opacity-90",
  link: "bg-transparent text-accent underline-offset-4 hover:underline p-0 h-auto",
};

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-base",
  xl: "h-14 px-8 text-base",
  icon: "h-10 w-10 p-0",
};

const Button = forwardRef(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className,
      children,
      asChild = false,
      ...props
    },
    ref
  ) => {
    const classes = cn(
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all focus-ring disabled:opacity-50 disabled:cursor-not-allowed select-none",
      variants[variant],
      sizes[size],
      className
    );

    const content = (
      <>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </>
    );

    if (asChild) {
      // passthrough styling for <Link>
      return (
        <span ref={ref} className={classes} {...props}>
          {content}
        </span>
      );
    }

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        disabled={disabled || loading}
        className={classes}
        {...props}
      >
        {content}
      </motion.button>
    );
  }
);
Button.displayName = "Button";
export default Button;
