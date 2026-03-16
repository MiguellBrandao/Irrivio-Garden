"use client"

import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, Controller, useForm } from "react-hook-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Add01Icon,
  SearchIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createStockRule,
  getStockRuleById,
  listProducts,
  updateStockRule,
} from "@/features/stock/api"
import {
  stockRuleFormDefaults,
  stockRuleFormSchema,
  type StockRuleFormValues,
} from "@/features/stock/schema"
import {
  stockRuleOperatorLabels,
  toStockRuleFormValues,
  toStockRulePayload,
  unitLabels,
} from "@/features/stock/utils"
import { useAuthStore } from "@/lib/auth/store"

type StockRuleFormPageProps = {
  mode: "create" | "edit"
  stockRuleId?: string
}

export function StockRuleFormPage({
  mode,
  stockRuleId,
}: StockRuleFormPageProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const activeCompanyId = useAuthStore((state) => state.activeCompanyId)
  const activeCompany = useAuthStore((state) =>
    state.companies.find((company) => company.id === state.activeCompanyId) ?? null
  )
  const isAdmin = activeCompany?.role === "admin"
  const [productPickerOpen, setProductPickerOpen] = useState(false)

  const form = useForm<StockRuleFormValues>({
    resolver: zodResolver(stockRuleFormSchema),
    defaultValues: stockRuleFormDefaults,
  })

  const emailsFieldArray = useFieldArray({
    control: form.control,
    name: "emails",
  })
  const selectedProductId = form.watch("product_id")

  const stockRuleQuery = useQuery({
    queryKey: ["stock-rules", "detail", stockRuleId, activeCompanyId, accessToken],
    queryFn: () => getStockRuleById(accessToken ?? "", stockRuleId ?? ""),
    enabled: Boolean(accessToken && activeCompanyId && stockRuleId && mode === "edit" && isAdmin),
  })

  const productsQuery = useQuery({
    queryKey: ["products", activeCompanyId, accessToken],
    queryFn: () => listProducts(accessToken ?? ""),
    enabled: Boolean(accessToken && activeCompanyId && isAdmin),
  })

  useEffect(() => {
    if (mode === "edit" && stockRuleQuery.data) {
      form.reset(toStockRuleFormValues(stockRuleQuery.data))
    }
  }, [form, mode, stockRuleQuery.data])

  const selectedProduct = useMemo(
    () => (productsQuery.data ?? []).find((product) => product.id === selectedProductId) ?? null,
    [productsQuery.data, selectedProductId]
  )

  const saveMutation = useMutation({
    mutationFn: async (values: StockRuleFormValues) => {
      if (!accessToken) {
        throw new Error("Sem sessao ativa.")
      }
      if (!activeCompanyId) {
        throw new Error("Seleciona uma empresa.")
      }

      const payload = toStockRulePayload(values)

      if (mode === "edit" && stockRuleId) {
        return updateStockRule(accessToken, stockRuleId, payload)
      }

      return createStockRule(accessToken, payload)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["stock-rules"] })
      toast.success(
        mode === "edit"
          ? "Regra atualizada com sucesso."
          : "Regra criada com sucesso."
      )
      router.push("/stock?tab=rules")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel guardar a regra.")
    },
  })

  function onSubmit(values: StockRuleFormValues) {
    saveMutation.mutate(values)
  }

  if (!accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sessao em falta</CardTitle>
          <CardDescription>
            Faz login novamente antes de gerir regras de stock.
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
            Seleciona uma empresa antes de gerir regras de stock.
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
            Apenas administradores podem criar ou editar regras de stock.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="mx-auto w-full max-w-4xl border-[#dfd7c0] bg-white">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>
              {mode === "edit" ? "Editar regra de stock" : "Criar regra de stock"}
            </CardTitle>
          </div>
          <Button asChild variant="outline">
            <Link href="/stock?tab=rules">Voltar a listagem</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {mode === "edit" && stockRuleQuery.isLoading ? (
          <div className="rounded-2xl border border-dashed border-[#dfd7c0] bg-[#fbf8ef] p-5 text-sm text-muted-foreground">
            A carregar regra...
          </div>
        ) : (
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="gap-5">
              <Controller
                control={form.control}
                name="product_id"
                render={({ fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Produto</FieldLabel>
                    <Popover open={productPickerOpen} onOpenChange={setProductPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="justify-between"
                          aria-invalid={fieldState.invalid}
                        >
                          <span className="truncate">
                            {selectedProduct
                              ? `${selectedProduct.name} (${unitLabels[selectedProduct.unit]})`
                              : "Selecionar produto"}
                          </span>
                          <HugeiconsIcon icon={SearchIcon} strokeWidth={2} />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[360px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Pesquisar produto..." />
                          <CommandList>
                            <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                            {(productsQuery.data ?? []).map((product) => (
                              <CommandItem
                                key={product.id}
                                value={`${product.name} ${unitLabels[product.unit]}`}
                                data-checked={selectedProductId === product.id}
                                onSelect={() => {
                                  form.setValue("product_id", product.id, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  })
                                  setProductPickerOpen(false)
                                }}
                              >
                                <div className="flex min-w-0 flex-1 flex-col">
                                  <span className="truncate">{product.name}</span>
                                  <span className="truncate text-xs text-muted-foreground">
                                    {unitLabels[product.unit]}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <div className="grid gap-5 md:grid-cols-2">
                <Controller
                  control={form.control}
                  name="operator"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Condicao</FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger aria-invalid={fieldState.invalid}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(stockRuleOperatorLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="threshold_quantity"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="stock-rule-threshold">Quantidade limite</FieldLabel>
                      <Input
                        {...field}
                        id="stock-rule-threshold"
                        type="number"
                        min="0"
                        step="0.01"
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </div>

              <Field>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <FieldLabel>Emails</FieldLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => emailsFieldArray.append({ value: "" })}
                  >
                    <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                    Adicionar email
                  </Button>
                </div>
                <div className="mt-3 space-y-3">
                  {emailsFieldArray.fields.map((emailField, index) => (
                    <div
                      key={emailField.id}
                      className="flex flex-col gap-3 rounded-2xl border border-[#dfd7c0] bg-[#fbf8ef] p-4 sm:flex-row sm:items-start"
                    >
                      <div className="flex-1">
                        <Controller
                          control={form.control}
                          name={`emails.${index}.value`}
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel htmlFor={`stock-rule-email-${index}`}>
                                Email {index + 1}
                              </FieldLabel>
                              <Input
                                {...field}
                                id={`stock-rule-email-${index}`}
                                type="email"
                                aria-invalid={fieldState.invalid}
                                placeholder="alertas@empresa.pt"
                              />
                              <FieldError errors={[fieldState.error]} />
                            </Field>
                          )}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="sm:mt-7"
                        onClick={() => {
                          if (emailsFieldArray.fields.length === 1) {
                            form.setValue("emails.0.value", "", {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                            return
                          }

                          emailsFieldArray.remove(index)
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
                {typeof form.formState.errors.emails?.message === "string" ? (
                  <FieldError>{form.formState.errors.emails.message}</FieldError>
                ) : null}
              </Field>

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
                      : "Criar regra"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    form.reset(
                      mode === "edit" && stockRuleQuery.data
                        ? toStockRuleFormValues(stockRuleQuery.data)
                        : stockRuleFormDefaults
                    )
                  }
                >
                  Limpar formulario
                </Button>
              </div>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
