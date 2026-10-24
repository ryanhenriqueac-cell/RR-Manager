# PLANO de reconstrução do RR Manager

Objetivo: deixar o RR Manager estável, rápido e pronto para venda automática.
Briefing completo: [docs/PROMPT-RECONSTRUCAO.md](docs/PROMPT-RECONSTRUCAO.md).

## Andamento

- [x] **Fase 0: Diagnóstico** (24/10/2026)
- [x] **Fase 1: Confiabilidade dos dados** (publicada em 24/10/2026)
A partir da Fase 2, o plano segue o caminho A decidido pelo dono em 24/10/2026: reconstruir em Next.js no padrão do RR Infotech, sobre os mesmos dados. As antigas fases de desempenho, dispositivos e segurança passam a ser resolvidas dentro do 2.0. Arquitetura: [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

- [ ] **Fase 2: Fundação do 2.0** (aguardando decisões D1 a D4 da arquitetura). Inclui: repositório, Next.js, identidade visual, login, menu, cache offline, PWA, emuladores com testes das regras e publicação de teste no plano gratuito.
- [ ] Fase 3: Telas do dia a dia, uma por vez, cada uma aprovada pelo dono comparando com a antiga.
- [ ] Fase 4: Landing page de vendas e cadastro self-service com teste grátis (Turnstile).
- [ ] Fase 5: Assinatura pelo Mercado Pago (plano Blaze), com liberação e suspensão automáticas e painel de assinantes.
- [ ] Fase 6: Virada do domínio, monitoramento, backups agendados e testes em aparelhos reais.

---

## Fase 0: Diagnóstico

### Como o sistema funciona hoje

- 20 páginas HTML independentes. Toda troca de página recarrega tudo do zero: os scripts, o login e todos os dados.
- Quase todas as páginas do sistema carregam os mesmos arquivos:
  `style.css` (286 KB, 271 `!important`), `script.js` (261 KB, 4.953 linhas) e `firebase-sync.js` (282 KB, 4.696 linhas).
  Ao todo são cerca de 830 KB de código sem compactar, mesmo quando a página usa uma fração disso.
  `admin.html` e `dre.html` também carregam a biblioteca de planilhas XLSX (cerca de 900 KB) logo de início, sem ela ser necessária para abrir a página.
- **O "banco de dados" das telas é o `localStorage`.** Cada coleção inteira (clientes, orçamentos, financeiro…) fica guardada como **um único texto JSON**:
  [script.js:338-344](script.js#L338-L344).
- O `firebase-sync.js` **substitui o `localStorage.setItem` do navegador** para detectar mudanças. A cada gravação, ele compara o texto antigo com o novo, item por item, e envia a diferença ao Firestore:
  [firebase-sync.js:4538-4567](firebase-sync.js#L4538-L4567).
- O Firestore roda **sem cache offline** (`getFirestore` simples, sem `persistentLocalCache`), então nada fica guardado no aparelho de forma confiável.

### Causas reais dos problemas

#### 1. "Às vezes não salva" (crítico)

| # | Causa | Onde |
|---|---|---|
| 1.1 | **Sem internet, salvar trava para sempre.** Sem cache offline, o `batch.commit()` só termina quando o servidor responde. Não existe tempo limite nem detecção de offline no código. O botão fica em "Salvando…", a pessoa recarrega a página e a alteração some. | [firebase-sync.js:1774](firebase-sync.js#L1774) |
| 1.2 | **Um contador extra derruba salvamentos que deram certo.** Depois de gravar, o sistema faz `getCountFromServer` só para atualizar uma estatística. Se essa consulta falha (oscilação de rede), o salvamento inteiro é tratado como erro. | [firebase-sync.js:1776-1782](firebase-sync.js#L1776-L1782) |
| 1.3 | **O "desfazer" apaga o que foi salvo.** Quando 1.2 acontece, a tela restaura a lista antiga (`writeData(previous)`). O interceptador entende isso como exclusão e **apaga do servidor** o orçamento ou cliente que tinha acabado de ser gravado. Para a pessoa aparece "não salvo", e ela tem que digitar tudo de novo. | [script.js:2765-2774](script.js#L2765-L2774), [script.js:1979-1988](script.js#L1979-L1988) e o mesmo padrão em financeiro, OS, inspeções e DRE |
| 1.4 | **A tela libera antes da sincronização ficar pronta.** A página abre com os dados do cache (`restoreCachedWorkspace`) antes de `cloudReady = true`. Se a pessoa salvar nesse intervalo, o salvamento é recusado ("sincronização ainda não está pronta"). Mudanças gravadas sem confirmação são **sobrescritas em silêncio** quando os dados da nuvem chegam. | [firebase-sync.js:717-741](firebase-sync.js#L717-L741), [firebase-sync.js:1817](firebase-sync.js#L1817), [firebase-sync.js:4542](firebase-sync.js#L4542) |
| 1.5 | **Edição em dois aparelhos:** prevalece a última gravação, com o documento inteiro. Uma edição no celular pode apagar uma edição feita no computador no mesmo orçamento. | [firebase-sync.js:1771](firebase-sync.js#L1771) |
| 1.6 | O `localStorage` tem limite de cerca de 5 MB por site. Com muitos orçamentos (cada um guarda até 12 versões anteriores, [script.js:2756-2759](script.js#L2756-L2759)), a gravação vai falhar sem aviso. No iPhone, o Safari ainda apaga o `localStorage` de sites sem uso por 7 dias. | |

#### 2. "Lento, carrega demais"

| # | Causa | Onde |
|---|---|---|
| 2.1 | **Toda página baixa o banco inteiro de novo.** São 8 escutas em tempo real (`onSnapshot`) em coleções inteiras, sem limite e sem cache. Abrir o painel e depois os orçamentos baixa tudo duas vezes. Fica mais lento a cada cliente novo. | [firebase-sync.js:4573-4600](firebase-sync.js#L4573-L4600) |
| 2.2 | **A cada mudança em orçamentos, todos os custos são baixados de novo** (`getDocs` em `orcamento_custos` dentro da escuta). | [firebase-sync.js:4582-4586](firebase-sync.js#L4582-L4586) |
| 2.3 | **Uma fila de esperas ao abrir cada página:** login, depois o workspace, depois a **regravação de 4 documentos de configuração** (`publishWorkspaceSettings`, em todo carregamento), depois a migração de permissões, depois as coleções e depois os termos. Uma etapa espera a outra. | [firebase-sync.js:648-745](firebase-sync.js#L648-L745), [firebase-sync.js:1341-1347](firebase-sync.js#L1341-L1347) |
| 2.4 | Cerca de 830 KB de JS e CSS por página, mais 900 KB de XLSX em 2 páginas, sem minificar nem dividir. Num celular simples, só interpretar esse código leva segundos. | |
| 2.5 | Cada escrita também faz `getCountFromServer` e mais um `setDoc` (custo e latência extras). | [firebase-sync.js:1776-1782](firebase-sync.js#L1776-L1782) |

Esse padrão também **aumenta a conta do Firebase**: as leituras crescem com (número de páginas abertas × tamanho do banco). Com vários clientes pagantes, isso vira custo real.

#### 3. "Perde conexão"

- Não há indicador de online/offline, reconexão tratada nem fila offline (ver 1.1). Quando a rede oscila, a escuta só registra um `console.warn` ([firebase-sync.js:4596](firebase-sync.js#L4596)) e a tela continua mostrando "Online" ([firebase-sync.js:4640](firebase-sync.js#L4640)). Para quem usa, parece que o sistema caiu.

#### 4. "Não funciona em todos os dispositivos"

- `:has()` no CSS (8 usos) não funciona em iPhones com iOS 15.3 ou anterior nem em Firefox anterior ao 121. Partes do layout quebram nesses aparelhos.
- `100vh` (19 usos) no iPhone corta conteúdo e botões atrás da barra do navegador.
- `window.open("about:blank")` seguido de espera pela rede, no envio por WhatsApp ([script.js:1021](script.js#L1021)): o Safari do iPhone costuma bloquear ou deixar a aba em branco.
- O limite e a limpeza do `localStorage` no Safari (ver 1.6).
- CSS de 286 KB com 271 `!important`, sinal de regras brigando entre si. Cada ajuste para celular quebra outra tela.

#### 5. Segurança (estado atual: **bom**, com lacunas)

Pontos fortes: regras isolam cada oficina por `uid`; o próprio cliente não consegue alterar `subscription`, `accessStatus` nem `billing`; custos de orçamentos ficam separados da equipe; o link público de orçamento não permite listar outros; `senhas manager.txt` está no `.gitignore`.

Lacunas:
- Plano Pro **não é exigido no servidor** para tudo. O dono no Essencial ainda consegue gravar `dre_config` e lançamentos recorrentes direto no banco, porque o bloqueio é só visual ([firestore.rules:514-516](firestore.rules#L514-L516)).
- Não existe `firebase.json` nem testes de regras no Emulator. As regras são publicadas à mão no console, sem teste automático.
- O e-mail do admin está fixo nas regras ([firestore.rules:14-16](firestore.rules#L14-L16)). Funciona, mas o ideal é usar *custom claims*.
- Liberação de acesso, plano e pagamento são **manuais** (status `pending` → admin libera). Isso impede a venda automática (Fase 5).

### Prioridades (da que mais dói para a que menos dói)

1. Parar de perder dados: itens 1.1 a 1.4, em ordem.
2. Status de conexão visível e funcionamento offline de verdade.
3. Parar de baixar o banco inteiro a cada página (2.1 a 2.3), que traz o maior ganho de velocidade.
4. Dividir e compactar JS/CSS (2.4).
5. Compatibilidade com iPhone e celulares antigos.
6. Bloqueio do Pro no servidor e testes de regras.
7. Venda automática.

---

## Fase 1: Confiabilidade dos dados

Mudanças pequenas e seguras, sem trocar a arquitetura ainda e sem alterar a estrutura dos dados no Firestore:

- [x] 1a. Cache offline do Firestore (`persistentLocalCache`, várias abas): alterações ficam no aparelho (IndexedDB), sobrevivem a recarregar a página e sobem sozinhas quando a internet volta. Se o navegador não suportar, usa o modo antigo.
- [x] 1b. Salvar não trava mais: espera o servidor até 4 s (0,3 s sem internet) e depois considera guardado no aparelho. Se o servidor recusar depois, aparece um aviso e a alteração é desfeita na tela.
- [x] 1c. Removido o `getCountFromServer` do salvamento (a estatística usa a contagem local, em segundo plano).
- [x] 1d. Recusa definitiva do servidor (permissão, dado inválido) não é reenviada; só falhas de rede voltam para a fila. Com 1c, o caso "salvou mas apagou" deixa de existir.
- [x] 1e. Formulários do sistema não salvam enquanto a conta ainda está conectando (aviso "Ainda conectando…").
- [x] 1f. Indicador no topo: aparece com "Offline · salvando no aparelho" ou "Sincronizando…". O rodapé mostra Online/Offline de verdade.
- [x] 1g. Aviso ao fechar a página com alterações ainda na fila, e envio automático ao sair.
- [x] 1h. Botão **Baixar backup agora** em Meu cadastro (lê direto do servidor). Não existia mais backup no sistema.
- [x] Extra: a abertura das páginas não espera mais a regravação das configurações (que só acontece quando algo mudou), e leituras vazias do cache sem internet não apagam as listas locais.
- [x] **Teste do dono** aprovado em 24/10/2026.
- [x] Publicada em 24/10/2026 (commit dcaf58d).

Roteiro de teste (http://localhost:5500, logado na sua conta):
1. Meu cadastro → Baixar backup agora. Guardar o arquivo.
2. Online: criar um cliente de teste e um orçamento de teste; editar; excluir.
3. Desligar o Wi-Fi: o aviso "Offline" aparece; criar um orçamento de teste (deve salvar na hora); recarregar a página (deve continuar lá).
4. Religar o Wi-Fi: o aviso some; abrir em outro aparelho e conferir que o orçamento chegou.
5. Duas abas abertas ao mesmo tempo: salvar em uma e ver na outra.

## Decisão para a Fase 2 (discutir antes)

A raiz da lentidão e da fragilidade é usar o `localStorage` como banco e interceptar o `setItem`. Proposta: **migrar aos poucos para o cache do Firestore como fonte da verdade**, uma tela por vez, começando por orçamentos. Junto disso, adotar o **Vite** (build leve que mantém as páginas HTML atuais) para dividir e compactar os arquivos. Prós e contras a apresentar antes de começar.
