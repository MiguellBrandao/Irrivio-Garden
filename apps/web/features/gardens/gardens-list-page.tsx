"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ChangeEvent, useMemo, useRef, useState } from "react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { createGarden, deleteGarden, listGardens } from "@/features/gardens/api"
import type { Garden, GardenStatus, SaveGardenPayload } from "@/features/gardens/types"
import {
  formatCurrency,
  formatDate,
  frequencyLabels,
  openAddressInMaps,
  statusLabels,
} from "@/features/gardens/utils"
import { useAuthStore } from "@/lib/auth/store"
import { cn } from "@/lib/utils"
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  MapPinpoint02Icon,
  MoreVerticalIcon,
  PencilEdit02Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

const PAGE_SIZE_OPTIONS = [5, 10, 20]

export function GardensListPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const importInputRef = useRef<HTMLInputElement | null>(null)
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

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!accessToken) {
        throw new Error("Sem sessao ativa.")
      }

      const content = await file.text()
      const records = parseGardensCsv(content)

      if (!records.length) {
        throw new Error("O ficheiro CSV nao tem registos validos para importar.")
      }

      for (const record of records) {
        await createGarden(accessToken, record)
      }

      return records.length
    },
    onSuccess: async (count) => {
      await queryClient.invalidateQueries({ queryKey: ["gardens"] })
      toast.success(`${count} jardim(ns) importado(s) com sucesso.`)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel importar o ficheiro CSV.")
    },
  })

  function openGardenDetails(gardenId: string) {
    router.push(`/gardens/${gardenId}`)
  }

  function handleGardenKeyDown(
    event: React.KeyboardEvent<HTMLElement>,
    gardenId: string
  ) {
    if (event.key !== "Enter" && event.key !== " ") {
      return
    }

    event.preventDefault()
    openGardenDetails(gardenId)
  }

  function handleExportCsv() {
    const gardens = gardensQuery.data ?? []

    if (!gardens.length) {
      toast.error("Nao existem jardins para exportar.")
      return
    }

    const csvContent = buildGardensCsv(gardens)
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `gardens-${activeCompany?.slug ?? "company"}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  function handleImportSelect() {
    importInputRef.current?.click()
  }

  function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) {
      return
    }

    importMutation.mutate(file)
  }

  if (!accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sessao em falta</CardTitle>
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
                    {value}/pag.
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <Button asChild className="bg-[#215442] text-white hover:bg-[#183b2f]">
                  <Link href="/gardens/new">
                    <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                    Criar jardim
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon-sm" disabled={importMutation.isPending}>
                      <HugeiconsIcon icon={MoreVerticalIcon} strokeWidth={2} />
                      <span className="sr-only">Mais opcoes</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-44">
                    <DropdownMenuItem onSelect={handleImportSelect} disabled={importMutation.isPending}>
                      <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} />
                      <span>{importMutation.isPending ? "A importar CSV..." : "Import CSV"}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleExportCsv} disabled={gardensQuery.isLoading}>
                      <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
                      <span>Export CSV</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleImportFileChange}
                />
              </div>
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
                role="button"
                tabIndex={0}
                onClick={() => openGardenDetails(garden.id)}
                onKeyDown={(event) => handleGardenKeyDown(event, garden.id)}
                className="cursor-pointer rounded-2xl border border-[#dfd7c0] bg-white p-4 shadow-sm transition hover:border-[#cfc4a5] hover:bg-[#f8f4ea]"
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
                    <dt className="text-muted-foreground">Frequencia</dt>
                    <dd>
                      {garden.maintenance_frequency
                        ? frequencyLabels[garden.maintenance_frequency]
                        : "-"}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-muted-foreground">Valor mensal</dt>
                    <dd>
                      {garden.monthly_price
                        ? formatCurrency(Number(garden.monthly_price))
                        : "-"}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-muted-foreground">Dia cobranca</dt>
                    <dd>{garden.billing_day ?? "-"}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-muted-foreground">Criado</dt>
                    <dd>{formatDate(garden.created_at)}</dd>
                  </div>
                </dl>

                <GardenActionButtons
                  garden={garden}
                  isAdmin={isAdmin}
                  isDeletePending={deleteMutation.isPending}
                  className="mt-4"
                  onDelete={() =>
                    deleteMutation.mutate({
                      id: garden.id,
                      client_name: garden.client_name,
                    })
                  }
                />
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
                <TableHead>Frequencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Valor mensal</TableHead>
                <TableHead>Dia cobranca</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gardensQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    A carregar jardins...
                  </TableCell>
                </TableRow>
              ) : paginatedGardens.length ? (
                paginatedGardens.map((garden) => (
                  <TableRow
                    key={garden.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openGardenDetails(garden.id)}
                    onKeyDown={(event) => handleGardenKeyDown(event, garden.id)}
                    className="cursor-pointer transition hover:bg-[#f8f4ea]"
                  >
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
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <GardenStatusBadge status={garden.status} />
                    </TableCell>
                    <TableCell>
                      {garden.monthly_price
                        ? formatCurrency(Number(garden.monthly_price))
                        : "-"}
                    </TableCell>
                    <TableCell>{garden.billing_day ?? "-"}</TableCell>
                    <TableCell>{formatDate(garden.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <GardenActionButtons
                        garden={garden}
                        isAdmin={isAdmin}
                        isDeletePending={deleteMutation.isPending}
                        onDelete={() =>
                          deleteMutation.mutate({
                            id: garden.id,
                            client_name: garden.client_name,
                          })
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Nenhum jardim encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredGardens.length} registo(s) no total. Pagina {safePageIndex + 1} de{" "}
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

const GARDEN_CSV_HEADERS = [
  "id",
  "client_name",
  "address",
  "phone",
  "monthly_price",
  "maintenance_frequency",
  "start_date",
  "billing_day",
  "status",
  "notes",
  "created_at",
] as const

function buildGardensCsv(gardens: Garden[]) {
  const header = GARDEN_CSV_HEADERS.join(",")
  const rows = gardens.map((garden) =>
    [
      garden.id,
      garden.client_name,
      garden.address,
      garden.phone ?? "",
      garden.monthly_price ?? "",
      garden.maintenance_frequency ?? "",
      garden.start_date ?? "",
      garden.billing_day ?? "",
      garden.status,
      garden.notes ?? "",
      garden.created_at,
    ]
      .map(escapeCsvValue)
      .join(",")
  )

  return [header, ...rows].join("\n")
}

function escapeCsvValue(value: string | number) {
  const normalized = String(value)
  const escaped = normalized.replaceAll('"', '""')

  if (/[",\n]/.test(escaped)) {
    return `"${escaped}"`
  }

  return escaped
}

function parseGardensCsv(content: string) {
  const rows = parseCsvRows(content)

  if (rows.length < 2) {
    return []
  }

  const headers = rows[0].map((value) => normalizeCsvHeader(value))

  return rows
    .slice(1)
    .filter((row) => row.some((value) => value.trim() !== ""))
    .map((row, index) => mapCsvRowToGardenPayload(headers, row, index + 2))
}

function normalizeCsvHeader(value: string) {
  return value.trim().toLowerCase()
}

function mapCsvRowToGardenPayload(
  headers: string[],
  row: string[],
  rowNumber: number
): SaveGardenPayload {
  const data = Object.fromEntries(headers.map((header, index) => [header, row[index]?.trim() ?? ""]))

  const clientName = data.client_name
  const address = data.address

  if (!clientName || !address) {
    throw new Error(`A linha ${rowNumber} do CSV tem de incluir client_name e address.`)
  }

  const monthlyPrice = data.monthly_price ? Number(data.monthly_price) : undefined
  if (data.monthly_price && Number.isNaN(monthlyPrice)) {
    throw new Error(`A linha ${rowNumber} do CSV tem monthly_price invalido.`)
  }

  const billingDay = data.billing_day ? Number(data.billing_day) : undefined
  if (data.billing_day) {
    if (
      billingDay === undefined ||
      Number.isNaN(billingDay) ||
      billingDay < 1 ||
      billingDay > 31
    ) {
      throw new Error(`A linha ${rowNumber} do CSV tem billing_day invalido.`)
    }
  }

  const maintenanceFrequency = data.maintenance_frequency
  if (
    maintenanceFrequency &&
    maintenanceFrequency !== "weekly" &&
    maintenanceFrequency !== "biweekly" &&
    maintenanceFrequency !== "monthly"
  ) {
    throw new Error(`A linha ${rowNumber} do CSV tem maintenance_frequency invalida.`)
  }

  const status = data.status || "active"
  if (status !== "active" && status !== "paused" && status !== "cancelled") {
    throw new Error(`A linha ${rowNumber} do CSV tem status invalido.`)
  }

  return {
    client_name: clientName,
    address,
    phone: data.phone || undefined,
    monthly_price: monthlyPrice,
    maintenance_frequency:
      (maintenanceFrequency as Garden["maintenance_frequency"] | "") || undefined,
    start_date: data.start_date || undefined,
    billing_day: billingDay,
    status: status as GardenStatus,
    notes: data.notes || undefined,
  }
}

function parseCsvRows(content: string) {
  const normalized = content.replace(/^\uFEFF/, "")
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentValue = ""
  let isInsideQuotes = false

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index]
    const nextChar = normalized[index + 1]

    if (char === '"') {
      if (isInsideQuotes && nextChar === '"') {
        currentValue += '"'
        index += 1
      } else {
        isInsideQuotes = !isInsideQuotes
      }
      continue
    }

    if (char === "," && !isInsideQuotes) {
      currentRow.push(currentValue)
      currentValue = ""
      continue
    }

    if ((char === "\n" || char === "\r") && !isInsideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1
      }

      currentRow.push(currentValue)
      rows.push(currentRow)
      currentRow = []
      currentValue = ""
      continue
    }

    currentValue += char
  }

  if (currentValue !== "" || currentRow.length > 0) {
    currentRow.push(currentValue)
    rows.push(currentRow)
  }

  return rows
}

type GardenActionButtonsProps = {
  garden: Garden
  isAdmin: boolean
  isDeletePending: boolean
  className?: string
  onDelete: () => void
}

function GardenActionButtons({
  garden,
  isAdmin,
  isDeletePending,
  className,
  onDelete,
}: GardenActionButtonsProps) {
  return (
    <div
      className={cn("flex justify-end gap-2", className)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        onClick={() => openAddressInMaps(garden.address)}
        disabled={!garden.address?.trim()}
      >
        <HugeiconsIcon icon={MapPinpoint02Icon} strokeWidth={2} />
        <span className="sr-only">Abrir localizacao do jardim</span>
      </Button>
      <Button asChild variant="outline" size="icon-sm">
        <Link href={`/gardens/${garden.id}`}>
          <HugeiconsIcon icon={ViewIcon} strokeWidth={2} />
          <span className="sr-only">Ver detalhes do jardim</span>
        </Link>
      </Button>
      {isAdmin ? (
        <Button asChild variant="outline" size="icon-sm">
          <Link href={`/gardens/${garden.id}/edit`}>
            <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
            <span className="sr-only">Editar jardim</span>
          </Link>
        </Button>
      ) : null}
      {isAdmin ? (
        <DeleteConfirmDialog
          title="Apagar jardim"
          description={`Tens a certeza que queres apagar o jardim de ${garden.client_name}? Esta acao nao pode ser revertida.`}
          onConfirm={onDelete}
          isPending={isDeletePending}
          srLabel="Apagar jardim"
        />
      ) : null}
    </div>
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
