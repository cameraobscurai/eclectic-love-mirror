import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useRouter } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Inbox,
  ImageIcon,
  Images,
  ScanEye,
  Upload,
  Link2,
  ExternalLink,
  LogOut,
  ChevronRight,
  Sparkles,
  PlusCircle,
  Wand2,
  Package,
  Users,
} from "lucide-react";


import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { getInquirySummary } from "@/lib/admin.functions";
import { BohCommand } from "@/components/admin/boh-command";
import { PAGES } from "@/lib/boh/boh.config";

// ---------------------------------------------------------------------------
// AdminShell — single chrome wrapper for every /admin/* page.
//
// Owns: collapsible left sidebar (grouped nav, open-inquiry badge),
// top bar (breadcrumb, sidebar trigger, "view live site", sign out).
// Pages render their own <h1> + content area; they no longer render their
// own admin-cross-nav row.
// ---------------------------------------------------------------------------

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  external?: boolean;
};

const OVERVIEW: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  // Hidden: /admin/admin (chat/agent surface) — still reachable by direct URL.
];
void Sparkles;

const INBOX: NavItem[] = [
  { to: "/admin/insights", label: "Inquiries & insights", icon: Inbox },
];

const INVENTORY: NavItem[] = [
  { to: "/admin/products", label: "Inventory", icon: Package },
  { to: "/admin/photos", label: "Collection photos", icon: ImageIcon },
  { to: "/admin/new-product", label: "New product", icon: PlusCircle },
  { to: "/admin/render", label: "Photo studio", icon: Wand2 },
  { to: "/admin/gallery", label: "Gallery", icon: Images },
];

const ACCESS: NavItem[] = [
  { to: "/admin/team", label: "Team", icon: Users },
];
void Upload;
// Hidden utility routes — still reachable by direct URL, just removed from
// sidebar to reduce admin clutter: /admin/image-health, /admin/image-qa,
// /admin/colors, /admin/incoming, /admin/upload-hero (superseded by
// /admin/new-product, which owns the title→category→photos flow).

const LIVE_ORIGIN = "https://eclectichive.com";

const SITE: NavItem[] = [
  { to: `${LIVE_ORIGIN}/`, label: "View live site", icon: ExternalLink, external: true },
  { to: `${LIVE_ORIGIN}/collection`, label: "Collection", icon: ScanEye, external: true },
  { to: `${LIVE_ORIGIN}/contact`, label: "Contact form", icon: Link2, external: true },
];

// Crumb labels keyed off the path. Falls back to last segment if missing.
const CRUMB_LABELS: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/products": "Inventory",
  "/admin/team": "Team",
  "/admin/photos": "Collection photos",
  "/admin/render": "Photo studio",
  "/admin/new-product": "New product",
  "/admin/gallery": "Gallery",
  "/admin/upload-hero": "Upload hero",
  "/admin/insights": "Inquiries & insights",
  "/admin/colors": "Color QA",
  "/admin/image-qa": "Image QA",
  "/admin/image-health": "Image health",
  "/admin/incoming": "Incoming photos",
};

function useBreadcrumbs(pathname: string) {
  const segs = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let acc = "";
  for (const s of segs) {
    acc += "/" + s;
    crumbs.push({
      label: CRUMB_LABELS[acc] ?? s.replace(/-/g, " "),
      href: acc,
    });
  }
  return crumbs;
}

function NavGroup({
  label,
  items,
  pathname,
  openCount,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  openCount?: number;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.24em] text-charcoal/45">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = item.exact
              ? pathname === item.to
              : pathname === item.to || pathname.startsWith(item.to + "/");
            const isInbox = item.to === "/admin/insights";
            return (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton asChild isActive={active}>
                  {item.external ? (
                    <a
                      href={item.to}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[12px] uppercase tracking-[0.14em]"
                    >
                      <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="truncate">{item.label}</span>
                    </a>
                  ) : (
                    <Link
                      to={item.to}
                      className="flex items-center gap-2 text-[12px] uppercase tracking-[0.14em]"
                    >
                      <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )}
                </SidebarMenuButton>
                {isInbox && openCount && openCount > 0 ? (
                  <SidebarMenuBadge className="tabular-nums">
                    {openCount}
                  </SidebarMenuBadge>
                ) : null}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const router = useRouter();
  const crumbs = useBreadcrumbs(pathname);
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [openCount, setOpenCount] = useState<number>(0);
  const [cmdOpen, setCmdOpen] = useState(false);

  // Global ⌘K — mounts once at shell so palette persists across admin subroutes.
  // Also listens for `boh:open-command` so in-page buttons (BOH home header)
  // can open it without re-implementing state.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    const onEvent = () => setCmdOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("boh:open-command", onEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("boh:open-command", onEvent);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!alive) return;
      setEmail(data.user?.email ?? null);
      if (data.user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .eq("role", "admin");
        if (alive) setIsAdmin((roles ?? []).length > 0);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  // Fetch inbox count once per mount, not on every navigation. Each nav-
  // triggered refetch hits getInquirySummary which pulls 500 rows.
  useEffect(() => {
    let alive = true;
    getInquirySummary()
      .then((d) => alive && setOpenCount(d.open ?? 0))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/login", search: { redirect: "/admin" } });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-cream text-charcoal">
        <Sidebar collapsible="icon" className="border-r border-charcoal/10">
          <SidebarHeader className="px-3 py-4">
            <Link
              to="/admin"
              search={{ page: undefined }}
              className="flex items-center gap-2 px-2 py-1 group"
              aria-label="Admin home"
            >
              <span
                className="font-display text-[1.05rem] leading-none uppercase tracking-[0.04em] truncate group-data-[collapsible=icon]:hidden"
                style={{ letterSpacing: "0.04em" }}
              >
                Eclectic Hive
              </span>
              <span className="hidden group-data-[collapsible=icon]:inline font-display text-base">
                EH
              </span>
            </Link>
            <p className="px-2 text-[9px] uppercase tracking-[0.3em] text-charcoal/45 group-data-[collapsible=icon]:hidden">
              Admin · Internal
            </p>
          </SidebarHeader>
          <SidebarContent>
            {isAdmin && (
              <>
                <NavGroup label="Overview" items={OVERVIEW} pathname={pathname} />
                <NavGroup
                  label="Inbox"
                  items={INBOX}
                  pathname={pathname}
                  openCount={openCount}
                />
              </>
            )}
            <NavGroup label="Inventory" items={INVENTORY} pathname={pathname} />
            {isAdmin && <NavGroup label="Access" items={ACCESS} pathname={pathname} />}
            <NavGroup label="Site" items={SITE} pathname={pathname} />

          </SidebarContent>
          <SidebarFooter className="border-t border-charcoal/10 px-3 py-3">
            <div className="px-2 group-data-[collapsible=icon]:hidden">
              <p className="text-[9px] uppercase tracking-[0.24em] text-charcoal/45">
                Signed in
              </p>
              <p className="mt-1 text-[11px] tabular-nums text-charcoal/85 truncate">
                {email ?? "—"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-2 flex items-center gap-2 px-2 py-1.5 text-[11px] uppercase tracking-[0.18em] text-charcoal/65 hover:text-charcoal hover:bg-charcoal/5 rounded-sm transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
            </button>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center gap-3 border-b border-charcoal/10 px-4 bg-cream sticky top-0 z-30">
            <SidebarTrigger className="text-charcoal/70 hover:text-charcoal" />
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-charcoal/55 min-w-0"
            >
              {crumbs.map((c, i) => {
                const isLast = i === crumbs.length - 1;
                return (
                  <span key={c.href} className="flex items-center gap-1.5 min-w-0">
                    {i > 0 && (
                      <ChevronRight
                        className="h-3 w-3 text-charcoal/30 shrink-0"
                        aria-hidden
                      />
                    )}
                    {isLast ? (
                      <span className="text-charcoal/85 truncate">{c.label}</span>
                    ) : (
                      <Link
                        to={c.href}
                        className="hover:text-charcoal truncate"
                      >
                        {c.label}
                      </Link>
                    )}
                  </span>
                );
              })}
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 border border-charcoal/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-charcoal/75 hover:bg-charcoal/5 hover:text-charcoal"
                title="Exit admin — back to site"
              >
                ← Exit
              </Link>
              <a
                href={LIVE_ORIGIN}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 border border-charcoal/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-charcoal/75 hover:bg-charcoal/5 hover:text-charcoal"
                title="Open live site in new tab"
              >
                <ExternalLink className="h-3 w-3" aria-hidden />
                Live
              </a>
            </div>

          </header>
          <main id="main-content" className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
      {cmdOpen && (
        <BohCommand
          onClose={() => setCmdOpen(false)}
          onZoomPage={(index) => {
            setCmdOpen(false);
            router.navigate({
              to: "/admin",
              search: { page: PAGES[index].slug } as never,
            });
          }}
          onNavigate={(route) => {
            setCmdOpen(false);
            window.location.assign(route);
          }}
        />
      )}
    </SidebarProvider>
  );
}
