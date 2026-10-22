# Pesquisa gratuita de tempos de mão de obra

**Preferência atual:** usar fontes gratuitas abertas, sem o portal REPXPERT. O pedido de contato com a Schaeffler foi cancelado por escolha do usuário em 22/10/2026 e não deve ser enviado. O registro abaixo sobre o portal é apenas histórico da pesquisa.

Consulta realizada em 22/10/2026. Pesquisa progressiva de sincronismo, embreagem, manutenção e instalação de filtros. O levantamento das 999 configurações e 664 operações continua incompleto. O banco online não foi consultado nem alterado.

O registro reúne **28 fontes principais e 10 documentos de aplicação**, incluindo a tabela MANN que fornece tempo e aplicação na mesma publicação. [free-sources.json](free-sources.json) guarda **52 referências**: 50 com número de horas/minutos e duas sem precisão suficiente. Há **30 rascunhos preparados**, 13 pendentes de aplicação e sete sem configuração correspondente. Nenhuma referência aprova publicação automática.

## Ampliação atual: 25 novos rascunhos

O [lote consolidado](ready-drafts.json) reúne os **30 registros** dos quatro lotes, em um único arquivo para o importador administrativo. [ready-drafts-validation.json](ready-drafts-validation.json) registra hash, validação local, bloqueio de duplicação e ausência de gravações online. Importar este arquivo e também os lotes separados será bloqueado por sobreposição.

- [Terceiro lote](third-batch.json): 16 referências históricas de concessionárias Honda brasileiras, para Fit 1.5 CVT 2019, City sedã 1.5 CVT 2019, HR-V 1.8 CVT 2019 e Civic geração 10 2.0 CVT 2018. Quatro serviços por aplicação: pastilhas dianteiras, amortecedores dianteiros **o par**, filtro de cabine e óleo com filtro. A motorização/versão foi conferida em catálogo ou comunicado brasileiro da Honda.
- [Quarto lote](fourth-batch.json): nove tempos de instalação de filtros de cabine FreciousPlus, no catálogo brasileiro MANN-FILTER. Inclui recortes de Fit 1.4, Corolla 1.8/2.0, Golf TSI/GTI, BMW 120i/130i, Volvo C30 T5 e CLA 250. O produto, a geração e o recorte de anos permanecem nas notas.

As tabelas Honda são referências históricas das concessionárias Auto Japan, H Motors e Flora, com validade comercial expirada; não foram atribuídas à fábrica nem usadas para preços atuais. Os tempos MANN são de instalação do filtro identificado, não de higienização ou de qualquer produto de cabine. **0,1 hora significa seis minutos; dez minutos foram convertidos por divisão por 60.** Não foi calculada média entre fontes.

As colunas dos cinco PDFs foram conferidas em renderização local, com hashes no registro de fontes. Uma revisão independente conferiu os 25 novos registros. Discos por unidade não viraram tempo para o par; bateria com recarga/testes e revisões completas não foram desmembradas. Linhas MANN com motor, geração ou datas incoerentes ficaram fora do lote. Não foram inventados códigos de motor: nesses serviços, a aplicação foi identificada pela designação documentada, geração, ano e montagem relevantes.

[research-round-3.json](research-round-3.json) registra decisões, referências complementares, descartes e falhas de acesso. Passat V6, Daily/Ducato, A5, C180 Coupé e i30 trouxeram mais cinco tempos, mantidos pendentes. O Clio continua sem comprovação brasileira do sufixo K4M748; o novo catálogo Motorservice confirma somente a aplicação global.

Execute `node scripts/audit-labor-research.cjs` e `node scripts/validate-labor-batch.mjs` para atualizar métricas e validar os quatro lotes e o consolidado. O site não carrega esses arquivos automaticamente. O catálogo online continua sem consulta ou gravação nesta pesquisa; os arquivos permanecem locais.

## Histórico: segundo lote

[second-batch.json](second-batch.json) contém **quatro novos rascunhos**, além do Focus preservado no primeiro lote:

| Aplicação delimitada | Operação | Horas | Minutos |
| --- | --- | ---: | ---: |
| Picanto 1.0 L4 G4HE gasolina, manual por cabo, 2008-2010 | EMB-001 — kit de embreagem | 3,00 | 180 |
| Picanto 1.1 L4 G4HG gasolina, manual por cabo, somente 2006 | EMB-001 — kit de embreagem | 3,00 | 180 |
| Tucson JM 2.0 G4GC gasolina, manual 2WD, somente 2007 | EMB-001 — kit de embreagem | 5,00 | 300 |
| Countryman R60 Cooper S ALL4 N18B16A gasolina, manual, somente 2013 | EMB-012 — kit de embreagem e volante bimassa | 6,70 | 402 |

As horas vêm dos artigos de reparação LuK/Schaeffler. Os catálogos MTE-THOMSON confirmam aplicação brasileira de motor, anos e combustível; não substituem a identificação do câmbio e da tração no exemplar. A preparação desses rascunhos não afirma que todo carro brasileiro de mesmo nome tenha a montagem manual descrita nas fontes. A compatibilidade da montagem deve ser confirmada antes da publicação e do uso.

No G4HE, o catálogo brasileiro relaciona 2008-2012, mas o lote se limita a 2008-2010 para evitar a transição de geração. Não foi copiado para motores de três cilindros. No G4HG, o tempo de 3 h vem do artigo PMM de 2016; o PDF de 2018 confirma um exemplar de 2006 e o procedimento, mas não informa horas. Não foi atribuído tempo extra ao retentor citado nesse PDF.

A Tucson ficou restrita ao ano e à montagem do artigo, sem ampliar para 2005-2018, automático, flex ou 4WD. A abertura direta da página PMM retornou timeout; seu texto integral foi obtido pela pesquisa da própria página e o procedimento foi conferido no PDF assinado por Malcolm Short. Esse PDF não informa 5 h: a origem do número continua sendo o artigo PMM de 2015. O Countryman usa a operação composta; não foi criada uma segunda cobrança de embreagem ou remoção de câmbio.

Também foram examinados Audi A3 ARZ, MINI antigo, Jimny, Navara/Frontier e artigos de Golf, CR-V, Corolla e outros modelos. Os três primeiros continuam pendentes de individualização de aplicação. A Navara informa pouco mais de três horas e meia e não virou número exato. O Golf antigo e o Corolla têm procedimentos sem horas; o material do CR-V se refere ao diesel 2.2, sem equivalência com a base brasileira. O [registro da rodada](research-round-2.json) documenta os limites de acesso e os descartes, sem tratá-los como prova de inexistência de outras fontes gratuitas.

Naquela etapa, os dois primeiros lotes somavam **cinco rascunhos**, com validação local reproduzível. As demais 17 referências daquela etapa permaneceram pendentes ou incompatíveis. A ampliação atual está descrita acima. A pesquisa não cobriu individualmente as 64 marcas nem todas as 664 operações. Os artigos consultados forneceram principalmente sincronismo e embreagem; nenhuma taxa genérica foi multiplicada para completar freios, suspensão, elétrica ou outros sistemas.

## Primeiro lote preparado

[first-batch.json](first-batch.json) contém **um rascunho importável**, conferido contra os cadastros locais e as fontes: Focus I 2.0 16V Zetec-S **EDDB, gasolina, 2000-2004**, operação **SIN-001**, **2,20 h / 132 minutos**. GL/Ghia têm aplicação 2000-2004; GLX, 2002-2004. O código EDDB deve ser confirmado no veículo. O registro não abrange flex, Duratec ou anos posteriores.

O tempo é uma **referência do procedimento ContiTech de correia dentada**. O enquadramento em SIN-001 acompanha o serviço descrito no título e nas etapas da fonte; não transforma o valor em tempo Ford de garantia nem em tempos individuais de cada componente. A recomendação de bomba, polias e tensionador permanece registrada, assim como a ausência de horas discriminadas para esses itens. Não foram gerados registros SIN-002/003/004/005 nem somados adicionais sem comprovação. O escopo não foi resolvido por uma afirmação de que a bomba está incluída ou excluída dos 132 minutos.

O lote conserva as três referências completas no campo `evidence`: boletim, republicação AUTOBIZ e catálogo Motorservice. A republicação repete a informação do mesmo fabricante e não conta como medição independente. O uso preparado se limita ao tempo factual e aos metadados das fontes, com notas próprias; `reuseAllowed` não declara uma licença sobre textos, imagens, tabelas ou sobre os documentos completos, nem autorização de acesso ao REPXPERT.

O [relatório de validação](first-batch-validation.json) registra identificação, anos, combustível, minutos e hash do lote. A validação verificou o importador real, rejeição de reimportação e preservação de combustível e URL ao editar no admin. Execute `node scripts/validate-labor-batch.mjs` para reproduzir. A estrutura passou na validação local; a compatibilidade com o estado atual do catálogo online só é verificada pelo painel ao salvar. O arquivo importa sempre como **rascunho**, mantendo a revisão técnica antes da publicação. Nenhum registro foi gravado no Firestore.

## Histórico: referências das duas primeiras rodadas

Valores em horas decimais. São referências limitadas à aplicação e ao procedimento da publicação, não tempos aprovados para todos os veículos de mesmo nome.

| Aplicação descrita na fonte | Serviço | Horas | Resultado do cruzamento |
| --- | --- | ---: | --- |
| Clio II 1.6 16V K4M 748 | Correia dentada | 2,70 | Candidato; confirmar motor, anos, mercado e escopo |
| Mégane, família do boletim Renault | Correia dentada | 3,60 | Candidato; motor e geração por confirmar |
| Mégane Scénic, família do boletim Renault | Correia dentada | 3,90 | Candidato; motor e geração por confirmar |
| Laguna, família do boletim Renault | Correia dentada | 2,50 | Motor não individualizado para cruzamento |
| Focus 2.0 16V EDDB/EDDC/EDDD | Correia dentada | 2,20 | Rascunho de referência SIN-001, restrito a EDDB gasolina 2000-2004 |
| Fiesta V 1.4 16V FXJA, 2004 | Correia dentada | 2,80 | Configuração ausente |
| Fiesta V 1.4 16V FXJA, 2004 | Correia de acessórios | 0,60 | Configuração ausente; verificar sobreposição |
| Fiat 500 1.2 169 A4.000 | Correia dentada | 2,35 | Base local contém 1.4, não 1.2 |
| Doblò 263 1.6 D Multijet | Correia dentada | 2,70 | Base local não contém essa versão diesel |
| Panda 1.2 188.A4.000, 2004 | Correia dentada | 1,60 | Modelo ausente; há restrição por número de motor |
| Saxo 1.4 KFX/KFW | Correia dentada | 1,60 | Modelo ausente; não transferir para C3/206 |
| Focus C-Max 1.6 Ti HXDA/SIDA | Correia dentada | 2,90 | Modelo ausente; não transferir para Focus brasileiro |
| Focus 1.6 gasolina, 2008 | Embreagem | Não informado com exatidão | Fonte diz pouco menos de cinco horas; não arredondado |
| Honda Jazz II GD 1.4 gasolina, 2002-2008 | Embreagem | 4,50 | Fit i-DSI é candidato; confirmar equivalência de motor e câmbio |
| Kia Picanto 1.0 G4HE gasolina | Embreagem | 3,00 | Rascunho restrito a manual L4 2008-2010 |
| Kia Picanto 1.1 G4HG gasolina | Embreagem | 3,00 | Rascunho restrito a manual L4 2006 |
| Hyundai Tucson 2.0 gasolina 2WD, 2007 | Embreagem | 5,00 | Rascunho manual G4GC, somente 2007 |
| MINI Countryman R60 Cooper S ALL4, 2013 | Embreagem e volante bimassa | 6,70 | Rascunho manual N18B16A, somente 2013 |
| Audi A3 1.8 T ARZ | Correia dentada | 2,20 | Individualizar anos do ARZ; base mistura aspirado e turbo |
| BMW MINI 1.4DT / 1.6i, 2001-2006 | Embreagem | 6,50 | Boletim agrupa versões; correspondência local pendente |
| Suzuki Jimny terceira geração | Embreagem | 3,00 | Motor e ano do exemplar não individualizados |
| Nissan Navara 2.5 DDTi | Embreagem e volante bimassa | Não informado com exatidão | Pouco mais de 3h30; não arredondado nem transferido à Frontier |

Fontes da tabela, todas com o tempo na primeira página:

- [ContiTech: Renault Clio II e demais modelos citados](https://www.techtips.ie/Contitech/renault-clio-ii-16-16v-timing-belt-fitting-guide.pdf).
- [ContiTech: Focus 2.0](https://www.techtalk.ie/wp-content/uploads/2017/01/TN_15_045-EN.pdf).
- [ContiTech: Fiesta FXJA](https://www.forumdellautoriparatore.it/public/attachments/danieli/ford-fiesta-timing-belt-guide-14-liter-16-v-with-engine-code-fxja.pdf).
- [ContiTech: Fiat 500 1.2](https://www.techtalk.ie/wp-content/uploads/2017/01/TN_15_S01-EN.pdf).
- [ContiTech: Doblò Multijet](https://www.techtips.ie/Contitech/fiat-doblo-timing-belt-fitting-instructions-16d-multijet.pdf).
- [ContiTech: Panda](https://techtalk.ie/wp-content/uploads/2017/12/TN_17_S02-EN.pdf).
- [ContiTech: Saxo](https://www.techtips.ie/Contitech/timing-belt-guide---citron-saxo-s0-s1-14-liter-vts-with-engine-code-kfx-kfw-tu3jp.pdf).
- [ContiTech: Focus C-Max](https://www.techtalk.ie/wp-content/uploads/2017/01/TN_15_043-EN.pdf).
- [Alistair Mason/Schaeffler: embreagem do Focus](https://www.techtips.ie/LuK/luk-clutch-academy---2008-ford-focus-16.pdf).
- [Malcolm Short/Schaeffler: embreagem do Jazz GD](https://www.techtips.ie/LuK/luk-clutch-academy-honda-jazz-ii-gd-14p.pdf).
- [LuK/Schaeffler: embreagem do Picanto G4HE](https://pmmonline.co.uk/technical/how-to-change-a-clutch-on-a-kia-picanto/).

Esses artigos são públicos e foram consultados fora do portal REPXPERT, sem cadastro, login ou contato com o fabricante.

## Correspondência identificada nesta ampliação

O [catálogo brasileiro da Motorservice/Pierburg](https://catweb.ms-motorservice.com.br/detalhes.php?cw_pgAtual=199&cw_produtoAtivo=CodigoProduto%3C%212%21%3E4897), produto 7.22184.20.0, identifica Focus GL/Ghia com motor EDDB 2.0 16V gasolina entre 2000 e 2004 e GLX entre 2002 e 2004. É uma fonte de identificação; não contém horas. O recorte foi registrado separadamente e não altera o cadastro amplo do veículo nem pressupõe que todo Focus desses anos use EDDB.

O boletim Continental dá 2,2 h para o procedimento de correia nos motores EDDB/EDDC/EDDD e recomenda trocar bomba, tensionador e polias. A leitura completa não individualiza um tempo adicional da bomba. O rascunho usa SIN-001 como referência ao procedimento descrito e explicita essa limitação; não alimenta a operação de kit com bomba. O valor não foi duplicado entre operações nem aplicado a Focus Duratec/flex de anos posteriores.

## Limitações da base atual

A auditoria local encontrou 999 configurações, 64 marcas e 664 operações. As 663.336 combinações cartesianas são um limite bruto; não representam serviços aplicáveis. Há 302 configurações com intervalos de pelo menos dez anos. Nenhuma configuração possui campos próprios `engineCode`, `transmission` e `generation`; algumas notas mecânicas contêm informações parciais.

Exemplo: `veh_fda727a70a533aee` representa Focus 2.0 16V gasolina/flex de 2000 a 2019. O boletim consultado se limita aos códigos EDDB, EDDC e EDDD. O valor não pode ser atribuído automaticamente aos 20 anos desse cadastro.

Os 31 IDs candidatos atuais incluem 18 configurações com rascunhos delimitados; as demais permanecem sem rascunho preparado. Mesmo nos rascunhos, as condições de montagem precisam ser conferidas no exemplar. Intervalos de troca em quilômetros/anos não foram convertidos em horas de execução. Expressões sem número exato não viraram valores inventados. Operações com bomba, polias ou desmontagens compartilhadas mantêm suas condições de escopo.

## Continuidade do preenchimento

1. Individualizar as configurações candidatas por código de motor, geração, anos e combustível; acrescentar câmbio quando o serviço depender dele.
2. Confirmar o tempo, a operação e as inclusões na documentação da aplicação brasileira.
3. Registrar página, fonte, data da consulta e as condições do serviço.
4. Preparar vínculos como rascunhos somente após confirmar a correspondência. Publicar depois da revisão técnica e da verificação das condições de reutilização da fonte.
5. Expandir a pesquisa por marca e sistema, mantendo como pendentes as combinações sem evidência. As 64 marcas não foram pesquisadas individualmente neste lote.

Fontes genéricas de licitações, trechos isolados do índice de busca, valores de peças e estimativas sem aplicação exata não são comprovação para publicar um tempo por veículo. Um manual encontrado no domínio antigo da Continental retornou 404; para Renault foi obtida outra publicação original acessível.

## Portais das montadoras

- **[REPXPERT Brasil / Schaeffler](https://www.repxpert.com.br/pt-br/catalog):** confirmado no navegador o anúncio de acesso gratuito a dados RMI para produtos Schaeffler, com catálogo para usuários cadastrados. Os [termos consultados](https://www.repxpert.com.br/pt-br/conditions-of-use), seções 6 e 7, restringem disponibilização a terceiros e pedem consentimento para uso além dos próprios fins. Foi preparado um [pedido de autorização e integração](solicitacao-schaeffler.txt); não foi enviado. A existência de conta não substitui a autorização de disponibilização aos clientes do RR Manager.
- **[Tempário oficial Fiat](https://aftersales.fiat.com/tempario/home.aspx?LanguageID=tr-TR):** a consulta no navegador abriu a lista de modelos, mas selecionar Palio/Siena retornou erro de servidor. Ao acessar a página inicial, o portal exibiu ausência de assinatura válida. Não foram extraídos tempos. A sessão observada usa mercado TR; cobertura e contratação para o Brasil não foram verificadas.
- **[Reparador Fiat Brasil](https://reparador.fiat.com.br/novo_reparador.html):** o conteúdo aberto solicita cadastro no Fiat ID. A disponibilidade de tempos não foi comprovada e nenhuma conta foi criada.
- **[Reparador Volkswagen](https://www.vw.com.br/pt/servicos-e-acessorios/reparadoresvw.html):** há materiais técnicos e treinamentos públicos; não foi obtida tabela de horas por configuração na página consultada.
- **[Renault Manutenção](https://www.renault.com.br/renault-care-service/manutencao.html):** não foi obtida tabela de horas por configuração na página consultada.

Essas observações não demonstram que inexiste qualquer tabela gratuita dessas marcas; registram os limites concretos do acesso e do material consultado nesta etapa. A pesquisa não reuniu cobertura suficiente para preencher integralmente o catálogo por versão.

## Arquivos e validação

- [free-sources.json](free-sources.json): fontes, tempos, aplicação declarada, IDs candidatos e pendências.
- [coverage.json](coverage.json): métricas locais, contagem por marca e hashes dos arquivos auditados. Não representa cobertura integral da pesquisa nem do Firestore.
- [../../scripts/audit-labor-research.cjs](../../scripts/audit-labor-research.cjs): valida fontes, códigos, IDs, conversão de horas e bloqueio de publicação automática; atualiza as métricas com `node scripts/audit-labor-research.cjs`. A contagem `approvedForImport` considera preparação de rascunhos e não aprovação para publicar.
- [first-batch.json](first-batch.json) e [first-batch-validation.json](first-batch-validation.json): primeiro rascunho preparado e resultado reproduzível da validação.
- [second-batch.json](second-batch.json) e [second-batch-validation.json](second-batch-validation.json): quatro rascunhos adicionais e validação.
- [third-batch.json](third-batch.json) e [third-batch-validation.json](third-batch-validation.json): 16 novas referências Honda.
- [fourth-batch.json](fourth-batch.json) e [fourth-batch-validation.json](fourth-batch-validation.json): nove referências MANN-FILTER.
- [ready-drafts.json](ready-drafts.json) e [ready-drafts-validation.json](ready-drafts-validation.json): arquivo único com os 30 rascunhos e sua validação.
- [research-round-2.json](research-round-2.json) e [research-round-3.json](research-round-3.json): decisões e limites de cada ampliação.

Os arquivos desta pasta não são carregados automaticamente pelo site nem equivalem a registros da coleção `labor_time_catalog`. O arquivo `first-batch.json` deve passar pelo fluxo autenticado de importação administrativa; a pesquisa geral `free-sources.json` não é um arquivo de importação.

## Importação em lote implementada

O painel administrativo local agora oferece **Importar tempos pesquisados**: modelo de arquivo, prévia, lista de erros e gravação de até 100 rascunhos por lote. Os dados só são gravados após o botão de salvar, com sessão administrativa. A transação é integral: uma falha não deixa parte do lote salva. IDs estáveis e verificação transacional impedem sobrescrever registros de uma importação anterior. Também são verificados os intervalos sobrepostos do arquivo e do catálogo consultado imediatamente antes da transação.

Cada registro precisa conter veículo e operação existentes, anos dentro da configuração, horas numéricas, aplicação confirmada e fonte com título, URL, página e data. As confirmações `applicationVerified`, `operationVerified` e `reuseAllowed` só devem ser verdadeiras depois da conferência real e dentro do uso descrito no lote. Referências com pendências e o formato de pesquisa `free-sources.json` são recusados. Um combustível mais restrito pode ser informado quando pertence à configuração de origem; a edição mantém esse recorte. Até três fontes complementares em `source.supporting` são preservadas no campo de fonte do Firestore, com URLs intactas; a conferência de aplicação não se perde após importar ou editar.

Os rascunhos importados mantêm fonte e aplicação visíveis no admin; sua publicação continua individual. Dos 20 tempos numéricos pesquisados, cinco foram preparados para importação como rascunhos e 15 permanecem pendentes. Nenhuma gravação foi feita no banco real. As alterações do site estão somente nos arquivos locais e precisam ser publicadas para aparecer no domínio em produção. `node scripts/validate-labor-batch.mjs` valida ambos os lotes, inclusive ausência de duplicidade entre eles, e atualiza os dois relatórios.

Validação: `node scripts/test-labor-import.mjs` verifica dados, sobreposição, aplicação, fonte e bloqueio de referências pendentes. O fluxo foi exercitado no Chrome com dados fictícios e banco em memória: prévia válida, rejeição de duplicidades, gravação como rascunho, impedimento de repetição e erro de conexão sem gravação. A conexão de escrita com Firestore real não foi testada.

Para repetir a conferência visual, execute `node scripts/preview-labor-import.cjs`, inicie `serve-local.ps1` e abra `http://localhost:5500/tmp/labor-import-preview/index.html`. O gerador usa os mesmos handlers de importação do aplicativo; nenhum SDK Firebase é carregado na página de teste.
