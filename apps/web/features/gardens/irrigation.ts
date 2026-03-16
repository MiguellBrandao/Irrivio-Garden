import type {
  IrrigationFrequencyType,
  IrrigationWeekDay,
  IrrigationZone,
} from "@/features/gardens/types"

export const irrigationFrequencyLabels: Record<IrrigationFrequencyType, string> = {
  daily: "Diariamente",
  every_n_days: "A cada n dias",
  weekly: "Semanal",
}

export const irrigationWeekDayLabels: Record<IrrigationWeekDay, string> = {
  monday: "Seg",
  tuesday: "Ter",
  wednesday: "Qua",
  thursday: "Qui",
  friday: "Sex",
  saturday: "Sab",
  sunday: "Dom",
}

const irrigationWeekDayIndices: Record<IrrigationWeekDay, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 0,
}

type UpcomingIrrigationZone = {
  zone: IrrigationZone
  nextDate: Date
}

export function formatIrrigationTime(value: string) {
  return value.slice(0, 5)
}

export function formatIrrigationTimeRange(zone: Pick<IrrigationZone, "start_time" | "end_time">) {
  return `${formatIrrigationTime(zone.start_time)} - ${formatIrrigationTime(zone.end_time)}`
}

export function formatIrrigationFrequency(zone: Pick<IrrigationZone, "frequency_type" | "interval_days" | "week_days">) {
  if (zone.frequency_type === "daily") {
    return "Diariamente"
  }

  if (zone.frequency_type === "every_n_days") {
    return `A cada ${zone.interval_days ?? 0} dias`
  }

  return `Semanal: ${zone.week_days.map((day) => irrigationWeekDayLabels[day]).join(", ")}`
}

export function computeNextIrrigationDate(
  zone: Pick<
    IrrigationZone,
    "active" | "frequency_type" | "interval_days" | "week_days" | "start_date" | "start_time" | "end_time"
  >,
  now = new Date()
) {
  if (!zone.active) {
    return null
  }

  const scheduleStartDate = parseDateOnly(zone.start_date)
  const today = startOfDay(now)

  if (zone.frequency_type === "daily") {
    const candidateDate = today < scheduleStartDate ? scheduleStartDate : today
    const candidateEnd = setTime(candidateDate, zone.end_time)

    if (sameDay(candidateDate, today) && now > candidateEnd) {
      return setTime(addDays(candidateDate, 1), zone.start_time)
    }

    return setTime(candidateDate, zone.start_time)
  }

  if (zone.frequency_type === "every_n_days") {
    const interval = zone.interval_days ?? 0
    if (interval < 2) {
      return null
    }

    let candidateDate = today < scheduleStartDate ? scheduleStartDate : today
    const diffDays = Math.floor(
      (candidateDate.getTime() - scheduleStartDate.getTime()) / DAY_IN_MS
    )
    const remainder = diffDays % interval

    if (remainder !== 0) {
      candidateDate = addDays(candidateDate, interval - remainder)
    }

    const candidateEnd = setTime(candidateDate, zone.end_time)
    if (sameDay(candidateDate, today) && now > candidateEnd) {
      candidateDate = addDays(candidateDate, interval)
    }

    return setTime(candidateDate, zone.start_time)
  }

  if (!zone.week_days.length) {
    return null
  }

  const selectedWeekDays = new Set(zone.week_days.map((day) => irrigationWeekDayIndices[day]))
  const initialDate = today < scheduleStartDate ? scheduleStartDate : today

  for (let offset = 0; offset < 21; offset += 1) {
    const candidateDate = addDays(initialDate, offset)
    if (!selectedWeekDays.has(candidateDate.getDay())) {
      continue
    }

    const candidateEnd = setTime(candidateDate, zone.end_time)
    if (sameDay(candidateDate, today) && now > candidateEnd) {
      continue
    }

    return setTime(candidateDate, zone.start_time)
  }

  return null
}

export function formatNextIrrigation(
  zone: Pick<
    IrrigationZone,
    "active" | "frequency_type" | "interval_days" | "week_days" | "start_date" | "start_time" | "end_time"
  >,
  now = new Date()
) {
  const nextDate = computeNextIrrigationDate(zone, now)
  if (!nextDate) {
    return "Sem proxima rega"
  }

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(nextDate)
}

export function getUpcomingIrrigationZones(zones: IrrigationZone[], now = new Date()) {
  return zones
    .map((zone) => {
      const nextDate = computeNextIrrigationDate(zone, now)

      return nextDate ? { zone, nextDate } : null
    })
    .filter((entry): entry is UpcomingIrrigationZone => entry !== null)
    .sort((left, right) => left.nextDate.getTime() - right.nextDate.getTime())
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function parseTime(value: string) {
  const [hours = "0", minutes = "0", seconds = "0"] = value.split(":")
  return {
    hours: Number(hours),
    minutes: Number(minutes),
    seconds: Number(seconds),
  }
}

function setTime(date: Date, time: string) {
  const { hours, minutes, seconds } = parseTime(time)
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    seconds,
    0
  )
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function sameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

const DAY_IN_MS = 24 * 60 * 60 * 1000
