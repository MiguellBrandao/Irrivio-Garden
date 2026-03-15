import { apiFetch } from "@/lib/api/http"
import type {
  LoginPayload,
  LoginResponse,
  MeResponse,
  RefreshResponse,
  UserResponse,
  UpdateProfilePayload,
} from "@/lib/auth/types"

export function login(payload: LoginPayload) {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function refreshSession() {
  return apiFetch<RefreshResponse>("/auth/refresh", {
    method: "POST",
  })
}

export function getCurrentUser(accessToken: string) {
  return apiFetch<MeResponse>("/auth/me", {
    authToken: accessToken,
  })
}

export function logout(accessToken: string | null) {
  return apiFetch<{ success: true }>("/auth/logout", {
    method: "POST",
    authToken: accessToken,
  })
}

export function updateProfile(
  accessToken: string,
  payload: UpdateProfilePayload
) {
  return apiFetch<UserResponse>("/users/me", {
    method: "PATCH",
    authToken: accessToken,
    requireAuth: true,
    body: JSON.stringify(payload),
  })
}
