# Registro simplificado das operações de tratamento

Versão interna: 1.0 — 9 de setembro de 2026.

| Operação | Dados principais | Titulares | Papel do RR Manager | Finalidade | Base a validar pelo controlador | Destinatários/suboperadores | Retenção |
|---|---|---|---|---|---|---|---|
| Solicitação e administração da conta | nome, e-mail, telefone, empresa, CPF/CNPJ, plano | responsável da oficina | controlador | cadastro, análise, contratação, suporte e cobrança | contrato, procedimentos preliminares, obrigação legal e legítimo interesse quando cabível | Firebase e atendimento | durante a conta e prazo legal/defesa a definir |
| Autenticação | e-mail, UID, estado de verificação e registros de acesso disponíveis | usuários | controlador e operador conforme o contexto | segurança e controle de acesso | execução do contrato e legítimo interesse | Firebase Authentication | conforme configuração e necessidade de segurança |
| Gestão da equipe | nome, e-mail, perfil, permissões, status e autoria | colaboradores | operador para a oficina; controlador para segurança própria | contas individuais, menor privilégio e rastreabilidade | execução contratual, legítimo interesse e obrigações da oficina | Firebase | enquanto ativo e prazo de auditoria a definir |
| Clientes e veículos | contato, documento, endereço, observações, placa, motor, ano e quilometragem | clientes da oficina | operador | gestão cadastral, orçamento, inspeção e histórico | definida pela oficina | Firebase/Firestore | definida pela oficina e política de encerramento |
| Orçamentos e links públicos | cliente, veículo, itens, valores, condições, decisão e identificador do link | clientes da oficina | operador | elaborar, compartilhar e registrar indicação do cliente | definida pela oficina | Firebase/Firestore e destinatário escolhido | enquanto vinculado e prazo posterior a definir |
| Inspeção e operação | checklist, responsável, status, recomendações e observações técnicas | clientes e colaboradores | operador | executar e acompanhar serviços | definida pela oficina | Firebase/Firestore | conforme histórico da oficina e obrigações aplicáveis |
| Financeiro e DRE | receitas, despesas, custos, margens, metas e recorrências | oficina e eventualmente pessoas identificáveis | operador | gestão financeira e relatórios gerenciais | execução contratual e bases da oficina | Firebase/Firestore | conforme necessidade contratual, fiscal e defesa |
| Suporte e segurança | mensagens, diagnóstico, versão e eventos necessários | usuários e clientes citados | controlador para segurança/suporte | corrigir falhas, prevenir fraude e atender solicitações | contrato, legítimo interesse e obrigação legal | fornecedores de comunicação e infraestrutura | prazo a definir conforme natureza do chamado |

## Regras de uso

- A oficina define por que cadastra os dados de seus clientes e deve aplicar necessidade e minimização.
- O RR Manager deve tratar os dados operados somente conforme as funções solicitadas, o contrato e instruções lícitas da oficina.
- Novos campos ou integrações exigem atualização desta tabela antes da publicação.
- Bases legais não devem ser escolhidas automaticamente: precisam ser confirmadas conforme a relação concreta entre oficina e titular.
