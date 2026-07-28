# Meu Bolso 💰

App pessoal de controle financeiro — um **PWA** que você instala no celular e usa como app nativo.

## Privacidade em primeiro lugar

- **Todos os dados ficam apenas no seu aparelho** (localStorage do navegador).
- Nenhum dado é enviado a servidores. Sem conta, sem login, sem rastreamento.
- Backup manual: exporte/importe um arquivo JSON na aba **Ajustes**.

## Funcionalidades

- Lançamentos de receitas e despesas com categorias, data e descrição
- Resumo mensal: saldo, receitas, despesas
- Despesas por categoria (barras) e gráfico dos últimos 6 meses
- Extrato agrupado por dia, com edição e exclusão
- Funciona offline depois de instalado (service worker)

## Como instalar no celular

1. Publique o app (Vercel, Netlify, GitHub Pages — é um site estático) ou rode localmente.
2. Abra a URL no celular.
3. **Android (Chrome):** menu ⋮ → "Adicionar à tela inicial".
4. **iPhone (Safari):** botão de compartilhar → "Adicionar à Tela de Início".

## Desenvolvimento

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # gera o site estático em ./out
```

Stack: Next.js 14 (App Router, `output: "export"`), Tailwind CSS, shadcn/ui, Recharts.
