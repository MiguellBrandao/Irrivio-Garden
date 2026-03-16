"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Add01Icon, CheckmarkCircle02Icon, PencilEdit02Icon, SearchIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
import { Textarea } from "@/components/ui/textarea"
import {
  createGardenProductUsage,
  deleteGardenProductUsage,
  getGardenById,
  listGardenProductUsage,
  updateGardenProductUsage,
} from "@/features/gardens/api"
import type {
  GardenProductUsage,
  SaveGardenProductUsagePayload,
} from "@/features/gardens/types"
import { formatDate } from "@/features/gardens/utils"
import { listProducts } from "@/features/stock/api"
import type { Product } from "@/features/stock/types"
import { formatStockQuantity } from "@/features/stock/utils"
import { useAuthStore } from "@/lib/auth/store"

const PAGE_SIZE_OPTIONS = [5, 10, 20]

type GardenProductsPageProps = {
  gardenId: string
}

export function GardenProductsPage({ gardenId }: GardenProductsPageProps) {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const activeCompanyId = useAuthStore((state) => state.activeCompanyId)
  const activeCompany = useAuthStore((state) =>
    state.companies.find((company) => company.id === state.activeCompanyId) ?? null
  )
  const isAdmin = activeCompany?.role === "admin"

  const [search, setSearch] = useState("")
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUsage, setEditingUsage] = useState<GardenProductUsage | null>(null)
  const [selectedProductId, setSelectedProductId] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState("")

  const gardenQuery = useQuery({
    queryKey: ["gardens", "detail", gardenId, activeCompanyId, accessToken],
    queryFn: () => getGardenById(accessToken ?? "", gardenId),
    enabled: Boolean(accessToken && activeCompanyId && gardenId),
  })

  const productUsageQuery = useQuery({
    queryKey: ["gardens", "product-usage", gardenId, activeCompanyId, accessToken],
    queryFn: () => listGardenProductUsage(accessToken ?? "", gardenId),
    enabled: Boolean(accessToken && activeCompanyId && gardenId),
  })

  const productsQuery = useQuery({
    queryKey: ["products", activeCompanyId, accessToken],
    queryFn: () => listProducts(accessToken ?? ""),
    enabled: Boolean(accessToken && activeCompanyId && isAdmin),
  })

  const filteredUsage = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    if (!normalizedSearch) {
      return productUsageQuery.data ?? []
    }

    return (productUsageQuery.data ?? []).filter((usage) =>
      [
        usage.product_name,
        usage.company_membership_name ?? "",
        usage.notes ?? "",
        usage.task_id ? "tarefa" : "manual",
        usage.date,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    )
  }, [productUsageQuery.data, search])

  const availableProducts = useMemo(() => {
    const usedProductIds = new Set(
      (productUsageQuery.data ?? [])
        .filter((usage) => usage.id !== editingUsage?.id)
        .map((usage) => usage.product_id)
    )

    return (productsQuery.data ?? []).filter((product) => !usedProductIds.has(product.id))
  }, [editingUsage?.id, productUsageQuery.data, productsQuery.data])

  const totalPages = Math.max(1, Math.ceil(filteredUsage.length / pageSize))
  const safePageIndex = Math.min(pageIndex, totalPages - 1)
  const paginatedUsage = filteredUsage.slice(
    safePageIndex * pageSize,
    safePageIndex * pageSize + pageSize
  )

  const selectedProduct = useMemo(
    () => (productsQuery.data ?? []).find((product) => product.id === selectedProductId) ?? null,
    [productsQuery.data, selectedProductId]
  )
  const canCreateProductUsage =
    isAdmin && (productsQuery.isLoading || availableProducts.length > 0)

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) {
        throw new Error("Sem sessao ativa.")
      }

      if (!selectedProductId) {
        throw new Error("Seleciona um produto.")
      }

      const parsedQuantity = Number(quantity)
      if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
        throw new Error("Indica uma quantidade valida.")
      }

      if (!date.trim()) {
        throw new Error("Indica a data do registo.")
      }

      const payload: SaveGardenProductUsagePayload = {
        product_id: selectedProductId,
        quantity: parsedQuantity,
        date: date.trim(),
        notes: notes.trim() || undefined,
        task_id: editingUsage?.task_id ?? undefined,
      }

      if (editingUsage) {
        return updateGardenProductUsage(accessToken, editingUsage.id, gardenId, payload)
      }

      return createGardenProductUsage(accessToken, gardenId, payload)
    },
    onSuccess: async () => {
      const wasEditing = Boolean(editingUsage)

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["gardens", "product-usage", gardenId] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ])

      closeDialog()
      toast.success(
        wasEditing
          ? "Registo atualizado com sucesso."
          : "Produto utilizado registado com sucesso."
      )
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel guardar o registo.")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (usage: GardenProductUsage) => {
      if (!accessToken) {
        throw new Error("Sem sessao ativa.")
      }

      await deleteGardenProductUsage(accessToken, usage.id)
      return usage
    },
    onSuccess: async (usage) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["gardens", "product-usage", gardenId] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ])
      toast.success(`Registo de "${usage.product_name}" apagado com sucesso.`)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel apagar o registo.")
    },
  })

  function resetForm() {
    setEditingUsage(null)
    setSelectedProductId("")
    setQuantity("1")
    setDate(new Date().toISOString().slice(0, 10))
    setNotes("")
  }

  function closeDialog() {
    setDialogOpen(false)
    resetForm()
  }

  function openCreateDialog() {
    resetForm()
    setDialogOpen(true)
  }

  function openEditDialog(usage: GardenProductUsage) {
    setEditingUsage(usage)
    setSelectedProductId(usage.product_id)
    setQuantity(usage.quantity)
    setDate(usage.date)
    setNotes(usage.notes ?? "")
    setDialogOpen(true)
  }

  if (!accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sessao em falta</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (!activeCompanyId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Empresa em falta</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-[#dfd7c0] bg-[#fbf8ef]">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <CardTitle>Produtos utilizados</CardTitle>
              <p className="text-sm text-muted-foreground">
                {gardenQuery.data
                  ? `Registos de consumo do jardim ${gardenQuery.data.client_name}.`
                  : "Historico de produtos utilizados neste jardim."}
              </p>
              {isAdmin && !productsQuery.isLoading && availableProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Todos os produtos ja foram registados neste jardim.
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPageIndex(0)
                }}
                placeholder="Pesquisar produto, origem, notas ou responsavel"
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
              {canCreateProductUsage ? (
                <Button
                  type="button"
                  className="bg-[#215442] text-white hover:bg-[#183b2f]"
                  onClick={openCreateDialog}
                >
                  <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                  Criar registo
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 md:hidden">
            {productUsageQuery.isLoading ? (
              <EmptyStateCard label="A carregar produtos utilizados..." />
            ) : paginatedUsage.length ? (
              paginatedUsage.map((usage) => (
                <article
                  key={usage.id}
                  className="rounded-2xl border border-[#dfd7c0] bg-white p-4 shadow-sm"
                >
                  <div className="space-y-1">
                    <h3 className="font-medium text-[#1f2f27]">{usage.product_name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {formatStockQuantity(usage.quantity, usage.product_unit)}
                    </p>
                  </div>

                  <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
                    <div className="space-y-1">
                      <dt className="text-muted-foreground">Data</dt>
                      <dd>{formatDate(usage.date)}</dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-muted-foreground">Registado por</dt>
                      <dd>{usage.company_membership_name ?? "Sem identificacao"}</dd>
                    </div>
                    {usage.notes?.trim() ? (
                      <div className="space-y-1">
                        <dt className="text-muted-foreground">Notas</dt>
                        <dd>{usage.notes}</dd>
                      </div>
                    ) : null}
                  </dl>

                  {isAdmin ? (
                    <div className="mt-4 flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => openEditDialog(usage)}
                      >
                        <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                        <span className="sr-only">Editar registo</span>
                      </Button>
                      <DeleteConfirmDialog
                        title="Apagar registo"
                        description={`Tens a certeza que queres apagar o registo de ${usage.product_name}?`}
                        onConfirm={() => deleteMutation.mutate(usage)}
                        isPending={deleteMutation.isPending}
                        srLabel="Apagar registo"
                      />
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <EmptyStateCard label="Ainda nao existem produtos utilizados registados para este jardim." />
            )}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-[#dfd7c0] bg-white md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Registado por</TableHead>
                  {isAdmin ? <TableHead className="text-right">Acoes</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {productUsageQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 5 : 4} className="h-24 text-center">
                      A carregar produtos utilizados...
                    </TableCell>
                  </TableRow>
                ) : paginatedUsage.length ? (
                  paginatedUsage.map((usage) => (
                    <TableRow key={usage.id}>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <div className="font-medium text-[#1f2f27]">{usage.product_name}</div>
                          {usage.notes?.trim() ? (
                            <div className="max-w-80 whitespace-normal text-sm text-muted-foreground">
                              {usage.notes}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{formatStockQuantity(usage.quantity, usage.product_unit)}</TableCell>
                      <TableCell>{formatDate(usage.date)}</TableCell>
                      <TableCell>{usage.company_membership_name ?? "Sem identificacao"}</TableCell>
                      {isAdmin ? (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              onClick={() => openEditDialog(usage)}
                            >
                              <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                              <span className="sr-only">Editar registo</span>
                            </Button>
                            <DeleteConfirmDialog
                              title="Apagar registo"
                              description={`Tens a certeza que queres apagar o registo de ${usage.product_name}?`}
                              onConfirm={() => deleteMutation.mutate(usage)}
                              isPending={deleteMutation.isPending}
                              srLabel="Apagar registo"
                            />
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 5 : 4} className="h-24 text-center">
                      Ainda nao existem produtos utilizados registados para este jardim.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredUsage.length} registo(s) no total. Pagina {safePageIndex + 1} de{" "}
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
        </CardContent>
      </Card>

      <GardenProductUsageDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            resetForm()
          }
        }}
        mode={editingUsage ? "edit" : "create"}
        selectedProduct={selectedProduct}
        selectedProductId={selectedProductId}
        onSelectedProductChange={setSelectedProductId}
        products={availableProducts}
        quantity={quantity}
        onQuantityChange={setQuantity}
        date={date}
        onDateChange={setDate}
        notes={notes}
        onNotesChange={setNotes}
        isPending={saveMutation.isPending}
        isProductsLoading={productsQuery.isLoading}
        onSubmit={() => saveMutation.mutate()}
        hasLinkedTask={Boolean(editingUsage?.task_id)}
      />
    </>
  )
}

type GardenProductUsageDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  selectedProduct: Product | null
  selectedProductId: string
  onSelectedProductChange: (value: string) => void
  products: Product[]
  quantity: string
  onQuantityChange: (value: string) => void
  date: string
  onDateChange: (value: string) => void
  notes: string
  onNotesChange: (value: string) => void
  isPending: boolean
  isProductsLoading: boolean
  onSubmit: () => void
  hasLinkedTask: boolean
}

function GardenProductUsageDialog({
  open,
  onOpenChange,
  mode,
  selectedProduct,
  selectedProductId,
  onSelectedProductChange,
  products,
  quantity,
  onQuantityChange,
  date,
  onDateChange,
  notes,
  onNotesChange,
  isPending,
  isProductsLoading,
  onSubmit,
  hasLinkedTask,
}: GardenProductUsageDialogProps) {
  const [productPickerOpen, setProductPickerOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Editar produto utilizado" : "Criar produto utilizado"}
          </DialogTitle>
          <DialogDescription>
            Regista consumos de stock diretamente neste jardim.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {hasLinkedTask ? (
            <div className="rounded-2xl border border-[#dfd7c0] bg-[#fbf8ef] p-4 text-sm text-muted-foreground">
              Este registo esta ligado a uma tarefa. A edicao mantem essa ligacao.
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Produto
            </label>
            <Popover open={productPickerOpen} onOpenChange={setProductPickerOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-between">
                  <span className="truncate">
                    {selectedProduct
                      ? `${selectedProduct.name} (${formatStockQuantity(selectedProduct.stock_quantity, selectedProduct.unit)})`
                      : "Selecionar produto"}
                  </span>
                  <HugeiconsIcon icon={SearchIcon} strokeWidth={2} />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Pesquisar produto..." />
                  <CommandList>
                    <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                    {products.map((product) => (
                      <CommandItem
                        key={product.id}
                        value={`${product.name} ${product.unit}`}
                        onSelect={() => {
                          onSelectedProductChange(product.id)
                          setProductPickerOpen(false)
                        }}
                      >
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate">{product.name}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {formatStockQuantity(product.stock_quantity, product.unit)}
                          </span>
                        </div>
                        {selectedProductId === product.id ? (
                          <HugeiconsIcon
                            icon={CheckmarkCircle02Icon}
                            strokeWidth={2}
                            className="ml-auto"
                          />
                        ) : null}
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="garden-product-quantity"
                className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
              >
                Quantidade
              </label>
              <Input
                id="garden-product-quantity"
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(event) => onQuantityChange(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="garden-product-date"
                className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
              >
                Data
              </label>
              <Input
                id="garden-product-date"
                type="date"
                value={date}
                onChange={(event) => onDateChange(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="garden-product-notes"
              className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
            >
              Notas
            </label>
            <Textarea
              id="garden-product-notes"
              className="min-h-24"
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder="Opcional. Ex.: aplicado apenas na zona frontal."
            />
          </div>

          {selectedProduct ? (
            <p className="text-xs text-muted-foreground">
              Stock disponivel: {formatStockQuantity(selectedProduct.stock_quantity, selectedProduct.unit)}
            </p>
          ) : null}

          {!isProductsLoading && products.length === 0 ? (
            <EmptyStateCard label="Nao existem produtos disponiveis para registar." />
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              className="bg-[#215442] text-white hover:bg-[#183b2f]"
              onClick={onSubmit}
              disabled={isPending || isProductsLoading || products.length === 0}
            >
              {isPending
                ? "A guardar..."
                : mode === "edit"
                  ? "Guardar alteracoes"
                  : "Criar registo"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EmptyStateCard({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-[#dfd7c0] bg-white px-4 py-8 text-center text-sm text-muted-foreground">
      {label}
    </div>
  )
}
