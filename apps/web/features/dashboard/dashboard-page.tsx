"use client"

import Link from "next/link"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Calendar02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  addDays,
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  subMonths,
  subYears,
} from "date-fns"
import { useMemo, useState } from "react"
import type { DateRange } from "react-day-picker"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { listTasks } from "@/features/calendar/api"
import type { Task } from "@/features/calendar/types"
import {
  formatTaskDate,
  formatTaskTimeRange,
  taskTypeLabels,
} from "@/features/calendar/utils"
import { listTeams } from "@/features/employees/api"
import type { TeamOption } from "@/features/employees/types"
import {
  listExpenses,
  listGardens,
  listIrrigationZones,
  listProductUsage,
} from "@/features/gardens/api"
import {
  formatIrrigationTimeRange,
  getUpcomingIrrigationZones,
} from "@/features/gardens/irrigation"
import type {
  Garden,
  GardenExpense,
  GardenProductUsage,
  IrrigationZone,
} from "@/features/gardens/types"
import { listPayments } from "@/features/payments/api"
import type { DerivedPaymentEntry, Payment } from "@/features/payments/types"
import {
  buildDerivedPaymentEntries,
  formatCurrency,
  paymentStatusLabels,
} from "@/features/payments/utils"
import { listProducts, listStockRules } from "@/features/stock/api"
import type { Product, StockRule } from "@/features/stock/types"
import {
  describeStockRule,
  formatStockQuantity,
  isStockRuleTriggered,
} from "@/features/stock/utils"
import { useAuthStore } from "@/lib/auth/store"

type QuickAction = {
  href: string
  label: string
}

type DashboardFinancePeriodOption =
  | "this_month"
  | "last_month"
  | "last_year"
  | "all_time"
  | "custom"

type DashboardDateRange = {
  from: Date | null
  to: Date | null
}

type DashboardFinanceSummary = {
  revenue: number
  directExpenses: number
  productUsageExpenses: number
  totalExpenses: number
  gross: number
}

const dashboardFinancePeriodLabels: Record<DashboardFinancePeriodOption, string> = {
  this_month: "Este mes",
  last_month: "Mes passado",
  last_year: "Ultimo 1 ano",
  all_time: "Todo o tempo",
  custom: "Customizado",
}

export function DashboardPageContent() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const activeCompanyId = useAuthStore((state) => state.activeCompanyId)
  const activeCompany = useAuthStore((state) =>
    state.companies.find((company) => company.id === state.activeCompanyId) ?? null
  )
  const isAdmin = activeCompany?.role === "admin"
  const today = useMemo(() => new Date(), [])
  const [financePeriod, setFinancePeriod] =
    useState<DashboardFinancePeriodOption>("this_month")
  const [customRange, setCustomRange] = useState<DateRange | undefined>(() => {
    const now = new Date()

    return {
      from: startOfMonth(now),
      to: now,
    }
  })
  const [customRangeOpen, setCustomRangeOpen] = useState(false)
  const todayIsoDate = format(today, "yyyy-MM-dd")
  const nextWeekIsoDate = format(addDays(today, 7), "yyyy-MM-dd")
  const financeDateRange = useMemo(
    () => resolveDashboardDateRange(financePeriod, customRange, today),
    [customRange, financePeriod, today]
  )
  const financeQueryFilters = useMemo(
    () => buildDashboardQueryFilters(financeDateRange),
    [financeDateRange]
  )

  const tasksQuery = useQuery({
    queryKey: ["dashboard", "tasks", activeCompanyId, accessToken, todayIsoDate, nextWeekIsoDate],
    queryFn: () =>
      listTasks(accessToken ?? "", {
        date_from: todayIsoDate,
        date_to: nextWeekIsoDate,
      }),
    enabled: Boolean(accessToken && activeCompanyId),
    placeholderData: keepPreviousData,
  })

  const gardensQuery = useQuery({
    queryKey: ["dashboard", "gardens", activeCompanyId, accessToken],
    queryFn: () => listGardens(accessToken ?? ""),
    enabled: Boolean(accessToken && activeCompanyId),
    placeholderData: keepPreviousData,
  })

  const teamsQuery = useQuery({
    queryKey: ["dashboard", "teams", activeCompanyId, accessToken],
    queryFn: () => listTeams(accessToken ?? ""),
    enabled: Boolean(accessToken && activeCompanyId),
    placeholderData: keepPreviousData,
  })

  const stockRulesQuery = useQuery({
    queryKey: ["dashboard", "stock-rules", activeCompanyId, accessToken],
    queryFn: () => listStockRules(accessToken ?? ""),
    enabled: Boolean(accessToken && activeCompanyId),
    placeholderData: keepPreviousData,
  })

  const productsQuery = useQuery({
    queryKey: ["dashboard", "products", activeCompanyId, accessToken],
    queryFn: () => listProducts(accessToken ?? ""),
    enabled: Boolean(accessToken && activeCompanyId && isAdmin),
    placeholderData: keepPreviousData,
  })

  const irrigationZonesQuery = useQuery({
    queryKey: ["dashboard", "irrigation", activeCompanyId, accessToken],
    queryFn: () => listIrrigationZones(accessToken ?? ""),
    enabled: Boolean(accessToken && activeCompanyId),
    placeholderData: keepPreviousData,
  })

  const paymentsQuery = useQuery({
    queryKey: ["dashboard", "payments", activeCompanyId, accessToken],
    queryFn: () => listPayments(accessToken ?? ""),
    enabled: Boolean(accessToken && activeCompanyId && isAdmin),
    placeholderData: keepPreviousData,
  })

  const expensesQuery = useQuery({
    queryKey: [
      "dashboard",
      "expenses",
      activeCompanyId,
      accessToken,
      financeQueryFilters.date_from ?? "all",
      financeQueryFilters.date_to ?? "all",
    ],
    queryFn: () => listExpenses(accessToken ?? "", financeQueryFilters),
    enabled: Boolean(accessToken && activeCompanyId && isAdmin),
    placeholderData: keepPreviousData,
  })

  const productUsageQuery = useQuery({
    queryKey: [
      "dashboard",
      "product-usage",
      activeCompanyId,
      accessToken,
      financeQueryFilters.date_from ?? "all",
      financeQueryFilters.date_to ?? "all",
    ],
    queryFn: () => listProductUsage(accessToken ?? "", financeQueryFilters),
    enabled: Boolean(accessToken && activeCompanyId && isAdmin),
    placeholderData: keepPreviousData,
  })

  const gardensById = useMemo(
    () => new Map((gardensQuery.data ?? []).map((garden) => [garden.id, garden])),
    [gardensQuery.data]
  )
  const teamsById = useMemo(
    () => new Map((teamsQuery.data ?? []).map((team) => [team.id, team])),
    [teamsQuery.data]
  )
  const scheduledTasks = useMemo(
    () => sortTasksBySchedule(tasksQuery.data ?? []),
    [tasksQuery.data]
  )
  const tasksToday = useMemo(
    () => scheduledTasks.filter((task) => task.date === todayIsoDate),
    [scheduledTasks, todayIsoDate]
  )
  const futureTasks = useMemo(
    () => scheduledTasks.filter((task) => task.date > todayIsoDate),
    [scheduledTasks, todayIsoDate]
  )
  const stockAlerts = useMemo(
    () => (stockRulesQuery.data ?? []).filter((rule) => isStockRuleTriggered(rule)),
    [stockRulesQuery.data]
  )
  const productsById = useMemo(
    () => new Map((productsQuery.data ?? []).map((product) => [product.id, product])),
    [productsQuery.data]
  )
  const upcomingIrrigation = useMemo(
    () => getUpcomingIrrigationZones(irrigationZonesQuery.data ?? []).slice(0, 6),
    [irrigationZonesQuery.data]
  )
  const paymentEntries = useMemo(
    () =>
      isAdmin
        ? buildDerivedPaymentEntries(
            gardensQuery.data ?? [],
            paymentsQuery.data ?? [],
            "1m"
          )
        : [],
    [gardensQuery.data, isAdmin, paymentsQuery.data]
  )
  const openPayments = useMemo(
    () => paymentEntries.filter((entry) => entry.status !== "paid"),
    [paymentEntries]
  )
  const financeSummary = useMemo(
    () =>
      buildDashboardFinanceSummary({
        payments: paymentsQuery.data ?? [],
        expenses: expensesQuery.data ?? [],
        productUsage: productUsageQuery.data ?? [],
        productsById,
        dateRange: financeDateRange,
      }),
    [
      expensesQuery.data,
      financeDateRange,
      paymentsQuery.data,
      productUsageQuery.data,
      productsById,
    ]
  )
  const isFinanceSummaryLoading =
    paymentsQuery.isLoading ||
    expensesQuery.isLoading ||
    productUsageQuery.isLoading ||
    productsQuery.isLoading

  if (!accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sessao em falta</CardTitle>
          <CardDescription>Faz login novamente antes de consultar o painel.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!activeCompanyId || !activeCompany) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Empresa em falta</CardTitle>
          <CardDescription>Seleciona uma empresa antes de consultar o painel.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {isAdmin ? (
        <AdminDashboard
          todayIsoDate={todayIsoDate}
          tasks={scheduledTasks}
          stockAlerts={stockAlerts}
          openPayments={openPayments}
          upcomingIrrigation={upcomingIrrigation}
          gardensById={gardensById}
          teamsById={teamsById}
          financePeriod={financePeriod}
          onFinancePeriodChange={(value) => {
            setFinancePeriod(value)
            setCustomRangeOpen(value === "custom")
          }}
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
          customRangeOpen={customRangeOpen}
          onCustomRangeOpenChange={setCustomRangeOpen}
          financeSummary={financeSummary}
          isTasksLoading={tasksQuery.isLoading}
          isStockAlertsLoading={stockRulesQuery.isLoading}
          isIrrigationLoading={irrigationZonesQuery.isLoading}
          isFinanceLoading={paymentsQuery.isLoading}
          isFinanceSummaryLoading={isFinanceSummaryLoading}
        />
      ) : (
        <EmployeeDashboard
          tasksToday={tasksToday}
          futureTasks={futureTasks}
          stockAlerts={stockAlerts}
          gardensById={gardensById}
          teamsById={teamsById}
          isTasksLoading={tasksQuery.isLoading}
          isStockAlertsLoading={stockRulesQuery.isLoading}
        />
      )}
    </div>
  )
}

function AdminDashboard({
  todayIsoDate,
  tasks,
  stockAlerts,
  openPayments,
  upcomingIrrigation,
  gardensById,
  teamsById,
  financePeriod,
  onFinancePeriodChange,
  customRange,
  onCustomRangeChange,
  customRangeOpen,
  onCustomRangeOpenChange,
  financeSummary,
  isTasksLoading,
  isStockAlertsLoading,
  isIrrigationLoading,
  isFinanceLoading,
  isFinanceSummaryLoading,
}: {
  todayIsoDate: string
  tasks: Task[]
  stockAlerts: StockRule[]
  openPayments: DerivedPaymentEntry[]
  upcomingIrrigation: Array<{ zone: IrrigationZone; nextDate: Date }>
  gardensById: Map<string, Garden>
  teamsById: Map<string, TeamOption>
  financePeriod: DashboardFinancePeriodOption
  onFinancePeriodChange: (value: DashboardFinancePeriodOption) => void
  customRange: DateRange | undefined
  onCustomRangeChange: (range: DateRange | undefined) => void
  customRangeOpen: boolean
  onCustomRangeOpenChange: (open: boolean) => void
  financeSummary: DashboardFinanceSummary
  isTasksLoading: boolean
  isStockAlertsLoading: boolean
  isIrrigationLoading: boolean
  isFinanceLoading: boolean
  isFinanceSummaryLoading: boolean
}) {
  const quickActions: QuickAction[] = [
    { href: `/calendar/tasks/new?date=${todayIsoDate}`, label: "Criar tarefa" },
    { href: "/gardens/new", label: "Criar jardim" },
    { href: "/quotes/new", label: "Criar orcamento" },
    { href: "/stock/new", label: "Criar produto" },
    { href: "/employees/new", label: "Criar membro" },
    { href: "/teams", label: "Gerir equipas" },
  ]

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Resumo financeiro
            </h2>
            <p className="text-sm text-muted-foreground">
              Pagamentos recebidos, despesas registadas e margem do periodo selecionado.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select
              value={financePeriod}
              onValueChange={(value: DashboardFinancePeriodOption) =>
                onFinancePeriodChange(value)
              }
            >
              <SelectTrigger className="w-full bg-white sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(
                  dashboardFinancePeriodLabels
                ) as DashboardFinancePeriodOption[]).map((option) => (
                  <SelectItem key={option} value={option}>
                    {dashboardFinancePeriodLabels[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {financePeriod === "custom" ? (
              <Popover
                open={customRangeOpen}
                onOpenChange={onCustomRangeOpenChange}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-between bg-white sm:w-[18rem]"
                  >
                    <span className="truncate">{formatDashboardRangeLabel(customRange)}</span>
                    <HugeiconsIcon icon={Calendar02Icon} strokeWidth={2} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    numberOfMonths={2}
                    selected={customRange}
                    onSelect={onCustomRangeChange}
                  />
                </PopoverContent>
              </Popover>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FinanceMetricCard
            label="Recebido"
            value={formatCurrency(financeSummary.revenue)}
            description="Pagamentos registados nos meses do periodo."
            isLoading={isFinanceSummaryLoading}
          />
          <FinanceMetricCard
            label="Despesas totais"
            value={formatCurrency(financeSummary.totalExpenses)}
            description="Despesas registadas mais produtos utilizados."
            detail={`Diretas ${formatCurrency(financeSummary.directExpenses)} | Produtos ${formatCurrency(financeSummary.productUsageExpenses)}`}
            isLoading={isFinanceSummaryLoading}
          />
          <FinanceMetricCard
            label="Valor bruto final"
            value={formatCurrency(financeSummary.gross)}
            description="Recebido menos os custos do mesmo periodo."
            isLoading={isFinanceSummaryLoading}
            tone={financeSummary.gross < 0 ? "negative" : "positive"}
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <SectionCard
          title="Agenda operacional"
          description="Hoje e proximos dias com acesso rapido ao detalhe de cada tarefa."
          href="/calendar"
          actionLabel="Abrir calendario"
        >
          <TaskList
            tasks={tasks.slice(0, 6)}
            gardensById={gardensById}
            teamsById={teamsById}
            isLoading={isTasksLoading}
            emptyLabel="Nao existem tarefas agendadas para os proximos dias."
          />
        </SectionCard>

        <SectionCard
          title="Acoes rapidas"
          description="Atalhos para as criacoes e areas principais da operacao."
        >
          <QuickActions actions={quickActions} />
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Alertas de stock"
          description="Apenas produtos que acionaram regras de negocio configuradas."
          href="/stock?tab=rules"
          actionLabel="Ver regras"
        >
          <StockAlertList
            stockAlerts={stockAlerts}
            isLoading={isStockAlertsLoading}
            emptyLabel="Nenhuma regra de stock esta acionada neste momento."
          />
        </SectionCard>

        <SectionCard
          title="Pagamentos em aberto"
          description="Entradas do mes atual que ainda nao estao totalmente pagas."
          href="/payments"
          actionLabel="Abrir pagamentos"
        >
          <PaymentList entries={openPayments.slice(0, 6)} isLoading={isFinanceLoading} />
        </SectionCard>
      </div>

      <SectionCard
        title="Proximas regas"
        description="Zonas de irrigacao mais proximas da proxima execucao."
        href="/gardens"
        actionLabel="Ver jardins"
      >
        <IrrigationList
          items={upcomingIrrigation}
          gardensById={gardensById}
          isLoading={isIrrigationLoading}
          emptyLabel="Nao existem regas proximas configuradas."
        />
      </SectionCard>
    </div>
  )
}

function EmployeeDashboard({
  tasksToday,
  futureTasks,
  stockAlerts,
  gardensById,
  teamsById,
  isTasksLoading,
  isStockAlertsLoading,
}: {
  tasksToday: Task[]
  futureTasks: Task[]
  stockAlerts: StockRule[]
  gardensById: Map<string, Garden>
  teamsById: Map<string, TeamOption>
  isTasksLoading: boolean
  isStockAlertsLoading: boolean
}) {
  const quickActions: QuickAction[] = [
    { href: "/calendar", label: "Abrir calendario" },
    { href: "/gardens", label: "Abrir jardins" },
    { href: "/stock", label: "Abrir stock" },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <SectionCard
          title="Hoje no terreno"
          description="Tarefas do dia com acesso rapido ao detalhe."
          href="/calendar"
          actionLabel="Ver calendario"
        >
          <TaskList
            tasks={tasksToday}
            gardensById={gardensById}
            teamsById={teamsById}
            isLoading={isTasksLoading}
            emptyLabel="Nao tens tarefas previstas para hoje."
          />
        </SectionCard>

        <SectionCard
          title="Acoes rapidas"
          description="Atalhos diretos para as areas de trabalho mais frequentes."
        >
          <QuickActions actions={quickActions} />
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Proximas tarefas"
          description="Planeamento visivel para os proximos dias."
          href="/calendar"
          actionLabel="Abrir calendario"
        >
          <TaskList
            tasks={futureTasks.slice(0, 6)}
            gardensById={gardensById}
            teamsById={teamsById}
            isLoading={isTasksLoading}
            emptyLabel="Nao tens mais tarefas agendadas para os proximos dias."
          />
        </SectionCard>

        <SectionCard
          title="Alertas de stock"
          description="Regras de negocio acionadas neste momento."
          href="/stock"
          actionLabel="Abrir stock"
        >
          <StockAlertList
            stockAlerts={stockAlerts}
            isLoading={isStockAlertsLoading}
            emptyLabel="Nenhuma regra de stock esta acionada neste momento."
          />
        </SectionCard>
      </div>
    </div>
  )
}

function FinanceMetricCard({
  label,
  value,
  description,
  detail,
  isLoading,
  tone = "default",
}: {
  label: string
  value: string
  description: string
  detail?: string
  isLoading: boolean
  tone?: "default" | "positive" | "negative"
}) {
  const valueClassName =
    tone === "negative" ? "text-red-700" : "text-[#1f2f27]"

  return (
    <Card className="border-[#dfd7c0] bg-white">
      <CardContent className="space-y-3 p-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <p className={`text-3xl font-semibold tracking-tight ${valueClassName}`}>
          {isLoading ? "A carregar..." : value}
        </p>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        {detail ? <p className="text-xs leading-5 text-muted-foreground">{detail}</p> : null}
      </CardContent>
    </Card>
  )
}

function SectionCard({
  title,
  description,
  href,
  actionLabel,
  children,
}: {
  title: string
  description: string
  href?: string
  actionLabel?: string
  children: React.ReactNode
}) {
  return (
    <Card className="border-[#dfd7c0] bg-white">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {href && actionLabel ? (
            <Button asChild variant="outline" size="sm">
              <Link href={href}>{actionLabel}</Link>
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  )
}

function TaskList({
  tasks,
  gardensById,
  teamsById,
  isLoading,
  emptyLabel,
}: {
  tasks: Task[]
  gardensById: Map<string, Garden>
  teamsById: Map<string, TeamOption>
  isLoading: boolean
  emptyLabel: string
}) {
  if (isLoading) {
    return <InfoPlaceholder label="A carregar tarefas..." />
  }

  if (tasks.length === 0) {
    return <InfoPlaceholder label={emptyLabel} />
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <Link
          key={task.id}
          href={`/calendar/tasks/${task.id}`}
          className="block rounded-2xl border border-[#e8e1cf] bg-[#fbf8ef] p-4 transition hover:border-[#215442]/40"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{taskTypeLabels[task.task_type]}</Badge>
                <span className="text-sm font-semibold text-[#1f2f27]">
                  {gardensById.get(task.garden_id)?.client_name ?? "Jardim"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {teamsById.get(task.team_id ?? "")?.name ?? "Sem equipa"}
              </p>
            </div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {formatTaskDate(task.date)} {formatTaskTimeRange(task)}
            </p>
          </div>
          {task.description?.trim() ? (
            <p className="mt-3 text-sm leading-6 text-[#1f2f27]">{task.description}</p>
          ) : null}
        </Link>
      ))}
    </div>
  )
}

function StockAlertList({
  stockAlerts,
  isLoading,
  emptyLabel,
}: {
  stockAlerts: StockRule[]
  isLoading: boolean
  emptyLabel: string
}) {
  if (isLoading) {
    return <InfoPlaceholder label="A carregar alertas de stock..." />
  }

  if (stockAlerts.length === 0) {
    return <InfoPlaceholder label={emptyLabel} />
  }

  return (
    <div className="space-y-3">
      {stockAlerts.slice(0, 6).map((rule) => (
        <article key={rule.id} className="rounded-2xl border border-[#e8e1cf] bg-[#fbf8ef] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[#1f2f27]">{rule.product_name}</p>
              <p className="text-sm text-muted-foreground">{describeStockRule(rule)}</p>
            </div>
            <Badge variant="destructive">Em alerta</Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#1f2f27]">
            Stock atual: {formatStockQuantity(rule.product_stock_quantity, rule.product_unit)}
          </p>
        </article>
      ))}
    </div>
  )
}

function IrrigationList({
  items,
  gardensById,
  isLoading,
  emptyLabel,
}: {
  items: Array<{ zone: IrrigationZone; nextDate: Date }>
  gardensById: Map<string, Garden>
  isLoading: boolean
  emptyLabel: string
}) {
  if (isLoading) {
    return <InfoPlaceholder label="A carregar sistema de irrigacao..." />
  }

  if (items.length === 0) {
    return <InfoPlaceholder label={emptyLabel} />
  }

  return (
    <div className="space-y-3">
      {items.map(({ zone, nextDate }) => (
        <article key={zone.id} className="rounded-2xl border border-[#e8e1cf] bg-[#fbf8ef] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[#1f2f27]">{zone.name}</p>
              <p className="text-sm text-muted-foreground">
                {gardensById.get(zone.garden_id)?.client_name ?? "Jardim"}
              </p>
            </div>
            <Badge variant="outline">{format(nextDate, "dd/MM HH:mm")}</Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#1f2f27]">
            Horario: {formatIrrigationTimeRange(zone)}
          </p>
        </article>
      ))}
    </div>
  )
}

function PaymentList({
  entries,
  isLoading,
}: {
  entries: DerivedPaymentEntry[]
  isLoading: boolean
}) {
  if (isLoading) {
    return <InfoPlaceholder label="A carregar pagamentos..." />
  }

  if (entries.length === 0) {
    return <InfoPlaceholder label="Nao existem pagamentos em aberto no mes atual." />
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <article key={entry.key} className="rounded-2xl border border-[#e8e1cf] bg-[#fbf8ef] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[#1f2f27]">{entry.garden_name}</p>
              <p className="text-sm text-muted-foreground">{entry.period_label}</p>
            </div>
            <Badge variant={entry.status === "pending" ? "destructive" : "outline"}>
              {paymentStatusLabels[entry.status]}
            </Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#1f2f27]">
            Em falta: {formatCurrency(entry.remaining_amount)}
          </p>
        </article>
      ))}
    </div>
  )
}

function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {actions.map((action) => (
        <Button key={action.href} asChild variant="outline" className="justify-start bg-[#fbf8ef]">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      ))}
    </div>
  )
}

function InfoPlaceholder({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#dfd7c0] bg-[#fbf8ef] p-4 text-sm text-muted-foreground">
      {label}
    </div>
  )
}

function sortTasksBySchedule(tasks: Task[]) {
  return [...tasks].sort((left, right) => {
    const dateComparison = left.date.localeCompare(right.date)
    if (dateComparison !== 0) {
      return dateComparison
    }

    return (left.start_time ?? "99:99:99").localeCompare(right.start_time ?? "99:99:99")
  })
}

function buildDashboardFinanceSummary({
  payments,
  expenses,
  productUsage,
  productsById,
  dateRange,
}: {
  payments: Payment[]
  expenses: GardenExpense[]
  productUsage: GardenProductUsage[]
  productsById: Map<string, Product>
  dateRange: DashboardDateRange
}): DashboardFinanceSummary {
  const revenue = payments.reduce((sum, payment) => {
    if (!isPaymentInsideDashboardRange(payment, dateRange)) {
      return sum
    }

    return sum + toFiniteNumber(payment.amount)
  }, 0)

  const directExpenses = expenses.reduce(
    (sum, expense) => sum + toFiniteNumber(expense.amount),
    0
  )

  const productUsageExpenses = productUsage.reduce((sum, usage) => {
    const product = productsById.get(usage.product_id)
    const unitPrice = toFiniteNumber(product?.unit_price)
    const quantity = toFiniteNumber(usage.quantity)

    return sum + unitPrice * quantity
  }, 0)

  const totalExpenses = directExpenses + productUsageExpenses

  return {
    revenue,
    directExpenses,
    productUsageExpenses,
    totalExpenses,
    gross: revenue - totalExpenses,
  }
}

function isPaymentInsideDashboardRange(payment: Payment, range: DashboardDateRange) {
  if (!range.from && !range.to) {
    return true
  }

  const paymentMonthDate = new Date(payment.year, payment.month - 1, 1)

  if (range.from) {
    const fromMonthDate = new Date(range.from.getFullYear(), range.from.getMonth(), 1)

    if (paymentMonthDate < fromMonthDate) {
      return false
    }
  }

  if (range.to) {
    const toMonthDate = new Date(range.to.getFullYear(), range.to.getMonth(), 1)

    if (paymentMonthDate > toMonthDate) {
      return false
    }
  }

  return true
}

function resolveDashboardDateRange(
  option: DashboardFinancePeriodOption,
  customRange: DateRange | undefined,
  now: Date
): DashboardDateRange {
  if (option === "all_time") {
    return { from: null, to: null }
  }

  if (option === "custom") {
    return {
      from: customRange?.from ? startOfDay(customRange.from) : null,
      to: customRange?.to
        ? endOfDay(customRange.to)
        : customRange?.from
          ? endOfDay(customRange.from)
          : null,
    }
  }

  if (option === "last_month") {
    const previousMonth = subMonths(now, 1)

    return {
      from: startOfMonth(previousMonth),
      to: endOfMonth(previousMonth),
    }
  }

  if (option === "last_year") {
    return {
      from: startOfDay(subYears(now, 1)),
      to: endOfDay(now),
    }
  }

  return {
    from: startOfMonth(now),
    to: endOfMonth(now),
  }
}

function buildDashboardQueryFilters(range: DashboardDateRange) {
  const filters: { date_from?: string; date_to?: string } = {}

  if (range.from) {
    filters.date_from = format(range.from, "yyyy-MM-dd")
  }

  if (range.to) {
    filters.date_to = format(range.to, "yyyy-MM-dd")
  }

  return filters
}

function isDateInsideDashboardRange(date: Date, range: DashboardDateRange) {
  if (range.from && date < range.from) {
    return false
  }

  if (range.to && date > range.to) {
    return false
  }

  return true
}

function formatDashboardRangeLabel(range: DateRange | undefined) {
  if (!range?.from) {
    return "Selecionar intervalo"
  }

  if (!range.to) {
    return format(range.from, "dd/MM/yyyy")
  }

  return `${format(range.from, "dd/MM/yyyy")} ate ${format(range.to, "dd/MM/yyyy")}`
}

function toFiniteNumber(value: string | number | null | undefined) {
  const normalized = Number(value)

  return Number.isFinite(normalized) ? normalized : 0
}
