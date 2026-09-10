# Matriz de retenção, exportação e exclusão

Minuta interna — os prazos marcados como **DEFINIR** não podem ser anunciados como implementados.

| Categoria | Evento inicial | Regra atual | Decisão/implementação necessária |
|---|---|---|---|
| Conta e contratação | aceite e vigência | versões, usuário, data e snapshot contratual são registrados | definir prazo de defesa e obrigação fiscal após encerramento |
| Dados da oficina | cancelamento/encerramento | podem permanecer para continuidade, obrigação legal, fraude e defesa | criar fluxo documentado de exportação e exclusão |
| Clientes, veículos e orçamentos | instrução da oficina ou encerramento | mantidos no ambiente enquanto a conta estiver ativa | definir janela de exportação e prazo de eliminação após encerramento |
| Links públicos e respostas | criação/substituição | permanecem vinculados ao identificador público até exclusão | implementar revogação visível e avaliar expiração automática |
| Rascunhos no navegador | encerramento da sessão/limpeza | parte é removida no logout ou pela limpeza do navegador | documentar quais rascunhos sobrevivem e por quanto tempo |
| Registros de incidentes | conhecimento do incidente | plano interno determina guarda mínima | manter por pelo menos cinco anos |
| Chamados de suporte | encerramento do chamado | **DEFINIR** | definir prazo conforme necessidade e conteúdo |
| Backups do fornecedor | exclusão no sistema | dependem dos ciclos técnicos contratados | registrar ciclo real do Firebase e como ocorre sobrescrita |
| Base técnica e revisões | publicação/correção | tempos possuem revisões e status | manter origem e histórico enquanto a referência for usada e pelo prazo de defesa definido |

## Princípios

- Eliminar ou anonimizar quando a finalidade terminar, salvo conservação permitida ou exigida.
- Não prometer exclusão imediata de backups se o fornecedor operar por ciclos de sobrescrita.
- Suspensão de recurso por downgrade não equivale a exclusão.
- Toda solicitação deve ser registrada, autenticada e avaliada segundo o papel de controlador ou operador.
