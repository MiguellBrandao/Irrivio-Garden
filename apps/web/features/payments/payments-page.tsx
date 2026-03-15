"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import type { DateRange } from "react-day-picker"
import { Add01Icon, Calendar02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { listGardens } from "@/features/gardens/api"
import { listPayments } from "@/features/payments/api"
import { PaymentDetailsDialog } from "@/features/payments/payment-details-dialog"
import { PaymentFormDialog } from "@/features/payments/payment-form-dialog"
import type {
  PaymentPeriodOption,
  PaymentStatus,
} from "@/features/payments/types"
import {
  buildDerivedPaymentEntries,
  formatCurrency,
  formatDate,
  formatMonthYear,
  paymentPeriodLabels,
  paymentStatusLabels,
} from "@/features/payments/utils"
import { useAuthStore } from "@/lib/auth/store"

const PAGE_SIZE_OPTIONS = [5, 10, 20]

export function PaymentsPageContent() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const activeCompanyId = useAuthStore((state) => state.activeCompanyId)
  const activeCompany = useAuthStore((state) =>
    state.companies.find((company) => company.id === state.activeCompanyId) ?? null
  )
  const isAdmin = activeCompany?.role === "admin"

  const [statusFilter, setStatusFilter] = useState<"all" | PaymentStatus>("all")
  const [periodFilter, setPeriodFilter] = useState<PaymentPeriodOption>("1m")
  const [gardenFilter, setGardenFilter] = useState("all")
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)
  const [detailsEntryKey, setDetailsEntryKey] = useState<string | null>(null)
  const [customRange, setCustomRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  })
  const [customRangeOpen, setCustomRangeOpen] = useState(false)

  const gardensQuery = useQuery({
    queryKey: ["gardens", activeCompanyId, accessToken],
    queryFn: () => listGardens(accessToken ?? ""),
    enabled: Boolean(accessToken && activeCompanyId && isAdmin),
    placeholderData: keepPreviousData,
  })

  const paymentsQuery = useQuery({
    queryKey: ["payments", activeCompanyId, accessToken],
    queryFn: () => listPayments(accessToken ?? ""),
    enabled: Boolean(accessToken && activeCompanyId && isAdmin),
    placeholderData: keepPreviousData,
  })

  const entries = useMemo(
    () =>
      buildDerivedPaymentEntries(
        gardensQuery.data ?? [],
        paymentsQuery.data ?? [],
        periodFilter,
        customRange
      ),
    [customRange, gardensQuery.data, paymentsQuery.data, periodFilter]
  )

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (statusFilter !== "all" && entry.status !== statusFilter) {
        return false
      }

      if (gardenFilter !== "all" && entry.garden_id !== gardenFilter) {
        return false
      }

      return true
    })
  }, [entries, gardenFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize))
  const safePageIndex = Math.min(pageIndex, totalPages - 1)
  const paginatedEntries = filteredEntries.slice(
    safePageIndex * pageSize,
    safePageIndex * pageSize + pageSize
  )

  const selectedDetailsEntry =
    filteredEntries.find((entry) => entry.key === detailsEntryKey) ?? null

  if (!accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sessao em falta</CardTitle>
          <CardDescription>
            Faz login novamente antes de gerir pagamentos.
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
            Seleciona uma empresa antes de gerir pagamentos.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acesso restrito</CardTitle>
          <CardDescription>
            Apenas administradores podem gerir pagamentos.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-[#dfd7c0] bg-[#fbf8ef]">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <CardTitle>Pagamentos</CardTitle>
            <CardDescription>
              Estado mensal dos pagamentos por jardim, com base nos registos ja feitos.
            </CardDescription>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-center xl:justify-end">
            <div className="grid grid-cols-3 gap-2 sm:gap-3 xl:flex xl:flex-wrap xl:items-center">
              <Select
                value={gardenFilter}
                onValueChange={(value) => {
                  setGardenFilter(value)
                  setPageIndex(0)
                }}
              >
                <SelectTrigger className="min-w-0 bg-white xl:w-56">
                  <SelectValue placeholder="Filtrar por jardim" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os jardins</SelectItem>
                  {(gardensQuery.data ?? []).map((garden) => (
                    <SelectItem key={garden.id} value={garden.id}>
                      {garden.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={periodFilter}
                onValueChange={(value: PaymentPeriodOption) => {
                  setPeriodFilter(value)
                  setPageIndex(0)
                }}
              >
                <SelectTrigger className="min-w-0 bg-white xl:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(paymentPeriodLabels) as PaymentPeriodOption[]).map((option) => (
                    <SelectItem key={option} value={option}>
                      {paymentPeriodLabels[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value))
                  setPageIndex(0)
                }}
              >
                <SelectTrigger className="min-w-0 bg-white xl:w-28">
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

              {periodFilter === "custom" ? (
                <Popover open={customRangeOpen} onOpenChange={setCustomRangeOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="col-span-3 justify-between bg-white xl:w-[22rem]"
                    >
                      <span className="truncate">
                        {customRange?.from
                          ? customRange.to
                            ? `${formatMonthYear(customRange.from)} ate ${formatMonthYear(customRange.to)}`
                            : formatMonthYear(customRange.from)
                          : "Selecionar intervalo"}
                      </span>
                      <HugeiconsIcon icon={Calendar02Icon} strokeWidth={2} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      numberOfMonths={2}
                      selected={customRange}
                      onSelect={(range) => {
                        setCustomRange(range)
                      }}
                    />
                  </PopoverContent>
                </Popover>
              ) : null}
            </div>

            <Button
              className="bg-[#215442] text-white hover:bg-[#183b2f]"
              onClick={() => setCreateOpen(true)}
            >
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
              Criar pagamento
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusFilterButton
            label="Todos"
            active={statusFilter === "all"}
            onClick={() => {
              setStatusFilter("all")
              setPageIndex(0)
            }}
          />
          <StatusFilterButton
            label="Pendente"
            active={statusFilter === "pending"}
            onClick={() => {
              setStatusFilter("pending")
              setPageIndex(0)
            }}
          />
          <StatusFilterButton
            label="Em pagamento"
            active={statusFilter === "partial"}
            onClick={() => {
              setStatusFilter("partial")
              setPageIndex(0)
            }}
          />
          <StatusFilterButton
            label="Pago"
            active={statusFilter === "paid"}
            onClick={() => {
              setStatusFilter("paid")
              setPageIndex(0)
            }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 md:hidden">
          {gardensQuery.isLoading || paymentsQuery.isLoading ? (
            <EmptyState message="A carregar pagamentos..." />
          ) : paginatedEntries.length ? (
            paginatedEntries.map((entry) => (
              <article
                key={entry.key}
                className="rounded-2xl border border-[#dfd7c0] bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="font-medium text-[#1f2f27]">{entry.garden_name}</h3>
                    <p className="text-sm text-muted-foreground">{entry.period_label}</p>
                  </div>
                  <PaymentStatusBadge status={entry.status} />
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <InfoRow label="Valor mensal" value={formatCurrency(entry.monthly_amount)} />
                  <InfoRow label="Pago" value={formatCurrency(entry.total_paid)} />
                  <InfoRow label="Inicio" value={formatDate(entry.start_date)} />
                  <InfoRow label="Dia cobranca" value={entry.billing_day?.toString() ?? "-"} />
                </dl>

                <div className="mt-4 flex justify-end">
                  <Button type="button" variant="outline" onClick={() => setDetailsEntryKey(entry.key)}>
                    Ver detalhes
                  </Button>
                </div>
              </article>
            ))
          ) : (
            <EmptyState message="Nenhum pagamento encontrado para os filtros selecionados." />
          )}
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-[#dfd7c0] bg-white md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jardim</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead>Valor mensal</TableHead>
                <TableHead>Inicio contrato</TableHead>
                <TableHead>Dia cobranca</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gardensQuery.isLoading || paymentsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    A carregar pagamentos...
                  </TableCell>
                </TableRow>
              ) : paginatedEntries.length ? (
                paginatedEntries.map((entry) => (
                  <TableRow key={entry.key}>
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <div className="font-medium text-[#1f2f27]">{entry.garden_name}</div>
                        <div className="max-w-72 whitespace-normal text-sm text-muted-foreground">
                          {entry.garden_address}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{entry.period_label}</TableCell>
                    <TableCell>{formatCurrency(entry.monthly_amount)}</TableCell>
                    <TableCell>{formatDate(entry.start_date)}</TableCell>
                    <TableCell>{entry.billing_day?.toString() ?? "-"}</TableCell>
                    <TableCell>{formatCurrency(entry.total_paid)}</TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={entry.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDetailsEntryKey(entry.key)}
                      >
                        Ver detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    Nenhum pagamento encontrado para os filtros selecionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredEntries.length} registo(s) no total. Pagina {safePageIndex + 1} de {totalPages}.
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

        <PaymentFormDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" />
        <PaymentFormDialog
          open={Boolean(editingPaymentId)}
          onOpenChange={(open) => {
            if (!open) {
              setEditingPaymentId(null)
            }
          }}
          mode="edit"
          paymentId={editingPaymentId ?? undefined}
        />
        <PaymentDetailsDialog
          open={Boolean(detailsEntryKey)}
          onOpenChange={(open) => {
            if (!open) {
              setDetailsEntryKey(null)
            }
          }}
          entry={selectedDetailsEntry}
          onEditPayment={(paymentId) => {
            setDetailsEntryKey(null)
            setEditingPaymentId(paymentId)
          }}
        />
      </CardContent>
    </Card>
  )
}

function StatusFilterButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      className={active ? "bg-[#215442] text-white hover:bg-[#183b2f]" : ""}
      onClick={onClick}
    >
      {label}
    </Button>
  )
}

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  if (status === "pending") {
    return <Badge variant="destructive">{paymentStatusLabels[status]}</Badge>
  }

  if (status === "partial") {
    return (
      <Badge className="border-yellow-200 bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
        {paymentStatusLabels[status]}
      </Badge>
    )
  }

  return <Badge variant="default">{paymentStatusLabels[status]}</Badge>
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-[#dfd7c0] bg-white px-4 py-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
