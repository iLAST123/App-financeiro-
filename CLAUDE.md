# Meu Bolso — Controle financeiro pessoal (PWA)

App **local-first** de finanças pessoais. Site estático (Next.js `output: "export"`) instalável como PWA no celular. **Sem backend**: todos os dados vivem no localStorage do aparelho; backup por export/import de JSON.


## Stack

- Next.js 14 (App Router, export estático — sem API routes, sem middleware)
- Tailwind CSS + shadcn/ui (`components/ui/`)
- Recharts (gráfico de 6 meses)
- lucide-react (ícones), sonner (toasts)

## Estrutura

```
app/{layout,page}.tsx        ← app inteiro é uma página client com abas
components/finance/          ← month-picker, summary-cards, insight-cards,
                               budgets-card, budget-editor, category-bars,
                               history-chart, transaction-list, transaction-form,
                               settings-view
components/pwa/sw-register.tsx
components/ui/               ← primitives shadcn
lib/finance/{types,categories,store,summary,budgets,insights}.ts
public/{manifest.webmanifest,sw.js,icons/}
```

## Convenções

- Valores monetários em **centavos** (inteiros); formatação pt-BR via `centsToBRL`
- Datas como string `YYYY-MM-DD`; mês como `YYYY-MM` (`MonthKey`)
- Dados persistidos na chave `meu-bolso:v1` do localStorage (schema versionado;
  campo opcional `budgets` = orçamento mensal por categoria, em centavos)
- Insights do "Radar do mês" (`lib/finance/insights.ts`) são heurísticas puras
  sobre os dados locais — nunca chamam rede
- UI em pt-BR; mobile-first (max-w-md centralizado)
- Cor brand `#4C5AFF` (token `brand`); cores de gráfico validadas: azul `#2a78d6` (receitas), laranja `#eb6834` (despesas)
- Nada de rede em runtime: não adicionar fetch para serviços externos sem discutir antes — a privacidade local-first é o requisito central do app

## Build & deploy

`npm run build` gera `./out` (site estático). O service worker (`public/sw.js`) só registra em produção; ao mudar assets cacheados, incrementar `CACHE_NAME`.

Deploy canônico: **Vercel**, projeto conectado a este repo — cada push na `main` publica **https://app-financeiro-amber.vercel.app** (app servido na raiz, sem basePath). Não há outro deploy ativo; o workflow do GitHub Pages foi removido (o Pages nunca foi habilitado — se um dia voltar, recuperar `.github/workflows/deploy.yml` do histórico do git).

Suporte a subpath (opcional, hoje não usado): a env `NEXT_PUBLIC_BASE_PATH` alimenta basePath/assetPrefix no `next.config.mjs` e também `app/layout.tsx` e `components/pwa/sw-register.tsx` (metadata e registro do SW não recebem basePath automaticamente). Na Vercel ela fica **sem valor**. `manifest.webmanifest` usa URLs relativas e o `sw.js` deriva a raiz do escopo do registro — manter assim ao mexer no PWA.
