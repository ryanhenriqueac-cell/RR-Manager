// Generates a local UI fixture using the real import handlers and an in-memory database.
// No Firebase SDK, credentials, or real workshop data are loaded.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "firebase-sync.js"), "utf8");
const start = source.indexOf('<section id="adminCatalog"');
const section = source.slice(start, source.indexOf("</section>", start) + "</section>".length);
const getFunction = (name) => {
  const expression = new RegExp(`^(?:async )?function ${name}\\(`, "m");
  const match = expression.exec(source);
  if (!match) throw new Error(`Missing function ${name}`);
  const tail = source.slice(match.index);
  const end = tail.slice(1).search(/^(?:async )?function \w+\(/m);
  return end < 0 ? tail : tail.slice(0, end + 1);
};
const names = ["normalizeCatalogText", "normalizeReadyLaborText", "normalizePublishedLaborTime", "formatCatalogHours", "previewAdminLaborImport", "saveAdminLaborImport", "renderAdminTechnicalCatalog", "renderAdminTechnicalCatalogList"];
const row = {
  vehicleId: "vehicle_test", serviceCode: "SIN-001", yearStart: 2001, yearEnd: 2002,
  timeHours: 2.35, application: "APLICAÇÃO FICTÍCIA PARA TESTE DA INTERFACE",
  source: { title: "Fonte fictícia", url: "https://example.test/ManualA.pdf", page: 2, accessedOn: "2026-10-22" },
  applicationVerified: true, operationVerified: true, reuseAllowed: true
};
const setup = `
import {validateLaborImport, buildLaborImportTemplate} from '../../labor-catalog-import.mjs';
const currentUser={email:'admin@example.test'};
const isAdminUser=(user)=>user?.email==='admin@example.test';
const escapeHtml=(value)=>String(value??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const firebaseError=(error)=>error.message;
const technicalVehicleConfigs=[{id:'vehicle_test',make:'Marca teste',model:'Modelo teste',engine:'1.6 16V',fuel:'Gasolina',aspiration:'Aspirado',yearStart:2000,yearEnd:2006}];
const technicalLaborOperations=[{code:'SIN-001',description:'SUBST. CORREIA DENTADA',system:'MOTOR',subsystem:'SINCRONISMO',operationType:'SUBSTITUIÇÃO',unit:'VEÍCULO',active:true}];
let adminLaborTimes=[],adminCatalogPendingImport=null;
const ADMIN_CATALOG_PAGE_SIZES=[5,10,20];
let adminCatalogPage=1,adminCatalogPageSize=5,adminCatalogFilterKey='';
const db={},TECHNICAL_CATALOG_COLLECTION='mock';
const mockRows=new Map();
let simulateFailure=false;
const collection=()=>({});
const doc=(_db,_collection,id)=>({id});
const serverTimestamp=()=>null;
const getDocs=async()=>({docs:[...mockRows].map(([id,data])=>({id,data:()=>data}))});
const runTransaction=async(_db,callback)=>{
 const pending=[];
 await callback({get:async(ref)=>({exists:()=>mockRows.has(ref.id)}),set:(ref,item)=>pending.push([ref.id,item])});
 if(simulateFailure){simulateFailure=false;throw new Error('Falha simulada de conexão; nenhuma gravação realizada.');}
 pending.forEach(([id,item])=>mockRows.set(id,item));
 document.getElementById('mockWrites').textContent=mockRows.size+' registro(s) no banco simulado';
};
const editAdminLaborTime=()=>{};
const setAdminLaborTimeStatus=()=>{};
`;
const interaction = `
document.getElementById('adminCatalogImportFile').addEventListener('change',previewAdminLaborImport);
document.getElementById('adminCatalogImportSave').addEventListener('click',saveAdminLaborImport);
document.getElementById('adminCatalogImportTemplate').disabled=true;
document.querySelector('.admin-catalog-import').open=true;
const example=${JSON.stringify(row)};
function loadFixture(duplicate){
 const transfer=new DataTransfer();
 transfer.items.add(new File([JSON.stringify({schemaVersion:1,records:duplicate?[example,example]:[example]})],'teste-sintetico.json',{type:'application/json'}));
 const input=document.getElementById('adminCatalogImportFile');input.files=transfer.files;input.dispatchEvent(new Event('change'));
}
document.getElementById('mockValid').onclick=()=>loadFixture(false);
document.getElementById('mockDuplicate').onclick=()=>loadFixture(true);
document.getElementById('mockFail').onclick=()=>{simulateFailure=true;document.getElementById('mockWrites').textContent='Próxima transação terá falha simulada.';};
renderAdminTechnicalCatalog();
document.getElementById('fixtureState').textContent='Pronto para testar';
`;
const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Teste local - importação de mão de obra</title><link rel="stylesheet" href="/style.css?v=138"><body data-page="admin"><main style="max-width:1200px;margin:24px auto;padding:20px"><h1>Importação de mão de obra</h1><p>TESTE LOCAL COM DADOS FICTÍCIOS. Nenhuma conexão com Firebase.</p><div class="actions"><button id="mockValid" class="btn btn-muted">Simular arquivo válido</button><button id="mockDuplicate" class="btn btn-muted">Simular arquivo duplicado</button><button id="mockFail" class="btn btn-muted">Simular falha de conexão</button></div><p id="mockWrites">0 registro(s) no banco simulado</p><p id="fixtureState">Carregando...</p>${section}</main><script type="module">${setup}\n${names.map(getFunction).join("\n")}\n${interaction}</script></body></html>`;
const output = path.join(root, "tmp", "labor-import-preview", "index.html");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, html);
console.log(output);
