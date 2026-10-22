# Bases técnicas normalizadas

- `vehicle-configs.json`: 999 configurações consolidadas por montadora, modelo, motor, combustível, aspiração e intervalo de anos, extraídas de `base_veiculos_brasil_2000_2025_motorizacoes_v1.xlsx`.
- `labor-operations.json`: 664 operações ativas, extraídas de `catalogo_mao_de_obra_automotiva_v1.xlsx`.

Esses arquivos são referências para seleção e não contêm tempos de execução aprovados. Um tempo só fica disponível às oficinas depois de o administrador vincular veículo e operação, informar o intervalo de anos e a quantidade de horas e publicar o registro na coleção `labor_time_catalog`.

A base veicular recebida declara que não é exaustiva nem substitui validação por VIN, catálogo OEM ou documentação técnica. Por isso, a publicação individual e a fonte são obrigatórias.

O primeiro levantamento de fontes gratuitas está em [docs/labor-research](../docs/labor-research/README.md). As referências possuem pendências de aplicação e não são tempos aprovados para importação automática.

O [primeiro lote preparado](../docs/labor-research/first-batch.json) contém um rascunho de referência do Focus EDDB gasolina 2000-2004, com fonte, condições e conferência local reproduzível. Ele não é carregado automaticamente nem publica tempos no banco online.

O [segundo lote](../docs/labor-research/second-batch.json) acrescenta quatro rascunhos delimitados de Picanto, Tucson e Countryman, com restrições de motor, ano, câmbio e tração. Os dois lotes totalizam cinco referências preparadas; continuam sujeitos à identificação da montagem e revisão antes de publicar.

O [lote consolidado atual](../docs/labor-research/ready-drafts.json) reúne **30 rascunhos**, incluindo 25 novos registros de manutenção Honda e instalação de filtro MANN-FILTER, nos [terceiro](../docs/labor-research/third-batch.json) e [quarto](../docs/labor-research/fourth-batch.json) lotes. Referências, recortes e [validação](../docs/labor-research/ready-drafts-validation.json) acompanham os arquivos. Nada foi gravado ou publicado no banco online.
