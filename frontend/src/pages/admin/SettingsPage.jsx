import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Plus, Trash2, Gift } from "lucide-react";

const baseUrl = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

let csrfToken = null;
const getCsrfToken = async () => {
  if (csrfToken) return csrfToken;
  const r = await fetch(`${baseUrl}/csrf-token`, { credentials: "include" });
  const d = await r.json();
  csrfToken = d.csrfToken;
  return csrfToken;
};

const Section = ({ title, children, action }) => (
  <div className="rounded-lg border border-border bg-card p-6 mb-6">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {action}
    </div>
    {children}
  </div>
);

const Field = ({ label, children, help }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium mb-1">{label}</label>
    {children}
    {help && <p className="text-xs text-muted-foreground mt-1">{help}</p>}
  </div>
);

const Input = (props) => (
  <input
    {...props}
    className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
  />
);

const Select = (props) => (
  <select
    {...props}
    className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
  />
);

const Toggle = ({ checked, onChange, label, help }) => (
  <label className="flex items-start gap-3 cursor-pointer">
    <input
      type="checkbox"
      checked={!!checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-1 h-4 w-4 rounded border-border accent-primary"
    />
    <div>
      <span className="text-sm font-medium">{label}</span>
      {help && <p className="text-xs text-muted-foreground mt-0.5">{help}</p>}
    </div>
  </label>
);

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${baseUrl}/settings`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSettings(d.settings);
        else toast.error(d.message || "Failed to load settings");
      });
  }, []);

  if (!settings) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  const update = (path, value) => {
    setSettings((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split(".");
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) {
        if (cur[keys[i]] === undefined) cur[keys[i]] = {};
        cur = cur[keys[i]];
      }
      cur[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const updateTaxRule = (region, field, value) => {
    setSettings((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const rule = next.taxRules.find((r) => r.region === region);
      if (rule) rule[field] = value;
      return next;
    });
  };

  const updateZoneTier = (region, idx, field, value) => {
    setSettings((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const zone = next.shippingZones.find((z) => z.region === region);
      if (zone && zone.tiers[idx]) zone.tiers[idx][field] = value;
      return next;
    });
  };

  const addTier = (region) => {
    setSettings((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const zone = next.shippingZones.find((z) => z.region === region);
      if (zone) {
        zone.tiers.push({ name: "New Tier", baseCost: 0, freeAbove: 0 });
      }
      return next;
    });
  };

  const removeTier = (region, idx) => {
    setSettings((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const zone = next.shippingZones.find((z) => z.region === region);
      if (zone) zone.tiers.splice(idx, 1);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const token = await getCsrfToken();
      const r = await fetch(`${baseUrl}/settings`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": token,
        },
        body: JSON.stringify({
          store: settings.store,
          currency: settings.currency,
          promotions: settings.promotions,
          taxRules: settings.taxRules,
          shippingZones: settings.shippingZones,
        }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Settings saved");
        setSettings(d.settings);
      } else {
        toast.error(d.message || "Save failed");
      }
    } catch (e) {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Store Settings</h1>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      <Section title="Store info">
        <Field label="Store name">
          <Input
            value={settings.store.name}
            onChange={(e) => update("store.name", e.target.value)}
          />
        </Field>
        <Field label="Support email">
          <Input
            type="email"
            value={settings.store.supportEmail}
            onChange={(e) => update("store.supportEmail", e.target.value)}
          />
        </Field>
        <Field label="Support phone">
          <Input
            value={settings.store.supportPhone}
            onChange={(e) => update("store.supportPhone", e.target.value)}
          />
        </Field>
      </Section>

      <Section title="Currency">
        <Field
          label="Default display currency"
          help="What customers see before they pick a region at checkout."
        >
          <Select
            value={settings.currency.defaultDisplay}
            onChange={(e) => update("currency.defaultDisplay", e.target.value)}
          >
            <option value="BDT">BDT (৳)</option>
            <option value="USD">USD ($)</option>
          </Select>
        </Field>
        <Field
          label="Exchange rate (1 USD = X BDT)"
          help="Product prices are stored in USD. This rate converts to BDT for BD customers."
        >
          <Input
            type="number"
            step="0.01"
            value={settings.currency.usdToBdt}
            onChange={(e) =>
              update("currency.usdToBdt", Number(e.target.value) || 0)
            }
          />
        </Field>
      </Section>

      <Section
        title={
          <span className="inline-flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Promotions
          </span>
        }
      >
        <Toggle
          checked={settings.promotions?.firstOrderFreeShipping}
          onChange={(v) => update("promotions.firstOrderFreeShipping", v)}
          label="Free shipping on first order"
          help="When a customer places their very first order, shipping is automatically waived. Doesn't apply to repeat orders."
        />
      </Section>

      <Section title="Tax rules">
        {settings.taxRules.map((rule) => (
          <div
            key={rule.region}
            className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mb-4 p-3 rounded border border-border"
          >
            <Field label="Region">
              <Input value={rule.region} disabled />
            </Field>
            <Field label="Label">
              <Input
                value={rule.label}
                onChange={(e) =>
                  updateTaxRule(rule.region, "label", e.target.value)
                }
              />
            </Field>
            <Field label="Rate (e.g. 0.15 = 15%)">
              <Input
                type="number"
                step="0.001"
                min="0"
                max="1"
                value={rule.rate}
                onChange={(e) =>
                  updateTaxRule(rule.region, "rate", Number(e.target.value))
                }
              />
            </Field>
            <Field label="Tax-inclusive pricing?">
              <Select
                value={rule.inclusive ? "yes" : "no"}
                onChange={(e) =>
                  updateTaxRule(rule.region, "inclusive", e.target.value === "yes")
                }
              >
                <option value="no">No (added at checkout)</option>
                <option value="yes">Yes (included in price)</option>
              </Select>
            </Field>
          </div>
        ))}
      </Section>

      {settings.shippingZones.map((zone) => (
        <Section
          key={zone.region}
          title={`Shipping — ${zone.region} (${zone.currency})`}
          action={
            <button
              onClick={() => addTier(zone.region)}
              className="inline-flex items-center gap-1 text-sm rounded border border-border px-3 py-1.5 hover:bg-accent"
            >
              <Plus size={14} /> Add tier
            </button>
          }
        >
          {zone.tiers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tiers configured. Add one to enable shipping for this region.
            </p>
          ) : (
            zone.tiers.map((tier, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end mb-3 p-3 rounded border border-border"
              >
                <Field label="Tier name">
                  <Input
                    value={tier.name}
                    onChange={(e) =>
                      updateZoneTier(zone.region, idx, "name", e.target.value)
                    }
                  />
                </Field>
                <Field label={`Base cost (${zone.currency})`}>
                  <Input
                    type="number"
                    min="0"
                    value={tier.baseCost}
                    onChange={(e) =>
                      updateZoneTier(
                        zone.region,
                        idx,
                        "baseCost",
                        Number(e.target.value) || 0,
                      )
                    }
                  />
                </Field>
                <Field
                  label={`Free above (${zone.currency})`}
                  help="0 = never free"
                >
                  <Input
                    type="number"
                    min="0"
                    value={tier.freeAbove}
                    onChange={(e) =>
                      updateZoneTier(
                        zone.region,
                        idx,
                        "freeAbove",
                        Number(e.target.value) || 0,
                      )
                    }
                  />
                </Field>
                <button
                  onClick={() => removeTier(zone.region, idx)}
                  className="rounded border border-border p-2 text-destructive hover:bg-destructive/10"
                  title="Remove tier"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </Section>
      ))}
    </div>
  );
}
