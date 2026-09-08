$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$firebasePath = Join-Path $projectRoot "firebase-sync.js"
$scriptPath = Join-Path $projectRoot "script.js"
$rulesPath = Join-Path $projectRoot "firestore.rules"
$teamPath = Join-Path $projectRoot "equipe.html"

$firebase = [System.IO.File]::ReadAllText($firebasePath)
$appScript = [System.IO.File]::ReadAllText($scriptPath)
$rules = [System.IO.File]::ReadAllText($rulesPath)
$teamHtml = [System.IO.File]::ReadAllText($teamPath)
$htmlFiles = Get-ChildItem -LiteralPath $projectRoot -Filter "*.html" -File
$allHtml = ($htmlFiles | ForEach-Object { [System.IO.File]::ReadAllText($_.FullName) }) -join "`n"
$checks = 0

function Assert-True {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw "FALHOU: $Message" }
  $script:checks += 1
}

function Get-CapturedBlock {
  param([string]$Source, [string]$Pattern, [string]$Description)
  $match = [regex]::Match($Source, $Pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
  Assert-True $match.Success "Nao encontrou $Description."
  return $match.Groups["body"].Value
}

$keysBlock = Get-CapturedBlock $firebase 'const TEAM_PERMISSION_KEYS\s*=\s*\[(?<body>.*?)\];' "TEAM_PERMISSION_KEYS"
$permissionKeys = [regex]::Matches($keysBlock, '"([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
$uiKeys = [regex]::Matches($teamHtml, 'data-team-permission="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }

$missingInUi = @($permissionKeys | Where-Object { $_ -notin $uiKeys })
$unknownInUi = @($uiKeys | Where-Object { $_ -notin $permissionKeys })
Assert-True ($missingInUi.Count -eq 0) "Permissoes sem controle na tela: $($missingInUi -join ', ')"
Assert-True ($unknownInUi.Count -eq 0) "Controles desconhecidos na tela: $($unknownInUi -join ', ')"
Assert-True ($permissionKeys.Count -eq ($permissionKeys | Select-Object -Unique).Count) "Existem permissoes duplicadas na matriz."

foreach ($permission in $permissionKeys) {
  Assert-True ($rules.Contains("'$permission'")) "A permissao $permission nao aparece nas regras do Firestore."
}
Assert-True ($rules.Contains("data.permissions.keys().size() == $($permissionKeys.Count)")) "As regras aceitam documentos de equipe com permissoes ausentes."

$mechanic = Get-CapturedBlock $firebase 'mechanic:\s*\{.*?permissions:\s*\{(?<body>.*?)\}\s*\},\s*financial:' "perfil do mecanico"
foreach ($permission in @("clientesVer", "clientesGerenciar", "clientesDadosSensiveis", "orcamentosVer", "orcamentosVerCustos", "financeiroVer", "dreVer", "dashboardFinanceiro")) {
  Assert-True ([regex]::IsMatch($mechanic, "\b$permission\s*:\s*false\b")) "Mecanico recebeu indevidamente $permission."
}
foreach ($permission in @("dashboardOperacional", "ordensServicoVer", "ordensServicoGerenciar", "inspecoesVer", "inspecoesGerenciar")) {
  Assert-True ([regex]::IsMatch($mechanic, "\b$permission\s*:\s*true\b")) "Mecanico deveria receber $permission."
}

$attendant = Get-CapturedBlock $firebase 'attendant:\s*\{.*?permissions:\s*\{(?<body>.*?)\}\s*\},\s*mechanic:' "perfil do atendente"
foreach ($permission in @("orcamentosVerCustos", "aprovarOrcamentos", "financeiroVer", "dreVer", "dashboardFinanceiro")) {
  Assert-True ([regex]::IsMatch($attendant, "\b$permission\s*:\s*false\b")) "Atendente recebeu indevidamente $permission."
}

$financial = Get-CapturedBlock $firebase 'financial:\s*\{.*?permissions:\s*\{(?<body>.*?)\}\s*\},\s*manager:' "perfil do financeiro"
foreach ($permission in @("clientesVer", "clientesGerenciar", "clientesDadosSensiveis", "veiculosVer", "orcamentosGerenciar", "ordensServicoVer")) {
  Assert-True ([regex]::IsMatch($financial, "\b$permission\s*:\s*false\b")) "Financeiro recebeu indevidamente $permission."
}

$manager = Get-CapturedBlock $firebase 'manager:\s*\{.*?permissions:\s*\{(?<body>.*?)\}\s*\},\s*custom:' "perfil do gerente"
foreach ($permission in @("financeiroGerenciar", "dreConfigurar")) {
  Assert-True ([regex]::IsMatch($manager, "\b$permission\s*:\s*false\b")) "Gerente recebeu indevidamente $permission."
}

$orderBuilder = Get-CapturedBlock $appScript 'function buildServiceOrderFromBudget(?<body>.*?)async function syncServiceOrderFromBudget' "sanitizacao da ordem de servico"
foreach ($forbidden in @("telefone", "documento", "endereco", "lucroEstimado", "totalCusto", "valorUnitario", "valorHora")) {
  Assert-True (-not [regex]::IsMatch($orderBuilder, "\b$forbidden\b", [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)) "A ordem operacional expoe $forbidden."
}

$publicBuilder = Get-CapturedBlock $appScript 'function buildPublicOrcamentoData(?<body>.*?)function normalizePublicOrcamentoData' "payload publico do orcamento"
Assert-True (-not $publicBuilder.Contains("cliente.telefone")) "O link publico inclui telefone do cliente."
Assert-True (-not $publicBuilder.Contains("cliente.email")) "O link publico inclui e-mail do cliente."
Assert-True ($firebase.Contains("crypto.getRandomValues")) "O identificador do link publico nao usa aleatoriedade criptografica."
Assert-True ($firebase.Contains("uniqueLegacyShareIds")) "Links publicos antigos e curtos nao sao invalidados na migracao."
Assert-True ($rules.Contains("allow get: if true;")) "Link publico nao permite leitura direta por ID."
Assert-True ($rules.Contains("allow list: if false;")) "Colecao de orcamentos publicos pode ser enumerada."
Assert-True ($rules.Contains("request.resource.data.clientRespondedAt == request.time")) "Resposta publica aceita horario forjado."
Assert-True ($rules.Contains("request.resource.data.owner == resource.data.owner")) "Dono do link publico pode ser alterado durante uma atualizacao."

Assert-True ($firebase.Contains('const CLIENT_SUMMARY_COLLECTION = "clientes_resumo"')) "Resumo protegido de clientes nao configurado."
Assert-True ($firebase.Contains('const BUDGET_COST_COLLECTION = "orcamento_custos"')) "Custos privados dos orcamentos nao configurados."
Assert-True ($firebase.Contains('workspaceSchemaVersion >= 2 ? flushV2Changes()')) "Fallback do schema 2 nao salva nas colecoes migradas."
Assert-True ($firebase.Contains("deleteUser(createdTeamCredential.user)")) "Convite invalido pode deixar uma conta orfa."
Assert-True ($firebase.Contains("workspaceAccessUnsubscribe = onSnapshot")) "Bloqueio do workspace ou do Plano Pro nao e monitorado em tempo real."
Assert-True ($firebase.Contains("clearSensitiveLocalData();")) "Limpeza do cache sensivel nao configurada."
Assert-True ($firebase.Contains("TEAM_SENSITIVE_PERMISSION_KEYS")) "Permissoes sensiveis nao exigem confirmacao destacada."
Assert-True ($firebase.Contains("alreadyGranular")) "A migracao antiga nao diferencia permissoes legadas das ja revisadas."
Assert-True ($firebase.Contains('TEAM_ROLE_PROFILES[role].permissions')) "Perfis antigos nao migram para os novos padroes conservadores."
Assert-True ($firebase.Contains('O indice do workspace e os documentos de acesso precisam mudar juntos.')) "Migracao de equipe nao e atomica."
Assert-True ($rules.Contains("request.auth.token.email_verified == true")) "As regras nao exigem e-mail verificado da equipe."
Assert-True ($rules.Contains("hasValidTeamPermissions(get(teamPath()).data)")) "As regras aceitam permissoes legadas antes da migracao segura."
Assert-True ($rules.Contains("resource.data.assignedToEmail == request.auth.token.email")) "As regras nao limitam a ordem ao colaborador atribuido."
Assert-True ($rules.Contains("function isAssignableTeamMember")) "As regras nao validam se o responsavel esta ativo na equipe."
Assert-True ($rules.Contains("budgetAssignmentChangeAllowed(id)")) "Edicao de orcamento pode alterar a atribuicao sem permissao especifica."
$orderRules = Get-CapturedBlock $rules 'match /workspaces/\{id\}/ordens_servico/\{docId\}\s*\{(?<body>.*?)match /team_access' "regras das ordens de servico"
Assert-True (-not $orderRules.Contains("aprovarOrcamentos")) "Aprovacao de orcamento concedeu controle implicito sobre ordens de servico."
Assert-True ($orderRules.Contains("matchesSourceBudget(id, request.resource.data)")) "Ordem pode divergir do orcamento de origem."
Assert-True ($orderRules.Contains("allow delete: if isAdmin() || isActiveOwner(id);")) "Distribuidor pode excluir historico operacional."
Assert-True ($appScript.Contains('!hasAccess("ordensServicoAtribuir")')) "A sincronizacao de ordens nao exige permissao de distribuicao."
Assert-True ($appScript.Contains('const canDeleteItem = canDelete && (orcamento.status !== "Aprovado"')) "Orcamento aprovado aparece como excluivel para colaborador."
Assert-True ($firebase.Contains('const PUBLIC_BUDGET_FIELDS')) "Lista positiva de campos publicos do orcamento ausente."
foreach ($forbidden in @("totalCustoPecas", "totalCustoTerceirizados", "lucroEstimado")) {
  $publicFields = Get-CapturedBlock $firebase 'const PUBLIC_BUDGET_FIELDS\s*=\s*\[(?<body>.*?)\];' "campos publicos do orcamento"
  Assert-True (-not $publicFields.Contains($forbidden)) "Campo de custo $forbidden esta no documento publico do orcamento."
}
$publicPaymentFields = Get-CapturedBlock $firebase 'const PUBLIC_PAYMENT_FIELDS\s*=\s*\[(?<body>.*?)\];' "campos publicos do pagamento"
foreach ($forbidden in @("taxaPercentual", "taxaValor")) {
  Assert-True (-not $publicPaymentFields.Contains($forbidden)) "Taxa privada $forbidden esta no pagamento comercial."
}
$commercialSettings = Get-CapturedBlock $firebase 'function getCommercialWorkspaceSettings\(workspace = \{\}\)\s*\{(?<body>.*?)function getFinancialWorkspaceSettings' "configuracoes comerciais"
Assert-True (-not $commercialSettings.Contains("partsMarkupPercent")) "Margem de pecas vazou nas configuracoes comerciais."
Assert-True (-not $commercialSettings.Contains("paymentRates")) "Taxas de pagamento vazaram nas configuracoes comerciais."
Assert-True ($rules.Contains("match /workspaces/{id}/settings/financial")) "Configuracoes financeiras privadas nao possuem regras dedicadas."
Assert-True ($rules.Contains("isValidPaymentCostUpdate")) "Aprovador sem acesso a custos nao possui escrita limitada da taxa privada."
Assert-True ($rules.Contains("match /{document=**}")) "Regra final de bloqueio ausente."
Assert-True ($rules.Contains("allow read, write: if false;")) "Regra final nao bloqueia acessos desconhecidos."

$declaredPermissionExpressions = [regex]::Matches($allHtml, 'data-requires-permission="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
foreach ($expression in $declaredPermissionExpressions) {
  foreach ($permission in ($expression -split '[|,]')) {
    Assert-True ($permission.Trim() -in $permissionKeys) "HTML exige permissao desconhecida: $permission"
  }
}
Assert-True ($teamHtml.Contains('href="equipe.html" data-nav="equipe"')) "A pagina Equipe nao possui navegacao dedicada."
Assert-True (-not $teamHtml.Contains('id="meuCadastroForm"')) "A pagina Equipe voltou a incorporar o formulario Meu cadastro."

foreach ($htmlFile in $htmlFiles) {
  $content = [System.IO.File]::ReadAllText($htmlFile.FullName)
  $ids = [regex]::Matches($content, '\bid="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
  $duplicateIds = @($ids | Group-Object | Where-Object { $_.Count -gt 1 } | ForEach-Object { $_.Name })
  Assert-True ($duplicateIds.Count -eq 0) "IDs duplicados em $($htmlFile.Name): $($duplicateIds -join ', ')"
  if ($content.Contains('class="nav-menu"')) {
    $dashboardPosition = $content.IndexOf('href="dashboard.html"')
    $operationPosition = $content.IndexOf('href="operacao.html"')
    $clientsPosition = $content.IndexOf('href="clientes.html"')
    Assert-True ($dashboardPosition -ge 0 -and $operationPosition -gt $dashboardPosition -and $operationPosition -lt $clientsPosition) "Operacao nao aparece logo apos Dashboard em $($htmlFile.Name)."
  }
  $localPages = [regex]::Matches($content, 'href="([^"?#]+\.html)(?:[?#][^"]*)?"') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique
  foreach ($localPage in $localPages) {
    Assert-True (Test-Path -LiteralPath (Join-Path $projectRoot $localPage)) "Link local ausente em $($htmlFile.Name): $localPage"
  }
  if ($content.Contains('style.css?v=')) { Assert-True ($content.Contains('style.css?v=128')) "Cache de CSS desatualizado em $($htmlFile.Name)." }
  if ($content.Contains('script.js?v=')) { Assert-True ($content.Contains('script.js?v=109')) "Cache do script desatualizado em $($htmlFile.Name)." }
  if ($content.Contains('firebase-sync.js?v=')) { Assert-True ($content.Contains('firebase-sync.js?v=74')) "Cache do Firebase desatualizado em $($htmlFile.Name)." }
}

Write-Host "OK: $checks verificacoes da matriz de permissoes passaram." -ForegroundColor Green
