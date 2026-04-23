import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "../../lib/utils.js";

export default function Drawer({
  open,
  onClose,
  side = "right",
  title,
  children,
  className,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const fromX = side === "right" ? "100%" : "-100%";
  const align = side === "right" ? "right-0" : "left-0";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: fromX }}
            animate={{ x: 0 }}
            exit={{ x: fromX }}
            transition={{ type: "spring", damping: 30, stiffness: 250 }}
            className={cn(
              "fixed top-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-hover",
              align,
              className
            )}
          >
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="font-heading text-lg font-semibold">{title}</h3>
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-ring"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
