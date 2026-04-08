"use client"

import Link from "next/link"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { addDays, addMonths, format, isToday, startOfMonth } from "date-fns"
import { useMemo, useState } from "react"
import { Add01Icon, InformationCircleIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { listTasks } from "@/features/calendar/api"
import type { CalendarEntry } from "@/features/calendar/types"
import {
  buildAutomaticGardenEntries,
  formatDayTitle,
  formatMonthTitle,
  formatTaskTimeRange,
  getCalendarEntriesByDate,
  getMonthDays,
  getVisibleMonthRange,
  taskTypeLabels,
  toIsoDate,
} from "@/features/calendar/utils"
import { listTeams } from "@/features/employees/api"
import { listGardens } from "@/features/gardens/api"
import { useAuthStore } from "@/lib/auth/store"
import { cn } from "@/lib/utils"

export function CalendarPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const activeCompanyId = useAuthStore((state) => state.activeCompanyId)
  const activeCompany = useAuthStore((state) =>
    state.companies.find((company) => company.id === state.activeCompanyId) ?? null
  )
  const isAdmin = activeCompany?.role === "admin"
  const [desktopMonthDate, setDesktopMonthDate] = useState(() => startOfMonth(new Date()))
  const [mobileDayDate, setMobileDayDate] = useState(() => new Date())

  const queryRange = useMemo(() => {
    const desktopRange = getVisibleMonthRange(desktopMonthDate)
    const mobileDate = toIsoDate(mobileDayDate)

    return {
      from: desktopRange.from < mobileDate ? desktopRange.from : mobileDate,
      to: desktopRange.to > mobileDate ? desktopRange.to : mobileDate,
    }
  }, [desktopMonthDate, mobileDayDate])

  const tasksQuery = useQuery({
    queryKey: ["tasks", "calendar", activeCompanyId, accessToken, queryRange.from, queryRange.to],
    queryFn: () =>
      listTasks(accessToken ?? "", {
        date_from: queryRange.from,
        date_to: queryRange.to,
      }),
    enabled: Boolean(accessToken && activeCompanyId),
    placeholderData: keepPreviousData,
  })

  const gardensQuery = useQuery({
    queryKey: ["gardens", "calendar", activeCompanyId, accessToken],
    queryFn: () => listGardens(accessToken ?? ""),
    enabled: Boolean(accessToken && activeCompanyId),
    placeholderData: keepPreviousData,
  })

  const teamsQuery = useQuery({
    queryKey: ["teams", activeCompanyId, accessToken],
    queryFn: () => listTeams(accessToken ?? ""),
    enabled: Boolean(accessToken && activeCompanyId),
  })

  const calendarEntries = useMemo<CalendarEntry[]>(() => {
    const tasks = (tasksQuery.data ?? []).map((task) => ({
      ...task,
      kind: "task" as const,
    }))
    const automaticEntries = buildAutomaticGardenEntries(
      gardensQuery.data ?? [],
      queryRange.from,
      queryRange.to
    )

    return [...tasks, ...automaticEntries]
  }, [gardensQuery.data, queryRange.from, queryRange.to, tasksQuery.data])

  const entriesByDate = useMemo(
    () => getCalendarEntriesByDate(calendarEntries),
    [calendarEntries]
  )
  const teamNameById = useMemo(
    () => Object.fromEntries((teamsQuery.data ?? []).map((team) => [team.id, team.name])),
    [teamsQuery.data]
  )
  const monthDays = useMemo(() => getMonthDays(desktopMonthDate), [desktopMonthDate])
  const mobileDayEntries = entriesByDate[toIsoDate(mobileDayDate)] ?? []

  if (!accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sessao em falta</CardTitle>
          <CardDescription>
            Faz login novamente antes de gerir o calendario.
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
            Seleciona uma empresa antes de gerir o calendario.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <Card className="border-[#dfd7c0] bg-[#fbf8ef]">
        <CardHeader className="gap-4">
          <div className="space-y-2 text-left">
            <div className="space-y-2">
              <CardTitle>Calendario</CardTitle>
              <CardDescription>
                Agenda mensal em desktop e vista diaria em telemoveis.
              </CardDescription>
            </div>
          </div>

          <div className="hidden justify-center md:flex">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setDesktopMonthDate((currentDate) =>
                    startOfMonth(addMonths(currentDate, -1))
                  )
                }
              >
                &lt;
              </Button>
              <div className="min-w-56 text-center text-2xl font-semibold capitalize text-[#1f2f27]">
                {formatMonthTitle(desktopMonthDate)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setDesktopMonthDate((currentDate) =>
                    startOfMonth(addMonths(currentDate, 1))
                  )
                }
              >
                &gt;
              </Button>
            </div>
          </div>

          <div className="flex justify-center md:hidden">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMobileDayDate((currentDate) => addDays(currentDate, -1))}
              >
                &lt;
              </Button>
              <div className="min-w-0 text-center text-base font-semibold text-[#1f2f27]">
                {formatDayTitle(mobileDayDate)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMobileDayDate((currentDate) => addDays(currentDate, 1))}
              >
                &gt;
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="hidden md:block">
            <div className="grid grid-cols-7 gap-3">
              {["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"].map((label) => (
                <div
                  key={label}
                  className="rounded-xl px-3 pb-1 text-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
                >
                  {label}
                </div>
              ))}
              {monthDays.map(({ date: day, isCurrentMonth }) => {
                const dayKey = toIsoDate(day)
                const dayEntries = entriesByDate[dayKey] ?? []

                return (
                  <div
                    key={dayKey}
                    className={cn(
                      "flex h-52 flex-col overflow-hidden rounded-3xl border p-3 text-left shadow-sm transition",
                      isCurrentMonth
                        ? "border-[#dfd7c0] bg-white hover:border-[#215442]/40 hover:shadow-md"
                        : "border-[#ebe5d6] bg-[#f6f2e8] text-muted-foreground opacity-65"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-between gap-3",
                        dayEntries.length > 0 && "mb-3"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {isCurrentMonth && isToday(day) ? <Badge>Hoje</Badge> : null}
                        <span
                          className={cn(
                            "text-lg font-semibold",
                            isCurrentMonth ? "text-[#1f2f27]" : "text-[#7f7a6d]"
                          )}
                        >
                          {format(day, "d")}
                        </span>
                      </div>
                      {isAdmin ? (
                        <Button asChild type="button" variant="outline" size="icon-sm">
                          <Link href={`/calendar/tasks/new?date=${dayKey}`}>
                            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                            <span className="sr-only">Criar tarefa</span>
                          </Link>
                        </Button>
                      ) : null}
                    </div>

                    <div
                      className={cn(
                        "flex min-h-0 flex-1 flex-col",
                        dayEntries.length > 0 && "pt-0.5"
                      )}
                    >
                      {dayEntries.length ? (
                        <div className="floripa-scrollbar h-full space-y-2 overflow-y-auto pr-1">
                          {dayEntries.map((entry) => (
                            <CalendarEntryCard
                              key={entry.id}
                              entry={entry}
                              isCurrentMonth={isCurrentMonth}
                              teamName={entry.kind === "automatic-garden" ? null : teamNameById[entry.team_id ?? ""] ?? "Sem equipa"}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-1 items-center justify-center px-3 py-5 text-center text-sm text-muted-foreground">
                          {isAdmin ? "Usa o botao + para criar uma tarefa." : "Sem tarefas."}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="md:hidden">
            <div className="flex h-[calc(100vh-18rem)] w-full flex-col overflow-hidden rounded-3xl border border-[#dfd7c0] bg-white p-4 text-left shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="capitalize text-sm text-muted-foreground">
                    {format(mobileDayDate, "EEEE")}
                  </p>
                  <div className="flex items-center gap-2">
                    {isToday(mobileDayDate) ? <Badge>Hoje</Badge> : null}
                    <h2 className="text-xl font-semibold text-[#1f2f27]">
                      {formatDayTitle(mobileDayDate)}
                    </h2>
                  </div>
                </div>
                {isAdmin ? (
                  <Button asChild type="button" variant="outline" size="icon-sm">
                    <Link href={`/calendar/tasks/new?date=${toIsoDate(mobileDayDate)}`}>
                      <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                      <span className="sr-only">Criar tarefa</span>
                    </Link>
                  </Button>
                ) : null}
              </div>

              <div
                className={cn(
                  "mt-4 flex min-h-0 flex-1 flex-col",
                  mobileDayEntries.length > 0 && "pt-0.5"
                )}
              >
                {tasksQuery.isLoading || gardensQuery.isLoading ? (
                  <div className="rounded-2xl border border-dashed border-[#dfd7c0] px-4 py-8 text-center text-sm text-muted-foreground">
                    A carregar calendario...
                  </div>
                ) : mobileDayEntries.length ? (
                  <div className="floripa-scrollbar h-full space-y-3 overflow-y-auto pr-1">
                    {mobileDayEntries.map((entry) => (
                      <CalendarEntryCard
                        key={entry.id}
                        entry={entry}
                        isCurrentMonth
                        compact
                        teamName={entry.kind === "automatic-garden" ? null : teamNameById[entry.team_id ?? ""] ?? "Sem equipa"}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center px-4 py-8 text-center text-sm text-muted-foreground">
                    {isAdmin ? "Usa o botao + para criar uma tarefa." : "Sem tarefas."}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

type CalendarEntryCardProps = {
  entry: CalendarEntry
  isCurrentMonth: boolean
  teamName: string | null
  compact?: boolean
}

function CalendarEntryCard({
  entry,
  isCurrentMonth,
  teamName,
  compact = false,
}: CalendarEntryCardProps) {
  const isAutomatic = entry.kind === "automatic-garden"
  const href = isAutomatic ? `/gardens/${entry.garden_id}` : `/calendar/tasks/${entry.id}`
  const title = isAutomatic ? entry.garden_name : teamName ?? "Sem equipa"
  const categoryLabel = isAutomatic ? "Manutencao" : taskTypeLabels[entry.task_type]

  return (
    <Link
      href={href}
      className={cn(
        "flex w-full flex-col rounded-2xl border px-3 py-2 text-left transition",
        compact
          ? "border-[#e8e1cf] bg-[#f7f2e7]"
          : isCurrentMonth
            ? "border-[#e8e1cf] bg-[#f7f2e7] hover:border-[#215442]/40"
            : "border-[#e7e0d0] bg-[#f1ebde]"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {categoryLabel}
        </span>
        {isAutomatic ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex size-5 items-center justify-center rounded-full text-[#215442]/60">
                <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-3.5" />
                <span className="sr-only">Evento automatico</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              {entry.description}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      <span
        className={cn(
          "truncate text-sm font-medium",
          isCurrentMonth ? "text-[#1f2f27]" : "text-[#6f6a5d]"
        )}
      >
        {title}
      </span>
      <span className="truncate text-xs text-muted-foreground">
        {formatTaskTimeRange(entry)}
      </span>
    </Link>
  )
}
