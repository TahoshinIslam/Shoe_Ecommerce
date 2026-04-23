import { forwardRef } from "react";
import { cn } from "../../lib/utils.js";

const Input = forwardRef(
  ({ className, type = "text", error, label, hint, icon: Icon, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            "flex h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-ring disabled:opacity-50",
            Icon && "pl-10",
            error && "border-danger focus:ring-danger",
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
);
Input.displayName = "Input";
export default Input;
