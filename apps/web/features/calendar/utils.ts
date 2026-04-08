import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfWeek,
  endOfMonth,
  format,
  getISODay,
  isSameDay,
  isSameMonth,
  startOfWeek,
  startOfMonth,
} from "date-fns"
import { pt } from "date-fns/locale"

import type { CalendarEntry, Task, TaskType } from "@/features/calendar/types"
import type { Garden, GardenWeekday } from "@/features/gardens/types"

export const taskTypeLabels: Record<TaskType, string> = {
  maintenance: "Manutencao",
  pruning: "Poda",
  cleaning: "Limpeza",
  installation: "Instalacao",
  inspection: "Inspecao",
  emergency: "Emergencia",
}

const weekdayIndexMap: Record<GardenWeekday, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
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

export function getVisibleMonthRange(date: Date) {
  return {
    from: toIsoDate(startOfWeek(startOfMonth(date), { weekStartsOn: 1 })),
    to: toIsoDate(endOfWeek(endOfMonth(date), { weekStartsOn: 1 })),
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

export function getCalendarEntriesByDate(entries: CalendarEntry[]) {
  return entries.reduce<Record<string, CalendarEntry[]>>((accumulator, entry) => {
    if (!accumulator[entry.date]) {
      accumulator[entry.date] = []
    }

    accumulator[entry.date].push(entry)
    accumulator[entry.date].sort((left, right) => {
      const leftValue = left.start_time ?? "99:99:99"
      const rightValue = right.start_time ?? "99:99:99"
      return leftValue.localeCompare(rightValue)
    })

    return accumulator
  }, {})
}

export function buildAutomaticGardenEntries(
  gardens: Garden[],
  from: string,
  to: string
) {
  const rangeStart = parseIsoDate(from)
  const rangeEnd = parseIsoDate(to)
  const entries: CalendarEntry[] = []

  for (let current = rangeStart; current <= rangeEnd; current = addDays(current, 1)) {
    for (const garden of gardens) {
      if (!shouldIncludeGardenOnDate(garden, current)) {
        continue
      }

      const date = toIsoDate(current)
      const description =
        garden.maintenance_frequency === "weekly"
          ? "Gerada a partir da rotina semanal deste jardim."
          : garden.maintenance_frequency === "biweekly"
            ? "Gerada a partir da rotina quinzenal deste jardim."
            : "Gerada a partir da rotina mensal deste jardim."

      entries.push({
        id: `garden-${garden.id}-${date}`,
        kind: "automatic-garden",
        garden_id: garden.id,
        garden_name: garden.client_name,
        date,
        start_time: garden.maintenance_start_time ?? null,
        end_time: garden.maintenance_end_time ?? null,
        frequency: garden.maintenance_frequency!,
        description,
      })
    }
  }

  return entries
}

function shouldIncludeGardenOnDate(garden: Garden, date: Date) {
  if (
    !garden.is_regular_service ||
    !garden.show_in_calendar ||
    garden.status !== "active" ||
    !garden.maintenance_frequency ||
    !garden.maintenance_day_of_week
  ) {
    return false
  }

  if (getISODay(date) !== weekdayIndexMap[garden.maintenance_day_of_week]) {
    return false
  }

  const contractStartDate = garden.start_date ? parseIsoDate(garden.start_date) : null
  if (contractStartDate && date < contractStartDate) {
    return false
  }

  if (garden.maintenance_frequency === "weekly") {
    return true
  }

  if (!garden.maintenance_anchor_date) {
    return false
  }

  const anchorDate = parseIsoDate(garden.maintenance_anchor_date)
  if (date < anchorDate) {
    return false
  }

  if (garden.maintenance_frequency === "biweekly") {
    return differenceInCalendarDays(date, anchorDate) % 14 === 0
  }

  return getWeekdayOccurrenceInMonth(date) === getWeekdayOccurrenceInMonth(anchorDate)
}

function getWeekdayOccurrenceInMonth(date: Date) {
  return Math.floor((date.getDate() - 1) / 7) + 1
}

export function formatTaskTimeRange(entry: Pick<CalendarEntry, "start_time" | "end_time">) {
  const startTime = normalizeTaskTime(entry.start_time)
  const endTime = normalizeTaskTime(entry.end_time)

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
