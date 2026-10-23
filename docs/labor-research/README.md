# Pesquisa gratuita de tempos de mão de obra

Atualização: 2026-10-23. Fontes gratuitas e abertas, sem REPXPERT, criação de conta em portais técnicos ou contato externo. O levantamento ainda não cobre todas as configurações e operações. Após a pesquisa, os 96 rascunhos foram cadastrados no Firebase e conferidos por nova leitura, conforme o [relatório de importação efetiva](catalog-import-2026-10-23.json).

**Situação online em 23/10/2026:** os 97 tempos do catálogo estão publicados, sem rascunhos pendentes. A pedido explícito do usuário, os 93 que ainda estavam em rascunho foram publicados em uma transação, preservando os quatro já publicados. O [relatório de publicação](catalog-publication-2026-10-23.json) registra a conferência posterior de todos os campos, a preservação dos dados técnicos e o histórico da alteração. A publicação não acrescenta validação técnica independente às fontes ou às condições de aplicação documentadas.

O [lote consolidado](ready-drafts.json) contém **96 rascunhos condicionais**, com fonte, página, data, aplicação e notas. O [relatório](ready-drafts-validation.json) registra hashes, conversão de minutos, preservação das fontes ao editar e bloqueio de reimportação. O arquivo não é carregado automaticamente pelo site.

## Cobertura registrada

Os números descrevem os arquivos locais, não o conteúdo do Firestore. Ter um rascunho não comprova cobertura de todas as operações ou de todos os anos do cadastro.

- 127 referências em [free-sources.json](free-sources.json): 125 com tempo numérico e 2 sem precisão suficiente.
- 38 fontes principais e 31 documentos de aplicação; os papéis podem se sobrepor.
- 75 configurações com pelo menos um rascunho, 14 somente com referências pendentes e 910 sem fonte mapeada. Total: 999.
- Entre as configurações com rascunho, 2 também possuem outras referências pendentes.
- 20 referências pendentes de aplicação e 9 sem configuração local correspondente.

O [mapa por veículo](backlog.json) enumera todas as configurações, rascunhos delimitados e pendências. [coverage.json](coverage.json) agrega os números por marca e hashes dos insumos. exhaustiveResearchCompleted permanece falso. As 663.336 combinações de veículo e operação são apenas um produto cartesiano, não uma lista de serviços aplicáveis.

## Lotes preparados

| Lote | Arquivo | Rascunhos |
| --- | --- | ---: |
| 1 | [first-batch.json](first-batch.json) | 1 |
| 2 | [second-batch.json](second-batch.json) | 4 |
| 3 | [third-batch.json](third-batch.json) | 16 |
| 4 | [fourth-batch.json](fourth-batch.json) | 9 |
| 5 | [fifth-batch.json](fifth-batch.json) | 18 |
| 6 | [sixth-batch.json](sixth-batch.json) | 17 |
| 7 | [seventh-batch.json](seventh-batch.json) | 3 |
| 8 | [eighth-batch.json](eighth-batch.json) | 22 |
| 9 | [ninth-batch.json](ninth-batch.json) | 6 |

O primeiro lote conserva o Focus EDDB gasolina 2000–2004, SIN-001, 132 minutos, como referência do procedimento Continental. A fonte não discrimina horas por componente; não foi criado tempo adicional de bomba nem afirmada sua inclusão ou exclusão.

O segundo lote delimita Picanto G4HE/G4HG manual por cabo, Tucson G4GC manual 2WD de 2007 e Countryman R60 Cooper S ALL4 N18B16A manual de 2013. Câmbio, tração e montagem devem ser identificados no exemplar antes de publicar.

O terceiro lote reúne 16 referências históricas de concessionárias Honda para Fit, City, HR-V e Civic, quatro serviços por aplicação. Nesta ampliação, seus códigos foram conferidos na documentação Honda sem ampliar anos, geração ou câmbio. O quinto lote acrescenta quatro serviços para WR-V 2019 L15Z9 CVT e 14 aplicações de filtros MANN.

O quarto lote contém nove aplicações MANN. O sexto adiciona 17 recortes e o oitavo mais 22, incluindo Fox, Audi, Mercedes, Volvo, Cayenne e Cruze. Compartilhar produto não autoriza compartilhar tempo: FP2842 tem 12 minutos no Cayenne e 10 no Q7.

O sétimo lote contém três referências históricas JLR para correia do gerador, limitadas a 2016, motor, VIN e peça. As horas vêm de garantia norte-americana; a declaração brasileira identifica motores, mas não prova equivalência integral da montagem. Esses registros exigem revisão das condições antes da publicação.

O nono lote acrescenta cinco aplicações delimitadas de Logan/Sandero II e uma de Fluence GT gasolina. O guia histórico CU22011 não autoriza transportar o tempo ao sucessor /1. Os códigos Renault e as designações MANN permanecem separados quando diferem.

Decisões e limites: [rodada 2](research-round-2.json), [rodada 3](research-round-3.json), [rodada 4](research-round-4.json), [rodada 5](research-round-5.json) e [rodada 6](research-round-6.json).

## Critérios e limites

- Tabelas de concessionárias são referências históricas, com validade comercial expirada; não foram atribuídas à fábrica ou usadas para preços atuais.
- Tempos MANN são de instalação do produto identificado; excluem higienização, reparos e outros elementos. O catálogo em português do Brasil não comprova homologação de todas as versões ou VINs.
- 0,1 hora corresponde a seis minutos. Tempos em minutos são convertidos por divisão por 60. Não foi calculada média entre fontes.
- Produto, direção, geração, motor, combustível e anos devem corresponder à documentação. Câmbio, tração, VIN e componentes permanecem nas condições.
- Não somar serviços já incluídos em revisão ou desmontagem compartilhada. Discos por unidade, amortecedores por par e filtros com dois elementos mantêm suas unidades.
- Não foram inventados códigos de motor ausentes na fonte. Designações documentadas e recortes são preservados quando sustentam a aplicação.
- Datas incoerentes, motores incompatíveis, conflitos entre produtos/fontes e tempos aproximados permanecem fora dos lotes.

Pendências incluem CR-V sem individualização da tabela de serviços; Fusion FWD/AWD sem vínculo brasileiro suficiente; Equinox 1.5 de 2020–2021 ausente do intervalo local; BMW E90 com linhas concorrentes após 2010; e Discovery com divergência entre fontes de filtros. Os motivos acompanham cada referência ou registro da rodada.

A base possui 999 configurações, 64 marcas e 664 operações. Não há campos próprios de código do motor, geração ou transmissão, e 302 configurações abrangem pelo menos dez anos. A seleção automática por ID e ano não resolve todas as condições técnicas.

reuseAllowed se refere ao uso limitado de fatos numéricos, metadados e notas próprias descrito no lote. Não declara licença contratual sobre documentos, tabelas completas, imagens ou procedimentos originais. Nenhum material protegido por login foi usado. Consultas históricas a portais e fontes recusadas estão no arquivo de pesquisa; não autorizam acesso ou contato.

## Importação e verificação

**Importação online confirmada em 23/10/2026:** a coleção labor_time_catalog passou de um registro publicado para **97 registros: inicialmente 96 rascunhos e um publicado**. A gravação foi atômica, com condição de inexistência em todos os novos IDs. Todos os campos dos 96 rascunhos foram lidos novamente e comparados; o documento preexistente do T-Cross foi preservado integralmente. A conexão autenticada existente da Firebase CLI foi usada via IAM, sem copiar credenciais para arquivos ou relatórios.

**Publicação posterior confirmada em 23/10/2026:** havia quatro publicados e 93 rascunhos na leitura anterior à execução. Todos os 93 rascunhos foram publicados por solicitação explícita do usuário; a nova leitura confirmou **97 publicados e nenhum rascunho**. Cada alteração incrementou a revisão e preservou o estado anterior no histórico. Fonte, minutos, combustível, anos, observações e demais dados técnicos permaneceram idênticos. As quatro publicações preexistentes não foram modificadas.

No painel administrativo, atualizar a página e selecionar **Todos** ou **Publicados** para ver os registros. As oficinas Pro recebem os tempos publicados compatíveis com o veículo e o ano selecionados, mantendo as condições de aplicação de cada referência.

O fluxo **Importar tempos pesquisados** permanece disponível para novos lotes: conferir a prévia e salvar como rascunhos. O lote ready-drafts.json já foi cadastrado; tentar reimportá-lo ou importar seus lotes separados será recusado por sobreposição. O importador aceita até 100 registros por arquivo e até três fontes complementares por registro.

Ao salvar, o painel consulta conflitos no catálogo online e usa transação integral com IDs determinísticos, sem sobrescrever importação anterior. Publicação continua individual. free-sources.json, coverage.json e backlog.json são arquivos de pesquisa e não servem como lote de importação.

Verificação local reproduzível:

    node scripts/test-labor-import.mjs
    node scripts/audit-labor-research.cjs
    node scripts/validate-labor-batch.mjs

O auditor verifica fontes, IDs, operações, recortes por veículo/motor/combustível/produto, anos e minutos; gera cobertura e mapa de pendências. O validador usa o importador real e o handler de edição do admin, verifica todos os lotes e produz o consolidado e relatórios. A validação local não substitui a conferência online nem a identificação técnica do veículo.

O fluxo de interface já foi exercitado com dados fictícios e banco em memória, incluindo duplicidade e falha de conexão. Para repetir, executar node scripts/preview-labor-import.cjs, iniciar serve-local.ps1 e abrir http://localhost:5500/tmp/labor-import-preview/index.html. A página de teste não carrega SDK Firebase.
