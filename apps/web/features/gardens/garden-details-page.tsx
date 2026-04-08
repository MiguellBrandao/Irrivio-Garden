"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getGardenById, listGardenIrrigationZones } from "@/features/gardens/api"
import { IrrigationOverviewCard } from "@/features/gardens/irrigation-overview-card"
import type { Garden, GardenStatus } from "@/features/gardens/types"
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
  ArrowLeftIcon,
  Calendar03Icon,
  Call02Icon,
  EuroCircleIcon,
  Invoice03Icon,
  MapPinpoint02Icon,
  NoteIcon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

type GardenDetailsPageProps = {
  gardenId: string
}

export function GardenDetailsPage({ gardenId }: GardenDetailsPageProps) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const activeCompanyId = useAuthStore((state) => state.activeCompanyId)
  const activeCompany = useAuthStore((state) =>
    state.companies.find((company) => company.id === state.activeCompanyId) ?? null
  )
  const isAdmin = activeCompany?.role === "admin"

  const gardenQuery = useQuery({
    queryKey: ["gardens", "detail", gardenId, activeCompanyId, accessToken],
    queryFn: () => getGardenById(accessToken ?? "", gardenId),
    enabled: Boolean(accessToken && activeCompanyId && gardenId),
  })

  const irrigationZonesQuery = useQuery({
    queryKey: ["gardens", "irrigation", gardenId, activeCompanyId, accessToken],
    queryFn: () => listGardenIrrigationZones(accessToken ?? "", gardenId),
    enabled: Boolean(accessToken && activeCompanyId && gardenId),
  })

  if (!accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sessao em falta</CardTitle>
          <CardDescription>
            Faz login novamente antes de consultar este jardim.
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
            Seleciona uma empresa antes de consultar este jardim.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (gardenQuery.isLoading) {
    return <LoadingPanel label="A carregar detalhes do jardim..." />
  }

  if (!gardenQuery.data) {
    return <LoadingPanel label="Nao foi possivel carregar este jardim." />
  }

  const garden = gardenQuery.data
  const hasNotes = Boolean(garden.notes?.trim())
  const showFinancialDetails = isAdmin

  function handleOpenLocation() {
    const address = garden.address?.trim()

    if (!address) {
      return
    }

    openAddressInMaps(address)
  }

  return (
    <div className="space-y-5">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={garden.status} />
          {garden.maintenance_frequency ? (
            <Badge variant="outline" className="border-[#d7cfbb] bg-white text-[#4e5d52]">
              {frequencyLabels[garden.maintenance_frequency]}
            </Badge>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-[#1f2f27] md:text-3xl">
              {garden.client_name}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {garden.address}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline" size="sm">
              <Link href="/gardens">
                <HugeiconsIcon icon={ArrowLeftIcon} strokeWidth={2} />
                Voltar aos jardins
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenLocation}
              disabled={!garden.address?.trim()}
            >
              <HugeiconsIcon icon={MapPinpoint02Icon} strokeWidth={2} />
              Abrir localizacao
            </Button>
            {isAdmin ? (
              <Button asChild size="sm" className="bg-[#215442] text-white hover:bg-[#183b2f]">
                <Link href={`/gardens/${garden.id}/edit`}>
                  <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                  Editar jardim
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      {showFinancialDetails ? (
        <section className="grid gap-4 lg:grid-cols-3">
          <SummaryTile
            icon={EuroCircleIcon}
            label="Valor mensal"
            value={
              garden.monthly_price ? formatCurrency(Number(garden.monthly_price)) : "Nao definido"
            }
          />
          <SummaryTile
            icon={Invoice03Icon}
            label="Dia de cobranca"
            value={garden.billing_day ? `Dia ${garden.billing_day}` : "Nao definido"}
          />
          <SummaryTile
            icon={Calendar03Icon}
            label="Inicio de contrato"
            value={garden.start_date ? formatDate(garden.start_date) : "Nao definido"}
          />
        </section>
      ) : null}

      <div className="space-y-4">
        {showFinancialDetails ? (
          <>
            <IrrigationOverviewCard
              title="Sistema de irrigacao"
              description="Resumo das zonas de rega configuradas para este jardim."
              zones={irrigationZonesQuery.data}
              isLoading={irrigationZonesQuery.isLoading}
              actionHref={`/gardens/${garden.id}/irrigation`}
              actionLabel={isAdmin ? "Gerir sistema de irrigacao" : "Ver sistema de irrigacao"}
              emptyLabel="Ainda nao existem zonas de irrigacao configuradas para este jardim."
            />

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
              {hasNotes ? (
                <NotesCard notes={garden.notes ?? ""} />
              ) : (
                <BillingCard garden={garden} />
              )}

              <div className="space-y-4">
                <ContactCard garden={garden} />
                {hasNotes ? <BillingCard garden={garden} /> : null}
              </div>
            </div>
          </>
        ) : hasNotes ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <NotesCard notes={garden.notes ?? ""} />
            <ContactCard garden={garden} />
          </div>
        ) : (
          <ContactCard garden={garden} />
        )}
      </div>

      {!showFinancialDetails ? (
        <IrrigationOverviewCard
          title="Sistema de irrigacao"
          description="Resumo das zonas de rega configuradas para este jardim."
          zones={irrigationZonesQuery.data}
          isLoading={irrigationZonesQuery.isLoading}
          actionHref={`/gardens/${garden.id}/irrigation`}
          actionLabel="Ver sistema de irrigacao"
          emptyLabel="Ainda nao existem zonas de irrigacao configuradas para este jardim."
        />
      ) : null}
    </div>
  )
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-[#dfd7c0] bg-[#fbf8ef] p-5 text-sm text-muted-foreground">
      {label}
    </div>
  )
}

function SummaryTile({
  icon,
  label,
  value,
}: {
  icon: Parameters<typeof HugeiconsIcon>[0]["icon"]
  label: string
  value: string
}) {
  return (
    <div className="rounded-3xl border border-[#dfd7c0] bg-white p-5 shadow-sm">
      <div className="mb-4 flex size-10 items-center justify-center rounded-2xl bg-[#eef2e8] text-[#215442]">
        <HugeiconsIcon icon={icon} strokeWidth={2} />
      </div>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-[#1f2f27]">{value}</p>
    </div>
  )
}

function NotesCard({ notes }: { notes: string }) {
  return (
    <Card className="border-[#dfd7c0] bg-white">
      <CardHeader className="gap-2">
        <CardTitle>Notas</CardTitle>
        <CardDescription>
          Observacoes internas e contexto adicional deste jardim.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="rounded-3xl border border-[#e8e1cf] bg-[#fbf8ef] p-5 text-sm leading-7 text-[#1f2f27]">
          {notes}
        </div>
      </CardContent>
    </Card>
  )
}

function BillingCard({ garden }: { garden: Garden }) {
  return (
    <Card className="border-[#dfd7c0] bg-white">
      <CardHeader className="gap-2">
        <CardTitle>Faturacao e manutencao</CardTitle>
        <CardDescription>
          Resumo financeiro e da cadencia de manutencao deste jardim.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <DetailStack
          icon={EuroCircleIcon}
          label="Valor mensal"
          value={
            garden.monthly_price
              ? formatCurrency(Number(garden.monthly_price))
              : "Nao definido"
          }
        />
        <DetailStack
          icon={Invoice03Icon}
          label="Dia de cobranca"
          value={garden.billing_day ? `Dia ${garden.billing_day}` : "Nao definido"}
        />
        <DetailStack
          icon={NoteIcon}
          label="Frequencia prevista"
          value={
            garden.maintenance_frequency
              ? frequencyLabels[garden.maintenance_frequency]
              : "Nao definida"
          }
        />
      </CardContent>
    </Card>
  )
}

function ContactCard({ garden }: { garden: Garden }) {
  return (
    <Card className="border-[#dfd7c0] bg-white">
      <CardHeader className="gap-2">
        <CardTitle>Contacto e localizacao</CardTitle>
        <CardDescription>
          Dados do cliente e local principal de intervencao.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <DetailStack
          icon={MapPinpoint02Icon}
          label="Morada"
          value={garden.address}
        />
        <DetailStack
          icon={Call02Icon}
          label="Telefone"
          value={garden.phone?.trim() ? garden.phone : "Nao definido"}
        />
      </CardContent>
    </Card>
  )
}

function DetailStack({
  icon,
  label,
  value,
}: {
  icon: Parameters<typeof HugeiconsIcon>[0]["icon"]
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-3xl border border-[#e8e1cf] bg-[#fbf8ef] p-4">
      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl bg-white text-[#215442]">
        <HugeiconsIcon icon={icon} strokeWidth={2} />
      </div>
      <div className="min-w-0 space-y-1">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p className="text-sm leading-6 text-[#1f2f27]">{value}</p>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: GardenStatus }) {
  return (
    <Badge
      className={cn(
        "border",
        status === "active"
          ? "border-[#cfe3d6] bg-[#edf7f0] text-[#215442]"
          : status === "paused"
            ? "border-[#ecd9a6] bg-[#fff6db] text-[#8a6111]"
            : "border-[#e3d2cd] bg-[#f8efed] text-[#7a3126]"
      )}
    >
      {statusLabels[status]}
    </Badge>
  )
}
