import type {
  GardenExpenseCategory,
  Garden,
  GardenFrequency,
  GardenStatus,
  GardenWeekday,
  SaveGardenPayload,
} from "@/features/gardens/types"
import type { GardenFormValues } from "@/features/gardens/schema"

export const frequencyLabels: Record<GardenFrequency, string> = {
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
}

export const weekdayLabels: Record<GardenWeekday, string> = {
  monday: "Segunda-feira",
  tuesday: "Terca-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sabado",
  sunday: "Domingo",
}

const weekdayLabelsByValue = Object.fromEntries(
  Object.entries(weekdayLabels).map(([key, label]) => [label.toLowerCase(), key])
) as Record<string, GardenWeekday>

export function normalizeWeekdayValue(value: string | null | undefined): GardenWeekday | null {
  if (!value) {
    return null
  }

  const trimmed = value.trim().toLowerCase()
  if (trimmed in weekdayLabels) {
    return trimmed as GardenWeekday
  }

  return weekdayLabelsByValue[trimmed] ?? null
}

export const statusLabels: Record<GardenStatus, string> = {
  active: "Ativo",
  paused: "Pausado",
  cancelled: "Cancelado",
}

export const expenseCategoryLabels: Record<GardenExpenseCategory, string> = {
  fuel: "Combustivel",
  tolls: "Portagens",
  parking: "Estacionamento",
  equipment: "Equipamento",
  maintenance: "Manutencao",
  transport: "Transporte",
  other: "Outra",
}

export function toGardenPayload(values: GardenFormValues): SaveGardenPayload {
  const isRegularService = values.is_regular_service
  const derivedWeekday =
    values.maintenance_frequency === "weekly"
      ? values.maintenance_day_of_week
      : getWeekdayFromIsoDate(values.maintenance_anchor_date)

  return {
    client_name: values.client_name.trim(),
    address: values.address.trim(),
    phone: values.phone?.trim() || undefined,
    monthly_price:
      values.monthly_price.trim() === ""
        ? undefined
        : Number(values.monthly_price),
    is_regular_service: isRegularService,
    show_in_calendar: isRegularService ? values.show_in_calendar : false,
    maintenance_frequency: isRegularService ? values.maintenance_frequency : null,
    maintenance_day_of_week: isRegularService ? derivedWeekday : null,
    maintenance_anchor_date:
      isRegularService && values.maintenance_frequency !== "weekly"
        ? values.maintenance_anchor_date.trim() || null
        : null,
    maintenance_start_time:
      isRegularService ? values.maintenance_start_time.trim() || null : null,
    maintenance_end_time:
      isRegularService ? values.maintenance_end_time.trim() || null : null,
    start_date: values.start_date.trim() || undefined,
    billing_day:
      values.billing_day.trim() === "" ? undefined : Number(values.billing_day),
    status: values.status,
    notes: values.notes?.trim() || undefined,
    team_ids: values.team_ids,
  }
}

export function toGardenFormValues(garden: Garden): GardenFormValues {
  const derivedWeekday =
    garden.maintenance_frequency && garden.maintenance_frequency !== "weekly"
      ? getWeekdayFromIsoDate(garden.maintenance_anchor_date)
      : null
  const maintenanceFrequency =
    garden.maintenance_frequency === "weekly" ||
    garden.maintenance_frequency === "biweekly" ||
    garden.maintenance_frequency === "monthly"
      ? garden.maintenance_frequency
      : "weekly"

  const normalizedMaintenanceDay = normalizeWeekdayValue(garden.maintenance_day_of_week)

  // For weekly frequency, prefer garden.maintenance_day_of_week
  // For biweekly/monthly, use derived weekday from anchor date, fallback to stored day
  const maintenanceDayOfWeek =
    maintenanceFrequency === "weekly"
      ? normalizedMaintenanceDay ?? "monday"
      : derivedWeekday ?? normalizedMaintenanceDay ?? "monday"

  return {
    client_name: garden.client_name,
    address: garden.address,
    phone: garden.phone ?? "",
    monthly_price: garden.monthly_price ?? "",
    is_regular_service: garden.is_regular_service ?? true,
    show_in_calendar: garden.show_in_calendar ?? true,
    maintenance_frequency: maintenanceFrequency,
    maintenance_day_of_week: maintenanceDayOfWeek,
    maintenance_anchor_date: garden.maintenance_anchor_date ?? "",
    maintenance_start_time: normalizeTimeInput(garden.maintenance_start_time) ?? "",
    maintenance_end_time: normalizeTimeInput(garden.maintenance_end_time) ?? "",
    start_date: garden.start_date ?? "",
    billing_day: garden.billing_day?.toString() ?? "",
    status: garden.status,
    notes: garden.notes ?? "",
    team_ids: garden.team_ids ?? [],
  }
}

export function normalizeTimeInput(value: string | null | undefined) {
  if (!value) {
    return null
  }

  return value.slice(0, 5)
}

export function getWeekdayFromIsoDate(value: string | null | undefined): GardenWeekday | null {
  if (!value) {
    return null
  }

  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  const weekDay = date.getDay()

  if (weekDay === 0) {
    return "sunday"
  }

  return ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][
    weekDay - 1
  ] as GardenWeekday
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(value)
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
  }).format(new Date(value))
}

export function formatGardenSchedule(garden: Pick<
  Garden,
  | "is_regular_service"
  | "maintenance_frequency"
  | "maintenance_day_of_week"
  | "maintenance_anchor_date"
  | "maintenance_start_time"
  | "maintenance_end_time"
>) {
  if (!garden.is_regular_service || !garden.maintenance_frequency || !garden.maintenance_day_of_week) {
    return "Sem rotina automatica"
  }

  const parts = [
    frequencyLabels[garden.maintenance_frequency],
    weekdayLabels[garden.maintenance_day_of_week],
  ]

  if (garden.maintenance_anchor_date && garden.maintenance_frequency !== "weekly") {
    parts.push(`base em ${formatDate(garden.maintenance_anchor_date)}`)
  }

  const timeRange = formatGardenTimeRange(garden)
  if (timeRange !== "Sem horario") {
    parts.push(timeRange)
  }

  return parts.join(" | ")
}

export function formatGardenTimeRange(
  garden: Pick<Garden, "maintenance_start_time" | "maintenance_end_time">
) {
  const start = normalizeTimeInput(garden.maintenance_start_time)
  const end = normalizeTimeInput(garden.maintenance_end_time)

  if (start && end) {
    return `${start} - ${end}`
  }

  if (start) {
    return start
  }

  if (end) {
    return `Ate ${end}`
  }

  return "Sem horario"
}

export function openAddressInMaps(address: string) {
  const normalizedAddress = address.trim()

  if (!normalizedAddress) {
    return false
  }

  const encodedAddress = encodeURIComponent(normalizedAddress)
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
  const appleMapsUrl = `maps://maps.apple.com/?q=${encodedAddress}`
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isAndroid = /android/i.test(navigator.userAgent)

  if (isIOS) {
    // On iOS, try Apple Maps first, fallback to Google Maps
    const appleMapsWorks = window.open(appleMapsUrl, "_blank")
    // If Apple Maps didn't open (might be blocked), try Google Maps
    if (!appleMapsWorks || appleMapsWorks.closed) {
      window.open(googleMapsUrl, "_blank", "noopener,noreferrer")
    }
    return true
  }

  if (isAndroid) {
    // On Android, try geo: scheme first (opens Google Maps app)
    const geoUrl = `geo:0,0?q=${encodedAddress}`
    window.location.href = geoUrl
    // Fallback to Google Maps web after a short delay if geo: didn't work
    setTimeout(() => {
      if (document.hidden === false) {
        window.open(googleMapsUrl, "_blank", "noopener,noreferrer")
      }
    }, 500)
    return true
  }

  // Desktop fallback
  window.open(googleMapsUrl, "_blank", "noopener,noreferrer")
  return true
}
