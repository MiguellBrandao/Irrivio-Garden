"use client"

import Link from "next/link"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { Add01Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
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
import { deleteQuote, listQuotes } from "@/features/quotes/api"
import { GenerateQuotePdfButton } from "@/features/quotes/generate-quote-pdf-button"
import {
  formatQuoteCurrency,
  formatQuoteDate,
  formatQuoteServicesPreview,
} from "@/features/quotes/utils"
import { useAuthStore } from "@/lib/auth/store"

const PAGE_SIZE_OPTIONS = [5, 10, 20]

export function QuotesListPage() {
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

  const quotesQuery = useQuery({
    queryKey: ["quotes", activeCompanyId, accessToken],
    queryFn: () => listQuotes(accessToken ?? ""),
    enabled: Boolean(accessToken && activeCompanyId && isAdmin),
    placeholderData: keepPreviousData,
  })

  const filteredQuotes = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    if (!normalizedSearch) {
      return quotesQuery.data ?? []
    }

    return (quotesQuery.data ?? []).filter((quote) =>
      [
        quote.garden_client_name,
        quote.garden_address,
        quote.services.join(" "),
        quote.price,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    )
  }, [quotesQuery.data, search])

  const totalPages = Math.max(1, Math.ceil(filteredQuotes.length / pageSize))
  const safePageIndex = Math.min(pageIndex, totalPages - 1)
  const paginatedQuotes = filteredQuotes.slice(
    safePageIndex * pageSize,
    safePageIndex * pageSize + pageSize
  )

  const deleteMutation = useMutation({
    mutationFn: async (quote: { id: string; garden_client_name: string }) => {
      if (!accessToken) {
        throw new Error("Sem sessao ativa.")
      }

      await deleteQuote(accessToken, quote.id)
      return quote
    },
    onSuccess: async (quote) => {
      await queryClient.invalidateQueries({ queryKey: ["quotes"] })
      toast.success(`Orçamento para "${quote.garden_client_name}" apagado com sucesso.`)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel apagar o orçamento.")
    },
  })

  if (!accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sessao em falta</CardTitle>
          <CardDescription>
            Faz login novamente antes de gerir orçamentos.
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
            Seleciona uma empresa antes de gerir orçamentos.
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
            Apenas administradores podem gerir orçamentos.
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
            <CardTitle>Orçamentos</CardTitle>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPageIndex(0)
              }}
              placeholder="Pesquisar jardim, localizacao ou servicos"
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
              <Link href="/quotes/new">
                <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                Criar orçamento
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:hidden">
          {quotesQuery.isLoading ? (
            <div className="rounded-2xl border border-[#dfd7c0] bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              A carregar orçamentos...
            </div>
          ) : paginatedQuotes.length ? (
            paginatedQuotes.map((quote) => (
              <article
                key={quote.id}
                className="rounded-2xl border border-[#dfd7c0] bg-white p-4 shadow-sm"
              >
                <div className="space-y-1">
                  <h3 className="font-medium text-[#1f2f27]">
                    {quote.garden_client_name}
                  </h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {quote.garden_address}
                  </p>
                </div>

                <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
                  <div className="space-y-1">
                    <dt className="text-muted-foreground">Servicos</dt>
                    <dd>{formatQuoteServicesPreview(quote.services)}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-muted-foreground">Valido ate</dt>
                    <dd>{formatQuoteDate(quote.valid_until)}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-muted-foreground">Valor</dt>
                    <dd>{formatQuoteCurrency(Number(quote.price))}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-muted-foreground">Criado</dt>
                    <dd>{formatQuoteDate(quote.created_at)}</dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <GenerateQuotePdfButton quote={quote} variant="outline" size="sm" />
                  <Button asChild variant="outline" size="icon-sm">
                    <Link href={`/quotes/${quote.id}/edit`}>
                      <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                      <span className="sr-only">Editar orçamento</span>
                    </Link>
                  </Button>
                  <DeleteConfirmDialog
                    title="Apagar orçamento"
                    description={`Tens a certeza que queres apagar o orçamento de ${quote.garden_client_name}? Esta acao nao pode ser revertida.`}
                    onConfirm={() =>
                      deleteMutation.mutate({
                        id: quote.id,
                        garden_client_name: quote.garden_client_name,
                      })
                    }
                    isPending={deleteMutation.isPending}
                    srLabel="Apagar orçamento"
                  />
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-[#dfd7c0] bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhum orçamento encontrado.
            </div>
          )}
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-[#dfd7c0] bg-white md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jardim</TableHead>
                <TableHead>Servicos</TableHead>
                <TableHead>Valido ate</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotesQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    A carregar orçamentos...
                  </TableCell>
                </TableRow>
              ) : paginatedQuotes.length ? (
                paginatedQuotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <div className="font-medium text-[#1f2f27]">
                          {quote.garden_client_name}
                        </div>
                        <div className="max-w-72 whitespace-normal text-sm text-muted-foreground">
                          {quote.garden_address}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-80 whitespace-normal">
                      {formatQuoteServicesPreview(quote.services)}
                    </TableCell>
                    <TableCell>{formatQuoteDate(quote.valid_until)}</TableCell>
                    <TableCell>{formatQuoteCurrency(Number(quote.price))}</TableCell>
                    <TableCell>{formatQuoteDate(quote.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <GenerateQuotePdfButton quote={quote} variant="outline" size="sm" />
                        <Button asChild variant="outline" size="icon-sm">
                          <Link href={`/quotes/${quote.id}/edit`}>
                            <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                            <span className="sr-only">Editar orçamento</span>
                          </Link>
                        </Button>
                        <DeleteConfirmDialog
                          title="Apagar orçamento"
                          description={`Tens a certeza que queres apagar o orçamento de ${quote.garden_client_name}? Esta acao nao pode ser revertida.`}
                          onConfirm={() =>
                            deleteMutation.mutate({
                              id: quote.id,
                              garden_client_name: quote.garden_client_name,
                            })
                          }
                          isPending={deleteMutation.isPending}
                          srLabel="Apagar orçamento"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Nenhum orçamento encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredQuotes.length} registo(s) no total. Pagina {safePageIndex + 1} de{" "}
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
