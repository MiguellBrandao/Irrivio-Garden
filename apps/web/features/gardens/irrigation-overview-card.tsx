"use client"

import Link from "next/link"

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
  formatIrrigationFrequency,
  formatIrrigationTimeRange,
  formatNextIrrigation,
  getUpcomingIrrigationZones,
} from "@/features/gardens/irrigation"
import type { IrrigationZone } from "@/features/gardens/types"

type IrrigationOverviewCardProps = {
  title: string
  description: string
  zones?: IrrigationZone[]
  isLoading?: boolean
  actionHref: string
  actionLabel: string
  emptyLabel: string
}

export function IrrigationOverviewCard({
  title,
  description,
  zones,
  isLoading = false,
  actionHref,
  actionLabel,
  emptyLabel,
}: IrrigationOverviewCardProps) {
  const irrigationZones = zones ?? []
  const activeZones = irrigationZones.filter((zone) => zone.active)
  const upcomingZones = getUpcomingIrrigationZones(irrigationZones).slice(0, 3)

  return (
    <Card className="border-[#dfd7c0] bg-white">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {isLoading ? (
          <OverviewPlaceholder label="A carregar sistema de irrigacao..." />
        ) : irrigationZones.length === 0 ? (
          <OverviewPlaceholder label={emptyLabel} />
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <OverviewTile label="Zonas" value={String(irrigationZones.length)} />
              <OverviewTile label="Ativas" value={String(activeZones.length)} />
              <OverviewTile
                label="Proxima rega"
                value={
                  upcomingZones[0]
                    ? formatNextIrrigation(upcomingZones[0].zone)
                    : "Sem proxima rega"
                }
              />
            </div>

            {upcomingZones.length ? (
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Proximas zonas
                </p>
                <div className="grid gap-3">
                  {upcomingZones.map(({ zone }) => (
                    <article
                      key={zone.id}
                      className="rounded-2xl border border-[#e8e1cf] bg-[#fbf8ef] p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-[#1f2f27]">{zone.name}</p>
                            <Badge
                              variant="outline"
                              className={
                                zone.active
                                  ? "border-[#cfe3d6] bg-[#edf7f0] text-[#215442]"
                                  : "border-[#e3d2cd] bg-[#f8efed] text-[#7a3126]"
                              }
                            >
                              {zone.active ? "Ativa" : "Inativa"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatIrrigationFrequency(zone)}
                          </p>
                        </div>
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          {formatNextIrrigation(zone)}
                        </p>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[#1f2f27]">
                        Horario: {formatIrrigationTimeRange(zone)}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function OverviewTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#e8e1cf] bg-[#fbf8ef] p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-[#1f2f27]">{value}</p>
    </div>
  )
}

function OverviewPlaceholder({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#dfd7c0] bg-[#fbf8ef] p-4 text-sm text-muted-foreground">
      {label}
    </div>
  )
}
