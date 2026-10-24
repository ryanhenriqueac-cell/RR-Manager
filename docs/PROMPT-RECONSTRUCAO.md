# Missão: reconstruir o RR Manager para ficar pronto para venda

Você vai trabalhar comigo no **RR Manager**, um sistema de gestão para oficinas mecânicas (clientes, veículos, orçamentos, inspeções, ordens de serviço, financeiro, DRE, equipe e catálogo de mão de obra). Hoje ele é usado só por mim, porque **não confio nele o suficiente para vender**. Quero transformá-lo num produto profissional, estável e vendável, com venda automática pela internet.

Fale comigo sempre em português simples. Não sou programador profissional: explique o que vai fazer e por quê antes de mudanças grandes.

## O que está errado hoje (minha experiência de uso)

1. **Lento**: as páginas demoram muito para carregar, e cada troca de página parece começar do zero.
2. **Perde conexão**: às vezes cai a sincronização com o Firebase.
3. **Não salva**: às vezes eu faço uma ação (salvar orçamento, lançamento etc.) e ela some. Esse é o pior problema; não posso vender um sistema que perde dados de cliente.
4. **Não funciona em todos os dispositivos**: tem problema em alguns celulares e navegadores.
5. **Construído "empurrando com a barriga"**: foi crescendo sem planejamento, então o código está grande e confuso.

## O que eu já sei sobre o projeto

- HTML, CSS e JavaScript puros, várias páginas (`index.html`, `dashboard.html`, `orcamentos.html`, `financeiro.html`, `admin.html` etc.).
- Arquivos gigantes: `script.js` (~260 KB), `firebase-sync.js` (~280 KB) e `style.css` (~285 KB), carregados sem minificar em toda página.
- Firebase 11.10 (Auth + Firestore) via CDN, com regras em `firestore.rules`.
- Hospedado no GitHub Pages com domínio `rrreparacaomanager.com.br` (arquivo `CNAME`).
- Planos já definidos no `README.md` (Essencial e Pro, com preços de lançamento e preços cheios).
- `senhas manager.txt`, `marketing/`, `exports/` e `*.log` estão no `.gitignore`. **Nunca leia, envie nem commite o arquivo de senhas.**

Confirme tudo isso lendo o código. Não confie só na minha descrição.

## Regras de trabalho (obrigatórias)

1. **Nada de reescrever tudo de uma vez.** A reconstrução é em fases pequenas, e o sistema continua funcionando a cada passo, porque eu uso no dia a dia.
2. **Meus dados reais são sagrados.** Antes de qualquer mudança na estrutura do Firestore ou nas regras, faça um backup/exportação e um plano de migração que eu aprovo antes de rodar.
3. **Teste antes de dizer que está pronto.** Rode localmente (`serve-local.ps1` ou equivalente), teste o fluxo afetado e me diga o que testou. Se algo falhar, me mostre o erro; não esconda.
4. **Commits pequenos, em português**, um por melhoria, explicando o que mudou. Não faça push nem publique sem eu pedir.
5. **Pergunte antes** de qualquer ação difícil de desfazer: apagar dados, mudar regras de segurança em produção, trocar o plano do Firebase, configurar pagamentos, publicar.
6. **Mantenha um arquivo `PLANO.md`** na raiz com as fases em checklist (`- [ ]` / `- [x]`), atualizado a cada etapa concluída, para eu saber onde estamos em qualquer conversa nova.

## Fases do plano

### Fase 0: Diagnóstico (sem mudar código)

Leia o projeto inteiro e escreva no `PLANO.md`:
- Mapa do sistema: páginas, o que cada uma faz e quais arquivos carrega.
- **Causas reais** de cada problema que listei (lentidão, quedas, ações que não salvam, incompatibilidade), apontando arquivo e linha. Exemplos do que investigar: quantas leituras do Firestore acontecem ao abrir cada página; listeners (`onSnapshot`) duplicados ou nunca encerrados; gravações sem `await` ou sem tratamento de erro; dados salvos só no `localStorage` sem confirmação do servidor; conflitos quando dois aparelhos editam ao mesmo tempo; erros de JavaScript em Safari/iOS e Android antigos; CSS que quebra no celular.
- Riscos de segurança: as regras do Firestore isolam de verdade os dados de cada oficina? Um cliente consegue ler dados de outro? Tem chave ou segredo exposto?
- Uma lista priorizada de correções, da que mais dói para a que menos dói.

Me mostre o diagnóstico e **espere minha aprovação** antes da Fase 1.

### Fase 1: Confiabilidade dos dados (prioridade máxima)

Objetivo: **nenhuma ação pode se perder, nunca.**
- Toda gravação com `await`, tratamento de erro e feedback visual claro ("Salvando…", "Salvo ✓", "Falhou, tentar de novo").
- Cache offline do Firestore (`persistentLocalCache`) para o sistema funcionar sem internet e sincronizar quando voltar.
- Indicador de status de conexão sempre visível (online / offline / sincronizando).
- Reconexão automática e tratamento de sessão expirada sem perder o que foi digitado.
- Proteção contra conflitos de edição em dois aparelhos (transações ou controle de versão onde for crítico: orçamentos e financeiro).
- Aviso ao fechar a página com alterações pendentes.

### Fase 2: Desempenho

Objetivo: cada página abrir em menos de 2 segundos num celular comum em 4G.
- Dividir os arquivos gigantes em módulos por funcionalidade e carregar só o necessário em cada página.
- Recomende se vale adotar uma ferramenta de build leve (ex.: Vite, mantendo as páginas HTML atuais) para minificar, dividir e versionar os arquivos. Explique prós e contras e decida comigo.
- Paginação e limites nas consultas do Firestore (não baixar o banco inteiro), com índices onde precisar.
- Imagens otimizadas, fontes e CSS críticos primeiro, cache correto.
- Meça antes e depois (Lighthouse ou similar) e anote os números no `PLANO.md`.

### Fase 3: Funcionar em todo dispositivo

- Layout responsivo revisado página por página (celular pequeno, tablet, notebook).
- Compatibilidade com Safari/iPhone, Chrome/Android, Samsung Internet, Edge e Firefox.
- Transformar em **PWA** instalável (manifest + service worker), com ícone na tela inicial e abertura rápida.
- Impressão de orçamentos, DRE e relatórios funcionando no celular e no computador.

### Fase 4: Segurança e base para vários clientes (multi-oficina)

- Cada oficina (assinante) com dados 100% isolados, garantidos nas regras do Firestore e testados com o Firebase Emulator.
- Permissões de colaboradores (plano Pro, até 4) validadas no servidor, não só escondidas na tela.
- Bloqueio por plano: recursos do Pro inacessíveis para o Essencial, validado nas regras.
- Backup automático periódico dos dados.
- Revisar a conformidade com a LGPD (`privacidade.html`, `termos.html`, `docs/compliance`).

### Fase 5: Venda automática

Objetivo: alguém acha o site, assina, paga e começa a usar **sem eu precisar fazer nada manualmente**.
- **Landing page de vendas** profissional (pode ser a `index.html` atual reformulada ou uma nova): problema da oficina, solução, prints reais do sistema, comparativo Essencial × Pro com os preços do `README.md`, perguntas frequentes, depoimentos (só reais; deixe espaço reservado se eu ainda não tiver), botão de WhatsApp e chamada clara para assinar ou testar grátis. Rápida, bonita no celular e com SEO básico (títulos, descrição, Open Graph, sitemap).
- **Teste grátis** (sugira 7 ou 14 dias) com cadastro self-service e onboarding guiado no primeiro acesso.
- **Pagamento recorrente** com Pix, cartão e boleto. Compare para mim Asaas, Mercado Pago e Stripe (taxas, assinatura recorrente, Pix automático, facilidade) e recomende um.
- **Webhook do pagamento** (Firebase Cloud Functions, que exige o plano Blaze; me avise dos custos antes) que ativa, renova, suspende e reativa o plano automaticamente.
- E-mails automáticos: boas-vindas, fim do teste chegando, pagamento confirmado, pagamento atrasado.
- Inadimplência: carência, depois modo somente leitura (nunca apagar os dados do cliente).
- Painel admin (`admin.html`) mostrando assinantes, status de pagamento, receita mensal (MRR) e cancelamentos.

### Fase 6: Lançamento e acompanhamento

- Monitoramento de erros em produção (ex.: Sentry, plano grátis) para eu saber dos problemas antes do cliente reclamar.
- Analytics da landing page (visitas → testes → assinaturas).
- Checklist final de lançamento: tudo testado em aparelhos reais, backup em dia, termos publicados, suporte por WhatsApp definido.
- Depois, sugestões de crescimento: indicação, tutorial em vídeo, materiais de divulgação.

## Como começar agora

1. Leia este documento e o projeto.
2. Crie o `PLANO.md` com as fases acima em checklist.
3. Execute **somente a Fase 0** e me apresente o diagnóstico.
4. Aguarde meu "pode seguir" para cada fase.

Seja direto e honesto: se algo do meu plano for má ideia ou se houver um caminho melhor, me diga.
