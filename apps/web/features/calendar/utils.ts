import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfWeek,
  endOfMonth,
  format,
  isSameMonth,
  isSameDay,
  startOfWeek,
  startOfMonth,
} from "date-fns"
import { pt } from "date-fns/locale"

import type { Task, TaskType } from "@/features/calendar/types"

export const taskTypeLabels: Record<TaskType, string> = {
  maintenance: "Manutencao",
  pruning: "Poda",
  cleaning: "Limpeza",
  installation: "Instalacao",
  inspection: "Inspecao",
  emergency: "Emergencia",
}

export function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function toIsoDate(date: Date) {
  return format(date, "yyyy-MM-dd")
}

export function formatMonthTitle(date: Date) {
  return format(date, "MMMM yyyy", { locale: pt })
}

export function formatDayTitle(date: Date) {
  return format(date, "d 'de' MMMM 'de' yyyy", { locale: pt })
}

export function formatTaskDate(date: string) {
  return format(parseIsoDate(date), "dd/MM/yyyy")
}

export function formatTaskDateTime(value: string | null | undefined) {
  if (!value) {
    return "Sem registo"
  }

  return format(new Date(value), "dd/MM/yyyy HH:mm")
}

export function getMonthRange(date: Date) {
  return {
    from: toIsoDate(startOfMonth(date)),
    to: toIsoDate(endOfMonth(date)),
  }
}

export function getMonthDays(date: Date) {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const totalDays = differenceInCalendarDays(gridEnd, gridStart) + 1

  return Array.from({ length: totalDays }, (_, index) => {
    const day = addDays(gridStart, index)

    return {
      date: day,
      isCurrentMonth: isSameMonth(day, date),
    }
  })
}

export function getTasksByDate(tasks: Task[]) {
  return tasks.reduce<Record<string, Task[]>>((accumulator, task) => {
    if (!accumulator[task.date]) {
      accumulator[task.date] = []
    }

    accumulator[task.date].push(task)
    accumulator[task.date].sort((left, right) => {
      const leftValue = left.start_time ?? "99:99:99"
      const rightValue = right.start_time ?? "99:99:99"
      return leftValue.localeCompare(rightValue)
    })

    return accumulator
  }, {})
}

export function formatTaskTimeRange(task: Pick<Task, "start_time" | "end_time">) {
  const startTime = normalizeTaskTime(task.start_time)
  const endTime = normalizeTaskTime(task.end_time)

  if (startTime && endTime) {
    return `${startTime} - ${endTime}`
  }

  if (startTime) {
    return startTime
  }

  if (endTime) {
    return `Ate ${endTime}`
  }

  return "Sem horario"
}

export function normalizeTaskTime(value: string | null | undefined) {
  if (!value) {
    return null
  }

  return value.slice(0, 5)
}

export function toTaskPayload(values: {
  garden_id: string
  team_id: string
  date: string
  task_type: TaskType
  start_time: string
  end_time: string
  description?: string
}) {
  return {
    garden_id: values.garden_id,
    team_id: values.team_id,
    date: values.date,
    task_type: values.task_type,
    start_time: values.start_time.trim() || undefined,
    end_time: values.end_time.trim() || undefined,
    description: values.description?.trim() || undefined,
  }
}

export function toTaskFormValues(task: Task) {
  return {
    garden_id: task.garden_id,
    team_id: task.team_id ?? "",
    date: task.date,
    task_type: task.task_type,
    start_time: normalizeTaskTime(task.start_time) ?? "",
    end_time: normalizeTaskTime(task.end_time) ?? "",
    description: task.description ?? "",
  }
}

export function getNextMonth(date: Date) {
  return addMonths(date, 1)
}

export function getPreviousMonth(date: Date) {
  return addMonths(date, -1)
}

export function getNextDay(date: Date) {
  return addDays(date, 1)
}

export function getPreviousDay(date: Date) {
  return addDays(date, -1)
}

export function isTaskOnDate(task: Task, date: Date) {
  return isSameDay(parseIsoDate(task.date), date)
}
