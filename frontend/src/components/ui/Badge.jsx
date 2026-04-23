import { cn } from "../../lib/utils.js";

const variants = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary text-primary-foreground",
  accent: "bg-accent text-accent-foreground",
  success: "bg-success/15 text-success border border-success/30",
  warning: "bg-warning/15 text-warning border border-warning/30",
  danger: "bg-danger/15 text-danger border border-danger/30",
  outline: "border border-border text-foreground",
};

export default function Badge({ variant = "default", className, children, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
