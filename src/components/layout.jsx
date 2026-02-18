import { useLocation } from "react-router";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";

const pageTitles = {
  "/": "Dashboard",
  "/properties": "Properties",
  "/properties/new": "Add Property",
  "/assets": "Assets",
  "/assets/new": "Add Asset",
  "/service-records": "Service Records",
  "/service-records/new": "Add Service Record",
  "/maintenance": "Maintenance Tasks",
  "/maintenance/new": "Add Task",
  "/contractors": "Contractors",
  "/contractors/new": "Add Contractor",
  "/profile": "Profile",
};

function getPageTitle(pathname) {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.match(/^\/properties\/[^/]+\/edit$/)) return "Edit Property";
  if (pathname.match(/^\/properties\/[^/]+$/)) return "Property Details";
  if (pathname.match(/^\/assets\/[^/]+\/edit$/)) return "Edit Asset";
  if (pathname.match(/^\/assets\/[^/]+$/)) return "Asset Details";
  if (pathname.match(/^\/service-records\/[^/]+\/edit$/))
    return "Edit Service Record";
  if (pathname.match(/^\/service-records\/[^/]+$/))
    return "Service Record Details";
  if (pathname.match(/^\/maintenance\/[^/]+\/edit$/)) return "Edit Task";
  if (pathname.match(/^\/maintenance\/[^/]+$/)) return "Task Details";
  if (pathname.match(/^\/contractors\/[^/]+\/edit$/)) return "Edit Contractor";
  if (pathname.match(/^\/contractors\/[^/]+$/)) return "Contractor Details";
  return "RentTrack";
}

function getBreadcrumbs(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = [{ label: "Home", href: "/" }];

  if (segments.length === 0) return crumbs;

  const base = `/${segments[0]}`;
  const baseLabel =
    segments[0].charAt(0).toUpperCase() +
    segments[0].slice(1).replace(/-/g, " ");
  crumbs.push({ label: baseLabel, href: base });

  if (segments.length > 1) {
    crumbs.push({ label: getPageTitle(pathname) });
  }

  return crumbs;
}

export function Layout({ children }) {
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);
  const breadcrumbs = getBreadcrumbs(location.pathname);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-1 text-sm">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && (
                  <span className="text-muted-foreground">/</span>
                )}
                {crumb.href ? (
                  <span className="text-muted-foreground hover:text-foreground cursor-default">
                    {crumb.label}
                  </span>
                ) : (
                  <span className="font-medium">{crumb.label}</span>
                )}
              </span>
            ))}
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
