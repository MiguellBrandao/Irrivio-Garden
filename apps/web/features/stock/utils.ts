import type { ProductFormValues } from "@/features/stock/schema"
import type { Product, ProductUnit, SaveProductPayload } from "@/features/stock/types"

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

export function toProductPayload(values: ProductFormValues): SaveProductPayload {
  return {
    name: values.name.trim(),
    unit: values.unit,
    stock_quantity: Number(values.stock_quantity),
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
