export type ProductUnit = "unit" | "kg" | "g" | "l" | "ml" | "m" | "m2" | "m3" | "pack"

export type Product = {
  id: string
  company_id: string
  name: string
  unit: ProductUnit
  stock_quantity: string
  created_at: string
}

export type SaveProductPayload = {
  name?: string
  unit?: ProductUnit
  stock_quantity?: number
}
