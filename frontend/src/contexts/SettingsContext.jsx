import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const SettingsContext = createContext(null);

const DEFAULTS = {
  store: { name: "Store" },
  currency: { defaultDisplay: "BDT", usdToBdt: 120 },
};

const baseUrl = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

const STORAGE_KEY = "ss:currency";
const SETTINGS_CACHE_KEY = "ss:settings";
const SETTINGS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Decide which currency to show:
 * 1. Manual user override (localStorage) — wins.
 * 2. Browser locale — bn/bn-BD/etc → BDT, else USD.
 * 3. Server default fallback.
 */
const detectCurrency = (serverDefault) => {
  if (typeof window === "undefined") return serverDefault;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "BDT" || stored === "USD") return stored;

  const lang = (navigator.language || "").toLowerCase();
  if (lang.startsWith("bn") || lang.includes("-bd")) return "BDT";
  return "USD";
};

const getCachedSettings = () => {
  try {
    const raw = sessionStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > SETTINGS_CACHE_TTL) return null;
    return parsed.data;
  } catch {
    return null;
  }
};

const setCachedSettings = (data) => {
  try {
    sessionStorage.setItem(
      SETTINGS_CACHE_KEY,
      JSON.stringify({ ts: Date.now(), data }),
    );
  } catch {
    // ignore storage errors
  }
};

export const SettingsProvider = ({ children }) => {
  const cached = getCachedSettings();
  const [settings, setSettings] = useState(cached || DEFAULTS);
  const [loaded, setLoaded] = useState(!!cached);
  const [activeCurrency, setActiveCurrencyState] = useState(
    detectCurrency(cached?.currency?.defaultDisplay || "USD"),
  );

  useEffect(() => {
    // Skip network fetch if we have valid cached settings
    if (cached) {
      setLoaded(true);
      return;
    }

    fetch(`${baseUrl}/settings/public`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setSettings(d.settings);
          setCachedSettings(d.settings);
          setActiveCurrencyState(detectCurrency(d.settings.currency.defaultDisplay));
        }
      })
      .catch(() => {
        setActiveCurrencyState(detectCurrency("USD"));
      })
      .finally(() => setLoaded(true));
  }, []);

  const setActiveCurrency = (currency) => {
    if (currency !== "BDT" && currency !== "USD") return;
    localStorage.setItem(STORAGE_KEY, currency);
    setActiveCurrencyState(currency);
  };

  const value = useMemo(
    () => ({
      ...settings,
      loaded,
      activeCurrency,
      setActiveCurrency,
      /**
       * Format a USD-priced product into the active display currency.
       */
      formatPrice: (usdPrice) => {
        const cur = activeCurrency;
        const value =
          cur === "BDT"
            ? Math.round(Number(usdPrice) * settings.currency.usdToBdt)
            : Number(usdPrice);
        try {
          return new Intl.NumberFormat(cur === "BDT" ? "en-BD" : "en-US", {
            style: "currency",
            currency: cur,
            maximumFractionDigits: 0,
          }).format(value || 0);
        } catch {
          return `${cur} ${value}`;
        }
      },
    }),
    [settings, loaded, activeCurrency],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    return {
      ...DEFAULTS,
      loaded: false,
      activeCurrency: "USD",
      setActiveCurrency: () => {},
      formatPrice: (v) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(Number(v) || 0),
    };
  }
  return ctx;
};
