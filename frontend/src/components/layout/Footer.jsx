import { Link } from "react-router-dom";
import { Facebook, Instagram, Twitter, Youtube, Mail } from "lucide-react";
import { useTheme } from "../../contexts/ThemeProvider.jsx";
import { useSettings } from "../../contexts/SettingsContext.jsx";

export default function Footer() {
  const { theme } = useTheme();
  const settings = useSettings();
  // Settings is the source of truth for shop name; theme is the legacy fallback.
  const siteName = settings?.store?.name || theme?.siteName || "ShoeStore";

  return (
    <footer className="mt-24 border-t border-border bg-muted/30">
      <div className="container-x py-16">
        <div className="grid gap-12 md:grid-cols-4">
          <div>
            <h3 className="font-heading text-xl font-black">
              {siteName}
              <span className="text-accent">.</span>
            </h3>
            <p className="mt-3 text-sm text-muted-foreground">
              {theme?.tagline || "Step into something new."}
            </p>
            <div className="mt-5 flex gap-3">
              {[Facebook, Instagram, Twitter, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-background text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-ring"
                  aria-label="Social link"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <FooterCol title="Shop">
            <FooterLink to="/shop">All Shoes</FooterLink>
            <FooterLink to="/shop?gender=men">Men</FooterLink>
            <FooterLink to="/shop?gender=women">Women</FooterLink>
            <FooterLink to="/shop?gender=kids">Kids</FooterLink>
            <FooterLink to="/shop?featured=true">Featured</FooterLink>
          </FooterCol>

          <FooterCol title="Support">
            <FooterLink to="/orders">Track Order</FooterLink>
            <FooterLink to="/profile">Account</FooterLink>
            <FooterLink to="#">Returns</FooterLink>
            <FooterLink to="#">Size Guide</FooterLink>
            <FooterLink to="#">Contact</FooterLink>
          </FooterCol>

          <FooterCol title="Newsletter">
            <p className="text-sm text-muted-foreground">
              Get 10% off your first order.
            </p>
            <form className="mt-3 flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <div className="relative flex-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-ring"
                />
              </div>
              <button
                type="submit"
                className="rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
              >
                Join
              </button>
            </form>
          </FooterCol>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} {siteName}. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link to="#" className="hover:text-foreground">Privacy</Link>
            <Link to="#" className="hover:text-foreground">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }) {
  return (
    <div>
      <h4 className="font-heading text-sm font-bold uppercase tracking-wider text-foreground">
        {title}
      </h4>
      <ul className="mt-4 space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({ to, children }) {
  return (
    <li>
      <Link
        to={to}
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {children}
      </Link>
    </li>
  );
}
