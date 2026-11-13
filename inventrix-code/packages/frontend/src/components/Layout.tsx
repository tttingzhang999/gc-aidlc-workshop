import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { gsap } from "../fx/gsap";
import Button from "../ui/Button";
import LinkButton from "../ui/LinkButton";
import Marquee from "../ui/Marquee";
import { useToast } from "../ui/Toast";

interface NavItem {
  to: string;
  label: string;
  match: (path: string) => boolean;
  badge?: number;
}

const FOOTER_TICKER = [
  "INVENTRIX",
  "NEON ORBIT",
  "ZERO GRAVITY RETAIL",
  "NO BORING CHECKOUTS",
  "STOCK IN HYPERSPACE",
];

function useNavItems(): NavItem[] {
  const { user } = useAuth();
  const { count } = useCart();
  const items: NavItem[] = [
    {
      to: "/",
      label: "Store",
      match: (p) => p === "/" || p.startsWith("/products"),
    },
    {
      to: "/gomoku",
      label: "Gomoku",
      match: (p) => p.startsWith("/gomoku"),
    },
    {
      to: "/cart",
      label: "Cart",
      match: (p) => p.startsWith("/cart"),
      badge: count,
    },
    {
      to: "/role",
      label: "Role",
      match: (p) => p.startsWith("/role"),
    },
  ];
  if (user)
    items.push({
      to: "/orders",
      label: "My Orders",
      match: (p) => p.startsWith("/orders"),
    });
  if (user?.role === "admin")
    items.push({
      to: "/admin",
      label: "Admin",
      match: (p) => p.startsWith("/admin"),
    });
  return items;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const items = useNavItems();
  const [menuOpen, setMenuOpen] = useState(false);
  const linksRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const moveIndicator = useCallback(() => {
    const container = linksRef.current;
    const indicator = indicatorRef.current;
    if (!container || !indicator) return;
    const active = container.querySelector<HTMLElement>('[data-active="true"]');
    if (!active) {
      gsap.to(indicator, { opacity: 0, duration: 0.2 });
      return;
    }
    gsap.to(indicator, {
      x: active.offsetLeft,
      width: active.offsetWidth,
      opacity: 1,
      duration: 0.6,
      ease: "elastic.out(1, 0.6)",
    });
  }, []);

  useLayoutEffect(moveIndicator, [pathname, items.length, moveIndicator]);

  useEffect(() => {
    window.addEventListener("resize", moveIndicator);
    return () => window.removeEventListener("resize", moveIndicator);
  }, [moveIndicator]);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menuOpen || !menu) return;
    const tl = gsap.timeline();
    tl.fromTo(
      menu,
      { clipPath: "circle(0% at 100% 0%)" },
      { clipPath: "circle(150% at 100% 0%)", duration: 0.7, ease: "expo.out" },
    ).from(
      menu.querySelectorAll("[data-menu-item]"),
      {
        x: 120,
        opacity: 0,
        skewX: -20,
        stagger: 0.07,
        duration: 0.6,
        ease: "back.out(2)",
      },
      0.15,
    );
    return () => {
      tl.kill();
    };
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    toast.info("Logged out", "Your session has left the orbit.");
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 px-3 pt-3 md:px-6">
        <nav className="glass mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-full px-4 py-2.5 md:px-6">
          <Link
            to="/"
            data-testid="nav-logo"
            className="group flex items-center gap-2"
          >
            <span className="relative inline-block h-8 w-8">
              <span className="absolute inset-0 animate-spin-slow rounded-full border-2 border-neon-cyan border-t-transparent" />
              <span className="absolute inset-2 rounded-full bg-neon-pink shadow-neon-pink transition-transform group-hover:scale-150" />
            </span>
            <span className="font-display text-lg font-black tracking-tighter text-gradient">
              INVENTRIX
            </span>
          </Link>

          <div
            ref={linksRef}
            className="relative hidden items-center gap-1 md:flex"
          >
            <span
              ref={indicatorRef}
              aria-hidden="true"
              className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-neon-pink to-neon-violet opacity-0 shadow-neon-pink"
            />
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                data-active={item.match(pathname)}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                className="relative rounded-full px-5 py-2 font-display text-xs font-bold uppercase tracking-widest text-white/80 transition-colors hover:text-white"
              >
                {item.label}
                {item.badge ? (
                  <span
                    data-testid="nav-cart-count"
                    className="ml-2 rounded-full bg-neon-lime px-1.5 py-0.5 text-[0.6rem] font-black text-void"
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <>
                <span
                  data-testid="nav-user"
                  className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1 pr-4 pl-1 text-sm"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-neon-lime to-neon-cyan font-display text-xs font-black text-void">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  {user.name}
                  {user.role === "admin" && (
                    <span className="text-[0.6rem] font-bold text-neon-lime uppercase">
                      admin
                    </span>
                  )}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleLogout}
                  data-testid="nav-logout"
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <LinkButton
                  to="/login"
                  size="sm"
                  variant="ghost"
                  testId="nav-login"
                >
                  Login
                </LinkButton>
                <LinkButton
                  to="/register"
                  size="sm"
                  variant="primary"
                  testId="nav-register"
                >
                  Register
                </LinkButton>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            data-testid="nav-menu-toggle"
            className="relative z-[60] flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-full border border-white/20 md:hidden"
          >
            <span
              className={`h-0.5 w-5 bg-white transition-transform ${menuOpen ? "translate-y-2 rotate-45" : ""}`}
            />
            <span
              className={`h-0.5 w-5 bg-neon-pink transition-opacity ${menuOpen ? "opacity-0" : ""}`}
            />
            <span
              className={`h-0.5 w-5 bg-white transition-transform ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`}
            />
          </button>
        </nav>
      </header>

      {menuOpen && (
        <div
          ref={menuRef}
          data-testid="mobile-menu"
          className="fixed inset-0 z-[55] flex flex-col justify-center gap-4 bg-gradient-to-br from-void-2 via-void-3 to-void px-8 md:hidden"
        >
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              data-menu-item
              className={`font-display text-5xl font-black tracking-tighter uppercase ${item.match(pathname) ? "text-gradient" : "text-white"}`}
            >
              {item.label}
              {item.badge ? ` (${item.badge})` : ""}
            </Link>
          ))}
          <div data-menu-item className="mt-8 flex flex-wrap gap-3">
            {user ? (
              <Button
                variant="danger"
                onClick={handleLogout}
                data-testid="mobile-logout"
              >
                Logout {user.name}
              </Button>
            ) : (
              <>
                <LinkButton to="/login" testId="mobile-login">
                  Login
                </LinkButton>
                <LinkButton
                  to="/register"
                  variant="primary"
                  testId="mobile-register"
                >
                  Register
                </LinkButton>
              </>
            )}
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 md:px-8">
        <Outlet />
      </main>

      <footer className="border-t border-white/10 bg-void/60 py-5 font-display text-2xl font-black tracking-tighter text-white/20 md:text-4xl">
        <Marquee items={FOOTER_TICKER} />
      </footer>
    </div>
  );
}
