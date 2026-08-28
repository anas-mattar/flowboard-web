// ADR-13/R-5: authenticated app shell — every signed-in screen shares one persistent
// Sidebar instead of each page owning its own shell fragment (no sidebar existed before
// this feature). TopBar stays page-rendered (R-6: it needs the currently-open board's
// summary, which only the page knows) — this layout only supplies the redirect guard and
// the Sidebar + content frame around {children}.
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth-config";
import { Sidebar } from "@/components/layout/sidebar";
import { SidebarProvider } from "@/components/layout/sidebar-context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </SidebarProvider>
  );
}
