import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import vm from "node:vm";
import { validateLaborImport } from "../labor-catalog-import.mjs";

const root = new URL("../", import.meta.url);
const read = (file) => JSON.parse(fs.readFileSync(new URL(file, root), "utf8").replace(/^\uFEFF/, ""));
const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(new URL(file, root))).digest("hex");
const research = read("docs/labor-research/free-sources.json");
const vehicles = read("data/vehicle-configs.json");
const operations = read("data/labor-operations.json");
const files = ["first", "second", "third", "fourth"].map((name) => `docs/labor-research/${name}-batch.json`);
const code = fs.readFileSync(new URL("firebase-sync.js", root), "utf8");
const handler = code.slice(code.indexOf("function getAdminCatalogFormData("), code.indexOf("\nasync function saveAdminLaborTime("));
assert.ok(handler.length > 100);
const allRows = [];
const allInputRows = [];
const allEvidence = new Map();
const importedFindingIds = new Set();
const reports = [];

for (const file of files) {
  const batch = read(file);
  allInputRows.push(...batch.records);
  for (const item of batch.evidence) allEvidence.set(item.url, item);
  const plan = validateLaborImport(batch, { vehicles, operations, existing: allRows });
  assert.deepEqual(plan.errors, [], file);
  assert.equal(plan.valid, true);
  assert.ok(batch.evidence.length && batch.reuseBasis, "Lote sem dossiê de conferência");
  for (const [index, row] of batch.records.entries()) {
    const finding = research.findings.find((item) => item.id === row.researchFindingId);
    assert.ok(finding?.draftEligible, "Referência sem liberação para preparar rascunho");
    assert.equal(importedFindingIds.has(finding.id), false, "Referência repetida entre lotes");
    importedFindingIds.add(finding.id);
    assert.equal(finding.publicationEligible, false, "A preparação não pode aprovar publicação");
    assert.equal(finding.resolvedServiceCode, row.serviceCode);
    assert.ok(finding.candidateVehicleIds.includes(row.vehicleId));
    assert.equal(finding.timeMinutes, plan.records[index].timeMinutes);
    assert.equal(row.timeHours, finding.timeHours);
    assert.equal(row.yearStart, finding.verifiedApplicationSubset.yearStart);
    assert.equal(row.yearEnd, finding.verifiedApplicationSubset.yearEnd);
    assert.equal(row.fuel, finding.verifiedApplicationSubset.fuel);
    assert.equal(plan.records[index].status, "draft");
    assert.equal(row.publicationReviewRequired, true);
    const primarySource = research.sources.find((item) => item.id === finding.sourceId);
    assert.equal(row.source.url, primarySource.url);
    assert.equal(row.source.page, finding.sourcePage || primarySource.page, "Página da fonte divergente");
    for (const applicationId of finding.applicationSourceIds) {
      const applicationSource = research.applicationSources.find((item) => item.id === applicationId);
      assert.ok(row.source.supporting.some((item) => item.url === applicationSource.url), "Catálogo de aplicação ausente do registro");
      assert.ok(plan.records[index].source.includes(applicationSource.url), "Importação perdeu a URL de conferência");
    }
    const normalizedApplication = row.application.replace(/\s+/g, "").toLocaleUpperCase("pt-BR");
    const engineIdentity = finding.verifiedApplicationSubset.engineCode || finding.verifiedApplicationSubset.engineDesignation;
    assert.ok(normalizedApplication.includes(engineIdentity.replace(/\s+/g, "").toLocaleUpperCase("pt-BR")), "Código ou designação documentada do motor deve acompanhar o rascunho");

    // Exercise the actual admin edit handler without browser or Firebase access.
    const ids = {
      adminCatalogVehicle: row.vehicleId, adminCatalogOperation: row.serviceCode,
      adminCatalogYearStart: String(row.yearStart), adminCatalogYearEnd: String(row.yearEnd),
      adminCatalogHours: String(row.timeHours), adminCatalogNotes: plan.records[index].notes
    };
    const sandbox = {
      technicalVehicleConfigs: vehicles, technicalLaborOperations: operations,
      adminLaborTimes: plan.records, adminCatalogEditingId: plan.records[index].id,
      normalizeReadyLaborText: (value) => String(value || "").toLocaleUpperCase("pt-BR"),
      document: { getElementById: (id) => ({ value: ids[id] }) }
    };
    vm.createContext(sandbox);
    const edited = vm.runInContext(`${handler}\ngetAdminCatalogFormData('draft')`, sandbox);
    assert.equal(edited.fuel, row.fuel, "Editar rascunho não pode ampliar combustível");
    assert.equal(edited.source, plan.records[index].source, "A URL deve preservar maiúsculas e minúsculas");
    assert.equal(edited.timeMinutes, finding.timeMinutes);
  }
  assert.equal(validateLaborImport(batch, { vehicles, operations, existing: plan.records }).valid, false, "Reimportação deve ser bloqueada");
  allRows.push(...plan.records);
  const report = {
    preparedOn: batch.preparedOn, batchSha256: hash(file), validForDraftImport: true,
    drafts: plan.records.map(({ id, vehicleId, serviceCode, fuel, yearStart, yearEnd, timeMinutes, status }) => ({ id, vehicleId, serviceCode, fuel, yearStart, yearEnd, timeMinutes, status })),
    duplicateImportBlocked: true, adminEditPreservesFuelAndSource: true,
    onlineCatalogChecked: false, databaseWritesPerformed: 0, automaticPublicationApproved: false,
    limitation: "Validação local de estrutura e rastreabilidade. O painel deve conferir conflitos no catálogo online ao salvar; confirmar a montagem e revisar as condições antes de publicar."
  };
  fs.writeFileSync(new URL(file.replace(/\.json$/, "-validation.json"), root), JSON.stringify(report, null, 2) + "\n");
  reports.push({ file, batchSha256: report.batchSha256, drafts: plan.records.length });
}
assert.equal(importedFindingIds.size, research.findings.filter((item) => item.draftEligible).length, "Referência preparada ausente dos lotes");
const focus = allRows.find((item) => item.id === "labor_import_veh_fda727a70a533aee_SIN-001_2000_2004");
assert.ok(focus);
assert.equal(focus.timeMinutes, 132);
assert.equal(focus.fuel, "Gasolina");
assert.match(focus.notes, /NÃO DISCRIMINA HORAS POR COMPONENTE/);
// A single reviewable file avoids requiring the administrator to upload four separate batches.
const consolidatedFile = "docs/labor-research/ready-drafts.json";
const consolidated = {
  schemaVersion: 1,
  preparedOn: research.researchedOn,
  purpose: "Lote consolidado de referências para importar somente como rascunhos. Conferir as condições de cada aplicação antes de publicar.",
  reuseBasis: "Fatos numéricos limitados, identificação bibliográfica e notas próprias. Não reproduz documentos integrais nem declara licença contratual sobre o material original.",
  evidence: [...allEvidence.values()],
  records: allInputRows
};
const consolidatedPlan = validateLaborImport(consolidated, { vehicles, operations });
assert.deepEqual(consolidatedPlan.errors, []);
assert.deepEqual(consolidatedPlan.records, allRows);
assert.equal(validateLaborImport(consolidated, { vehicles, operations, existing: allRows }).valid, false);
// Regression checks for units and decimal hours: 0.1 h is 6 min, while 10/60 h is 10 min.
const fitDealer = allRows.find((item) => item.vehicleId === "veh_a42d5a03fffe6257" && item.serviceCode === "REV-007" && item.yearStart === 2019);
const fitMann = allRows.find((item) => item.vehicleId === "veh_24dfb78b902f789b" && item.serviceCode === "REV-007");
assert.equal(fitDealer.timeMinutes, 6);
assert.equal(fitMann.timeMinutes, 10);
assert.ok(fitMann.notes.includes("FP 21 003"));
assert.equal(allRows.filter((item) => item.serviceCode === "SUD-002").length, 4);
assert.ok(allRows.filter((item) => item.serviceCode === "SUD-002").every((item) => item.unit === "EIXO"));
fs.writeFileSync(new URL(consolidatedFile, root), JSON.stringify(consolidated, null, 2) + "\n");
fs.writeFileSync(new URL(consolidatedFile.replace(/\.json$/, "-validation.json"), root), JSON.stringify({
  preparedOn: research.researchedOn, batchSha256: hash(consolidatedFile), validForDraftImport: true,
  records: allRows.length, allRecordsAreDrafts: allRows.every((item) => item.status === "draft"),
  duplicateImportBlocked: true, sourceBatches: reports,
  minuteConversionChecked: true, axleUnitChecked: true,
  databaseWritesPerformed: 0, onlineCatalogChecked: false, automaticPublicationApproved: false
}, null, 2) + "\n");
console.log(JSON.stringify({ valid: true, batches: reports, consolidatedFile, totalDrafts: allRows.length, writesPerformed: 0, automaticPublicationApproved: false }, null, 2));
