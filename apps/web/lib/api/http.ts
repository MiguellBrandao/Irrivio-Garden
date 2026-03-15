const API_BASE_URL = `${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").replace(/\/$/, "")}`

type ApiFetchOptions = RequestInit & {
  authToken?: string | null
  requireAuth?: boolean
}

type ApiErrorPayload = {
  message?: string | string[]
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export async function apiFetch<T>(
  path: string,
  init?: ApiFetchOptions
): Promise<T> {
  const { ensureSession } = await import("@/lib/auth/session")
  const { useAuthStore } = await import("@/lib/auth/store")
  const { authToken, headers, requireAuth = false, ...requestInit } = init ?? {}

  let resolvedToken =
    authToken ?? (requireAuth ? useAuthStore.getState().accessToken : null)

  if (requireAuth && !resolvedToken) {
    resolvedToken = await ensureSession()
  }

  let response = await executeFetch(
    `${API_BASE_URL}${path}`,
    requestInit,
    headers,
    resolvedToken
  )

  if (response.status === 401 && requireAuth) {
    const refreshedToken = await ensureSession({ force: true })

    if (refreshedToken) {
      response = await executeFetch(
        `${API_BASE_URL}${path}`,
        requestInit,
        headers,
        refreshedToken
      )
    }
  }

  const contentType = response.headers.get("content-type") ?? ""
  const isJson = contentType.includes("application/json")
  const payload = isJson
    ? ((await response.json()) as T | ApiErrorPayload)
    : undefined

  if (!response.ok) {
    const message =
      extractErrorMessage(payload as ApiErrorPayload | undefined) ??
      "Request failed"
    throw new ApiError(message, response.status)
  }

  return payload as T
}

async function executeFetch(
  url: string,
  init: RequestInit,
  headers: HeadersInit | undefined,
  authToken: string | null
) {
  return fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
  })
}

function extractErrorMessage(payload: ApiErrorPayload | undefined) {
  if (!payload || typeof payload !== "object" || !("message" in payload)) {
    return null
  }

  if (Array.isArray(payload.message)) {
    return payload.message.join(", ")
  }

  return payload.message ?? null
}
