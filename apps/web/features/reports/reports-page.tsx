"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import type { DateRange } from "react-day-picker"
import {
  Calendar02Icon,
  FileDownloadIcon,
  PencilEdit02Icon,
  SearchIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
import { listTasks, listWorkLogs } from "@/features/calendar/api"
import { listEmployees, listTeams } from "@/features/employees/api"
import {
  listExpenses,
  listGardens,
  listIrrigationZones,
  listProductUsage,
} from "@/features/gardens/api"
import { listPayments } from "@/features/payments/api"
import { listQuotes } from "@/features/quotes/api"
import { createReport, deleteReport, getReportById, listReports, updateReport } from "@/features/reports/api"
import { buildGeneralReportDocument, downloadStoredReportPdf } from "@/features/reports/pdf"
import type { Report, ReportPeriodType } from "@/features/reports/types"
import {
  buildDefaultReportTitle,
  buildReportFileName,
  formatReportCreatedAt,
  formatReportDateRangeLabel,
  formatReportPeriodValue,
  normalizeReportSummary,
  reportPeriodLabels,
  resolveReportDateRange,
  toDateOnly,
  toDateTimeIso,
} from "@/features/reports/utils"
import { listProducts, listStockRules } from "@/features/stock/api"
import { useAuthStore } from "@/lib/auth/store"
import { formatCurrency } from "@/features/payments/utils"

const PAGE_SIZE_OPTIONS = [5, 10, 20]

export function ReportsPageContent() {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const activeCompanyId = useAuthStore((state) => state.activeCompanyId)
  const activeCompany = useAuthStore((state) =>
    state.companies.find((company) => company.id === state.activeCompanyId) ?? null
  )
  const user = useAuthStore((state) => state.user)
  const isAdmin = activeCompany?.role === "admin"

  const [periodType, setPeriodType] = useState<ReportPeriodType>("this_month")
  const [customRange, setCustomRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  })
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [customRangeOpen, setCustomRangeOpen] = useState(false)
  const [titleInput, setTitleInput] = useState("")
  const [search, setSearch] = useState("")
  const [periodFilter, setPeriodFilter] = useState<"all" | ReportPeriodType>("all")
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [editingReport, setEditingReport] = useState<Report | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const dateRange = useMemo(
    () => resolveReportDateRange(periodType, customRange),
    [customRange, periodType]
  )
  const previewTitle = titleInput.trim() || buildDefaultReportTitle(periodType, dateRange)

  const reportsQuery = useQuery({
    queryKey: ["reports", activeCompanyId, accessToken],
    queryFn: () => listReports(accessToken ?? ""),
    enabled: Boolean(accessToken && activeCompanyId && isAdmin),
    placeholderData: keepPreviousData,
  })

  const reports = useMemo(
    () =>
      (reportsQuery.data ?? []).map((report) => ({
        ...report,
        summary: normalizeReportSummary(report.summary),
      })),
    [reportsQuery.data]
  )

  const filteredReports = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return reports.filter((report) => {
      if (periodFilter !== "all" && report.period_type !== periodFilter) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return [report.title, report.generated_by_name, formatReportPeriodValue(report)]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    })
  }, [periodFilter, reports, search])

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize))
  const safePageIndex = Math.min(pageIndex, totalPages - 1)
  const paginatedReports = filteredReports.slice(
    safePageIndex * pageSize,
    safePageIndex * pageSize + pageSize
  )

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken || !activeCompany || !user) {
        throw new Error("Sessao em falta.")
      }
      if (periodType === "custom" && !dateRange.from) {
        throw new Error("Seleciona um intervalo de datas para o relatorio customizado.")
      }

      const [gardens, employees, teams, tasks, workLogs, payments, expenses, productUsage, products, stockRules, irrigationZones, quotes] =
        await Promise.all([
          listGardens(accessToken),
          listEmployees(accessToken),
          listTeams(accessToken),
          listTasks(accessToken, {
            date_from: toDateOnly(dateRange.from),
            date_to: toDateOnly(dateRange.to),
          }),
          listWorkLogs(accessToken, {
            start_from: toDateTimeIso(dateRange.from, "start"),
            start_to: toDateTimeIso(dateRange.to, "end"),
          }),
          listPayments(accessToken),
          listExpenses(accessToken, {
            date_from: toDateOnly(dateRange.from),
            date_to: toDateOnly(dateRange.to),
          }),
          listProductUsage(accessToken, {
            date_from: toDateOnly(dateRange.from),
            date_to: toDateOnly(dateRange.to),
          }),
          listProducts(accessToken),
          listStockRules(accessToken),
          listIrrigationZones(accessToken),
          listQuotes(accessToken),
        ])

      const generatedAt = new Date()
      const pdf = await buildGeneralReportDocument({
        company: activeCompany,
        title: previewTitle,
        periodType,
        periodLabel: formatReportDateRangeLabel(periodType, dateRange),
        dateRange,
        generatedByName: user.name,
        generatedAt,
        gardens,
        employees,
        teams,
        tasks,
        workLogs,
        payments,
        expenses,
        productUsage,
        products,
        stockRules,
        irrigationZones,
        quotes,
      })

      await createReport(accessToken, {
        title: previewTitle,
        report_type: "general",
        period_type: periodType,
        period_start: toDateOnly(dateRange.from),
        period_end: toDateOnly(dateRange.to),
        file_name: pdf.fileName,
        mime_type: pdf.mimeType,
        file_base64: pdf.base64,
        summary: pdf.summary,
      })

      return pdf
    },
    onSuccess: async (pdf) => {
      await queryClient.invalidateQueries({ queryKey: ["reports"] })
      downloadStoredReportPdf(pdf.base64, pdf.fileName)
      toast.success("Relatorio gerado e guardado com sucesso.")
      setTitleInput("")
      setGenerateDialogOpen(false)
      setCustomRangeOpen(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel gerar o relatorio.")
    },
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken || !editingReport) {
        throw new Error("Relatorio invalido.")
      }

      return updateReport(accessToken, editingReport.id, {
        title: editingTitle.trim(),
        file_name: buildReportFileName(editingTitle.trim(), new Date(editingReport.created_at)),
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reports"] })
      toast.success("Titulo do relatorio atualizado com sucesso.")
      setEditingReport(null)
      setEditingTitle("")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel atualizar o relatorio.")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (report: Report) => {
      if (!accessToken) {
        throw new Error("Sessao em falta.")
      }

      await deleteReport(accessToken, report.id)
      return report
    },
    onSuccess: async (report) => {
      await queryClient.invalidateQueries({ queryKey: ["reports"] })
      toast.success(`Relatorio "${report.title}" apagado com sucesso.`)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel apagar o relatorio.")
    },
  })

  async function handleDownload(report: Report) {
    if (!accessToken) {
      toast.error("Sessao em falta.")
      return
    }

    try {
      setDownloadingId(report.id)
      const storedReport = await getReportById(accessToken, report.id)
      downloadStoredReportPdf(storedReport.file_base64 ?? "", storedReport.file_name)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nao foi possivel descarregar o relatorio."
      )
    } finally {
      setDownloadingId(null)
    }
  }

  function openEditDialog(report: Report) {
    setEditingReport(report)
    setEditingTitle(report.title)
  }

  if (!accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sessao em falta</CardTitle>
          <CardDescription>Faz login novamente antes de gerar relatorios.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!activeCompanyId || !activeCompany) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Empresa em falta</CardTitle>
          <CardDescription>Seleciona uma empresa antes de gerar relatorios.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acesso restrito</CardTitle>
          <CardDescription>Apenas administradores podem gerar relatorios.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-[#dfd7c0] bg-[#fbf8ef]">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-2">
              <CardTitle>Relatorios</CardTitle>
              <CardDescription>
                Registo dos PDFs ja gerados e guardados nesta empresa.
              </CardDescription>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_7rem_auto] xl:min-w-[44rem]">
              <div className="relative">
                <HugeiconsIcon
                  icon={SearchIcon}
                  strokeWidth={2}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setPageIndex(0)
                  }}
                  placeholder="Pesquisar relatorios..."
                  className="bg-white pl-10"
                />
              </div>

              <Select
                value={periodFilter}
                onValueChange={(value: "all" | ReportPeriodType) => {
                  setPeriodFilter(value)
                  setPageIndex(0)
                }}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os periodos</SelectItem>
                  {(Object.keys(reportPeriodLabels) as ReportPeriodType[]).map((option) => (
                    <SelectItem key={option} value={option}>
                      {reportPeriodLabels[option]}
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
                <SelectTrigger className="bg-white">
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
                onClick={() => setGenerateDialogOpen(true)}
              >
                <HugeiconsIcon icon={FileDownloadIcon} strokeWidth={2} />
                Gerar relatorio
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 md:hidden">
            {reportsQuery.isLoading ? (
              <EmptyState label="A carregar relatorios..." />
            ) : paginatedReports.length ? (
              paginatedReports.map((report) => (
                <article
                  key={report.id}
                  className="rounded-2xl border border-[#dfd7c0] bg-white p-4 shadow-sm"
                >
                  <div className="space-y-1">
                    <h3 className="font-medium text-[#1f2f27]">{report.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatReportPeriodValue(report)}
                    </p>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <InfoRow label="Criado por" value={report.generated_by_name} />
                    <InfoRow label="Criado em" value={formatReportCreatedAt(report.created_at)} />
                    <InfoRow
                      label="Recebido"
                      value={formatCurrency(report.summary.revenue)}
                    />
                    <InfoRow
                      label="Bruto"
                      value={formatCurrency(report.summary.gross)}
                    />
                  </dl>

                  <div className="mt-4 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => handleDownload(report)}
                      disabled={downloadingId === report.id}
                    >
                      <HugeiconsIcon icon={FileDownloadIcon} strokeWidth={2} />
                      <span className="sr-only">Descarregar relatorio</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => openEditDialog(report)}
                    >
                      <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                      <span className="sr-only">Editar titulo</span>
                    </Button>
                    <DeleteConfirmDialog
                      title="Apagar relatorio"
                      description={`Tens a certeza que queres apagar o relatorio "${report.title}"?`}
                      onConfirm={() => deleteMutation.mutate(report)}
                      isPending={deleteMutation.isPending}
                      srLabel="Apagar relatorio"
                    />
                  </div>
                </article>
              ))
            ) : (
              <EmptyState label="Ainda nao existem relatorios gerados para esta empresa." />
            )}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-[#dfd7c0] bg-white md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titulo</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Criado por</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Recebido</TableHead>
                  <TableHead>Despesas</TableHead>
                  <TableHead>Bruto</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      A carregar relatorios...
                    </TableCell>
                  </TableRow>
                ) : paginatedReports.length ? (
                  paginatedReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <div className="font-medium text-[#1f2f27]">{report.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {report.file_name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatReportPeriodValue(report)}</TableCell>
                      <TableCell>{report.generated_by_name}</TableCell>
                      <TableCell>{formatReportCreatedAt(report.created_at)}</TableCell>
                      <TableCell>{formatCurrency(report.summary.revenue)}</TableCell>
                      <TableCell>{formatCurrency(report.summary.total_expenses)}</TableCell>
                      <TableCell>{formatCurrency(report.summary.gross)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            onClick={() => handleDownload(report)}
                            disabled={downloadingId === report.id}
                          >
                            <HugeiconsIcon icon={FileDownloadIcon} strokeWidth={2} />
                            <span className="sr-only">Descarregar relatorio</span>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            onClick={() => openEditDialog(report)}
                          >
                            <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                            <span className="sr-only">Editar titulo</span>
                          </Button>
                          <DeleteConfirmDialog
                            title="Apagar relatorio"
                            description={`Tens a certeza que queres apagar o relatorio "${report.title}"?`}
                            onConfirm={() => deleteMutation.mutate(report)}
                            isPending={deleteMutation.isPending}
                            srLabel="Apagar relatorio"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      Ainda nao existem relatorios gerados para esta empresa.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredReports.length} registo(s) no total. Pagina {safePageIndex + 1} de{" "}
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

      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Gerar relatorio</DialogTitle>
            <DialogDescription>
              Gera um PDF completo com financeiro, operacao, stock, irrigacao e orçamentos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="report-title"
                className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
              >
                Titulo do relatorio
              </label>
              <Input
                id="report-title"
                value={titleInput}
                onChange={(event) => setTitleInput(event.target.value)}
                placeholder={previewTitle}
                className="bg-white"
              />
              <p className="text-sm text-muted-foreground">
                Se deixares vazio, usa o titulo sugerido automaticamente.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Periodo
              </label>
              <Select
                value={periodType}
                onValueChange={(value: ReportPeriodType) => {
                  setPeriodType(value)
                  setCustomRangeOpen(value === "custom")
                }}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(reportPeriodLabels) as ReportPeriodType[]).map((option) => (
                    <SelectItem key={option} value={option}>
                      {reportPeriodLabels[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {periodType === "custom" ? (
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Intervalo de datas
                </label>
                <Popover open={customRangeOpen} onOpenChange={setCustomRangeOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between bg-white"
                    >
                      <span className="truncate">
                        {formatReportDateRangeLabel(periodType, dateRange)}
                      </span>
                      <HugeiconsIcon icon={Calendar02Icon} strokeWidth={2} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      numberOfMonths={2}
                      selected={customRange}
                      onSelect={setCustomRange}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                className="bg-[#215442] text-white hover:bg-[#183b2f]"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                <HugeiconsIcon icon={FileDownloadIcon} strokeWidth={2} />
                {generateMutation.isPending ? "A gerar..." : "Gerar relatorio"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setGenerateDialogOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingReport)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingReport(null)
            setEditingTitle("")
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar titulo do relatorio</DialogTitle>
            <DialogDescription>
              Atualiza apenas o titulo mostrado no historico e no ficheiro guardado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="edit-report-title"
                className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
              >
                Titulo
              </label>
              <Input
                id="edit-report-title"
                value={editingTitle}
                onChange={(event) => setEditingTitle(event.target.value)}
                placeholder="Titulo do relatorio"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                className="bg-[#215442] text-white hover:bg-[#183b2f]"
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending || !editingTitle.trim()}
              >
                {updateMutation.isPending ? "A guardar..." : "Guardar alteracoes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingReport(null)
                  setEditingTitle("")
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-[#dfd7c0] bg-white px-4 py-8 text-center text-sm text-muted-foreground">
      {label}
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
