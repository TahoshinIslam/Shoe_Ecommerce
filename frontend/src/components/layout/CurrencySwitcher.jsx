import { useSettings } from "../../contexts/SettingsContext.jsx";

/**
 * Small currency toggle for the header. Shows "৳ BDT" / "$ USD" pill that
 * cycles between the two on click. User choice is persisted in localStorage.
 */
export default function CurrencySwitcher({ className = "" }) {
  const { activeCurrency, setActiveCurrency } = useSettings();

  const next = activeCurrency === "BDT" ? "USD" : "BDT";
  const label = activeCurrency === "BDT" ? "৳ BDT" : "$ USD";

  return (
      <button
      onClick={() => setActiveCurrency(next)}
      aria-label={`Switch currency to ${next}`}
      title={`Switch to ${next}`}
      className={
        "rounded-md px-2 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-ring whitespace-nowrap flex-shrink-0 " +
        className
      }
    >
      {label}
    </button>
  );
}
