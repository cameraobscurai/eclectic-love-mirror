import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useRouter } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Inbox,
  BarChart3,
  ImageIcon,
  ScanEye,
  Palette,
  Upload,
  Link2,
  ExternalLink,
  LogOut,
  ChevronRight,
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
import { getInquirySummary } from "@/server/admin.functions";

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
};

const OVERVIEW: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
];

const INBOX: NavItem[] = [
  { to: "/admin/insights", label: "Inquiries & insights", icon: Inbox },
];

const INVENTORY: NavItem[] = [
  { to: "/admin/incoming", label: "Incoming photos", icon: Upload },
  { to: "/admin/image-health", label: "Image health", icon: BarChart3 },
  { to: "/admin/image-qa", label: "Image QA", icon: ImageIcon },
  { to: "/admin/colors", label: "Color QA", icon: Palette },
];

const SITE: NavItem[] = [
  { to: "/", label: "View live site", icon: ExternalLink },
  { to: "/collection", label: "Collection", icon: ScanEye },
  { to: "/contact", label: "Contact form", icon: Link2 },
];

// Crumb labels keyed off the path. Falls back to last segment if missing.
const CRUMB_LABELS: Record<string, string> = {
  "/admin": "Dashboard",
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
                  <Link
                    to={item.to}
                    className="flex items-center gap-2 text-[12px] uppercase tracking-[0.14em]"
                  >
                    <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate">{item.label}</span>
                  </Link>
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
  const [openCount, setOpenCount] = useState<number>(0);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (alive) setEmail(data.user?.email ?? null);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    getInquirySummary()
      .then((d) => alive && setOpenCount(d.open ?? 0))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/login" });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-cream text-charcoal">
        <Sidebar collapsible="icon" className="border-r border-charcoal/10">
          <SidebarHeader className="px-3 py-4">
            <Link
              to="/admin"
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
            <NavGroup label="Overview" items={OVERVIEW} pathname={pathname} />
            <NavGroup
              label="Inbox"
              items={INBOX}
              pathname={pathname}
              openCount={openCount}
            />
            <NavGroup label="Inventory" items={INVENTORY} pathname={pathname} />
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
            <div className="ml-auto flex items-center gap-3">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-charcoal/55 hover:text-charcoal"
              >
                <ExternalLink className="h-3 w-3" aria-hidden />
                Live site
              </a>
            </div>
          </header>
          <main id="main-content" className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
