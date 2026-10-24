# PLANO de reconstrução do RR Manager

Objetivo: deixar o RR Manager estável, rápido e pronto para venda automática.
Briefing completo: [docs/PROMPT-RECONSTRUCAO.md](docs/PROMPT-RECONSTRUCAO.md).

## Andamento

- [x] **Fase 0: Diagnóstico** (24/10/2026)
- [ ] **Fase 1: Confiabilidade dos dados** (aguardando aprovação)
- [ ] Fase 2: Desempenho
- [ ] Fase 3: Funcionar em todo dispositivo
- [ ] Fase 4: Segurança e multi-oficina
- [ ] Fase 5: Venda automática
- [ ] Fase 6: Lançamento e acompanhamento

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

## Fase 1: Confiabilidade dos dados (proposta)

Mudanças pequenas e seguras, sem trocar a arquitetura ainda e sem alterar a estrutura dos dados no Firestore:

- [ ] 1a. Ativar o **cache offline do Firestore** (`initializeFirestore` + `persistentLocalCache` com várias abas). As gravações passam a ficar guardadas no aparelho (IndexedDB), sobrevivem a recarregar a página e sobem sozinhas quando a internet volta.
- [ ] 1b. Considerar salvo assim que gravar no aparelho, sem esperar o servidor. Mostrar "Salvo no aparelho · sincronizando" e depois "Sincronizado ✓". Sem botão travado.
- [ ] 1c. Tirar o `getCountFromServer` do caminho do salvamento (a estatística fica para depois, em segundo plano).
- [ ] 1d. Corrigir o "desfazer": em caso de falha, **nunca** enviar exclusão do que pode ter sido gravado. Manter na fila e tentar de novo.
- [ ] 1e. Bloquear os botões de salvar até a sincronização estar pronta (com aviso "Conectando…"), em vez de aceitar e depois recusar.
- [ ] 1f. Indicador fixo de conexão: Online / Offline / Sincronizando (N pendentes).
- [ ] 1g. Aviso ao sair da página com alterações ainda não enviadas.
- [ ] 1h. Antes de tudo: **backup completo** dos dados reais, exportado para `exports/` (fora do Git).

Teste: salvar orçamento, cliente e lançamento online; desligar o Wi-Fi, salvar, recarregar a página, religar e confirmar que chegou ao Firestore; salvar com duas abas abertas.

## Decisão para a Fase 2 (discutir antes)

A raiz da lentidão e da fragilidade é usar o `localStorage` como banco e interceptar o `setItem`. Proposta: **migrar aos poucos para o cache do Firestore como fonte da verdade**, uma tela por vez, começando por orçamentos. Junto disso, adotar o **Vite** (build leve que mantém as páginas HTML atuais) para dividir e compactar os arquivos. Prós e contras a apresentar antes de começar.
