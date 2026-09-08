# Bases técnicas normalizadas

- `vehicle-configs.json`: 999 configurações consolidadas por montadora, modelo, motor, combustível, aspiração e intervalo de anos, extraídas de `base_veiculos_brasil_2000_2025_motorizacoes_v1.xlsx`.
- `labor-operations.json`: 664 operações ativas, extraídas de `catalogo_mao_de_obra_automotiva_v1.xlsx`.

Esses arquivos são referências para seleção e não contêm tempos de execução aprovados. Um tempo só fica disponível às oficinas depois de o administrador vincular veículo e operação, informar o intervalo de anos, minutos e fonte técnica e publicar o registro na coleção `labor_time_catalog`.

A base veicular recebida declara que não é exaustiva nem substitui validação por VIN, catálogo OEM ou documentação técnica. Por isso, a publicação individual e a fonte são obrigatórias.
