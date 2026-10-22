const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "..");
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, name), "utf8").replace(/^\uFEFF/, ""));
const vehicles = read("data/vehicle-configs.json");
const operations = read("data/labor-operations.json");
const research = read("docs/labor-research/free-sources.json");
const fail = (message) => { throw new Error(message); };
const sources = new Map(research.sources.map((item) => [item.id, item]));
const applicationSources = new Map((research.applicationSources || []).map((item) => [item.id, item]));
const vehicleIds = new Set(vehicles.map((item) => item.id));
const operationCodes = new Set(operations.map((item) => item.code));
if (sources.size !== research.sources.length) fail("Fonte duplicada.");
if (applicationSources.size !== (research.applicationSources || []).length) fail("Fonte de aplicação duplicada.");
if (new Set(research.findings.map((item) => item.id)).size !== research.findings.length) fail("Referência duplicada.");

for (const item of research.findings) {
  if (!sources.has(item.sourceId)) fail(`Fonte inexistente: ${item.id}`);
  if (item.publicationEligible !== false) fail(`Lote de pesquisa não pode autorizar publicação: ${item.id}`);
  if (item.draftEligible && (!item.verifiedApplicationSubset || !operationCodes.has(item.resolvedServiceCode)
    || item.researchStatus !== "verified_reference_draft" || !item.mappingDecision)) fail(`Rascunho sem conferência documentada: ${item.id}`);
  if (!item.reviewNotes || !item.researchStatus) fail(`Pendência não documentada: ${item.id}`);
  if (item.timeHours === null) {
    if (item.timeMinutes !== null || !item.sourceTimeDescription) fail(`Tempo aproximado inconsistente: ${item.id}`);
  } else if (!Number.isFinite(item.timeHours) || item.timeHours <= 0 || Math.round(item.timeHours * 60) !== item.timeMinutes) {
    fail(`Conversão de horas inválida: ${item.id}`);
  }
  for (const id of item.candidateVehicleIds) if (!vehicleIds.has(id)) fail(`Veículo inexistente: ${id}`);
  for (const code of item.serviceCodeCandidates) if (!operationCodes.has(code)) fail(`Operação inexistente: ${code}`);
  for (const id of item.applicationSourceIds || []) if (!applicationSources.has(id)) fail(`Fonte de aplicação inexistente: ${id}`);
  if (item.verifiedApplicationSubset) {
    const subset = item.verifiedApplicationSubset;
    if (!(subset.engineCode || subset.engineDesignation) || !subset.condition || !item.applicationSourceIds?.length
      || !Number.isInteger(subset.yearStart) || !Number.isInteger(subset.yearEnd) || subset.yearStart > subset.yearEnd) fail(`Recorte sem comprovação: ${item.id}`);
    for (const id of item.candidateVehicleIds) {
      const vehicle = vehicles.find((entry) => entry.id === id);
      if (subset.yearStart < vehicle.yearStart || subset.yearEnd > vehicle.yearEnd) fail(`Recorte fora do cadastro: ${item.id}`);
    }
    const supported = item.applicationSourceIds.some((id) => {
      const application = applicationSources.get(id).application;
      return (Array.isArray(application) ? application : [application]).some((entry) => entry
        && (subset.engineCode
          ? (entry.engineCode === subset.engineCode || entry.engineCodes?.includes(subset.engineCode))
          : (entry.engineDesignation === subset.engineDesignation && entry.vehicleId && item.candidateVehicleIds.includes(entry.vehicleId)))
        && (!entry.fuel || entry.fuel === subset.fuel)
        && entry.yearStart <= subset.yearStart && entry.yearEnd >= subset.yearEnd);
    });
    if (!supported) fail(`Código, anos ou combustível sem suporte no catálogo citado: ${item.id}`);
  }
  if (item.researchStatus === "no_matching_configuration" && item.candidateVehicleIds.length) fail(`Correspondência contraditória: ${item.id}`);
}

const candidates = new Set(research.findings.flatMap((item) => item.candidateVehicleIds));
const makes = [...new Set(vehicles.map((item) => item.make))].sort((a, b) => a.localeCompare(b, "pt-BR"));
const countStatus = (status) => research.findings.filter((item) => item.researchStatus === status).length;
const hash = (name) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, name))).digest("hex");
const summary = {
  researchedOn: research.researchedOn,
  scope: "Pesquisa progressiva de referências gratuitas. Não é levantamento exaustivo das 664 operações nem verificação do banco online.",
  inputHashes: {
    vehicleConfigsSha256: hash("data/vehicle-configs.json"),
    laborOperationsSha256: hash("data/labor-operations.json"),
    researchSha256: hash("docs/labor-research/free-sources.json")
  },
  vehicleConfigurations: vehicles.length,
  makes: makes.length,
  operations: operations.length,
  potentialCartesianPairs: vehicles.length * operations.length,
  configurationsWithoutDedicatedEngineCode: vehicles.filter((item) => !item.engineCode).length,
  configurationsWithoutDedicatedTransmission: vehicles.filter((item) => !item.transmission).length,
  configurationsWithoutDedicatedGeneration: vehicles.filter((item) => !item.generation).length,
  configurationsSpanningAtLeastTenYears: vehicles.filter((item) => item.yearEnd - item.yearStart + 1 >= 10).length,
  consultedDocuments: research.sources.length,
  consultedApplicationDocuments: applicationSources.size,
  findings: research.findings.length,
  numericTimes: research.findings.filter((item) => item.timeHours !== null).length,
  pendingApplicationFindings: countStatus("pending_application"),
  pendingOperationScopeFindings: countStatus("pending_operation_scope"),
  verifiedReferenceDraftFindings: countStatus("verified_reference_draft"),
  findingsWithVerifiedApplicationSubset: research.findings.filter((item) => item.verifiedApplicationSubset).length,
  noMatchingConfigurationFindings: countStatus("no_matching_configuration"),
  insufficientPrecisionFindings: countStatus("insufficient_precision"),
  candidateConfigurations: candidates.size,
  approvedForImport: research.findings.filter((item) => item.draftEligible === true).length,
  approvedForAutomaticPublication: research.findings.filter((item) => item.publicationEligible).length,
  byMake: makes.map((make) => ({
    make,
    configurations: vehicles.filter((item) => item.make === make).length,
    configurationsWithPendingCandidate: vehicles.filter((item) => item.make === make && candidates.has(item.id)).length,
    exhaustiveResearchCompleted: false
  }))
};
fs.writeFileSync(path.join(root, "docs/labor-research/coverage.json"), JSON.stringify(summary, null, 2) + "\n", "utf8");
console.log(JSON.stringify({
  validated: true,
  findings: summary.findings,
  numericTimes: summary.numericTimes,
  sources: summary.consultedDocuments,
  candidateConfigurations: summary.candidateConfigurations,
  approvedForImport: summary.approvedForImport
}, null, 2));
