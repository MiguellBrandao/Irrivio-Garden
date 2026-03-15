"use client"

import Image from "next/image"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuthStore } from "@/lib/auth/store"
import { HugeiconsIcon } from "@hugeicons/react"
import { UnfoldMoreIcon } from "@hugeicons/core-free-icons"

function CompanyLogo({
  name,
  logoPath,
  sizeClassName,
}: {
  name: string
  logoPath: string | null
  sizeClassName: string
}) {
  if (logoPath) {
    return (
      <Image
        src={logoPath}
        alt={name}
        width={40}
        height={40}
        className={`${sizeClassName} shrink-0 object-contain`}
      />
    )
  }

  return (
    <span className="text-xs font-semibold uppercase tracking-[0.18em]">
      {name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((chunk) => chunk[0])
        .join("")}
    </span>
  )
}

export function CompanySwitcher() {
  const { isMobile } = useSidebar()
  const companies = useAuthStore((state) => state.companies)
  const activeCompanyId = useAuthStore((state) => state.activeCompanyId)
  const setActiveCompany = useAuthStore((state) => state.setActiveCompany)
  const hasMultipleCompanies = companies.length > 1

  const activeCompany =
    companies.find((company) => company.id === activeCompanyId) ?? companies[0] ?? null

  if (!activeCompany) {
    return null
  }

  const companyIdentity = (
    <>
      <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden">
        <CompanyLogo
          name={activeCompany.name}
          logoPath={activeCompany.logo_path}
          sizeClassName="size-8"
        />
      </div>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{activeCompany.name}</span>
        <span className="truncate text-xs text-sidebar-foreground/70">
          {activeCompany.slug}
        </span>
      </div>
      {hasMultipleCompanies ? (
        <HugeiconsIcon icon={UnfoldMoreIcon} strokeWidth={2} className="ml-auto" />
      ) : null}
    </>
  )

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {hasMultipleCompanies ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                {companyIdentity}
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Empresas
              </DropdownMenuLabel>
              {companies.map((company) => (
                <DropdownMenuItem
                  key={company.id}
                  onClick={() => setActiveCompany(company.id)}
                  className="gap-3 p-2"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden">
                    <CompanyLogo
                      name={company.name}
                      logoPath={company.logo_path}
                      sizeClassName="size-7"
                    />
                  </div>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate font-medium">{company.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {company.slug}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <SidebarMenuButton
            asChild
            size="lg"
            className="cursor-default hover:bg-transparent active:bg-transparent"
          >
            <div>{companyIdentity}</div>
          </SidebarMenuButton>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
