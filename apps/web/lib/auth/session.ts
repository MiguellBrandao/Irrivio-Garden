import { getCurrentUser, refreshSession } from "@/lib/auth/api"
import { useAuthStore } from "@/lib/auth/store"

let refreshPromise: Promise<string | null> | null = null

export async function ensureSession(options?: { force?: boolean }) {
  const { accessToken, user } = useAuthStore.getState()

  if (!options?.force && accessToken && user) {
    return accessToken
  }

  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    useAuthStore.getState().setRefreshing(true)

    try {
      const refreshed = await refreshSession()
      const me = await getCurrentUser(refreshed.accessToken)

      useAuthStore.getState().setSession({
        accessToken: refreshed.accessToken,
        user: me.user,
        companies: me.companies,
      })

      return refreshed.accessToken
    } catch {
      useAuthStore.getState().clearSession()
      return null
    } finally {
      useAuthStore.getState().setRefreshing(false)
      refreshPromise = null
    }
  })()

  return refreshPromise
}
