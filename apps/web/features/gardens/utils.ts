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
    maintenance_day_of_week: isRegularService ? values.maintenance_day_of_week : null,
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
  }
}

export function toGardenFormValues(garden: Garden): GardenFormValues {
  return {
    client_name: garden.client_name,
    address: garden.address,
    phone: garden.phone ?? "",
    monthly_price: garden.monthly_price ?? "",
    is_regular_service: garden.is_regular_service ?? true,
    show_in_calendar: garden.show_in_calendar ?? true,
    maintenance_frequency: garden.maintenance_frequency ?? "weekly",
    maintenance_day_of_week: garden.maintenance_day_of_week ?? "monday",
    maintenance_anchor_date: garden.maintenance_anchor_date ?? "",
    maintenance_start_time: normalizeTimeInput(garden.maintenance_start_time) ?? "",
    maintenance_end_time: normalizeTimeInput(garden.maintenance_end_time) ?? "",
    start_date: garden.start_date ?? "",
    billing_day: garden.billing_day?.toString() ?? "",
    status: garden.status,
    notes: garden.notes ?? "",
  }
}

export function normalizeTimeInput(value: string | null | undefined) {
  if (!value) {
    return null
  }

  return value.slice(0, 5)
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
  const mobileLocationUrl = `geo:0,0?q=${encodedAddress}`
  const mobileNavigator = navigator as Navigator & {
    userAgentData?: { mobile?: boolean }
  }
  const isMobile =
    mobileNavigator.userAgentData?.mobile === true ||
    /android|iphone|ipad|ipod|windows phone|mobile/i.test(navigator.userAgent)

  if (isMobile) {
    window.location.href = mobileLocationUrl
    return true
  }

  window.open(googleMapsUrl, "_blank", "noopener,noreferrer")
  return true
}
