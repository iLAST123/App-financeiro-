# Meu Bolso 💰

App pessoal de controle financeiro — um **PWA** que você instala no celular e usa como app nativo.

## Privacidade em primeiro lugar

- **Todos os dados ficam apenas no seu aparelho** (localStorage do navegador).
- Nenhum dado é enviado a servidores. Sem conta, sem login, sem rastreamento.
- Backup manual: exporte/importe um arquivo JSON na aba **Ajustes**.

## Funcionalidades

- Lançamentos de receitas e despesas com categorias, data e descrição
- Resumo mensal: saldo, receitas, despesas
- **Orçamento mensal por categoria**: teto de gastos com barra de progresso e alerta ao chegar em 80% ou estourar
- **Radar do mês**: insights automáticos calculados no aparelho — projeção de fim de mês pelo ritmo de gastos, orçamentos em risco, categoria que subiu/caiu vs. mês anterior e maior gasto
- Despesas por categoria (barras) e gráfico dos últimos 6 meses
- Extrato agrupado por dia, com edição e exclusão
- Funciona offline depois de instalado (service worker)

## Publicação (GitHub Pages)

O deploy é automático: todo push na `main` roda `.github/workflows/deploy.yml` e publica em **https://ilast123.github.io/App-financeiro-/**.

Configuração única (só na primeira vez): no GitHub, **Settings → Pages → Build and deployment → Source: "GitHub Actions"**.

## Como instalar no celular

1. Abra **https://ilast123.github.io/App-financeiro-/** no celular.
2. **Android (Chrome):** menu ⋮ → "Adicionar à tela inicial".
3. **iPhone (Safari):** botão de compartilhar → "Adicionar à Tela de Início".

## Desenvolvimento

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # gera o site estático em ./out
```

Stack: Next.js 14 (App Router, `output: "export"`), Tailwind CSS, shadcn/ui, Recharts.
