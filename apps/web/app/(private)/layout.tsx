import { AppSidebar } from "@/components/app-sidebar"
import { AuthSessionGuard } from "@/components/auth-session-guard"
import { PrivateLayoutHeader } from "@/components/private-layout-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <AuthSessionGuard>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-[linear-gradient(180deg,_#f5f1e5_0%,_#ede6d5_100%)]">
          <PrivateLayoutHeader />
          <div className="flex flex-1 flex-col p-4 pt-0 md:p-6 md:pt-0">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthSessionGuard>
  )
}
