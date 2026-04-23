import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils.js";

const Select = forwardRef(
  ({ className, label, error, hint, children, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "flex h-11 w-full appearance-none rounded-md border border-border bg-background px-3 pr-9 py-2 text-sm transition-colors focus-ring disabled:opacity-50",
            error && "border-danger focus:ring-danger",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
);
Select.displayName = "Select";
export default Select;