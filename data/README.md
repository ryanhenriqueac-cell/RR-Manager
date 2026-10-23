# Bases técnicas normalizadas

- vehicle-configs.json: 999 configurações por montadora, modelo, motor, combustível, aspiração e anos, extraídas de base_veiculos_brasil_2000_2025_motorizacoes_v1.xlsx.
- labor-operations.json: 664 operações ativas, extraídas de catalogo_mao_de_obra_automotiva_v1.xlsx.

Esses arquivos são referências para seleção e não contêm tempos de execução aprovados. Um tempo fica disponível às oficinas depois de o administrador vincular veículo e operação, informar anos e horas e publicar na coleção labor_time_catalog.

A base recebida não é exaustiva e não substitui identificação por VIN, catálogo OEM ou documentação técnica. A fonte e a revisão individual são obrigatórias.

A [pesquisa de fontes gratuitas](../docs/labor-research/README.md), atualizada em 2026-10-23, preparou **96 rascunhos condicionais** no [lote consolidado](../docs/labor-research/ready-drafts.json), com [validação](../docs/labor-research/ready-drafts-validation.json). Nenhum arquivo é importado automaticamente. Nenhum tempo foi gravado ou publicado no banco online durante a pesquisa.

O [mapa das 999 configurações](../docs/labor-research/backlog.json) registra 75 com rascunhos, 14 somente com referências pendentes e 910 sem fonte mapeada. Um rascunho não significa cobertura de todas as operações ou anos. O levantamento continua incompleto.
