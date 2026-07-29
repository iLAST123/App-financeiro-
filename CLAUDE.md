# Meu Bolso — Controle financeiro pessoal (PWA)

App **local-first** de finanças pessoais. Site estático (Next.js `output: "export"`) instalável como PWA no celular. **Sem backend próprio**: todos os dados vivem no localStorage do aparelho; backup por export/import de JSON. Única integração externa: import opcional de extrato via **API da Pluggy** (open finance), chamada direto do navegador com credenciais do próprio usuário — ver Convenções.


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
                               settings-view, pluggy-card, backup-reminder
components/pwa/sw-register.tsx  ← service worker + navigator.storage.persist()
components/ui/               ← primitives shadcn
lib/finance/{types,categories,store,summary,budgets,insights}.ts
lib/finance/{migrations,persistence}.ts  ← schema versionado (ver seção abaixo)
lib/finance/{csv,download,backup-meta}.ts ← export CSV, downloads, lembrete de backup
lib/finance/__tests__/       ← Vitest (motor financeiro puro; `npm test`)
lib/pluggy/{client,mapping,credentials}.ts  ← open finance (BYOK, só browser)
public/{manifest.webmanifest,sw.js,icons/}
.github/workflows/ci.yml     ← gate de PR: lint + test + build (SEM deploy)
```

## Convenções

- Valores monetários em **centavos** (inteiros); formatação pt-BR via `centsToBRL`
- Datas como string `YYYY-MM-DD`; mês como `YYYY-MM` (`MonthKey`)
- Dados persistidos na chave `meu-bolso:v1` do localStorage. **A chave não muda
  quando o schema evolui** (é namespace do app); a versão vive DENTRO do payload
  (`version`, hoje = 2: `{ version, transactions, budgets }`, budgets sempre
  presente). Estado do lembrete de backup em chave própria
  (`meu-bolso:backup-meta:v1`), fora do payload e fora do arquivo de backup.
- Insights do "Radar do mês" (`lib/finance/insights.ts`) são heurísticas puras
  sobre os dados locais — nunca chamam rede
- UI em pt-BR; mobile-first (max-w-md centralizado)
- Cor brand `#4C5AFF` (token `brand`); cores de gráfico validadas: azul `#2a78d6` (receitas), laranja `#eb6834` (despesas)
- Rede em runtime: a privacidade local-first continua sendo o requisito central,
  mas desde o PR #3 existe **uma** exceção deliberada: a API da Pluggy
  (`api.pluggy.ai`), no modelo **BYOK** — o usuário traz as credenciais da
  própria conta Pluggy, que ficam **só no aparelho** (chave
  `meu-bolso:pluggy:v1`, separada dos dados e **nunca incluída no backup**) e
  são enviadas **apenas** à Pluggy. Decisão tomada porque a API libera CORS
  (`access-control-allow-origin: *`, verificado em 2026-07-29), o que permite
  open finance com zero backend e zero custo. **Qualquer outra chamada externa
  segue proibida sem discutir antes.** Não criar env `NEXT_PUBLIC_*` com
  segredo; credencial jamais em código, log ou commit.
- Lançamentos importados do open finance carregam `pluggyId` (id da transação
  na Pluggy) — é a chave de deduplicação: import é sempre **merge**
  (`importMerge` no store), nunca replace; reimportar não duplica extrato.
  A apiKey de sessão da Pluggy (validade ~2h) vive só em memória.

## Migração de schema (regra 2: NUNCA perder dados)

O schema local é versionado e migrado por `lib/finance/migrations.ts`
(`CURRENT_SCHEMA_VERSION` + mapa `MIGRATIONS`). A migração roda na leitura
(`loadFromStorage`, em `lib/finance/persistence.ts`): antes de persistir o
payload migrado, o original é salvo **uma única vez** em
`meu-bolso:backup:pre-v{N}` (rollback manual). Invariantes do pipeline —
cobertos por teste, não regredir:

- Migração é **pura** (sem DOM), **idempotente** e **nunca descarta campo
  desconhecido** (sempre `...data` antes de sobrescrever) nem filtra
  lançamentos (validação de conteúdo é papel do `parseBackup`, na fronteira).
- Payload corrompido/irreconhecível **não é sobrescrito na leitura**; versão
  FUTURA (maior que a atual) é lida best-effort, sem migrar.
- **Nunca editar migração já publicada.**

**Como adicionar a v3 (próximo schema):**
1. Escrever `v2ToV3` em `migrations.ts` (padrão `...data` + só o que muda),
   registrar `2: v2ToV3` no mapa e subir `CURRENT_SCHEMA_VERSION` para 3.
2. Atualizar o tipo `StoredData` e os consumidores.
3. Testes em `__tests__/migrations.test.ts`: ida v2→v3 **e v1→v3 em cadeia**,
   idempotência, campos desconhecidos preservados, payload real de produção.
4. Conferir em `persistence.test.ts` que o snapshot `pre-v3` é gravado.

## Testes & CI

- `npm test` (Vitest, ambiente node) cobre o motor financeiro puro:
  migrações, persistência (com stub de localStorage), summary/parseBRLInput,
  parseBackup/merge Pluggy, CSV e lembrete de backup. Toda mudança no motor
  ou no schema exige teste junto.
- CI (`.github/workflows/ci.yml`): lint + test + build em todo PR e na main.
  É só gate — **não** recriar deploy por Actions (deploy é a Vercel).

## Build & deploy

`npm run build` gera `./out` (site estático). O service worker (`public/sw.js`) só registra em produção; ao mudar assets cacheados, incrementar `CACHE_NAME`.

Deploy canônico: **Vercel**, projeto conectado a este repo — cada push na `main` publica **https://app-financeiro-amber.vercel.app** (app servido na raiz, sem basePath). Não há outro deploy ativo; o workflow do GitHub Pages foi removido (o Pages nunca foi habilitado — se um dia voltar, recuperar `.github/workflows/deploy.yml` do histórico do git).

Suporte a subpath (opcional, hoje não usado): a env `NEXT_PUBLIC_BASE_PATH` alimenta basePath/assetPrefix no `next.config.mjs` e também `app/layout.tsx` e `components/pwa/sw-register.tsx` (metadata e registro do SW não recebem basePath automaticamente). Na Vercel ela fica **sem valor**. `manifest.webmanifest` usa URLs relativas e o `sw.js` deriva a raiz do escopo do registro — manter assim ao mexer no PWA.
