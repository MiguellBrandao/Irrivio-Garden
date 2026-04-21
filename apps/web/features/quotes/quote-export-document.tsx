import type { Quote } from "@/features/quotes/types"
import {
  formatQuoteCurrency,
  formatQuoteDate,
  getQuoteValidUntilFallback,
} from "@/features/quotes/utils"
import type { AuthCompany } from "@/lib/auth/types"

type QuoteExportDocumentProps = {
  quote: Quote
  company: AuthCompany
}

export function QuoteExportDocument({
  quote,
  company,
}: QuoteExportDocumentProps) {
  const validUntil = getQuoteValidUntilFallback(quote)

  return (
    <div
      className="flex min-h-[1123px] w-[794px] flex-col bg-white px-14 py-12 text-[#1f2f27]"
      style={{ boxSizing: "border-box" }}
    >
      <div className="flex items-start justify-between gap-10">
        <div className="flex min-h-28 items-start">
          {company.logo_path ? (
            <img
              src={company.logo_path}
              alt={company.name}
              className="max-h-28 w-auto max-w-52 object-contain"
            />
          ) : null}
        </div>

        <div className="max-w-[320px] space-y-2 text-right">
          <h1 className="text-4xl font-semibold tracking-tight text-[#1f2f27]">
            Orçamento
          </h1>
          <p className="text-sm uppercase tracking-[0.22em] text-[#7d8769]">
            Documento comercial
          </p>
          <p className="text-base text-[#697462]">
            Criado em {formatQuoteDate(quote.created_at)}
          </p>
          <p className="text-base text-[#697462]">
            Valido ate {formatQuoteDate(validUntil)}
          </p>
        </div>
      </div>

      <div className="mt-8 border-t border-[#e8dfcc] pt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7d8769]">
          Cliente
        </p>

        <div className="mt-5 flex items-start justify-between gap-8">
          <div className="max-w-[390px] space-y-3">
            <h2 className="text-3xl font-semibold text-[#1f2f27]">
              {quote.garden_client_name}
            </h2>
            <p className="text-base leading-7 text-[#445248]">{quote.garden_address}</p>
          </div>

          <div className="w-[240px] rounded-[24px] border border-[#e8dfcc] bg-[#f8f4ea] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7d8769]">
              Valor proposto
            </p>
            <p className="mt-3 text-4xl font-semibold text-[#215442]">
              {formatQuoteCurrency(Number(quote.price))}
            </p>
            <p className="mt-4 text-sm leading-6 text-[#445248]">
              Valor base sem IVA incluido. Sujeito a confirmacao final no momento da
              adjudicacao.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10 border-t border-[#efe8da] pt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7d8769]">
          Servicos incluidos
        </p>
        <h3 className="mt-4 text-2xl font-semibold text-[#1f2f27]">
          Proposta de intervencao
        </h3>

        <div className="mt-8 space-y-5">
          {quote.services.map((service, index) => (
            <div key={`${quote.id}-${index}`} className="flex gap-4">
              <div className="min-w-6 text-base font-semibold text-[#215442]">
                {index + 1}.
              </div>
              <p className="text-base leading-7 text-[#1f2f27]">{service}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto border-t border-[#e8dfcc] pt-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7d8769]">
          Contacto e faturacao
        </p>
        <div className="mt-4 space-y-1.5 text-[15px] leading-7 text-[#1f2f27]">
          <p>{company.address}</p>
          <p>NIF: {company.nif}</p>
          <p>Telm: {company.mobile_phone}</p>
          <p>{company.email}</p>
          <p>IBAN: {company.iban}</p>
        </div>
      </div>
    </div>
  )
}
