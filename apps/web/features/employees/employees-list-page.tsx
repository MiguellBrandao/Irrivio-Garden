"use client"

import Link from "next/link"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { Add01Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
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
import { deleteEmployee, listEmployees, listTeams } from "@/features/employees/api"
import { formatEmployeeDate } from "@/features/employees/utils"
import { useAuthStore } from "@/lib/auth/store"

const PAGE_SIZE_OPTIONS = [5, 10, 20]

export function EmployeesListPage() {
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

  const employeesQuery = useQuery({
    queryKey: ["employees", activeCompanyId, accessToken],
    queryFn: () => listEmployees(accessToken ?? ""),
    enabled: Boolean(accessToken && activeCompanyId && isAdmin),
    placeholderData: keepPreviousData,
  })

  const teamsQuery = useQuery({
    queryKey: ["teams", activeCompanyId, accessToken],
    queryFn: () => listTeams(accessToken ?? ""),
    enabled: Boolean(accessToken && activeCompanyId && isAdmin),
    placeholderData: keepPreviousData,
  })

  const teamNameMap = useMemo(
    () => new Map((teamsQuery.data ?? []).map((team) => [team.id, team.name])),
    [teamsQuery.data]
  )

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    if (!normalizedSearch) {
      return employeesQuery.data ?? []
    }

    return (employeesQuery.data ?? []).filter((employee) =>
      [employee.name, employee.email ?? "", employee.phone ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    )
  }, [employeesQuery.data, search])

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize))
  const safePageIndex = Math.min(pageIndex, totalPages - 1)
  const paginatedEmployees = filteredEmployees.slice(
    safePageIndex * pageSize,
    safePageIndex * pageSize + pageSize
  )

  const deleteMutation = useMutation({
    mutationFn: async (employee: { id: string; name: string }) => {
      if (!accessToken) {
        throw new Error("Sem sessao ativa.")
      }

      await deleteEmployee(accessToken, employee.id)
      return employee
    },
    onSuccess: async (employee) => {
      await queryClient.invalidateQueries({ queryKey: ["employees"] })
      toast.success(`Membro "${employee.name}" apagado com sucesso.`)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel apagar o membro.")
    },
  })

  if (!accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sessao em falta</CardTitle>
          <CardDescription>
            Faz login novamente antes de gerir membros.
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
            Seleciona uma empresa antes de gerir membros.
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
            Apenas administradores podem gerir membros.
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
            <CardTitle>Membros</CardTitle>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPageIndex(0)
              }}
              placeholder="Pesquisar nome, email ou telefone"
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
            <Button asChild className="bg-[#215442] text-white hover:bg-[#183b2f]">
              <Link href="/employees/new">
                <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                Criar membro
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:hidden">
          {employeesQuery.isLoading ? (
            <div className="rounded-2xl border border-[#dfd7c0] bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              A carregar membros...
            </div>
          ) : paginatedEmployees.length ? (
            paginatedEmployees.map((employee) => {
              const teamNames = employee.team_ids
                .map((teamId) => teamNameMap.get(teamId))
                .filter(Boolean)

              return (
                <article
                  key={employee.id}
                  className="rounded-2xl border border-[#dfd7c0] bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="font-medium text-[#1f2f27]">{employee.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {employee.email ?? "-"}
                      </p>
                    </div>
                    <EmployeeActiveBadge active={employee.active ?? false} />
                  </div>

                  <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
                    <div className="space-y-1">
                      <dt className="text-muted-foreground">Telefone</dt>
                      <dd>{employee.phone ?? "-"}</dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-muted-foreground">Perfil</dt>
                      <dd className="capitalize">{employee.role}</dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-muted-foreground">Equipas</dt>
                      <dd>{teamNames.length ? teamNames.join(", ") : "-"}</dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-muted-foreground">Criado</dt>
                      <dd>{formatEmployeeDate(employee.created_at)}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex justify-end gap-2">
                    <Button asChild variant="outline" size="icon-sm">
                      <Link href={`/employees/${employee.id}/edit`}>
                        <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                        <span className="sr-only">Editar membro</span>
                      </Link>
                    </Button>
                    <DeleteConfirmDialog
                      title="Apagar membro"
                      description={`Tens a certeza que queres apagar ${employee.name}? Esta acao nao pode ser revertida.`}
                      onConfirm={() =>
                        deleteMutation.mutate({
                          id: employee.id,
                          name: employee.name,
                        })
                      }
                      isPending={deleteMutation.isPending}
                      srLabel="Apagar membro"
                    />
                  </div>
                </article>
              )
            })
          ) : (
            <div className="rounded-2xl border border-[#dfd7c0] bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhum membro encontrado.
            </div>
          )}
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-[#dfd7c0] bg-white md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Equipas</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeesQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    A carregar membros...
                  </TableCell>
                </TableRow>
              ) : paginatedEmployees.length ? (
                paginatedEmployees.map((employee) => {
                  const teamNames = employee.team_ids
                    .map((teamId) => teamNameMap.get(teamId))
                    .filter(Boolean)

                  return (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium text-[#1f2f27]">
                        {employee.name}
                      </TableCell>
                      <TableCell>{employee.email ?? "-"}</TableCell>
                      <TableCell>{employee.phone ?? "-"}</TableCell>
                      <TableCell className="capitalize">{employee.role}</TableCell>
                      <TableCell>
                        <EmployeeActiveBadge active={employee.active ?? false} />
                      </TableCell>
                      <TableCell className="max-w-64 whitespace-normal">
                        {teamNames.length ? teamNames.join(", ") : "-"}
                      </TableCell>
                      <TableCell>{formatEmployeeDate(employee.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="icon-sm">
                          <Link href={`/employees/${employee.id}/edit`}>
                            <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                            <span className="sr-only">Editar membro</span>
                          </Link>
                        </Button>
                        <DeleteConfirmDialog
                          title="Apagar membro"
                          description={`Tens a certeza que queres apagar ${employee.name}? Esta acao nao pode ser revertida.`}
                          onConfirm={() =>
                            deleteMutation.mutate({
                              id: employee.id,
                              name: employee.name,
                            })
                          }
                          isPending={deleteMutation.isPending}
                          srLabel="Apagar membro"
                        />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    Nenhum membro encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredEmployees.length} registo(s) no total. Pagina {safePageIndex + 1} de{" "}
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

function EmployeeActiveBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? "default" : "secondary"}>{active ? "Ativo" : "Inativo"}</Badge>
}
