type PrivatePagePlaceholderProps = {
  title: string
  description: string
}

export function PrivatePagePlaceholder({
  title,
  description,
}: PrivatePagePlaceholderProps) {
  return (
    <section className="flex flex-1 flex-col gap-6 rounded-[1.75rem] border border-[#d8d1bb] bg-[#fbf8ef] p-6 shadow-[0_30px_80px_-48px_rgba(31,47,39,0.35)]">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#215442]">
          Área privada
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#1f2f27]">
          {title}
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-[#5b6b63]">
          {description}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.5rem] border border-dashed border-[#c8c0a8] bg-white/60 p-5 text-sm text-[#5b6b63]">
          Espaço reservado para métricas, filtros ou atalhos desta secção.
        </div>
        <div className="rounded-[1.5rem] border border-dashed border-[#c8c0a8] bg-white/60 p-5 text-sm text-[#5b6b63]">
          Aqui pode entrar uma tabela, calendário ou lista principal.
        </div>
        <div className="rounded-[1.5rem] border border-dashed border-[#c8c0a8] bg-white/60 p-5 text-sm text-[#5b6b63]">
          Área secundária preparada para detalhes, ações ou estado vazio.
        </div>
      </div>
      <div className="min-h-[320px] rounded-[1.5rem] border border-dashed border-[#c8c0a8] bg-white/70 p-6 text-sm text-[#5b6b63]">
        Conteúdo principal de {title.toLowerCase()} por implementar.
      </div>
    </section>
  )
}
