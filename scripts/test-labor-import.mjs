import assert from "node:assert/strict";
import fs from "node:fs";
import { validateLaborImport, buildLaborImportTemplate } from "../labor-catalog-import.mjs";

const vehicles = [{ id: "vehicle_test", make: "Marca teste", model: "Modelo teste", engine: "1.6 16V", fuel: "Gasolina", aspiration: "Aspirado", yearStart: 2000, yearEnd: 2006 }];
const operations = [{ code: "SIN-001", description: "Trocar correia", system: "Motor", subsystem: "Sincronismo", unit: "Veículo", operationType: "Substituição", active: true }];
const context = { vehicles, operations };
const row = () => ({
  vehicleId: "vehicle_test", serviceCode: "SIN-001", yearStart: 2001, yearEnd: 2002, timeHours: 2.35,
  application: "MOTOR TESTE, GERAÇÃO E CÂMBIO CONFIRMADOS PARA ESTES ANOS",
  source: { title: "Fonte de teste", url: "https://example.test/ManualA.pdf", page: 2, accessedOn: "2026-10-22" },
  applicationVerified: true, operationVerified: true, reuseAllowed: true
});
let checks = 0;
function check(fn) { fn(); checks++; }
const plan = (rows, ctx = context) => validateLaborImport({ schemaVersion: 1, records: rows }, ctx);
check(() => {
  const actual = plan([row()]);
  assert.equal(actual.valid, true);
  assert.equal(actual.records[0].timeMinutes, 141);
  assert.equal(actual.records[0].status, "draft");
  assert.match(actual.records[0].source, /ManualA\.pdf/);
  assert.equal(actual.records[0].description, "SUBST. CORREIA");
});
for (const update of [
  { timeHours: 0 }, { timeHours: -1 }, { timeHours: NaN }, { timeHours: "2,35" }, { timeHours: 200 },
  { yearStart: 1999 }, { yearEnd: 2007 }, { yearEnd: 2000 }, { yearStart: 2001.5 },
  { vehicleId: "unknown" }, { serviceCode: "unknown" },
  { applicationVerified: false }, { operationVerified: false }, { reuseAllowed: false },
  { publicationEligible: false }, { researchStatus: "pending_application" },
  { source: { ...row().source, url: "javascript:alert(1)" } },
  { source: { ...row().source, url: "https://user:password@example.test/" } },
  { source: { ...row().source, accessedOn: "2026-02-30" } },
  { source: { ...row().source, page: 0 } },
  { application: "" }, { notes: "x".repeat(1000) }
]) check(() => assert.equal(plan([{ ...row(), ...update }]).valid, false, JSON.stringify(update)));
check(() => assert.equal(plan([row(), row()]).valid, false));
check(() => assert.equal(plan([row(), { ...row(), yearStart: 2002, yearEnd: 2003 }]).valid, false));
check(() => assert.equal(plan([row(), { ...row(), yearStart: 2003, yearEnd: 2004 }]).valid, true));
check(() => assert.equal(plan([row()], { ...context, existing: [{ ...row(), status: "published" }] }).valid, false));
check(() => assert.equal(plan([row()], { ...context, existing: [{ ...row(), status: "disabled" }] }).valid, true));
check(() => assert.equal(plan([row()], { ...context, operations: [{ ...operations[0], active: false }] }).valid, false));
check(() => assert.throws(() => plan([]), /entre 1 e 100/));
check(() => assert.throws(() => plan(Array.from({ length: 101 }, row)), /entre 1 e 100/));
check(() => assert.throws(() => validateLaborImport(JSON.parse(fs.readFileSync(new URL("../docs/labor-research/free-sources.json", import.meta.url))), context), /Referências de pesquisa/));
check(() => assert.equal(plan(buildLaborImportTemplate(vehicles[0], operations[0]).records).valid, false));
check(() => assert.equal(plan([row()]).records[0].id, plan([row()]).records[0].id));
check(() => {
  const mixed = { ...context, vehicles: [{ ...vehicles[0], fuel: "Gasolina/Flex" }] };
  assert.equal(plan([{ ...row(), fuel: "Gasolina" }], mixed).records[0].fuel, "Gasolina");
  assert.equal(plan([{ ...row(), fuel: " gasolina " }], mixed).records[0].fuel, "Gasolina");
  assert.equal(plan([{ ...row(), fuel: "Diesel" }], mixed).valid, false);
  assert.equal(plan([{ ...row(), fuel: "" }], mixed).valid, false);
  assert.equal(plan([{ ...row(), fuel: {} }], mixed).valid, false);
});
check(() => {
  const extra = { title: "Aplicação brasileira", url: "https://example.test/AplicacaoA.pdf?Produto=Teste", page: 1 };
  const input = { ...row(), source: { ...row().source, supporting: [extra] } };
  const actual = plan([input]);
  assert.equal(actual.valid, true);
  assert.match(actual.records[0].source, /AplicacaoA\.pdf\?Produto=Teste/);
  for (const supporting of [null, {}, [null], [{ ...extra, url: "javascript:alert(1)" }], [{ ...extra, url: "https://user:secret@example.test/" }], [{ ...extra, page: 0 }], Array.from({ length: 4 }, () => extra)]) {
    assert.equal(plan([{ ...input, source: { ...input.source, supporting } }]).valid, false);
  }
});
console.log(`OK: ${checks} verificações de importação; nenhum acesso ao Firebase.`);
