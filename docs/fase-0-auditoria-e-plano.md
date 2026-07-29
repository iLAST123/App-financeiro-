# Fase 0 — Auditoria e plano do Meu Bolso

> Documento de análise (2026-07-29). **Nenhum código de feature foi escrito nesta rodada.**
> Arquivo criado sem commit — versionar só depois da sua aprovação.
> Base auditada: `origin/main` = `25cb989` (já inclui o merge do PR #3).

---

## 0. Correção de premissa antes de tudo

O roadmap que você recebeu foi escrito **sem olhar o código**. Ele assume um app mais cru
do que o real. Duas correções de fato:

1. **O PR #3 (Open Finance Pluggy BYOK) já está MERGED na `main`** (hoje, 2026-07-29).
   Importação de extrato bancário — o item mais difícil da "Fase 3" dele — **já é produção**
   na Vercel. Pendência real: validar com credencial de banco de verdade (sandbox já passou).
   Obs.: a `main` local está desatualizada (`f346117`) e o checkout está na branch da
   feature — quando aprovar o plano, o primeiro passo operacional é `git checkout main && git pull`.
2. **Cerca de um terço do roadmap já existe.** Implementar as fases dele "do zero" seria
   retrabalho e quebraria coisa que funciona.

---

## 1. Auditoria do que existe hoje (fatos do código)

**Stack:** Next.js 14 App Router com `output: "export"` (site 100% estático, sem API routes),
Tailwind + shadcn/ui, Recharts, PWA com service worker próprio (`public/sw.js`). Deploy único
na Vercel (push na `main` → https://app-financeiro-amber.vercel.app). ~2.360 linhas de
TS/TSX de produto. **Zero testes automatizados, zero CI de gate em PR.**

**Armazenamento real:** `localStorage`, chave `meu-bolso:v1`, um único JSON:

```
{ version: 1, transactions: Transaction[], budgets?: Record<categoryId, centavos> }
Transaction = { id, type: income|expense, amountCents (>0), categoryId, date "YYYY-MM-DD", note?, pluggyId? }
```

- Valores em **centavos inteiros** (correto para dinheiro), datas string ISO, pt-BR na formatação.
- Credencial Pluggy em chave separada `meu-bolso:pluggy:v1`, **fora do backup** (correto).
- O campo `version: 1` é **escrito mas nunca lido**: `loadFromStorage()` não tem pipeline de
  migração. O "schema versionado" do roadmap existe de nome, não de mecanismo.
- Categorias são **fixas no código** (`lib/finance/categories.ts`, 17 categorias, ícone =
  componente Lucide importado — detalhe que obriga refactor para categorias custom).
- O formulário de lançamento hoje: abrir (toque 1) → digitar valor → escolher categoria
  (toque 2) → salvar (toque 3). Tipo já vem "despesa" e data já vem "hoje" por padrão.

### Matriz: roadmap dele × realidade

| Item do roadmap | Situação |
|---|---|
| Backup/restauração JSON | **JÁ TEM** (Ajustes: export/import, `parseBackup` com validação e zona de perigo) |
| Orçamento por categoria + alerta 80%/100% | **JÁ TEM** (PR #1: azul→âmbar 80%→vermelho estourado, editor em bottom-sheet) |
| Insights automáticos no Resumo | **JÁ TEM** ("Radar do mês": projeção de fim de mês, orçamento estourado, categoria que subiu/caiu, maior gasto) |
| Gráfico de evolução (6 meses) | **JÁ TEM** (Recharts) |
| Comparativo mês atual vs. anterior | **PARCIAL** (o Radar compara por categoria; não há relatório dedicado) |
| Importação de extrato bancário | **JÁ TEM — MERGED HOJE** (Pluggy BYOK, client-side, dedup por `pluggyId`, merge nunca replace; falta só validar com conta real) |
| PWA offline, mobile-first, formatos BR | **JÁ TEM** (é a fundação do app) |
| Estado vazio | **JÁ TEM** (`EmptyState`/`ErrorState` como componentes de UI) |
| Modo escuro | **MEIO PRONTO** (Tailwind `darkMode: "class"` configurado; falta toggle + revisão do tema) |
| Aviso periódico de backup · export CSV | **NÃO TEM** |
| Múltiplas contas/carteiras + transferências | **NÃO TEM** |
| Categorias personalizáveis | **NÃO TEM** (e o design atual dificulta — ícone é componente) |
| Recorrentes e parceladas | **NÃO TEM** |
| Busca/filtros no Extrato + total do filtrado | **NÃO TEM** |
| Cartão de crédito com fatura/fechamento | **NÃO TEM** |
| Contas a pagar/receber + notificação | **NÃO TEM** |
| Metas de economia | **NÃO TEM** |
| Linguagem natural, CSV/OFX manual, PIN/biometria, atalhos PWA | **NÃO TEM** (ver §4 — parte disso eu recomendo não fazer) |
| Migração versionada de schema | **NÃO TEM** (só o campo `version`, sem mecanismo) |

---

## 2. Débitos técnicos e riscos reais (priorizados)

**P0 — Perda de dados (risco real, mas com nuance).** Tudo vive numa chave de localStorage.
Fatos: (a) não há `navigator.storage.persist()` — navegadores podem despejar storage sob
pressão de espaço; (b) no iOS, o Safari em aba comum apaga storage de site após 7 dias sem
uso (a PWA **instalada** na tela de início é isenta dessa regra — mais um motivo para
induzir a instalação); (c) "limpar dados de navegação" apaga tudo sem aviso; (d) não existe
lembrete de backup — o backup manual existe, mas ninguém lembra de fazer backup manual.
O limite de ~5 MB **não** é problema real (≈ 20–30 mil lançamentos; décadas de uso pessoal).
Mitigação barata: `persist()` + lembrete periódico + instalação incentivada. IndexedDB fica
para depois, se um dia precisar (não é urgente).

**P0 — Sem pipeline de migração.** Qualquer bloco novo do plano muda o schema. Mexer no
schema sem `migrate(v1→v2→…)` testado é onde apps locais **corrompem dados de usuário**.
Isso tem que existir **antes** da primeira feature que altere o formato. É a regra 2 dele,
e hoje ela não é cumprida pelo código.

**P1 — Zero testes e zero gate de CI.** O motor financeiro (`summary`, `budgets`,
`mergeByPluggyId`, `parseBackup`, `parseBRLInput`) é função pura — testável em horas com
Vitest. Hoje um PR pode quebrar dinheiro sem ninguém perceber até o celular dele. CI mínimo:
lint + build + testes em todo PR.

**P2 — Multi-aba.** O store relê o storage antes de cada escrita (bom), mas não escuta o
evento `storage`: duas abas abertas = última escrita vence sem aviso. Em PWA mobile de
janela única, risco **baixo** — registrar, não correr atrás agora.

**P2 — Credencial Pluggy em claro no localStorage.** Decisão consciente do modelo BYOK, já
documentada no CLAUDE.md, risco aceito (a credencial é do próprio usuário e só vai para a
Pluggy). Não é débito novo; fica o registro.

---

## 3. Plano redesenhado — blocos por valor/esforço/risco (não as fases dele)

Princípio: **agrupar pelo que compartilha schema** e atacar risco de dados antes de feature.
Cada bloco = 1+ PR revisado, com migração + testes quando toca schema.

**Bloco 0 — Fundação de dados** *(primeiro, inegociável — ~1 PR, dias)*
Pipeline de migração versionada (`migrate(v1→v2)` com testes de ida) · Vitest + CI de PR
(lint/build/test) cobrindo o motor financeiro atual · `navigator.storage.persist()` +
lembrete periódico de backup · export CSV do extrato (função pura, barata, sai de brinde).
É a Fase 1 "invisível": ataca os dois P0 e destrava todo o resto.
Sei que você já rejeitou "infra" antes (28/07) em favor de features visíveis — mas quem
mudou o jogo foi o **seu** roadmap: a regra 2 (nunca perder dados, migração versionada) é
impossível de cumprir sem isso. Sem o Bloco 0, cada bloco seguinte aposta os dados dos
usuários na sorte. É 1 PR, não uma temporada de infra.

**Bloco 1 — Extrato poderoso** *(valor imediato, schema intocado — ~1 PR)*
Busca por texto + filtros (tipo, categoria, período) + **total do filtrado**. Zero mudança
de schema → risco mínimo, ganho de uso diário. Primeiro entregável visível.

**Bloco 2 — Categorias personalizáveis** *(schema v2 — 1–2 PRs)*
Criar/editar/arquivar, cor + ícone de um catálogo curado (mapa `nome→ícone`, resolvendo o
débito do ícone-componente). Migração: categorias fixas viram registros. Toca orçamentos,
insights e o mapping da Pluggy — por isso é um bloco só, não três retoques.

**Bloco 3 — Contas e transferências** *(schema v3, o coração — 2–3 PRs, ~1 semana)*
`accountId` na transação, saldo por conta, transferência como par atômico, e a conta que
recebe o import da Pluggy. **Cartão entra aqui só como "conta do tipo cartão"** — fatura é
outro bloco. Guardião da regra 3 dele: ver §5 (conta padrão, zero campo novo obrigatório).

**Bloco 4 — Compromissos no tempo** *(schema v4 — 2–3 PRs, ~1 semana)*
Recorrentes, parceladas e contas a pagar/receber são **a mesma máquina**: um "lançamento
programado" (template) + materialização no mês. Notificação: honestidade — Web Push em PWA
iOS é frágil e exige instalação; o confiável é aviso in-app ao abrir + badge. Prometer
"notificação local" robusta em iOS seria vender o que a plataforma não entrega.

**Bloco 5 — Cartão de crédito completo (fatura)** *(schema v5 — 2–3 PRs, só se validado)*
Fechamento/vencimento, fatura agregada, pagamento debitando conta. É a regra de negócio
mais complexa do roadmap (competência vs. caixa). **Antes de construir, pergunta de
produto:** com a Pluggy trazendo as transações do cartão automaticamente, quanto da fatura
manual você ainda precisa? Talvez a resposta seja "um resumo por fatura sobre dados
importados", que custa 1/3 disso.

**Bloco 6 — Polimentos avulsos** *(itens independentes, meio PR cada, intercalar quando quiser)*
Modo escuro (metade já pronta) · atalhos PWA no manifest ("+ Despesa" abrindo direto o
formulário — ajuda na regra dos 2 toques) · metas de economia · evolução de saldo/patrimônio ·
"ocultar valores" (privacidade de tela, ver §4).

**Ordem recomendada:** 0 → 1 → 2 → 3 → 4 → (decidir 5) → 6 intercalado.
**Dimensionamento honesto:** ~10–14 PRs, algo como **4 a 6 semanas** no ritmo atual
(1 PR revisado por dia útil de trabalho de agente + sua validação no celular). O roadmap
original somado é um produto inteiro — Mobills e Organizze levaram anos nisso. Não é um
ciclo; é uma temporada. Aprove por bloco, não o pacote fechado.

---

## 4. O que eu recomendo NÃO fazer (e por quê)

- **PIN/biometria via WebAuthn — não fazer.** É teatro de segurança: os dados continuam em
  claro no localStorage; WebAuthn autentica, não cifra, e qualquer um com o aparelho
  desbloqueado inspeciona o storage. O lock real já existe — é o bloqueio do celular.
  Cifrar de verdade (WebCrypto + chave derivada de PIN) custa caro, piora a UX e cria o
  desastre "esqueci o PIN = perdi tudo", violando a regra 2. Alternativa barata que resolve
  o caso real (alguém olhando por cima do ombro): botão **"ocultar valores"**.
- **Gráfico de pizza — não fazer.** `category-bars` já mostra proporção por categoria, e
  barras leem melhor que pizza em tela pequena. Não vale bundle nem manutenção.
- **Parser de linguagem natural — adiar (ROI baixo).** O fluxo atual já é ~3 toques com
  tipo e data pré-preenchidos. Um parser local + dicionário que aprende é manutenção eterna
  para economizar um toque. Antes disso: categoria pré-selecionada pela última usada +
  atalho PWA direto no formulário — 10% do esforço, 80% do ganho. Reavaliar depois do Bloco 4.
- **Import CSV/OFX manual — adiar.** O caso de uso principal (extrato do banco) o Pluggy
  já cobre e está em produção. OFX só se a validação com conta real falhar ou seu banco
  ficar fora do BYOK.
- **Fluxo de caixa projetado completo — não agora.** Depende de recorrentes e contas a
  pagar (Bloco 4) para ter dado de verdade; antes disso seria chute bonito. O Radar já
  projeta o fim do mês.

---

## 5. A regra dos 2 toques vs. múltiplas contas (o conflito anunciado)

A Fase 1 do roadmap dele colide com a regra 3 dele: cada conceito novo (conta, cartão)
tende a virar campo obrigatório no formulário. Regra de aceite que proponho para **todos**
os blocos: **nenhum campo novo obrigatório no formulário rápido.**

- **Conta padrão**: todo lançamento cai na conta padrão a menos que o usuário toque em
  "Mais opções" (colapsado). Quem tem 1 conta nunca vê o conceito.
- **Categoria pré-selecionada** (última usada por tipo): o caminho feliz vira
  abrir → digitar valor → salvar = **2 toques + valor**, cumprindo a régua dele (hoje são 3).
- **Atalho PWA** "+ Despesa" abre direto o formulário: 1 toque a menos na largada.
- Recorrência, parcelas, conta e nota vivem atrás de "Mais opções" — poder sem poluição.

---

## 6. Próximo passo (aguardando seu "vai")

1. **Você (5 min):** validar o Pluggy com credencial real — já está em produção, é a
   pendência aberta do PR #3.
2. **Bloco 0** (fundação de dados) — 1 PR, invisível mas inegociável.
3. **Bloco 1** (busca/filtros/total no Extrato) — o primeiro ganho visível no dia a dia.

Nada disso começa sem sua aprovação explícita, bloco a bloco.
