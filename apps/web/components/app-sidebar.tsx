"use client"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { CompanySwitcher } from "@/components/company-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuthStore } from "@/lib/auth/store"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Calendar03Icon,
  ChartRingIcon,
  FileDownloadIcon,
  Invoice03Icon,
  Leaf02Icon,
  PackageIcon,
  PencilEdit02Icon,
  SentIcon,
  UserGroupIcon,
  UserIcon,
} from "@hugeicons/core-free-icons"

const commonItems = [
  {
    title: "Painel",
    url: "/dashboard",
    icon: <HugeiconsIcon icon={ChartRingIcon} strokeWidth={2} />,
  },
  {
    title: "Calendario",
    url: "/calendar",
    icon: <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} />,
  },
  {
    title: "Stock",
    url: "/stock",
    icon: <HugeiconsIcon icon={PackageIcon} strokeWidth={2} />,
  },
]

const employeeManagementItems = [
  {
    name: "Jardins",
    url: "/gardens",
    icon: <HugeiconsIcon icon={Leaf02Icon} strokeWidth={2} />,
  },
]

const adminManagementItems = [
  {
    name: "Jardins",
    url: "/gardens",
    icon: <HugeiconsIcon icon={Leaf02Icon} strokeWidth={2} />,
  },
  {
    name: "Membros",
    url: "/employees",
    icon: <HugeiconsIcon icon={UserIcon} strokeWidth={2} />,
  },
  {
    name: "Equipas",
    url: "/teams",
    icon: <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />,
  },
  {
    name: "Settings",
    url: "/settings",
    icon: <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />,
  },
]

const adminFinanceItems = [
  {
    title: "Pagamentos",
    url: "/payments",
    icon: <HugeiconsIcon icon={Invoice03Icon} strokeWidth={2} />,
  },
  {
    title: "Orcamentos",
    url: "/quotes",
    icon: <HugeiconsIcon icon={SentIcon} strokeWidth={2} />,
  },
  {
    title: "Relatorios",
    url: "/reports",
    icon: <HugeiconsIcon icon={FileDownloadIcon} strokeWidth={2} />,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useAuthStore((state) => state.user)
  const activeCompany = useAuthStore((state) =>
    state.companies.find((company) => company.id === state.activeCompanyId) ?? null
  )
  const isAdmin = activeCompany?.role === "admin"

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <CompanySwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={commonItems} />
        {isAdmin ? (
          <>
            <NavProjects projects={adminManagementItems} title="Administracao" />
            <NavSecondary items={adminFinanceItems} title="Financeiro" />
          </>
        ) : (
          <NavProjects projects={employeeManagementItems} title="Operacao" />
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: user?.name ?? "Sessao local",
            email: user?.email ?? "sem-login@floripa.local",
            avatar: "",
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
