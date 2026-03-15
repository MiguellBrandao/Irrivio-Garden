import type { Garden } from "@/features/gardens/types"
import type { PaymentFormValues } from "@/features/payments/schema"
import type { DateRange } from "react-day-picker"
import type {
  DerivedPaymentEntry,
  Payment,
  PaymentPeriodOption,
  PaymentStatus,
  SavePaymentPayload,
} from "@/features/payments/types"

const PERIOD_MONTHS: Record<PaymentPeriodOption, number> = {
  "1m": 1,
  "3m": 3,
  "6m": 6,
  "12m": 12,
  custom: 1,
}

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  pending: "Pendente",
  partial: "Em pagamento",
  paid: "Pago",
}

export const paymentPeriodLabels: Record<PaymentPeriodOption, string> = {
  "1m": "Este mes",
  "3m": "Ultimos 3 meses",
  "6m": "Ultimos 6 meses",
  "12m": "Ultimo ano",
  custom: "Customizado",
}

export function getPeriodMonths(
  option: PaymentPeriodOption,
  now = new Date(),
  customRange?: DateRange
) {
  if (option === "custom" && customRange?.from) {
    return buildMonthsFromRange(customRange)
  }

  const totalMonths = PERIOD_MONTHS[option]

  return Array.from({ length: totalMonths }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1)

    return {
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      label: formatMonthYear(date),
      date,
    }
  })
}

export function buildDerivedPaymentEntries(
  gardens: Garden[],
  payments: Payment[],
  period: PaymentPeriodOption,
  customRange?: DateRange
): DerivedPaymentEntry[] {
  const months = getPeriodMonths(period, new Date(), customRange)
  const paymentsMap = new Map<string, Payment[]>()

  for (const payment of payments) {
    const key = `${payment.garden_id}-${payment.year}-${payment.month}`
    const current = paymentsMap.get(key) ?? []
    current.push(payment)
    paymentsMap.set(key, current)
  }

  const entries: DerivedPaymentEntry[] = []

  for (const garden of gardens) {
    const monthlyAmount = Number(garden.monthly_price ?? 0)

    if (!monthlyAmount || Number.isNaN(monthlyAmount) || monthlyAmount <= 0) {
      continue
    }

    for (const monthInfo of months) {
      if (!isGardenActiveForMonth(garden.start_date ?? null, monthInfo.date)) {
        continue
      }

      const key = `${garden.id}-${monthInfo.year}-${monthInfo.month}`
      const relatedPayments = paymentsMap.get(key) ?? []
      const totalPaid = relatedPayments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0
      )

      entries.push({
        key,
        garden_id: garden.id,
        garden_name: garden.client_name,
        garden_address: garden.address,
        monthly_amount: monthlyAmount,
        start_date: garden.start_date ?? null,
        billing_day: garden.billing_day ?? null,
        month: monthInfo.month,
        year: monthInfo.year,
        period_label: monthInfo.label,
        payments: relatedPayments.sort((a, b) => {
          const left = a.paid_at ? new Date(a.paid_at).getTime() : 0
          const right = b.paid_at ? new Date(b.paid_at).getTime() : 0
          return right - left
        }),
        total_paid: totalPaid,
        remaining_amount: Math.max(monthlyAmount - totalPaid, 0),
        status:
          totalPaid <= 0
            ? "pending"
            : totalPaid >= monthlyAmount
              ? "paid"
              : "partial",
      })
    }
  }

  return entries.sort((a, b) => {
    if (a.year !== b.year) {
      return b.year - a.year
    }

    if (a.month !== b.month) {
      return b.month - a.month
    }

    return a.garden_name.localeCompare(b.garden_name)
  })
}

export function toPaymentPayload(values: PaymentFormValues): SavePaymentPayload {
  const billingDate = new Date(values.billing_date)

  return {
    garden_id: values.garden_id,
    month: billingDate.getMonth() + 1,
    year: billingDate.getFullYear(),
    amount: Number(values.amount),
    paid_at: values.paid_at?.trim() || undefined,
    notes: values.notes?.trim() || undefined,
  }
}

export function toPaymentFormValues(payment: Payment): PaymentFormValues {
  return {
    garden_id: payment.garden_id,
    billing_date: toIsoDate(new Date(payment.year, payment.month - 1, 1)),
    amount: payment.amount,
    paid_at: payment.paid_at ? toIsoDate(new Date(payment.paid_at)) : "",
    notes: payment.notes ?? "",
  }
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(value)
}

export function formatMonthYear(date: Date) {
  return new Intl.DateTimeFormat("pt-PT", {
    month: "long",
    year: "numeric",
  }).format(date)
}

export function formatDate(value: string | null) {
  if (!value) {
    return "-"
  }

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
  }).format(new Date(value))
}

export function toIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function isGardenActiveForMonth(startDate: string | null, targetMonth: Date) {
  if (!startDate) {
    return true
  }

  const start = new Date(startDate)
  const endOfTargetMonth = new Date(
    targetMonth.getFullYear(),
    targetMonth.getMonth() + 1,
    0
  )

  return start <= endOfTargetMonth
}

function buildMonthsFromRange(range: DateRange) {
  if (!range.from) {
    return []
  }

  const from = new Date(range.from.getFullYear(), range.from.getMonth(), 1)
  const to = range.to
    ? new Date(range.to.getFullYear(), range.to.getMonth(), 1)
    : from

  const months: Array<{ month: number; year: number; label: string; date: Date }> = []
  const cursor = new Date(to.getFullYear(), to.getMonth(), 1)

  while (cursor >= from) {
    months.push({
      month: cursor.getMonth() + 1,
      year: cursor.getFullYear(),
      label: formatMonthYear(cursor),
      date: new Date(cursor),
    })

    cursor.setMonth(cursor.getMonth() - 1)
  }

  return months
}
