"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Add01Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Textarea } from "@/components/ui/textarea"
import {
  createGardenExpense,
  deleteGardenExpense,
  getGardenById,
  listGardenExpenses,
  updateGardenExpense,
} from "@/features/gardens/api"
import type {
  GardenExpense,
  GardenExpenseCategory,
  SaveGardenExpensePayload,
} from "@/features/gardens/types"
import { expenseCategoryLabels, formatCurrency, formatDate } from "@/features/gardens/utils"
import { useAuthStore } from "@/lib/auth/store"

const PAGE_SIZE_OPTIONS = [5, 10, 20]
const expenseCategories: GardenExpenseCategory[] = [
  "fuel",
  "tolls",
  "parking",
  "equipment",
  "maintenance",
  "transport",
  "other",
]

type GardenExpensesPageProps = {
  gardenId: string
}

export function GardenExpensesPage({ gardenId }: GardenExpensesPageProps) {
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
  const [editingExpense, setEditingExpense] = useState<GardenExpense | null>(null)
  const [category, setCategory] = useState<GardenExpenseCategory>("fuel")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")

  const gardenQuery = useQuery({
    queryKey: ["gardens", "detail", gardenId, activeCompanyId, accessToken],
    queryFn: () => getGardenById(accessToken ?? "", gardenId),
    enabled: Boolean(accessToken && activeCompanyId && gardenId && isAdmin),
  })

  const expensesQuery = useQuery({
    queryKey: ["gardens", "expenses", gardenId, activeCompanyId, accessToken],
    queryFn: () => listGardenExpenses(accessToken ?? "", gardenId),
    enabled: Boolean(accessToken && activeCompanyId && gardenId && isAdmin),
  })

  const filteredExpenses = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    if (!normalizedSearch) {
      return expensesQuery.data ?? []
    }

    return (expensesQuery.data ?? []).filter((expense) =>
      [
        expenseCategoryLabels[expense.category],
        expense.category,
        expense.description ?? "",
        expense.amount,
        expense.date,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    )
  }, [expensesQuery.data, search])

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / pageSize))
  const safePageIndex = Math.min(pageIndex, totalPages - 1)
  const paginatedExpenses = filteredExpenses.slice(
    safePageIndex * pageSize,
    safePageIndex * pageSize + pageSize
  )

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) {
        throw new Error("Sem sessao ativa.")
      }

      if (!date.trim()) {
        throw new Error("Indica a data da despesa.")
      }

      if (amount.trim() === "") {
        throw new Error("Indica o valor da despesa.")
      }

      const numericAmount = Number(amount)
      if (Number.isNaN(numericAmount) || numericAmount < 0) {
        throw new Error("Indica um valor valido para a despesa.")
      }

      const payload: SaveGardenExpensePayload = {
        category,
        date: date.trim(),
        description: description.trim() || undefined,
        amount: numericAmount,
      }

      if (editingExpense) {
        return updateGardenExpense(accessToken, editingExpense.id, gardenId, payload)
      }

      return createGardenExpense(accessToken, gardenId, payload)
    },
    onSuccess: async () => {
      const wasEditing = Boolean(editingExpense)

      await queryClient.invalidateQueries({ queryKey: ["gardens", "expenses", gardenId] })
      closeDialog()
      toast.success(
        wasEditing
          ? "Despesa atualizada com sucesso."
          : "Despesa criada com sucesso."
      )
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel guardar a despesa.")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (expense: GardenExpense) => {
      if (!accessToken) {
        throw new Error("Sem sessao ativa.")
      }

      await deleteGardenExpense(accessToken, expense.id)
      return expense
    },
    onSuccess: async (expense) => {
      await queryClient.invalidateQueries({ queryKey: ["gardens", "expenses", gardenId] })
      toast.success(`Despesa "${expenseCategoryLabels[expense.category]}" apagada com sucesso.`)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel apagar a despesa.")
    },
  })

  function resetForm() {
    setEditingExpense(null)
    setCategory("fuel")
    setDate(new Date().toISOString().slice(0, 10))
    setDescription("")
    setAmount("")
  }

  function closeDialog() {
    setDialogOpen(false)
    resetForm()
  }

  function openCreateDialog() {
    resetForm()
    setDialogOpen(true)
  }

  function openEditDialog(expense: GardenExpense) {
    setEditingExpense(expense)
    setCategory(expense.category)
    setDate(expense.date)
    setDescription(expense.description ?? "")
    setAmount(expense.amount)
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

  if (!isAdmin) {
    return (
      <Card className="border-[#dfd7c0] bg-white">
        <CardHeader>
          <CardTitle>Acesso restrito</CardTitle>
          <CardDescription>
            Apenas administradores podem consultar e gerir despesas.
          </CardDescription>
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
              <CardTitle>Despesas</CardTitle>
              <p className="text-sm text-muted-foreground">
                {gardenQuery.data
                  ? `Registos de despesas do jardim ${gardenQuery.data.client_name}.`
                  : "Historico de despesas deste jardim."}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPageIndex(0)
                }}
                placeholder="Pesquisar categoria, descricao ou data"
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
                type="button"
                className="bg-[#215442] text-white hover:bg-[#183b2f]"
                onClick={openCreateDialog}
              >
                <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                Criar despesa
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 md:hidden">
            {expensesQuery.isLoading ? (
              <EmptyStateCard label="A carregar despesas..." />
            ) : paginatedExpenses.length ? (
              paginatedExpenses.map((expense) => (
                <article
                  key={expense.id}
                  className="rounded-2xl border border-[#dfd7c0] bg-white p-4 shadow-sm"
                >
                  <div className="space-y-1">
                    <h3 className="font-medium text-[#1f2f27]">
                      {expenseCategoryLabels[expense.category]}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(expense.date)} - {formatCurrency(Number(expense.amount))}
                    </p>
                  </div>

                  {expense.description?.trim() ? (
                    <p className="mt-4 text-sm leading-6 text-[#1f2f27]">
                      {expense.description}
                    </p>
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground">Sem descricao.</p>
                  )}

                  <div className="mt-4 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => openEditDialog(expense)}
                    >
                      <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                      <span className="sr-only">Editar despesa</span>
                    </Button>
                    <DeleteConfirmDialog
                      title="Apagar despesa"
                      description={`Tens a certeza que queres apagar a despesa de ${expenseCategoryLabels[expense.category]}?`}
                      onConfirm={() => deleteMutation.mutate(expense)}
                      isPending={deleteMutation.isPending}
                      srLabel="Apagar despesa"
                    />
                  </div>
                </article>
              ))
            ) : (
              <EmptyStateCard label="Ainda nao existem despesas registadas para este jardim." />
            )}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-[#dfd7c0] bg-white md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descricao</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expensesQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      A carregar despesas...
                    </TableCell>
                  </TableRow>
                ) : paginatedExpenses.length ? (
                  paginatedExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium text-[#1f2f27]">
                        {expenseCategoryLabels[expense.category]}
                      </TableCell>
                      <TableCell className="max-w-96 whitespace-normal">
                        {expense.description?.trim() || "Sem descricao."}
                      </TableCell>
                      <TableCell>{formatCurrency(Number(expense.amount))}</TableCell>
                      <TableCell>{formatDate(expense.date)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            onClick={() => openEditDialog(expense)}
                          >
                            <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                            <span className="sr-only">Editar despesa</span>
                          </Button>
                          <DeleteConfirmDialog
                            title="Apagar despesa"
                            description={`Tens a certeza que queres apagar a despesa de ${expenseCategoryLabels[expense.category]}?`}
                            onConfirm={() => deleteMutation.mutate(expense)}
                            isPending={deleteMutation.isPending}
                            srLabel="Apagar despesa"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Ainda nao existem despesas registadas para este jardim.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredExpenses.length} registo(s) no total. Pagina {safePageIndex + 1} de{" "}
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

      <GardenExpenseDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            resetForm()
          }
        }}
        mode={editingExpense ? "edit" : "create"}
        category={category}
        onCategoryChange={(value) => setCategory(value as GardenExpenseCategory)}
        date={date}
        onDateChange={setDate}
        description={description}
        onDescriptionChange={setDescription}
        amount={amount}
        onAmountChange={setAmount}
        isPending={saveMutation.isPending}
        onSubmit={() => saveMutation.mutate()}
      />
    </>
  )
}

type GardenExpenseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  category: GardenExpenseCategory
  onCategoryChange: (value: string) => void
  date: string
  onDateChange: (value: string) => void
  description: string
  onDescriptionChange: (value: string) => void
  amount: string
  onAmountChange: (value: string) => void
  isPending: boolean
  onSubmit: () => void
}

function GardenExpenseDialog({
  open,
  onOpenChange,
  mode,
  category,
  onCategoryChange,
  date,
  onDateChange,
  description,
  onDescriptionChange,
  amount,
  onAmountChange,
  isPending,
  onSubmit,
}: GardenExpenseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Editar despesa" : "Criar despesa"}
          </DialogTitle>
          <DialogDescription>
            Regista uma despesa associada a este jardim.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Categoria
            </label>
            <Select value={category} onValueChange={onCategoryChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((item) => (
                  <SelectItem key={item} value={item}>
                    {expenseCategoryLabels[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="garden-expense-date"
              className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
            >
              Data da despesa
            </label>
            <Input
              id="garden-expense-date"
              type="date"
              value={date}
              onChange={(event) => onDateChange(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="garden-expense-amount"
              className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
            >
              Valor
            </label>
            <Input
              id="garden-expense-amount"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="garden-expense-description"
              className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
            >
              Descricao
            </label>
            <Textarea
              id="garden-expense-description"
              className="min-h-24"
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="Opcional. Ex.: deslocacao extra para entrega de equipamento."
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              className="bg-[#215442] text-white hover:bg-[#183b2f]"
              onClick={onSubmit}
              disabled={isPending}
            >
              {isPending
                ? "A guardar..."
                : mode === "edit"
                  ? "Guardar alteracoes"
                  : "Criar despesa"}
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
