"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuthStore } from "@/lib/auth/store"

export function AuthStatus() {
  const user = useAuthStore((state) => state.user)
  const activeCompany = useAuthStore((state) =>
    state.companies.find((company) => company.id === state.activeCompanyId) ?? null
  )
  const clearSession = useAuthStore((state) => state.clearSession)

  if (!user) {
    return (
      <Card className="w-full max-w-lg border border-dashed">
        <CardHeader>
          <CardTitle>Sessao nao iniciada</CardTitle>
          <CardDescription>
            O login esta pronto. Entra com email e password para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/auth/login">Ir para login</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Sessao ativa</CardTitle>
        <CardDescription>
          O access token ficou guardado no estado global do frontend.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 text-sm">
          <div className="grid gap-1">
            <dt className="text-muted-foreground">Nome</dt>
            <dd className="font-medium">{user.name}</dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium">{user.email}</dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-muted-foreground">Perfil</dt>
            <dd className="font-medium capitalize">{activeCompany?.role ?? "-"}</dd>
          </div>
        </dl>
        <Button variant="outline" onClick={clearSession}>
          Limpar sessao local
        </Button>
      </CardContent>
    </Card>
  )
}
