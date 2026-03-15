"use client"

import Link from "next/link"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { deleteGarden, listGardens } from "@/features/gardens/api"
import type { GardenStatus } from "@/features/gardens/types"
import {
  formatCurrency,
  formatDate,
  frequencyLabels,
  statusLabels,
} from "@/features/gardens/utils"
import { useAuthStore } from "@/lib/auth/store"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons"

const PAGE_SIZE_OPTIONS = [5, 10, 20]

export function GardensListPage() {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const activeCompanyId = useAuthStore((state) => state.activeCompanyId)
  const activeCompany = useAuthStore((state) =>
    state.companies.find((company) => company.id === state.activeCompanyId) ?? null
  )
  const isAdmin = activeCompany?.role === "admin"

  const [search, setSearch] = useState("")
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const gardensQuery = useQuery({
    queryKey: ["gardens", activeCompanyId, accessToken],
    queryFn: () => listGardens(accessToken ?? ""),
    enabled: Boolean(accessToken && activeCompanyId),
    placeholderData: keepPreviousData,
  })

  const filteredGardens = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    if (!normalizedSearch) {
      return gardensQuery.data ?? []
    }

    return (gardensQuery.data ?? []).filter((garden) =>
      [garden.client_name, garden.address, garden.phone ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    )
  }, [gardensQuery.data, search])

  const totalPages = Math.max(1, Math.ceil(filteredGardens.length / pageSize))
  const safePageIndex = Math.min(pageIndex, totalPages - 1)
  const paginatedGardens = filteredGardens.slice(
    safePageIndex * pageSize,
    safePageIndex * pageSize + pageSize
  )

  const deleteMutation = useMutation({
    mutationFn: async (garden: { id: string; client_name: string }) => {
      if (!accessToken) {
        throw new Error("Sem sessao ativa.")
      }

      await deleteGarden(accessToken, garden.id)
      return garden
    },
    onSuccess: async (garden) => {
      await queryClient.invalidateQueries({ queryKey: ["gardens"] })
      toast.success(`Jardim "${garden.client_name}" apagado com sucesso.`)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel apagar o jardim.")
    },
  })

  if (!accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sessão em falta</CardTitle>
          <CardDescription>
            Faz login novamente antes de gerir jardins.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!activeCompanyId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Empresa em falta</CardTitle>
          <CardDescription>
            Seleciona uma empresa antes de ver os jardins.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-[#dfd7c0] bg-[#fbf8ef]">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <CardTitle>Jardins</CardTitle>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPageIndex(0)
              }}
              placeholder="Pesquisar cliente, morada ou telefone"
              className="w-full min-w-64 bg-white"
            />
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value))
                setPageIndex(0)
              }}
            >
              <SelectTrigger className="w-full bg-white sm:w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {value}/pág.
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin ? (
              <Button asChild className="bg-[#215442] text-white hover:bg-[#183b2f]">
                <Link href="/gardens/new">
                  <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                  Criar jardim
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:hidden">
          {gardensQuery.isLoading ? (
            <div className="rounded-2xl border border-[#dfd7c0] bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              A carregar jardins...
            </div>
          ) : paginatedGardens.length ? (
            paginatedGardens.map((garden) => (
              <article
                key={garden.id}
                className="rounded-2xl border border-[#dfd7c0] bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="font-medium text-[#1f2f27]">
                      {garden.client_name}
                    </h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {garden.address}
                    </p>
                  </div>
                  <GardenStatusBadge status={garden.status} />
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-1">
                    <dt className="text-muted-foreground">Frequência</dt>
                    <dd>
                      {garden.maintenance_frequency
                        ? frequencyLabels[garden.maintenance_frequency]
                        : "—"}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-muted-foreground">Valor mensal</dt>
                    <dd>
                      {garden.monthly_price
                        ? formatCurrency(Number(garden.monthly_price))
                        : "—"}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-muted-foreground">Dia cobrança</dt>
                    <dd>{garden.billing_day ?? "—"}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-muted-foreground">Criado</dt>
                    <dd>{formatDate(garden.created_at)}</dd>
                  </div>
                </dl>

                {isAdmin ? (
                  <div className="mt-4 flex justify-end gap-2">
                    <Button asChild variant="outline" size="icon-sm">
                      <Link href={`/gardens/${garden.id}/edit`}>
                        <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                        <span className="sr-only">Editar jardim</span>
                      </Link>
                    </Button>
                    <DeleteConfirmDialog
                      title="Apagar jardim"
                      description={`Tens a certeza que queres apagar o jardim de ${garden.client_name}? Esta acao nao pode ser revertida.`}
                      onConfirm={() =>
                        deleteMutation.mutate({
                          id: garden.id,
                          client_name: garden.client_name,
                        })
                      }
                      isPending={deleteMutation.isPending}
                      srLabel="Apagar jardim"
                    />
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-[#dfd7c0] bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhum jardim encontrado.
            </div>
          )}
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-[#dfd7c0] bg-white md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Frequência</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Valor mensal</TableHead>
                <TableHead>Dia cobrança</TableHead>
                <TableHead>Criado</TableHead>
                {isAdmin ? <TableHead className="text-right">Ações</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {gardensQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} className="h-24 text-center">
                    A carregar jardins...
                  </TableCell>
                </TableRow>
              ) : paginatedGardens.length ? (
                paginatedGardens.map((garden) => (
                  <TableRow key={garden.id}>
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <div className="font-medium text-[#1f2f27]">
                          {garden.client_name}
                        </div>
                        <div className="max-w-72 whitespace-normal text-sm text-muted-foreground">
                          {garden.address}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {garden.maintenance_frequency
                        ? frequencyLabels[garden.maintenance_frequency]
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <GardenStatusBadge status={garden.status} />
                    </TableCell>
                    <TableCell>
                      {garden.monthly_price
                        ? formatCurrency(Number(garden.monthly_price))
                        : "—"}
                    </TableCell>
                    <TableCell>{garden.billing_day ?? "—"}</TableCell>
                    <TableCell>{formatDate(garden.created_at)}</TableCell>
                    {isAdmin ? (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="icon-sm">
                          <Link href={`/gardens/${garden.id}/edit`}>
                            <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                            <span className="sr-only">Editar jardim</span>
                          </Link>
                        </Button>
                        <DeleteConfirmDialog
                          title="Apagar jardim"
                          description={`Tens a certeza que queres apagar o jardim de ${garden.client_name}? Esta acao nao pode ser revertida.`}
                          onConfirm={() =>
                            deleteMutation.mutate({
                              id: garden.id,
                              client_name: garden.client_name,
                            })
                          }
                          isPending={deleteMutation.isPending}
                          srLabel="Apagar jardim"
                        />
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} className="h-24 text-center">
                    Nenhum jardim encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredGardens.length} registo(s) no total. Página {safePageIndex + 1} de{" "}
            {totalPages}.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageIndex((value) => Math.max(0, value - 1))}
              disabled={safePageIndex === 0}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPageIndex((value) => Math.min(totalPages - 1, value + 1))
              }
              disabled={safePageIndex >= totalPages - 1}
            >
              Seguinte
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function GardenStatusBadge({ status }: { status: GardenStatus }) {
  const variant =
    status === "active"
      ? "default"
      : status === "paused"
        ? "secondary"
        : "outline"

  return <Badge variant={variant}>{statusLabels[status]}</Badge>
}
