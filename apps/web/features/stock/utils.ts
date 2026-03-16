import type {
  ProductFormValues,
  StockRuleFormValues,
} from "@/features/stock/schema"
import type {
  Product,
  ProductUnit,
  SaveProductPayload,
  SaveStockRulePayload,
  StockRule,
  StockRuleOperator,
} from "@/features/stock/types"

export const unitLabels: Record<ProductUnit, string> = {
  unit: "Unidade",
  kg: "Kg",
  g: "G",
  l: "L",
  ml: "Ml",
  m: "M",
  m2: "M2",
  m3: "M3",
  pack: "Pack",
}

export const stockRuleOperatorLabels: Record<StockRuleOperator, string> = {
  lt: "Menor que",
  lte: "Menor ou igual a",
  eq: "Igual a",
  gt: "Maior que",
  gte: "Maior ou igual a",
}

export function toProductPayload(values: ProductFormValues): SaveProductPayload {
  return {
    name: values.name.trim(),
    unit: values.unit,
    stock_quantity: Number(values.stock_quantity),
    unit_price: Number(values.unit_price),
  }
}

export function toStockQuantityPayload(value: string): SaveProductPayload {
  return {
    stock_quantity: Number(value),
  }
}

export function toProductFormValues(product: Product): ProductFormValues {
  return {
    name: product.name,
    unit: product.unit.trim().toLowerCase() as ProductUnit,
    stock_quantity: product.stock_quantity,
    unit_price: product.unit_price,
  }
}

export function toStockRulePayload(values: StockRuleFormValues): SaveStockRulePayload {
  return {
    product_id: values.product_id,
    operator: values.operator,
    threshold_quantity: Number(values.threshold_quantity),
    emails: values.emails
      .map((field) => field.value.trim().toLowerCase())
      .filter(Boolean),
  }
}

export function toStockRuleFormValues(rule: StockRule): StockRuleFormValues {
  return {
    product_id: rule.product_id,
    operator: rule.operator,
    threshold_quantity: rule.threshold_quantity,
    emails: rule.emails.map((email) => ({ value: email })),
  }
}

export function formatProductDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
  }).format(new Date(value))
}

export function formatStockQuantity(value: string, unit: ProductUnit) {
  return `${value} ${unitLabels[unit]}`
}

export function formatUnitPrice(value: string, unit: ProductUnit) {
  return `${formatEuro(value)}/${unitLabels[unit]}`
}

export function formatEuro(value: string | number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value))
}

export function describeStockRule(rule: Pick<StockRule, "operator" | "threshold_quantity" | "product_unit">) {
  return `${stockRuleOperatorLabels[rule.operator]} ${rule.threshold_quantity} ${unitLabels[rule.product_unit]}`
}

export function isStockRuleTriggered(rule: Pick<StockRule, "operator" | "threshold_quantity" | "product_stock_quantity">) {
  const stock = Number(rule.product_stock_quantity)
  const threshold = Number(rule.threshold_quantity)

  switch (rule.operator) {
    case "lt":
      return stock < threshold
    case "lte":
      return stock <= threshold
    case "eq":
      return stock === threshold
    case "gt":
      return stock > threshold
    case "gte":
      return stock >= threshold
    default:
      return false
  }
}
