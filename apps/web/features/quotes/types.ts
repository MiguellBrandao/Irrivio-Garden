export type Quote = {
  id: string
  company_id: string
  garden_id: string
  garden_client_name: string
  garden_address: string
  services: string[]
  price: string
  valid_until: string
  created_at: string
}

export type SaveQuotePayload = {
  garden_id: string
  services: string[]
  price: number
  valid_until?: string
}
