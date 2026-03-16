"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ProductsStockTab } from "@/features/stock/products-stock-tab"
import { StockRulesTab } from "@/features/stock/stock-rules-tab"
import { useAuthStore } from "@/lib/auth/store"
import { cn } from "@/lib/utils"

type StockTab = "products" | "rules"

export function StockListPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const activeCompanyId = useAuthStore((state) => state.activeCompanyId)
  const activeCompany = useAuthStore((state) =>
    state.companies.find((company) => company.id === state.activeCompanyId) ?? null
  )
  const isAdmin = activeCompany?.role === "admin"
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab: StockTab = searchParams.get("tab") === "rules" ? "rules" : "products"

  if (!accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sessao em falta</CardTitle>
          <CardDescription>
            Faz login novamente antes de consultar o stock.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!activeCompanyId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Empresa em falta</CardTitle>
          <CardDescription>
            Seleciona uma empresa antes de consultar o stock.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  function handleTabChange(tab: StockTab) {
    const params = new URLSearchParams(searchParams.toString())

    if (tab === "rules") {
      params.set("tab", "rules")
    } else {
      params.delete("tab")
    }

    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  return (
    <div className="space-y-4">
      <div className="inline-flex w-full rounded-4xl border border-[#dfd7c0] bg-white p-1 sm:w-auto">
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "flex-1 rounded-4xl px-5 sm:flex-none",
            activeTab === "products" && "bg-[#215442] text-white hover:bg-[#183b2f] hover:text-white"
          )}
          onClick={() => handleTabChange("products")}
        >
          Stock
        </Button>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "flex-1 rounded-4xl px-5 sm:flex-none",
            activeTab === "rules" && "bg-[#215442] text-white hover:bg-[#183b2f] hover:text-white"
          )}
          onClick={() => handleTabChange("rules")}
        >
          Regras de negocio
        </Button>
      </div>

      {activeTab === "products" ? (
        <ProductsStockTab
          accessToken={accessToken}
          activeCompanyId={activeCompanyId}
          isAdmin={isAdmin}
        />
      ) : (
        <StockRulesTab
          accessToken={accessToken}
          activeCompanyId={activeCompanyId}
          isAdmin={isAdmin}
        />
      )}
    </div>
  )
}
