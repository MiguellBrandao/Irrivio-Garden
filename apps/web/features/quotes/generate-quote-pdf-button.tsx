"use client"

import { useState } from "react"
import { FileDownloadIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { downloadQuotePdf } from "@/features/quotes/pdf"
import type { Quote } from "@/features/quotes/types"
import { useAuthStore } from "@/lib/auth/store"

type GenerateQuotePdfButtonProps = {
  quote: Quote
  label?: string
} & React.ComponentProps<typeof Button>

export function GenerateQuotePdfButton({
  quote,
  label = "Gerar",
  children,
  ...props
}: GenerateQuotePdfButtonProps) {
  const activeCompany = useAuthStore((state) =>
    state.companies.find((company) => company.id === state.activeCompanyId) ?? null
  )
  const [isGenerating, setIsGenerating] = useState(false)

  async function handleGenerate() {
    if (!activeCompany) {
      toast.error("Seleciona uma empresa antes de gerar o orcamento.")
      return
    }

    try {
      setIsGenerating(true)
      await downloadQuotePdf({ quote, company: activeCompany })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel gerar o PDF do orcamento."
      toast.error(message)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      type="button"
      onClick={handleGenerate}
      disabled={isGenerating || props.disabled}
      {...props}
    >
      <HugeiconsIcon icon={FileDownloadIcon} strokeWidth={2} />
      {children ?? (isGenerating ? "A gerar..." : label)}
    </Button>
  )
}
