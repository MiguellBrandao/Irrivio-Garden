"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  ArrowLeftIcon,
  CheckmarkCircle02Icon,
  MapPinpoint02Icon,
  PackageAddIcon,
  PencilEdit02Icon,
  SearchIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMemo, useState } from "react"

import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
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
import { Textarea } from "@/components/ui/textarea"
import {
  completeTask,
  createTaskProductUsage,
  deleteTaskProductUsage,
  deleteTask,
  getTaskById,
  listTaskProductUsage,
  listTaskWorkLogs,
  updateTaskProductUsage,
} from "@/features/calendar/api"
import type { Task, TaskProductUsage } from "@/features/calendar/types"
import {
  formatTaskDate,
  formatTaskDateTime,
  formatTaskTimeRange,
  taskTypeLabels,
} from "@/features/calendar/utils"
import { listTeams } from "@/features/employees/api"
import { listGardens, listGardenIrrigationZones } from "@/features/gardens/api"
import { IrrigationOverviewCard } from "@/features/gardens/irrigation-overview-card"
import { openAddressInMaps } from "@/features/gardens/utils"
import { listProducts } from "@/features/stock/api"
import type { Product } from "@/features/stock/types"
import { useAuthStore } from "@/lib/auth/store"

type TaskDetailsPageProps = {
  taskId: string
}

export function TaskDetailsPage({ taskId }: TaskDetailsPageProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const activeCompanyId = useAuthStore((state) => state.activeCompanyId)
  const activeCompany = useAuthStore((state) =>
    state.companies.find((company) => company.id === state.activeCompanyId) ?? null
  )
  const isAdmin = activeCompany?.role === "admin"
  const [addProductDialogOpen, setAddProductDialogOpen] = useState(false)
  const [completeTaskDialogOpen, setCompleteTaskDialogOpen] = useState(false)
  const [editingProductUsage, setEditingProductUsage] = useState<TaskProductUsage | null>(null)
  const [selectedProductId, setSelectedProductId] = useState("")
  const [productQuantity, setProductQuantity] = useState("1")
  const [productNotes, setProductNotes] = useState("")
  const [completionNotes, setCompletionNotes] = useState("")

  const taskQuery = useQuery({
    queryKey: ["tasks", "detail", taskId, activeCompanyId, accessToken],
    queryFn: () => getTaskById(accessToken ?? "", taskId),
    enabled: Boolean(accessToken && activeCompanyId && taskId),
  })

  const productsQuery = useQuery({
    queryKey: ["products", activeCompanyId, accessToken],
    queryFn: () => listProducts(accessToken ?? ""),
    enabled: Boolean(accessToken && activeCompanyId),
  })

  const productUsageQuery = useQuery({
    queryKey: ["tasks", "product-usage", taskId, activeCompanyId, accessToken],
    queryFn: () => listTaskProductUsage(accessToken ?? "", taskId),
    enabled: Boolean(accessToken && activeCompanyId && taskId),
  })

  const workLogsQuery = useQuery({
    queryKey: ["tasks", "worklogs", taskId, activeCompanyId, accessToken],
    queryFn: () => listTaskWorkLogs(accessToken ?? "", taskId),
    enabled: Boolean(accessToken && activeCompanyId && taskId),
  })

  const irrigationZonesQuery = useQuery({
    queryKey: [
      "gardens",
      "irrigation",
      taskQuery.data?.garden_id,
      activeCompanyId,
      accessToken,
    ],
    queryFn: () => listGardenIrrigationZones(accessToken ?? "", taskQuery.data!.garden_id),
    enabled: Boolean(accessToken && activeCompanyId && taskQuery.data?.garden_id),
  })

  const gardensQuery = useQuery({
    queryKey: ["gardens", activeCompanyId, accessToken],
    queryFn: () => listGardens(accessToken ?? ""),
    enabled: Boolean(accessToken && activeCompanyId),
  })

  const teamsQuery = useQuery({
    queryKey: ["teams", activeCompanyId, accessToken],
    queryFn: () => listTeams(accessToken ?? ""),
    enabled: Boolean(accessToken && activeCompanyId),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) {
        throw new Error("Sem sessao ativa.")
      }

      await deleteTask(accessToken, taskId)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks", "detail"] }),
      ])
      toast.success("Tarefa apagada com sucesso.")
      router.push("/calendar")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel apagar a tarefa.")
    },
  })

  function resetProductUsageForm() {
    setEditingProductUsage(null)
    setSelectedProductId("")
    setProductQuantity("1")
    setProductNotes("")
  }

  function openCreateProductUsageDialog() {
    resetProductUsageForm()
    setAddProductDialogOpen(true)
  }

  function openEditProductUsageDialog(usage: TaskProductUsage) {
    setEditingProductUsage(usage)
    setSelectedProductId(usage.product_id)
    setProductQuantity(usage.quantity)
    setProductNotes(usage.notes ?? "")
    setAddProductDialogOpen(true)
  }

  const saveProductUsageMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) {
        throw new Error("Sem sessao ativa.")
      }

      const task = taskQuery.data
      if (!task) {
        throw new Error("Nao foi possivel carregar a tarefa.")
      }

      if (!selectedProductId) {
        throw new Error("Seleciona um produto.")
      }

      const parsedQuantity = Number(productQuantity)
      if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
        throw new Error("Indica uma quantidade valida.")
      }

      const payload = {
        task_id: task.id,
        garden_id: task.garden_id,
        product_id: selectedProductId,
        quantity: parsedQuantity,
        date: editingProductUsage?.date ?? task.date,
        notes: productNotes.trim() || undefined,
      }

      if (editingProductUsage) {
        return updateTaskProductUsage(accessToken, editingProductUsage.id, payload)
      }

      return createTaskProductUsage(accessToken, payload)
    },
    onSuccess: async () => {
      const wasEditing = Boolean(editingProductUsage)

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tasks", "product-usage"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ])
      resetProductUsageForm()
      setAddProductDialogOpen(false)
      toast.success(
        wasEditing
          ? "Produto registado atualizado com sucesso."
          : "Produto adicionado a esta tarefa."
      )
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel guardar o produto.")
    },
  })

  const deleteProductUsageMutation = useMutation({
    mutationFn: async (usage: TaskProductUsage) => {
      if (!accessToken) {
        throw new Error("Sem sessao ativa.")
      }

      await deleteTaskProductUsage(accessToken, usage.id)
      return usage
    },
    onSuccess: async (usage) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tasks", "product-usage"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ])
      toast.success(`Registo de "${usage.product_name}" apagado com sucesso.`)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel apagar o produto registado.")
    },
  })

  const completeTaskMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) {
        throw new Error("Sem sessao ativa.")
      }

      const task = taskQuery.data
      if (!task) {
        throw new Error("Nao foi possivel carregar a tarefa.")
      }

      if (!task.team_id) {
        throw new Error("A tarefa precisa de uma equipa para ser concluida.")
      }

      const completionTime = new Date().toISOString()

      return completeTask(accessToken, {
        task_id: task.id,
        team_id: task.team_id,
        start_time: completionTime,
        end_time: completionTime,
        description: completionNotes.trim() || undefined,
      })
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tasks", "worklogs"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks", "detail"] }),
      ])
      setCompletionNotes("")
      setCompleteTaskDialogOpen(false)
      toast.success("Tarefa marcada como feita.")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel concluir a tarefa.")
    },
  })

  const task = taskQuery.data
  const latestWorkLog = workLogsQuery.data?.[0] ?? null
  const canManageTaskProductUsage = isAdmin || activeCompany?.role === "employee"
  const availableProducts = useMemo(() => {
    const usedProductIds = new Set(
      (productUsageQuery.data ?? [])
        .filter((usage) => usage.id !== editingProductUsage?.id)
        .map((usage) => usage.product_id)
    )

    return (productsQuery.data ?? []).filter((product) => !usedProductIds.has(product.id))
  }, [editingProductUsage?.id, productUsageQuery.data, productsQuery.data])
  const canAddTaskProductUsage =
    canManageTaskProductUsage && (productsQuery.isLoading || availableProducts.length > 0)
  const selectedProduct = useMemo(
    () => (productsQuery.data ?? []).find((product) => product.id === selectedProductId) ?? null,
    [productsQuery.data, selectedProductId]
  )
  const gardenNameById = useMemo(
    () =>
      Object.fromEntries(
        (gardensQuery.data ?? []).map((garden) => [garden.id, garden.client_name])
      ),
    [gardensQuery.data]
  )
  const taskGarden = useMemo(
    () => (gardensQuery.data ?? []).find((garden) => garden.id === task?.garden_id) ?? null,
    [gardensQuery.data, task?.garden_id]
  )
  const teamNameById = useMemo(
    () => Object.fromEntries((teamsQuery.data ?? []).map((team) => [team.id, team.name])),
    [teamsQuery.data]
  )
  const isFutureTask = task?.date ? task.date > new Date().toISOString().slice(0, 10) : false

  function handleOpenLocation() {
    const address = taskGarden?.address?.trim()

    if (!address) {
      toast.error("Este jardim nao tem morada configurada.")
      return
    }

    openAddressInMaps(address)
  }

  if (!accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sessao em falta</CardTitle>
          <CardDescription>
            Faz login novamente antes de consultar a tarefa.
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
            Seleciona uma empresa antes de consultar a tarefa.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (taskQuery.isLoading) {
    return (
      <div className="rounded-2xl border border-dashed border-[#dfd7c0] bg-[#fbf8ef] p-5 text-sm text-muted-foreground">
        A carregar tarefa...
      </div>
    )
  }

  if (!task) {
    return (
      <div className="rounded-2xl border border-dashed border-[#dfd7c0] bg-[#fbf8ef] p-5 text-sm text-muted-foreground">
        Nao foi possivel carregar a tarefa.
      </div>
    )
  }

  return (
    <>
      <div className="w-full space-y-5 px-1 sm:px-0">
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-[#1f2f27] md:text-3xl">
                {gardenNameById[task.garden_id] ?? "Jardim"}
              </h1>
              <p className="text-sm leading-6 text-muted-foreground">
                {task.description?.trim() || "Sem descricao para esta tarefa."}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link href="/calendar">
                <HugeiconsIcon icon={ArrowLeftIcon} strokeWidth={2} />
                <span className="hidden sm:inline">Voltar ao calendario</span>
                <span className="sm:hidden">Voltar</span>
              </Link>
            </Button>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={handleOpenLocation}
                disabled={!taskGarden?.address?.trim()}
              >
                <HugeiconsIcon icon={MapPinpoint02Icon} strokeWidth={2} />
                <span className="hidden sm:inline">Abrir localizacao</span>
                <span className="sm:hidden">Localizacao</span>
              </Button>
              <Button
                type="button"
                variant={latestWorkLog ? "default" : "outline"}
                size="sm"
                className={
                  latestWorkLog
                    ? "bg-[#215442] text-white hover:bg-[#183b2f] px-2.5 sm:pl-3 sm:pr-4 gap-2"
                    : "px-2.5 sm:pl-3 sm:pr-4 gap-2"
                }
                onClick={() => setCompleteTaskDialogOpen(true)}
                disabled={!task.team_id || Boolean(latestWorkLog)}
              >
                <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
                <span className={isAdmin ? "hidden sm:inline" : "inline"}>
                  {latestWorkLog ? "Tarefa concluida" : "Marcar como feita"}
                </span>
                <span className="sr-only">
                  {latestWorkLog ? "Tarefa concluida" : "Marcar como feita"}
                </span>
              </Button>
              {isAdmin ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => router.push(`/calendar/tasks/${task.id}/edit`)}
                  >
                    <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                    <span className="sr-only">Editar tarefa</span>
                  </Button>
                  <DeleteConfirmDialog
                    title="Apagar tarefa"
                    description="Tens a certeza que queres apagar esta tarefa? Esta acao nao pode ser revertida."
                    onConfirm={() => deleteMutation.mutate()}
                    isPending={deleteMutation.isPending}
                    srLabel="Apagar tarefa"
                  />
                </>
              ) : null}
            </div>
          </div>
        </div>

        <Card className="border-[#dfd7c0] bg-white">
          <CardHeader className="gap-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>Detalhes da tarefa</CardTitle>
                <CardDescription>
                  {latestWorkLog
                    ? `Concluida em ${formatTaskDateTime(
                        latestWorkLog.end_time ?? latestWorkLog.start_time
                      )}`
                    : "Consulta a informacao principal desta tarefa."}
                </CardDescription>
              </div>
              <Badge
                variant={latestWorkLog ? "default" : "destructive"}
                className={latestWorkLog ? "bg-[#215442] text-white" : undefined}
              >
                {latestWorkLog ? "Feita" : "Pendente"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-5 pt-0">
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailRow label="Data" value={formatTaskDate(task.date)} />
              <DetailRow label="Horario" value={formatTaskTimeRange(task)} />
              <DetailRow label="Tipo de tarefa" value={taskTypeLabels[task.task_type]} />
              <DetailRow
                label="Equipa"
                value={teamNameById[task.team_id ?? ""] ?? "Sem equipa"}
              />
              <DetailRow
                label="Estado"
                value={
                  latestWorkLog
                    ? `Concluida em ${formatTaskDateTime(
                        latestWorkLog.end_time ?? latestWorkLog.start_time
                      )}`
                    : "Pendente"
                }
              />
              <DetailRow
                label="Registo criado"
                value={
                  latestWorkLog
                    ? formatTaskDateTime(latestWorkLog.created_at)
                    : "Ainda sem work log"
                }
              />
            </div>

            {latestWorkLog?.description?.trim() ? (
              <div className="rounded-2xl border border-[#e8e1cf] bg-[#fbf8ef] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Nota da conclusao
                </p>
                <p className="mt-2 text-sm leading-6 text-[#1f2f27]">
                  {latestWorkLog.description}
                </p>
              </div>
            ) : null}

            {!task.team_id ? (
              <p className="text-sm text-muted-foreground">
                Atribui uma equipa a esta tarefa antes de a marcares como feita.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <IrrigationOverviewCard
          title="Sistema de irrigacao"
          description="Resumo das zonas de rega deste jardim para contexto da tarefa."
          zones={irrigationZonesQuery.data}
          isLoading={irrigationZonesQuery.isLoading}
          actionHref={`/gardens/${task.garden_id}/irrigation`}
          actionLabel={isAdmin ? "Gerir sistema de irrigacao" : "Ver sistema de irrigacao"}
          emptyLabel="Ainda nao existem zonas de irrigacao configuradas para este jardim."
        />

        <Card className="border-[#dfd7c0] bg-white">
          <CardHeader className="gap-2">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <CardTitle>Produtos registados</CardTitle>
                <CardDescription>
                  Historico de produtos utilizados nesta tarefa.
                </CardDescription>
                {!productsQuery.isLoading &&
                canManageTaskProductUsage &&
                availableProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Todos os produtos disponiveis ja foram registados nesta tarefa.
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{(productUsageQuery.data ?? []).length} registo(s)</Badge>
                {canAddTaskProductUsage ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-center sm:justify-start"
                    onClick={openCreateProductUsageDialog}
                  >
                    <HugeiconsIcon icon={PackageAddIcon} strokeWidth={2} />
                    Adicionar produto utilizado
                  </Button>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-5 pt-0">
            {productUsageQuery.isLoading ? (
              <SectionPlaceholder label="A carregar produtos utilizados..." />
            ) : (productUsageQuery.data ?? []).length ? (
              (productUsageQuery.data ?? []).map((usage) => (
                <div
                  key={usage.id}
                  className="rounded-2xl border border-[#e8e1cf] bg-[#fbf8ef] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[#1f2f27]">
                        {usage.product_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatStock(usage.quantity)} {usage.product_unit}
                        {usage.company_membership_name
                          ? ` - por ${usage.company_membership_name}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {formatTaskDate(usage.date)}
                      </p>
                      {canManageTaskProductUsage ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            onClick={() => openEditProductUsageDialog(usage)}
                          >
                            <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                            <span className="sr-only">Editar produto registado</span>
                          </Button>
                          <DeleteConfirmDialog
                            title="Apagar produto registado"
                            description={`Tens a certeza que queres apagar o registo de ${usage.product_name}? Esta acao nao pode ser revertida.`}
                            onConfirm={() => deleteProductUsageMutation.mutate(usage)}
                            isPending={deleteProductUsageMutation.isPending}
                            srLabel="Apagar produto registado"
                          />
                        </>
                      ) : null}
                    </div>
                  </div>
                  {usage.notes?.trim() ? (
                    <p className="mt-3 text-sm leading-6 text-[#1f2f27]">{usage.notes}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <SectionPlaceholder label="Ainda nao existem produtos registados nesta tarefa." />
            )}
          </CardContent>
        </Card>
      </div>

      <TaskProductUsageDialog
        open={addProductDialogOpen}
        onOpenChange={(open) => {
          setAddProductDialogOpen(open)

          if (!open) {
            resetProductUsageForm()
          }
        }}
        mode={editingProductUsage ? "edit" : "create"}
        task={task}
        products={availableProducts}
        selectedProductId={selectedProductId}
        onSelectedProductChange={setSelectedProductId}
        productQuantity={productQuantity}
        onProductQuantityChange={setProductQuantity}
        productNotes={productNotes}
        onProductNotesChange={setProductNotes}
        selectedProduct={selectedProduct}
        isProductsLoading={productsQuery.isLoading}
        isPending={saveProductUsageMutation.isPending}
        onSubmit={() => saveProductUsageMutation.mutate()}
      />

      <TaskCompletionDialog
        open={completeTaskDialogOpen}
        onOpenChange={setCompleteTaskDialogOpen}
        task={task}
        isFutureTask={isFutureTask}
        completionNotes={completionNotes}
        onCompletionNotesChange={setCompletionNotes}
        isPending={completeTaskMutation.isPending}
        onSubmit={() => completeTaskMutation.mutate()}
      />
    </>
  )
}

type TaskProductUsageDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  task: Task
  products: Product[]
  selectedProductId: string
  onSelectedProductChange: (value: string) => void
  productQuantity: string
  onProductQuantityChange: (value: string) => void
  productNotes: string
  onProductNotesChange: (value: string) => void
  selectedProduct: Product | null
  isProductsLoading: boolean
  isPending: boolean
  onSubmit: () => void
}

function TaskProductUsageDialog({
  open,
  onOpenChange,
  mode,
  task,
  products,
  selectedProductId,
  onSelectedProductChange,
  productQuantity,
  onProductQuantityChange,
  productNotes,
  onProductNotesChange,
  selectedProduct,
  isProductsLoading,
  isPending,
  onSubmit,
}: TaskProductUsageDialogProps) {
  const [productPickerOpen, setProductPickerOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Editar produto utilizado" : "Adicionar produto utilizado"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Atualiza o consumo de stock desta tarefa."
              : "Regista o consumo de stock desta tarefa."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-2xl border border-[#dfd7c0] bg-[#fbf8ef] p-4 text-sm text-muted-foreground">
            Consumo associado a {formatTaskDate(task.date)}.
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Produto
            </label>
            <Popover open={productPickerOpen} onOpenChange={setProductPickerOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-between">
                  <span className="truncate">
                    {selectedProduct
                      ? `${selectedProduct.name} (${formatStock(selectedProduct.stock_quantity)} ${selectedProduct.unit})`
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
                            {formatStock(product.stock_quantity)} {product.unit}
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

          <div className="space-y-2">
            <label
              htmlFor="task-product-quantity"
              className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
            >
              Quantidade
            </label>
            <Input
              id="task-product-quantity"
              type="number"
              min="0.01"
              step="0.01"
              value={productQuantity}
              onChange={(event) => onProductQuantityChange(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="task-product-notes"
              className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
            >
              Notas
            </label>
            <Textarea
              id="task-product-notes"
              className="min-h-24"
              value={productNotes}
              onChange={(event) => onProductNotesChange(event.target.value)}
              placeholder="Opcional. Ex.: aplicado nas zonas laterais."
            />
          </div>

          {selectedProduct ? (
            <p className="text-xs text-muted-foreground">
              Stock disponivel: {formatStock(selectedProduct.stock_quantity)} {selectedProduct.unit}
            </p>
          ) : null}

          {!isProductsLoading && products.length === 0 ? (
            <SectionPlaceholder label="Nao existem produtos disponiveis para registar." />
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
                  : "Guardar produto"}
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

type TaskCompletionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task
  isFutureTask: boolean
  completionNotes: string
  onCompletionNotesChange: (value: string) => void
  isPending: boolean
  onSubmit: () => void
}

function TaskCompletionDialog({
  open,
  onOpenChange,
  task,
  isFutureTask,
  completionNotes,
  onCompletionNotesChange,
  isPending,
  onSubmit,
}: TaskCompletionDialogProps) {
  const hasTeam = Boolean(task.team_id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Marcar tarefa como feita</DialogTitle>
          <DialogDescription>
            Ao confirmar, sera criado um work log para esta tarefa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {!hasTeam ? (
            <SectionPlaceholder label="Atribui uma equipa a esta tarefa antes de a marcares como feita." />
          ) : (
            <>
              {isFutureTask ? (
                <div className="rounded-2xl border border-[#d8b98b] bg-[#fdf5e8] p-4 text-sm text-[#7a4b17]">
                  Esta tarefa nao e do dia de hoje. Vais marca-la como feita antes da data agendada.
                </div>
              ) : null}

              <div className="space-y-2">
                <label
                  htmlFor="task-completion-notes"
                  className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
                >
                  Notas de conclusao
                </label>
                <Textarea
                  id="task-completion-notes"
                  className="min-h-28"
                  value={completionNotes}
                  onChange={(event) => onCompletionNotesChange(event.target.value)}
                  placeholder="Opcional. Ex.: servico finalizado sem ocorrencias."
                />
              </div>

              <div className="rounded-2xl border border-[#dfd7c0] bg-[#fbf8ef] p-4 text-sm text-muted-foreground">
                O registo sera criado com a data e hora atuais.
              </div>
            </>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              className="bg-[#215442] text-white hover:bg-[#183b2f]"
              onClick={onSubmit}
              disabled={isPending || !hasTeam}
            >
              {isPending ? "A concluir..." : "Confirmar conclusao"}
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="text-sm leading-6 text-[#1f2f27]">{value}</p>
    </div>
  )
}

function SectionPlaceholder({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#dfd7c0] bg-[#fbf8ef] p-4 text-sm text-muted-foreground">
      {label}
    </div>
  )
}

function formatStock(value: string) {
  return Number(value).toLocaleString("pt-PT", {
    minimumFractionDigits: Number(value) % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
}
