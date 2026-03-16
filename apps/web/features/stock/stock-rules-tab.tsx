"use client"

import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { Add01Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { deleteStockRule, listStockRules } from "@/features/stock/api"
import {
  describeStockRule,
  formatStockQuantity,
} from "@/features/stock/utils"

const PAGE_SIZE_OPTIONS = [5, 10, 20]

type StockRulesTabProps = {
  accessToken: string
  activeCompanyId: string
  isAdmin: boolean
}

export function StockRulesTab({
  accessToken,
  activeCompanyId,
  isAdmin,
}: StockRulesTabProps) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const stockRulesQuery = useQuery({
    queryKey: ["stock-rules", activeCompanyId, accessToken],
    queryFn: () => listStockRules(accessToken),
    enabled: Boolean(accessToken && activeCompanyId && isAdmin),
  })

  const deleteMutation = useMutation({
    mutationFn: async (ruleId: string) => deleteStockRule(accessToken, ruleId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["stock-rules"] })
      toast.success("Regra apagada com sucesso.")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel apagar a regra.")
    },
  })

  const filteredRules = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    if (!normalizedSearch) {
      return stockRulesQuery.data ?? []
    }

    return (stockRulesQuery.data ?? []).filter((rule) =>
      [rule.product_name, describeStockRule(rule), rule.emails.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    )
  }, [search, stockRulesQuery.data])

  const totalPages = Math.max(1, Math.ceil(filteredRules.length / pageSize))
  const safePageIndex = Math.min(pageIndex, totalPages - 1)
  const paginatedRules = filteredRules.slice(
    safePageIndex * pageSize,
    safePageIndex * pageSize + pageSize
  )

  return (
    <Card className="border-[#dfd7c0] bg-[#fbf8ef]">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <CardTitle>Regras de negocio</CardTitle>
          </div>
          {isAdmin ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPageIndex(0)
                }}
                placeholder="Pesquisar produto, regra ou email"
                className="w-full min-w-64 bg-white"
              />
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value))
                  setPageIndex(0)
                }}
              >
                <SelectTrigger className="w-full bg-white sm:w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}/pag.
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                asChild
                className="bg-[#215442] text-white hover:bg-[#183b2f]"
              >
                <Link href="/stock/rules/new">
                  <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                  Criar regra
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!isAdmin ? (
          <div className="rounded-2xl border border-dashed border-[#dfd7c0] bg-white px-4 py-8 text-center text-sm text-muted-foreground">
            Apenas administradores podem gerir regras de negocio de stock.
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {stockRulesQuery.isLoading ? (
                <div className="rounded-2xl border border-[#dfd7c0] bg-white px-4 py-8 text-center text-sm text-muted-foreground">
                  A carregar regras...
                </div>
              ) : paginatedRules.length ? (
                paginatedRules.map((rule) => (
                  <article
                    key={rule.id}
                    className="rounded-2xl border border-[#dfd7c0] bg-white p-4 shadow-sm"
                  >
                    <div className="space-y-1">
                      <h3 className="font-medium text-[#1f2f27]">{rule.product_name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {formatStockQuantity(rule.product_stock_quantity, rule.product_unit)} em stock
                      </p>
                    </div>

                    <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
                      <div className="space-y-1">
                        <dt className="text-muted-foreground">Regra</dt>
                        <dd>{describeStockRule(rule)}</dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-muted-foreground">Emails</dt>
                        <dd className="space-y-1">
                          {rule.emails.map((email) => (
                            <div key={email}>{email}</div>
                          ))}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex justify-end gap-2">
                      <Button asChild variant="outline" size="icon-sm">
                        <Link href={`/stock/rules/${rule.id}/edit`}>
                          <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                          <span className="sr-only">Editar regra</span>
                        </Link>
                      </Button>
                      <DeleteConfirmDialog
                        title="Apagar regra"
                        description="Tens a certeza que queres apagar esta regra de stock?"
                        onConfirm={() => deleteMutation.mutate(rule.id)}
                        isPending={deleteMutation.isPending}
                        srLabel="Apagar regra"
                      />
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-[#dfd7c0] bg-white px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhuma regra encontrada.
                </div>
              )}
            </div>

            <div className="hidden overflow-hidden rounded-2xl border border-[#dfd7c0] bg-white md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Regra</TableHead>
                    <TableHead>Emails</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockRulesQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        A carregar regras...
                      </TableCell>
                    </TableRow>
                  ) : paginatedRules.length ? (
                    paginatedRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium text-[#1f2f27]">
                          <div className="space-y-1">
                            <div>{rule.product_name}</div>
                            <div className="text-xs font-normal text-muted-foreground">
                              {formatStockQuantity(rule.product_stock_quantity, rule.product_unit)} em stock
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{describeStockRule(rule)}</TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            {rule.emails.map((email) => (
                              <div key={email}>{email}</div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button asChild variant="outline" size="icon-sm">
                              <Link href={`/stock/rules/${rule.id}/edit`}>
                                <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                                <span className="sr-only">Editar regra</span>
                              </Link>
                            </Button>
                            <DeleteConfirmDialog
                              title="Apagar regra"
                              description="Tens a certeza que queres apagar esta regra de stock?"
                              onConfirm={() => deleteMutation.mutate(rule.id)}
                              isPending={deleteMutation.isPending}
                              srLabel="Apagar regra"
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        Nenhuma regra encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredRules.length} registo(s) no total. Pagina {safePageIndex + 1} de{" "}
                {totalPages}.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageIndex((value) => Math.max(0, value - 1))}
                  disabled={safePageIndex === 0}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageIndex((value) => Math.min(totalPages - 1, value + 1))}
                  disabled={safePageIndex >= totalPages - 1}
                >
                  Seguinte
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
