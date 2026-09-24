import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/sidebar-context";

export default function GadwlyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </SidebarProvider>
  );
}
