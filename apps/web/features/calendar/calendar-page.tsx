"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { addDays, addMonths, endOfMonth, format, isToday, startOfMonth } from "date-fns"
import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { listTasks } from "@/features/calendar/api"
import { TaskDetailsDialog } from "@/features/calendar/task-details-dialog"
import { TaskFormDialog } from "@/features/calendar/task-form-dialog"
import {
  formatDayTitle,
  formatMonthTitle,
  formatTaskTimeRange,
  getMonthDays,
  getTasksByDate,
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
  const [createDate, setCreateDate] = useState<string | null>(null)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const queryRange = useMemo(() => {
    const firstReference =
      desktopMonthDate.getTime() <= mobileDayDate.getTime() ? desktopMonthDate : mobileDayDate
    const lastReference =
      desktopMonthDate.getTime() > mobileDayDate.getTime() ? desktopMonthDate : mobileDayDate

    return {
      from: toIsoDate(startOfMonth(firstReference)),
      to: toIsoDate(endOfMonth(lastReference)),
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
    queryKey: ["gardens", activeCompanyId, accessToken],
    queryFn: () => listGardens(accessToken ?? ""),
    enabled: Boolean(accessToken && activeCompanyId),
  })

  const teamsQuery = useQuery({
    queryKey: ["teams", activeCompanyId, accessToken],
    queryFn: () => listTeams(accessToken ?? ""),
    enabled: Boolean(accessToken && activeCompanyId),
  })

  const tasksByDate = useMemo(
    () => getTasksByDate(tasksQuery.data ?? []),
    [tasksQuery.data]
  )
  const gardenNameById = useMemo(
    () =>
      Object.fromEntries(
        (gardensQuery.data ?? []).map((garden) => [garden.id, garden.client_name])
      ),
    [gardensQuery.data]
  )
  const teamNameById = useMemo(
    () => Object.fromEntries((teamsQuery.data ?? []).map((team) => [team.id, team.name])),
    [teamsQuery.data]
  )
  const monthDays = useMemo(() => getMonthDays(desktopMonthDate), [desktopMonthDate])
  const mobileDayTasks = tasksByDate[toIsoDate(mobileDayDate)] ?? []

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
    <>
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
              {monthDays.map((day) => {
                const dayKey = toIsoDate(day)
                const dayTasks = tasksByDate[dayKey] ?? []

                return (
                  <div
                    key={dayKey}
                    onClick={() => {
                      if (!isAdmin) {
                        return
                      }

                      setCreateDate(dayKey)
                    }}
                    className={cn(
                      "flex h-52 flex-col overflow-hidden rounded-3xl border border-[#dfd7c0] bg-white p-3 text-left shadow-sm transition hover:border-[#215442]/40 hover:shadow-md",
                      !isAdmin && "cursor-default hover:border-[#dfd7c0] hover:shadow-sm"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-between gap-3",
                        dayTasks.length > 0 && "mb-3"
                      )}
                    >
                      <span className="text-lg font-semibold text-[#1f2f27]">
                        {format(day, "d")}
                      </span>
                      {isToday(day) ? <Badge>Hoje</Badge> : null}
                    </div>

                    <div
                      className={cn(
                        "flex min-h-0 flex-1 flex-col",
                        dayTasks.length > 0 && "pt-0.5"
                      )}
                    >
                      {dayTasks.length ? (
                        <div className="floripa-scrollbar h-full space-y-2 overflow-y-auto pr-1">
                          {dayTasks.map((task) => (
                            <button
                              key={task.id}
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                setSelectedTaskId(task.id)
                              }}
                              className="flex w-full flex-col rounded-2xl border border-[#e8e1cf] bg-[#f7f2e7] px-3 py-2 text-left transition hover:border-[#215442]/40"
                            >
                              <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                {taskTypeLabels[task.task_type]}
                              </span>
                              <span className="truncate text-sm font-medium text-[#1f2f27]">
                                {teamNameById[task.team_id ?? ""] ?? "Sem equipa"}
                              </span>
                              <span className="truncate text-xs text-muted-foreground">
                                {formatTaskTimeRange(task)}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-1 items-center justify-center px-3 py-5 text-center text-sm text-muted-foreground">
                          {isAdmin ? "Clique para criar uma tarefa." : "Sem tarefas."}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="md:hidden">
            <div
              onClick={() => {
                if (!isAdmin) {
                  return
                }

                setCreateDate(toIsoDate(mobileDayDate))
              }}
              className={cn(
                "flex h-[calc(100vh-18rem)] w-full flex-col overflow-hidden rounded-3xl border border-[#dfd7c0] bg-white p-4 text-left shadow-sm",
                !isAdmin && "cursor-default"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="capitalize text-sm text-muted-foreground">
                    {format(mobileDayDate, "EEEE")}
                  </p>
                  <h2 className="text-xl font-semibold text-[#1f2f27]">
                    {formatDayTitle(mobileDayDate)}
                  </h2>
                </div>
                {isToday(mobileDayDate) ? <Badge>Hoje</Badge> : null}
              </div>

              <div
                className={cn(
                  "mt-4 flex min-h-0 flex-1 flex-col",
                  mobileDayTasks.length > 0 && "pt-0.5"
                )}
              >
                {tasksQuery.isLoading ? (
                  <div className="rounded-2xl border border-dashed border-[#dfd7c0] px-4 py-8 text-center text-sm text-muted-foreground">
                    A carregar tarefas...
                  </div>
                ) : mobileDayTasks.length ? (
                  <div className="floripa-scrollbar h-full space-y-3 overflow-y-auto pr-1">
                    {mobileDayTasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          setSelectedTaskId(task.id)
                        }}
                        className="flex w-full flex-col rounded-2xl border border-[#e8e1cf] bg-[#f7f2e7] px-4 py-3 text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                              {taskTypeLabels[task.task_type]}
                            </p>
                            <p className="text-sm font-medium text-[#1f2f27]">
                              {teamNameById[task.team_id ?? ""] ?? "Sem equipa"}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatTaskTimeRange(task)}
                          </p>
                        </div>
                        {task.description?.trim() ? (
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {task.description}
                          </p>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center px-4 py-8 text-center text-sm text-muted-foreground">
                    {isAdmin ? "Toque neste dia para criar uma tarefa." : "Sem tarefas."}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isAdmin ? (
        <>
          <TaskFormDialog
            open={Boolean(createDate)}
            onOpenChange={(open) => {
              if (!open) {
                setCreateDate(null)
              }
            }}
            mode="create"
            defaultDate={createDate ?? undefined}
          />
          <TaskFormDialog
            open={Boolean(editingTaskId)}
            onOpenChange={(open) => {
              if (!open) {
                setEditingTaskId(null)
              }
            }}
            mode="edit"
            taskId={editingTaskId ?? undefined}
          />
        </>
      ) : null}

      <TaskDetailsDialog
        open={Boolean(selectedTaskId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTaskId(null)
          }
        }}
        taskId={selectedTaskId ?? undefined}
        gardenNameById={gardenNameById}
        teamNameById={teamNameById}
        canManage={isAdmin}
        onEdit={(taskId) => setEditingTaskId(taskId)}
      />
    </>
  )
}
