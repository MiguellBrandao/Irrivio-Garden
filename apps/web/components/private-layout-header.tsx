"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

const labels: Record<string, string> = {
  dashboard: "Painel",
  calendar: "Calendario",
  gardens: "Jardins",
  employees: "Membros",
  teams: "Equipas",
  stock: "Stock",
  payments: "Pagamentos",
  quotes: "Orcamentos",
  profile: "Perfil",
}

export function PrivateLayoutHeader() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)
  const current = segments.at(-1) ?? "dashboard"
  const previous = segments.at(-2)
  const currentLabel =
    current === "new" && previous === "gardens"
      ? "Novo jardim"
      : current === "new" && previous === "employees"
        ? "Novo membro"
      : current === "new" && previous === "quotes"
        ? "Novo orcamento"
      : current === "new" && previous === "stock"
        ? "Novo produto"
      : current === "edit" && previous
        ? previous === "employees"
          ? "Editar membro"
          : previous === "quotes"
            ? "Editar orcamento"
          : previous === "stock"
            ? "Editar produto"
          : "Editar jardim"
        : labels[current] ?? current

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger className="-ml-1 text-[#215442] hover:bg-[#215442]/8" />
        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink asChild>
                <Link href="/dashboard">Floripa Intranet</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{currentLabel}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}
