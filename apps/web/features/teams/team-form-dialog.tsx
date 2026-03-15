"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { createTeam, getTeamById, updateTeam } from "@/features/teams/api"
import {
  teamFormDefaults,
  teamFormSchema,
  type TeamFormValues,
} from "@/features/teams/schema"
import { toTeamFormValues, toTeamPayload } from "@/features/teams/utils"
import { useAuthStore } from "@/lib/auth/store"

type TeamFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  teamId?: string
}

export function TeamFormDialog({
  open,
  onOpenChange,
  mode,
  teamId,
}: TeamFormDialogProps) {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const activeCompanyId = useAuthStore((state) => state.activeCompanyId)

  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: teamFormDefaults,
  })

  const teamQuery = useQuery({
    queryKey: ["teams", "detail", teamId, activeCompanyId, accessToken],
    queryFn: () => getTeamById(accessToken ?? "", teamId ?? ""),
    enabled: Boolean(open && accessToken && activeCompanyId && teamId && mode === "edit"),
  })

  useEffect(() => {
    if (!open) {
      form.reset(teamFormDefaults)
      return
    }

    if (mode === "edit" && teamQuery.data) {
      form.reset(toTeamFormValues(teamQuery.data))
      return
    }

    if (mode === "create") {
      form.reset(teamFormDefaults)
    }
  }, [form, mode, open, teamQuery.data])

  const saveMutation = useMutation({
    mutationFn: async (values: TeamFormValues) => {
      if (!accessToken) {
        throw new Error("Sem sessao ativa.")
      }
      if (!activeCompanyId) {
        throw new Error("Seleciona uma empresa.")
      }

      const payload = toTeamPayload(values)

      if (mode === "edit" && teamId) {
        return updateTeam(accessToken, teamId, payload)
      }

      return createTeam(accessToken, payload)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["teams"] })
      toast.success(
        mode === "edit"
          ? "Equipa atualizada com sucesso."
          : "Equipa criada com sucesso."
      )
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel guardar a equipa.")
    },
  })

  function onSubmit(values: TeamFormValues) {
    saveMutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Editar equipa" : "Criar equipa"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Atualiza o nome da equipa."
              : "Cria uma nova equipa para organizacao interna."}
          </DialogDescription>
        </DialogHeader>

        {mode === "edit" && teamQuery.isLoading ? (
          <div className="rounded-2xl border border-dashed border-[#dfd7c0] bg-[#fbf8ef] p-5 text-sm text-muted-foreground">
            A carregar equipa...
          </div>
        ) : (
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="gap-5">
              <Controller
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="team-name">Nome</FieldLabel>
                    <Input {...field} id="team-name" aria-invalid={fieldState.invalid} />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              {saveMutation.isError ? (
                <FieldError>{saveMutation.error.message}</FieldError>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="submit"
                  className="bg-[#215442] text-white hover:bg-[#183b2f]"
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending
                    ? "A guardar..."
                    : mode === "edit"
                      ? "Guardar alteracoes"
                      : "Criar equipa"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
              </div>
            </FieldGroup>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
