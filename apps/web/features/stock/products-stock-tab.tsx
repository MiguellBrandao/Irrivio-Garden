"use client"

import Link from "next/link"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import {
  Add01Icon,
  PencilEdit02Icon,
  PackageAddIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

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
import { listProducts } from "@/features/stock/api"
import { StockQuantityDialog } from "@/features/stock/stock-quantity-dialog"
import type { Product } from "@/features/stock/types"
import {
  formatStockQuantity,
  formatUnitPrice,
  unitLabels,
} from "@/features/stock/utils"

const PAGE_SIZE_OPTIONS = [5, 10, 20]

type ProductsStockTabProps = {
  accessToken: string
  activeCompanyId: string
  isAdmin: boolean
}

export function ProductsStockTab({
  accessToken,
  activeCompanyId,
  isAdmin,
}: ProductsStockTabProps) {
  const [search, setSearch] = useState("")
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [stockDialogProduct, setStockDialogProduct] = useState<Product | null>(null)

  const productsQuery = useQuery({
    queryKey: ["products", activeCompanyId, accessToken],
    queryFn: () => listProducts(accessToken),
    enabled: Boolean(accessToken && activeCompanyId),
    placeholderData: keepPreviousData,
  })

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    if (!normalizedSearch) {
      return productsQuery.data ?? []
    }

    return (productsQuery.data ?? []).filter((product) =>
      [product.name, unitLabels[product.unit], formatUnitPrice(product.unit_price, product.unit)]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    )
  }, [productsQuery.data, search])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize))
  const safePageIndex = Math.min(pageIndex, totalPages - 1)
  const paginatedProducts = filteredProducts.slice(
    safePageIndex * pageSize,
    safePageIndex * pageSize + pageSize
  )

  return (
    <Card className="border-[#dfd7c0] bg-[#fbf8ef]">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <CardTitle>Stock</CardTitle>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPageIndex(0)
              }}
              placeholder="Pesquisar produto, unidade ou valor"
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
            {isAdmin ? (
              <Button asChild className="bg-[#215442] text-white hover:bg-[#183b2f]">
                <Link href="/stock/new">
                  <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                  Criar produto
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 md:hidden">
          {productsQuery.isLoading ? (
            <div className="rounded-2xl border border-[#dfd7c0] bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              A carregar stock...
            </div>
          ) : paginatedProducts.length ? (
            paginatedProducts.map((product) => (
              <article
                key={product.id}
                className="rounded-2xl border border-[#dfd7c0] bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="font-medium text-[#1f2f27]">{product.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {formatUnitPrice(product.unit_price, product.unit)}
                    </p>
                  </div>
                  <StockBadge quantity={product.stock_quantity} />
                </div>

                <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
                  <div className="space-y-1">
                    <dt className="text-muted-foreground">Valor em stock</dt>
                    <dd>{formatStockQuantity(product.stock_quantity, product.unit)}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-muted-foreground">Valor por unidade</dt>
                    <dd>{formatUnitPrice(product.unit_price, product.unit)}</dd>
                  </div>
                </dl>

                {isAdmin ? (
                  <div className="mt-4 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStockDialogProduct(product)}
                    >
                      <HugeiconsIcon icon={PackageAddIcon} strokeWidth={2} />
                      Alterar stock
                    </Button>
                    <Button asChild variant="outline" size="icon-sm">
                      <Link href={`/stock/${product.id}/edit`}>
                        <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                        <span className="sr-only">Editar produto</span>
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-[#dfd7c0] bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhum produto encontrado.
            </div>
          )}
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-[#dfd7c0] bg-white md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Valor em stock</TableHead>
                <TableHead>Valor por unidade</TableHead>
                {isAdmin ? <TableHead className="text-right">Acoes</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {productsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 4 : 3} className="h-24 text-center">
                    A carregar stock...
                  </TableCell>
                </TableRow>
              ) : paginatedProducts.length ? (
                paginatedProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium text-[#1f2f27]">{product.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{formatStockQuantity(product.stock_quantity, product.unit)}</span>
                        <StockBadge quantity={product.stock_quantity} />
                      </div>
                    </TableCell>
                    <TableCell>{formatUnitPrice(product.unit_price, product.unit)}</TableCell>
                    {isAdmin ? (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setStockDialogProduct(product)}
                          >
                            <HugeiconsIcon icon={PackageAddIcon} strokeWidth={2} />
                            Alterar stock
                          </Button>
                          <Button asChild variant="outline" size="icon-sm">
                            <Link href={`/stock/${product.id}/edit`}>
                              <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                              <span className="sr-only">Editar produto</span>
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 4 : 3} className="h-24 text-center">
                    Nenhum produto encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredProducts.length} registo(s) no total. Pagina {safePageIndex + 1} de{" "}
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

        <StockQuantityDialog
          open={Boolean(stockDialogProduct)}
          onOpenChange={(open) => {
            if (!open) {
              setStockDialogProduct(null)
            }
          }}
          product={stockDialogProduct}
        />
      </CardContent>
    </Card>
  )
}

function StockBadge({ quantity }: { quantity: string }) {
  const value = Number(quantity)

  if (value <= 0) {
    return <Badge variant="destructive">Sem stock</Badge>
  }

  if (value < 10) {
    return (
      <Badge className="border-yellow-200 bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
        Baixo
      </Badge>
    )
  }

  return null
}
