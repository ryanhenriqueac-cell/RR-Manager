# ARQUITETURA.md: RR Manager 2.0

Proposta de 24/10/2026, **aguardando aprovação do dono**. Segue o padrão do RR InfoTech (`../RR InfoTech`), com uma adaptação: a oficina precisa trabalhar sem internet.

## 1. Princípios

1. **Mesmo projeto Firebase, mesmos dados.** O 2.0 usa o projeto `rr-reparacao-manager` e a mesma estrutura do Firestore (`workspaces/{uid}/clientes`, `orcamentos`, `orcamento_custos`, `financeiro` etc.). O sistema atual e o novo funcionam **ao mesmo tempo, sobre os mesmos dados**: não há migração nem "dia da virada" arriscado. O banco já está em `nam5` (EUA), perto do App Hosting (`us-east4`), igual ao InfoTech.
2. **Troca tela por tela.** Cada tela nova é comparada pelo dono com a antiga antes de substituí-la. O sistema atual continua no ar até a última tela ser aprovada.
3. **Funcionar sem internet.** Os dados do dia a dia continuam sendo gravados pelo navegador, com o cache offline do Firestore (o que a Fase 1 já trouxe), protegidos pelas regras de segurança.
4. **O que é dinheiro e permissão fica no servidor**, como no InfoTech: assinatura, pagamento, liberação/bloqueio de plano, admin e cadastro de novas oficinas.

## 2. Stack (igual ao RR InfoTech)

| Item | Escolha |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript + Tailwind 4, mesmas versões do InfoTech |
| Banco | Firestore `(default)` do projeto `rr-reparacao-manager` (nam5), SDK web com `persistentLocalCache` |
| Login | Firebase Auth (e-mail/senha), contas atuais continuam valendo |
| Servidor | Rotas do Next.js com Firebase Admin SDK, no App Hosting (`us-east4`), **só quando entrar pagamento** |
| Pagamento | Mercado Pago (conta já configurada no InfoTech), segredos no Secret Manager |
| Anti-robô | Cloudflare Turnstile no cadastro |
| Admin | Custom claim `admin: true` (substitui o e-mail fixo nas regras) |
| Testes | Emuladores do Firebase + testes das regras antes de qualquer publicação |
| Instalação | PWA (ícone na tela inicial do celular, abre rápido) |
| Documentação | `AGENTS.md`, `CLAUDE.md`, `PLANO.md`, `STATUS.md`, igual ao InfoTech |

## 3. Por que vai ficar rápido

| Hoje | No 2.0 |
|---|---|
| Cada página baixa o banco inteiro (8 coleções) | Cada tela lê só o que mostra: orçamentos do mês, cliente aberto, lançamentos do período (consultas com filtro e paginação) |
| ~830 KB de código em toda página | O Next.js divide e compacta: cada tela carrega só o seu código |
| Login, permissões e dados reconsultados a cada clique | O app não recarrega entre telas; login e cache ficam na memória |
| `localStorage` como banco (limite de 5 MB, apagado pelo iPhone) | Cache do Firestore no aparelho (IndexedDB), sem esse limite |
| CSS de 286 KB com 271 `!important` | Tailwind: estilos por componente, responsivo desde o início |

## 4. Hospedagem e custos

- **Enquanto não houver pagamento:** o app pode ser publicado no **Firebase Hosting do plano gratuito (Spark)**, como o InfoTech fez no começo, num endereço de teste (`rr-reparacao-manager.web.app`) com `noindex`. Sem cartão.
- **Quando entrar a assinatura:** é preciso o **plano Blaze** (webhook do Mercado Pago roda no servidor), com alertas de orçamento. O custo esperado no início é perto de zero, mas não existe teto automático. O dono ativa no console, com aviso prévio.
- **Virada final:** o domínio `rrreparacaomanager.com.br` passa do GitHub Pages para o Firebase. O GitHub Pages atual fica desligado só depois disso.

## 5. Venda automática (resumo, detalhar na fase própria)

1. Visitante entra na landing page, compara Essencial × Pro e clica em "Testar grátis".
2. Cadastro com Turnstile: o **servidor** cria a oficina (`workspaces/{uid}`) já ativa em período de teste. Acaba a liberação manual.
3. Ao fim do teste: assinatura pelo Mercado Pago. O webhook, validado no servidor, ativa, renova ou suspende o plano sozinho.
4. Inadimplência: carência e depois modo **somente leitura**. Os dados nunca são apagados.
5. Admin vê assinantes, status, receita mensal (MRR) e cancelamentos.

**A confirmar na documentação oficial antes de implementar:** a assinatura recorrente do Mercado Pago (preapproval) cobra no cartão. Pix costuma valer para pagamento avulso (ex.: plano anual). Verificar se o Pix Automático já está disponível na conta.

## 6. O que fica igual

- Estrutura dos dados e IDs dos documentos (compatibilidade com o sistema atual).
- Planos Essencial e Pro e os preços do `README.md`.
- Regras de permissão da equipe (as 25 permissões atuais).
- Contas de login dos usuários atuais.
- Termos, Privacidade e Contrato (revisados na fase de venda).

## 7. Decisões pendentes do dono

| # | Decisão | Recomendação |
|---|---|---|
| D1 | Onde fica o código novo | **Pasta e repositório novos** (`RR Manager App`, repositório `rr-manager-app`), como o InfoTech. O site atual continua intacto neste repositório |
| D2 | Teste grátis | **14 dias** com todos os recursos do Pro, depois a pessoa escolhe o plano |
| D3 | Ordem das telas | Login → Clientes/Veículos → Orçamentos (com impressão, link público e WhatsApp) → Painel → Financeiro → OS/Operação → Inspeções → DRE → Meu cadastro/Equipe → Admin |
| D4 | Identidade visual | Manter a do RR Manager atual (azul-escuro e dourado), modernizada no padrão de acabamento do InfoTech |
