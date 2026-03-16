"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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
import {
  createGardenIrrigationZone,
  deleteGardenIrrigationZone,
  getGardenById,
  listGardenIrrigationZones,
  updateGardenIrrigationZone,
} from "@/features/gardens/api"
import {
  formatIrrigationFrequency,
  formatIrrigationTimeRange,
  formatNextIrrigation,
  irrigationFrequencyLabels,
  irrigationWeekDayLabels,
} from "@/features/gardens/irrigation"
import type {
  IrrigationFrequencyType,
  IrrigationWeekDay,
  IrrigationZone,
  SaveIrrigationZonePayload,
} from "@/features/gardens/types"
import { useAuthStore } from "@/lib/auth/store"
import { cn } from "@/lib/utils"

const PAGE_SIZE_OPTIONS = [5, 10, 20]
const irrigationFrequencyOptions: IrrigationFrequencyType[] = [
  "daily",
  "every_n_days",
  "weekly",
]
const irrigationWeekDayOrder: IrrigationWeekDay[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]

type GardenIrrigationPageProps = {
  gardenId: string
}

export function GardenIrrigationPage({ gardenId }: GardenIrrigationPageProps) {
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
  const [editingZone, setEditingZone] = useState<IrrigationZone | null>(null)
  const [name, setName] = useState("")
  const [frequencyType, setFrequencyType] = useState<IrrigationFrequencyType>("daily")
  const [intervalDays, setIntervalDays] = useState("3")
  const [weekDays, setWeekDays] = useState<IrrigationWeekDay[]>([])
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState("06:00")
  const [endTime, setEndTime] = useState("07:00")
  const [active, setActive] = useState(true)

  const gardenQuery = useQuery({
    queryKey: ["gardens", "detail", gardenId, activeCompanyId, accessToken],
    queryFn: () => getGardenById(accessToken ?? "", gardenId),
    enabled: Boolean(accessToken && activeCompanyId && gardenId),
  })

  const irrigationZonesQuery = useQuery({
    queryKey: ["gardens", "irrigation", gardenId, activeCompanyId, accessToken],
    queryFn: () => listGardenIrrigationZones(accessToken ?? "", gardenId),
    enabled: Boolean(accessToken && activeCompanyId && gardenId),
  })

  const filteredZones = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    if (!normalizedSearch) {
      return irrigationZonesQuery.data ?? []
    }

    return (irrigationZonesQuery.data ?? []).filter((zone) =>
      [
        zone.name,
        irrigationFrequencyLabels[zone.frequency_type],
        zone.week_days.map((day) => irrigationWeekDayLabels[day]).join(" "),
        zone.active ? "ativa" : "inativa",
        zone.start_date,
        zone.start_time,
        zone.end_time,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    )
  }, [irrigationZonesQuery.data, search])

  const totalPages = Math.max(1, Math.ceil(filteredZones.length / pageSize))
  const safePageIndex = Math.min(pageIndex, totalPages - 1)
  const paginatedZones = filteredZones.slice(
    safePageIndex * pageSize,
    safePageIndex * pageSize + pageSize
  )

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) {
        throw new Error("Sem sessao ativa.")
      }

      const normalizedName = name.trim()
      if (!normalizedName) {
        throw new Error("Indica o nome da zona.")
      }

      if (!startDate.trim()) {
        throw new Error("Indica a data inicial.")
      }

      if (!startTime.trim() || !endTime.trim()) {
        throw new Error("Indica o horario de rega.")
      }

      if (endTime <= startTime) {
        throw new Error("A hora final tem de ser depois da hora inicial.")
      }

      const payload: SaveIrrigationZonePayload = {
        name: normalizedName,
        frequency_type: frequencyType,
        start_date: startDate.trim(),
        start_time: normalizeTimeValue(startTime),
        end_time: normalizeTimeValue(endTime),
        active,
      }

      if (frequencyType === "every_n_days") {
        const parsedIntervalDays = Number(intervalDays)
        if (!Number.isInteger(parsedIntervalDays) || parsedIntervalDays < 2) {
          throw new Error("Indica um intervalo valido de pelo menos 2 dias.")
        }

        payload.interval_days = parsedIntervalDays
      }

      if (frequencyType === "weekly") {
        if (weekDays.length === 0) {
          throw new Error("Seleciona pelo menos um dia da semana.")
        }

        payload.week_days = weekDays
      }

      if (editingZone) {
        return updateGardenIrrigationZone(accessToken, editingZone.id, gardenId, payload)
      }

      return createGardenIrrigationZone(accessToken, gardenId, payload)
    },
    onSuccess: async () => {
      const wasEditing = Boolean(editingZone)

      await queryClient.invalidateQueries({ queryKey: ["gardens", "irrigation", gardenId] })
      closeDialog()
      toast.success(
        wasEditing
          ? "Zona de irrigacao atualizada com sucesso."
          : "Zona de irrigacao criada com sucesso."
      )
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel guardar a zona de irrigacao.")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (zone: IrrigationZone) => {
      if (!accessToken) {
        throw new Error("Sem sessao ativa.")
      }

      await deleteGardenIrrigationZone(accessToken, zone.id)
      return zone
    },
    onSuccess: async (zone) => {
      await queryClient.invalidateQueries({ queryKey: ["gardens", "irrigation", gardenId] })
      toast.success(`Zona "${zone.name}" apagada com sucesso.`)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel apagar a zona de irrigacao.")
    },
  })

  function resetForm() {
    setEditingZone(null)
    setName("")
    setFrequencyType("daily")
    setIntervalDays("3")
    setWeekDays([])
    setStartDate(new Date().toISOString().slice(0, 10))
    setStartTime("06:00")
    setEndTime("07:00")
    setActive(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    resetForm()
  }

  function openCreateDialog() {
    resetForm()
    setDialogOpen(true)
  }

  function openEditDialog(zone: IrrigationZone) {
    setEditingZone(zone)
    setName(zone.name)
    setFrequencyType(zone.frequency_type)
    setIntervalDays(zone.interval_days ? String(zone.interval_days) : "3")
    setWeekDays(zone.week_days)
    setStartDate(zone.start_date)
    setStartTime(zone.start_time.slice(0, 5))
    setEndTime(zone.end_time.slice(0, 5))
    setActive(zone.active)
    setDialogOpen(true)
  }

  function toggleWeekDay(day: IrrigationWeekDay) {
    setWeekDays((currentWeekDays) =>
      currentWeekDays.includes(day)
        ? currentWeekDays.filter((currentDay) => currentDay !== day)
        : [...currentWeekDays, day].sort(
            (left, right) =>
              irrigationWeekDayOrder.indexOf(left) - irrigationWeekDayOrder.indexOf(right)
          )
    )
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
              <CardTitle>Sistema de irrigacao</CardTitle>
              <p className="text-sm text-muted-foreground">
                {gardenQuery.data
                  ? `Configura as zonas de rega do jardim ${gardenQuery.data.client_name}.`
                  : "Configura as zonas e os horarios de irrigacao deste jardim."}
              </p>
              <p className="text-sm text-muted-foreground">
                {isAdmin
                  ? "Administradores podem criar, editar e apagar zonas."
                  : "Employees podem consultar as zonas e os respetivos horarios."}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPageIndex(0)
                }}
                placeholder="Pesquisar zona, frequencia ou horario"
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
                <Button
                  type="button"
                  className="bg-[#215442] text-white hover:bg-[#183b2f]"
                  onClick={openCreateDialog}
                >
                  <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                  Criar zona
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 md:hidden">
            {irrigationZonesQuery.isLoading ? (
              <EmptyStateCard label="A carregar zonas de irrigacao..." />
            ) : paginatedZones.length ? (
              paginatedZones.map((zone) => (
                <article
                  key={zone.id}
                  className="rounded-2xl border border-[#dfd7c0] bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="font-medium text-[#1f2f27]">{zone.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {formatIrrigationFrequency(zone)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        zone.active
                          ? "border-[#cfe3d6] bg-[#edf7f0] text-[#215442]"
                          : "border-[#e3d2cd] bg-[#f8efed] text-[#7a3126]"
                      }
                    >
                      {zone.active ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>

                  <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
                    <div className="space-y-1">
                      <dt className="text-muted-foreground">Horario</dt>
                      <dd>{formatIrrigationTimeRange(zone)}</dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-muted-foreground">Data inicial</dt>
                      <dd>{formatShortDate(zone.start_date)}</dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-muted-foreground">Proxima rega</dt>
                      <dd>{formatNextIrrigation(zone)}</dd>
                    </div>
                  </dl>

                  {isAdmin ? (
                    <div className="mt-4 flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => openEditDialog(zone)}
                      >
                        <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                        <span className="sr-only">Editar zona</span>
                      </Button>
                      <DeleteConfirmDialog
                        title="Apagar zona"
                        description={`Tens a certeza que queres apagar a zona ${zone.name}?`}
                        onConfirm={() => deleteMutation.mutate(zone)}
                        isPending={deleteMutation.isPending}
                        srLabel="Apagar zona"
                      />
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <EmptyStateCard label="Ainda nao existem zonas de irrigacao registadas para este jardim." />
            )}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-[#dfd7c0] bg-white md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zona</TableHead>
                  <TableHead>Frequencia</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Proxima rega</TableHead>
                  <TableHead>Estado</TableHead>
                  {isAdmin ? <TableHead className="text-right">Acoes</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {irrigationZonesQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 6 : 5} className="h-24 text-center">
                      A carregar zonas de irrigacao...
                    </TableCell>
                  </TableRow>
                ) : paginatedZones.length ? (
                  paginatedZones.map((zone) => (
                    <TableRow key={zone.id}>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <div className="font-medium text-[#1f2f27]">{zone.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Inicio em {formatShortDate(zone.start_date)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatIrrigationFrequency(zone)}</TableCell>
                      <TableCell>{formatIrrigationTimeRange(zone)}</TableCell>
                      <TableCell>{formatNextIrrigation(zone)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            zone.active
                              ? "border-[#cfe3d6] bg-[#edf7f0] text-[#215442]"
                              : "border-[#e3d2cd] bg-[#f8efed] text-[#7a3126]"
                          }
                        >
                          {zone.active ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      {isAdmin ? (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              onClick={() => openEditDialog(zone)}
                            >
                              <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                              <span className="sr-only">Editar zona</span>
                            </Button>
                            <DeleteConfirmDialog
                              title="Apagar zona"
                              description={`Tens a certeza que queres apagar a zona ${zone.name}?`}
                              onConfirm={() => deleteMutation.mutate(zone)}
                              isPending={deleteMutation.isPending}
                              srLabel="Apagar zona"
                            />
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 6 : 5} className="h-24 text-center">
                      Ainda nao existem zonas de irrigacao registadas para este jardim.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredZones.length} registo(s) no total. Pagina {safePageIndex + 1} de{" "}
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

      {isAdmin ? (
        <GardenIrrigationDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) {
              resetForm()
            }
          }}
          mode={editingZone ? "edit" : "create"}
          name={name}
          onNameChange={setName}
          frequencyType={frequencyType}
          onFrequencyTypeChange={(value) => setFrequencyType(value as IrrigationFrequencyType)}
          intervalDays={intervalDays}
          onIntervalDaysChange={setIntervalDays}
          weekDays={weekDays}
          onToggleWeekDay={toggleWeekDay}
          startDate={startDate}
          onStartDateChange={setStartDate}
          startTime={startTime}
          onStartTimeChange={setStartTime}
          endTime={endTime}
          onEndTimeChange={setEndTime}
          active={active}
          onActiveChange={setActive}
          isPending={saveMutation.isPending}
          onSubmit={() => saveMutation.mutate()}
        />
      ) : null}
    </>
  )
}

type GardenIrrigationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  name: string
  onNameChange: (value: string) => void
  frequencyType: IrrigationFrequencyType
  onFrequencyTypeChange: (value: string) => void
  intervalDays: string
  onIntervalDaysChange: (value: string) => void
  weekDays: IrrigationWeekDay[]
  onToggleWeekDay: (day: IrrigationWeekDay) => void
  startDate: string
  onStartDateChange: (value: string) => void
  startTime: string
  onStartTimeChange: (value: string) => void
  endTime: string
  onEndTimeChange: (value: string) => void
  active: boolean
  onActiveChange: (value: boolean) => void
  isPending: boolean
  onSubmit: () => void
}

function GardenIrrigationDialog({
  open,
  onOpenChange,
  mode,
  name,
  onNameChange,
  frequencyType,
  onFrequencyTypeChange,
  intervalDays,
  onIntervalDaysChange,
  weekDays,
  onToggleWeekDay,
  startDate,
  onStartDateChange,
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
  active,
  onActiveChange,
  isPending,
  onSubmit,
}: GardenIrrigationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Editar zona de irrigacao" : "Criar zona de irrigacao"}
          </DialogTitle>
          <DialogDescription>
            Define a cadencia e o horario de rega desta zona.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="irrigation-zone-name"
              className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
            >
              Nome da zona
            </label>
            <Input
              id="irrigation-zone-name"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Ex.: Zona frontal"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Frequencia
              </label>
              <Select value={frequencyType} onValueChange={onFrequencyTypeChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {irrigationFrequencyOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {irrigationFrequencyLabels[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Estado
              </label>
              <Select
                value={active ? "active" : "inactive"}
                onValueChange={(value) => onActiveChange(value === "active")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="inactive">Inativa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {frequencyType === "every_n_days" ? (
            <div className="space-y-2">
              <label
                htmlFor="irrigation-zone-interval-days"
                className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
              >
                Intervalo em dias
              </label>
              <Input
                id="irrigation-zone-interval-days"
                type="number"
                min="2"
                step="1"
                value={intervalDays}
                onChange={(event) => onIntervalDaysChange(event.target.value)}
              />
            </div>
          ) : null}

          {frequencyType === "weekly" ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Dias da semana
                </p>
                <p className="text-sm text-muted-foreground">
                  Seleciona os dias em que esta zona deve regar.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {irrigationWeekDayOrder.map((day) => {
                  const isSelected = weekDays.includes(day)

                  return (
                    <Button
                      key={day}
                      type="button"
                      variant="outline"
                      className={cn(
                        "rounded-full",
                        isSelected
                          ? "border-[#215442] bg-[#215442] text-white hover:bg-[#183b2f] hover:text-white"
                          : "bg-white"
                      )}
                      onClick={() => onToggleWeekDay(day)}
                    >
                      {irrigationWeekDayLabels[day]}
                    </Button>
                  )
                })}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label
                htmlFor="irrigation-zone-start-date"
                className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
              >
                Data inicial
              </label>
              <Input
                id="irrigation-zone-start-date"
                type="date"
                value={startDate}
                onChange={(event) => onStartDateChange(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="irrigation-zone-start-time"
                className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
              >
                Hora inicial
              </label>
              <Input
                id="irrigation-zone-start-time"
                type="time"
                value={startTime}
                onChange={(event) => onStartTimeChange(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="irrigation-zone-end-time"
                className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
              >
                Hora final
              </label>
              <Input
                id="irrigation-zone-end-time"
                type="time"
                value={endTime}
                onChange={(event) => onEndTimeChange(event.target.value)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[#dfd7c0] bg-[#fbf8ef] p-4 text-sm text-muted-foreground">
            {frequencyType === "daily"
              ? "A zona vai regar todos os dias dentro do horario definido."
              : frequencyType === "every_n_days"
                ? "A zona vai regar com base no intervalo de dias indicado a partir da data inicial."
                : "A zona vai regar nos dias da semana selecionados, a partir da data inicial."}
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
                  : "Criar zona"}
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

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
  }).format(new Date(value))
}

function normalizeTimeValue(value: string) {
  return value.length === 5 ? `${value}:00` : value
}
