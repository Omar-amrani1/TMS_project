import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "../ui/sidebar";
import { AppSidebar } from "./AppSidebar";

export const MainLayout = () => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <AppSidebar />

        <SidebarInset className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-2 border-b border-white/10 bg-black/40 backdrop-blur-xl px-4">
            <SidebarTrigger className="text-white" />
            <div className="flex-1" />
          </header>

          <main className="min-w-0 w-full flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
