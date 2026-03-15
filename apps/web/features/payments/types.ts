export type Payment = {
  id: string
  company_id: string
  garden_id: string
  month: number
  year: number
  amount: string
  paid_at: string | null
  notes: string | null
}

export type SavePaymentPayload = {
  garden_id: string
  month: number
  year: number
  amount: number
  paid_at?: string
  notes?: string
}

export type PaymentStatus = "pending" | "partial" | "paid"

export type PaymentPeriodOption = "1m" | "3m" | "6m" | "12m" | "custom"

export type DerivedPaymentEntry = {
  key: string
  garden_id: string
  garden_name: string
  garden_address: string
  monthly_amount: number
  start_date: string | null
  billing_day: number | null
  month: number
  year: number
  period_label: string
  payments: Payment[]
  total_paid: number
  remaining_amount: number
  status: PaymentStatus
}
