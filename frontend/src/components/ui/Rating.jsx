import { Star } from "lucide-react";
import { cn } from "../../lib/utils.js";

export default function Rating({ value = 0, size = 14, showValue = false, text, className }) {
  const v = Number(value) || 0;
  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = v >= n;
          const half = !filled && v >= n - 0.5;
          return (
            <span key={n} className="relative inline-block" style={{ width: size, height: size }}>
              <Star
                size={size}
                className="absolute inset-0 text-muted-foreground/50"
                strokeWidth={1.5}
              />
              {(filled || half) && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: half ? size / 2 : size }}
                >
                  <Star
                    size={size}
                    className="fill-yellow-400 text-yellow-400"
                    strokeWidth={1.5}
                  />
                </span>
              )}
            </span>
          );
        })}
      </div>
      {showValue && <span className="text-xs font-medium text-foreground">{v.toFixed(1)}</span>}
      {text && <span className="text-xs text-muted-foreground">{text}</span>}
    </div>
  );
}
