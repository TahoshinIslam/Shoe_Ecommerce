import { cn } from "../../lib/utils.js";

export const Card = ({ className, ...props }) => (
  <div
    className={cn(
      "rounded-lg border border-border bg-background shadow-soft",
      className
    )}
    {...props}
  />
);

export const CardHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
);

export const CardTitle = ({ className, ...props }) => (
  <h3
    className={cn("font-heading text-xl font-semibold tracking-tight", className)}
    {...props}
  />
);

export const CardDescription = ({ className, ...props }) => (
  <p className={cn("text-sm text-muted-foreground", className)} {...props} />
);

export const CardContent = ({ className, ...props }) => (
  <div className={cn("p-6 pt-0", className)} {...props} />
);

export const CardFooter = ({ className, ...props }) => (
  <div className={cn("flex items-center p-6 pt-0", className)} {...props} />
);
