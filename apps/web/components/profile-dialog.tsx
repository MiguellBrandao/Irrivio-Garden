"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useEffect } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { z } from "zod"
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
import { updateProfile } from "@/lib/auth/api"
import { useAuthStore } from "@/lib/auth/store"

const passwordRule = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

const profileNameSchema = z.object({
  name: z.string().trim().min(1, "Indica o nome."),
})

const profilePasswordSchema = z
  .object({
    password: z
      .string()
      .trim()
      .refine(
        (value) => passwordRule.test(value),
        "A password deve ter pelo menos 8 caracteres, 1 letra e 1 numero."
      ),
    confirmPassword: z.string().trim(),
  })
  .superRefine((values, context) => {
    if (values.password !== values.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "As passwords nao coincidem.",
      })
    }
  })

type ProfileNameValues = z.infer<typeof profileNameSchema>
type ProfilePasswordValues = z.infer<typeof profilePasswordSchema>

type ProfileDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)

  const nameForm = useForm<ProfileNameValues>({
    resolver: zodResolver(profileNameSchema),
    defaultValues: {
      name: user?.name ?? "",
    },
  })

  const passwordForm = useForm<ProfilePasswordValues>({
    resolver: zodResolver(profilePasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  const currentName = useWatch({
    control: nameForm.control,
    name: "name",
  })

  useEffect(() => {
    if (!open) {
      return
    }

    nameForm.reset({
      name: user?.name ?? "",
    })
    passwordForm.reset({
      password: "",
      confirmPassword: "",
    })
  }, [nameForm, open, passwordForm, user?.name])

  const saveNameMutation = useMutation({
    mutationFn: async (values: ProfileNameValues) => {
      if (!accessToken) {
        throw new Error("Sem sessao ativa.")
      }

      return updateProfile(accessToken, {
        name: values.name.trim(),
      })
    },
    onSuccess: (response) => {
      setUser(response.user)

      nameForm.reset({ name: response.user.name })
      toast.success("Nome atualizado com sucesso.")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel atualizar o nome.")
    },
  })

  const savePasswordMutation = useMutation({
    mutationFn: async (values: ProfilePasswordValues) => {
      if (!accessToken) {
        throw new Error("Sem sessao ativa.")
      }

      return updateProfile(accessToken, {
        password: values.password.trim(),
      })
    },
    onSuccess: (response) => {
      setUser(response.user)

      passwordForm.reset({
        password: "",
        confirmPassword: "",
      })
      toast.success("Password atualizada com sucesso.")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel atualizar a password.")
    },
  })

  const normalizedCurrentName = currentName?.trim() ?? ""
  const normalizedUserName = user?.name?.trim() ?? ""
  const isNameUnchanged = normalizedCurrentName === normalizedUserName

  function onSubmitName(values: ProfileNameValues) {
    saveNameMutation.mutate(values)
  }

  function onSubmitPassword(values: ProfilePasswordValues) {
    savePasswordMutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Perfil</DialogTitle>
          <DialogDescription>
            Atualiza o nome e a password em blocos separados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <form className="space-y-4" onSubmit={nameForm.handleSubmit(onSubmitName)}>
            <FieldGroup className="gap-4">
              <Controller
                control={nameForm.control}
                name="name"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="profile-name">Nome</FieldLabel>
                    <Input {...field} id="profile-name" aria-invalid={fieldState.invalid} />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              {saveNameMutation.isError ? (
                <FieldError>{saveNameMutation.error.message}</FieldError>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="submit"
                  className="bg-[#215442] text-white hover:bg-[#183b2f]"
                  disabled={saveNameMutation.isPending || isNameUnchanged}
                >
                  {saveNameMutation.isPending ? "A guardar..." : "Guardar nome"}
                </Button>
              </div>
            </FieldGroup>
          </form>

          <form
            className="space-y-4 border-t border-[#dfd7c0] pt-6"
            onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
          >
            <FieldGroup className="gap-4">
              <div className="grid gap-5 lg:grid-cols-2">
                <Controller
                  control={passwordForm.control}
                  name="password"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="profile-password">Nova password</FieldLabel>
                      <Input
                        {...field}
                        id="profile-password"
                        type="password"
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="profile-confirm-password">
                        Repetir password
                      </FieldLabel>
                      <Input
                        {...field}
                        id="profile-confirm-password"
                        type="password"
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </div>

              {savePasswordMutation.isError ? (
                <FieldError>{savePasswordMutation.error.message}</FieldError>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="submit"
                  className="bg-[#215442] text-white hover:bg-[#183b2f]"
                  disabled={savePasswordMutation.isPending}
                >
                  {savePasswordMutation.isPending
                    ? "A guardar..."
                    : "Guardar password"}
                </Button>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
              </div>
            </FieldGroup>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
