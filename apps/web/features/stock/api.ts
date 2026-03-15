import { apiFetch } from "@/lib/api/http"
import {
  appendCompanyId,
  requireActiveCompanyId,
} from "@/lib/auth/company"

import type { Product, SaveProductPayload } from "@/features/stock/types"

export function listProducts(authToken: string, search?: string) {
  const companyId = requireActiveCompanyId()
  const params = new URLSearchParams({ company_id: companyId })

  if (search?.trim()) {
    params.set("search", search.trim())
  }

  return apiFetch<Product[]>(`/products?${params.toString()}`, {
    authToken,
    requireAuth: true,
  })
}

export function getProductById(authToken: string, productId: string) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Product>(appendCompanyId(`/products/${productId}`, companyId), {
    authToken,
    requireAuth: true,
  })
}

export function createProduct(authToken: string, payload: SaveProductPayload) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Product>("/products", {
    method: "POST",
    authToken,
    requireAuth: true,
    body: JSON.stringify({ ...payload, company_id: companyId }),
  })
}

export function updateProduct(
  authToken: string,
  productId: string,
  payload: SaveProductPayload
) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Partial<Product> & { id: string }>(`/products/${productId}`, {
    method: "PATCH",
    authToken,
    requireAuth: true,
    body: JSON.stringify({ ...payload, company_id: companyId }),
  })
}
