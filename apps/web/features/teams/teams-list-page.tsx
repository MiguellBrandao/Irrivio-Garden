"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { Add01Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { TeamFormDialog } from "@/features/teams/team-form-dialog"
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
import { deleteTeam, listTeams } from "@/features/teams/api"
import { formatTeamDate } from "@/features/teams/utils"
import { useAuthStore } from "@/lib/auth/store"

const PAGE_SIZE_OPTIONS = [5, 10, 20]

export function TeamsListPage() {
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
  const [createOpen, setCreateOpen] = useState(false)
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)

  const teamsQuery = useQuery({
    queryKey: ["teams", activeCompanyId, accessToken],
    queryFn: () => listTeams(accessToken ?? ""),
    enabled: Boolean(accessToken && activeCompanyId && isAdmin),
    placeholderData: keepPreviousData,
  })

  const filteredTeams = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    if (!normalizedSearch) {
      return teamsQuery.data ?? []
    }

    return (teamsQuery.data ?? []).filter((team) =>
      team.name.toLowerCase().includes(normalizedSearch)
    )
  }, [teamsQuery.data, search])

  const totalPages = Math.max(1, Math.ceil(filteredTeams.length / pageSize))
  const safePageIndex = Math.min(pageIndex, totalPages - 1)
  const paginatedTeams = filteredTeams.slice(
    safePageIndex * pageSize,
    safePageIndex * pageSize + pageSize
  )

  const deleteMutation = useMutation({
    mutationFn: async (team: { id: string; name: string }) => {
      if (!accessToken) {
        throw new Error("Sem sessao ativa.")
      }

      await deleteTeam(accessToken, team.id)
      return team
    },
    onSuccess: async (team) => {
      await queryClient.invalidateQueries({ queryKey: ["teams"] })
      toast.success(`Equipa "${team.name}" apagada com sucesso.`)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel apagar a equipa.")
    },
  })

  if (!accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sessao em falta</CardTitle>
          <CardDescription>
            Faz login novamente antes de gerir equipas.
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
            Seleciona uma empresa antes de gerir equipas.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acesso restrito</CardTitle>
          <CardDescription>
            Apenas administradores podem gerir equipas.
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
            <CardTitle>Equipas</CardTitle>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPageIndex(0)
              }}
              placeholder="Pesquisar nome da equipa"
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
                    {value}/pag.
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="bg-[#215442] text-white hover:bg-[#183b2f]"
              onClick={() => setCreateOpen(true)}
            >
                <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                Criar equipa
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:hidden">
          {teamsQuery.isLoading ? (
            <div className="rounded-2xl border border-[#dfd7c0] bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              A carregar equipas...
            </div>
          ) : paginatedTeams.length ? (
            paginatedTeams.map((team) => (
              <article
                key={team.id}
                className="rounded-2xl border border-[#dfd7c0] bg-white p-4 shadow-sm"
              >
                <div className="space-y-1">
                  <h3 className="font-medium text-[#1f2f27]">{team.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Criada em {formatTeamDate(team.created_at)}
                  </p>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setEditingTeamId(team.id)}
                  >
                    <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                    <span className="sr-only">Editar equipa</span>
                  </Button>
                  <DeleteConfirmDialog
                    title="Apagar equipa"
                    description={`Tens a certeza que queres apagar a equipa ${team.name}? Esta acao nao pode ser revertida.`}
                    onConfirm={() =>
                      deleteMutation.mutate({
                        id: team.id,
                        name: team.name,
                      })
                    }
                    isPending={deleteMutation.isPending}
                    srLabel="Apagar equipa"
                  />
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-[#dfd7c0] bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma equipa encontrada.
            </div>
          )}
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-[#dfd7c0] bg-white md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Criada</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    A carregar equipas...
                  </TableCell>
                </TableRow>
              ) : paginatedTeams.length ? (
                paginatedTeams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium text-[#1f2f27]">
                      {team.name}
                    </TableCell>
                    <TableCell>{formatTeamDate(team.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={() => setEditingTeamId(team.id)}
                        >
                          <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                          <span className="sr-only">Editar equipa</span>
                        </Button>
                        <DeleteConfirmDialog
                          title="Apagar equipa"
                          description={`Tens a certeza que queres apagar a equipa ${team.name}? Esta acao nao pode ser revertida.`}
                          onConfirm={() =>
                            deleteMutation.mutate({
                              id: team.id,
                              name: team.name,
                            })
                          }
                          isPending={deleteMutation.isPending}
                          srLabel="Apagar equipa"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    Nenhuma equipa encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredTeams.length} registo(s) no total. Pagina {safePageIndex + 1} de{" "}
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
        <TeamFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          mode="create"
        />
        <TeamFormDialog
          open={Boolean(editingTeamId)}
          onOpenChange={(open) => {
            if (!open) {
              setEditingTeamId(null)
            }
          }}
          mode="edit"
          teamId={editingTeamId ?? undefined}
        />
      </CardContent>
    </Card>
  )
}
