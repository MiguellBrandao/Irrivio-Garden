"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { useAuthStore } from "@/lib/auth/store"
import { cn } from "@/lib/utils"

type GardenSectionsLayoutProps = {
  gardenId: string
  children: React.ReactNode
}

const sections = [
  { key: "details", label: "Detalhes", getHref: (gardenId: string) => `/gardens/${gardenId}` },
  {
    key: "products",
    label: "Produtos utilizados",
    getHref: (gardenId: string) => `/gardens/${gardenId}/products`,
  },
  {
    key: "irrigation",
    label: "Sistema de irrigacao",
    getHref: (gardenId: string) => `/gardens/${gardenId}/irrigation`,
  },
  {
    key: "expenses",
    label: "Despesas",
    getHref: (gardenId: string) => `/gardens/${gardenId}/expenses`,
  },
]

const sectionLinkClassName =
  "flex min-h-10 w-full items-center rounded-lg px-3 py-2 text-sm font-medium outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring"

export function GardenSectionsLayout({
  gardenId,
  children,
}: GardenSectionsLayoutProps) {
  const pathname = usePathname()
  const activeCompany = useAuthStore((state) =>
    state.companies.find((company) => company.id === state.activeCompanyId) ?? null
  )
  const isAdmin = activeCompany?.role === "admin"
  const visibleSections = isAdmin
    ? sections
    : sections.filter((section) => section.key !== "expenses")

  return (
    <div className="-mx-4 min-h-[calc(100svh-8rem)] md:-mx-6 lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block">
        <div className="sticky top-16 flex h-[calc(100svh-4rem)] flex-col">
          <div className="px-5 py-5">
            <p className="px-3 text-xs font-semibold uppercase tracking-[0.22em] text-sidebar-foreground/60">
              Jardim
            </p>
          </div>

          <nav className="flex-1 px-3 pb-6">
            <div className="space-y-1">
              {visibleSections.map((section) => {
                const href = section.getHref(gardenId)
                const isActive = pathname === href

                return (
                  <Link
                    key={section.key}
                    href={href}
                    className={cn(
                      sectionLinkClassName,
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    {section.label}
                  </Link>
                )
              })}
            </div>
          </nav>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="px-4 py-3 lg:hidden">
          <nav className="flex gap-2 overflow-x-auto pb-1">
            {visibleSections.map((section) => {
              const href = section.getHref(gardenId)
              const isActive = pathname === href

              return (
                <Link
                  key={section.key}
                  href={href}
                  className={cn(
                    "inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                    isActive
                      ? "border-sidebar-accent bg-sidebar-accent text-sidebar-accent-foreground"
                      : "border-[#dfd7c0] bg-white text-[#1f2f27] hover:border-[#cfc5a9]"
                  )}
                >
                  {section.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <section className="min-h-[calc(100svh-8rem)] px-4 py-5 md:px-6">
          {children}
        </section>
      </div>
    </div>
  )
}
