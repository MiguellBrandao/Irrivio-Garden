export type ProductUnit = "unit" | "kg" | "g" | "l" | "ml" | "m" | "m2" | "m3" | "pack"

export type Product = {
  id: string
  company_id: string
  name: string
  unit: ProductUnit
  stock_quantity: string
  unit_price: string
  created_at: string
}

export type SaveProductPayload = {
  name?: string
  unit?: ProductUnit
  stock_quantity?: number
  unit_price?: number
}

export type StockRuleOperator = "lt" | "lte" | "eq" | "gt" | "gte"

export type StockRule = {
  id: string
  company_id: string
  product_id: string
  product_name: string
  product_unit: ProductUnit
  product_stock_quantity: string
  operator: StockRuleOperator
  threshold_quantity: string
  emails: string[]
  created_at: string
}

export type SaveStockRulePayload = {
  product_id?: string
  operator?: StockRuleOperator
  threshold_quantity?: number
  emails?: string[]
}
