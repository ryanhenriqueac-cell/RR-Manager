// Isolated preview of the real admin catalog handlers. Uses local reference data
// and an in-memory database; never loads Firebase or account credentials.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'firebase-sync.js'), 'utf8');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const start = source.indexOf('<section id="adminCatalog"');
const section = source.slice(start, source.indexOf('</section>', start) + '</section>'.length);
const getFunction = name => {
  const match = new RegExp(`^(?:async )?function ${name}\\(`, 'm').exec(source);
  if (!match) throw new Error(`Missing function ${name}`);
  const tail = source.slice(match.index);
  const end = tail.slice(1).search(/^(?:async )?function \w+\(/m);
  return end < 0 ? tail : tail.slice(0, end + 1);
};
const names = ['normalizeCatalogText', 'normalizeReadyLaborText', 'normalizePublishedLaborTime', 'formatCatalogHours',
  'uniqueCatalogValues', 'fillAdminCatalogSelect', 'bindAdminTechnicalCatalog', 'downloadAdminLaborImportTemplate',
  'previewAdminLaborImport', 'saveAdminLaborImport', 'updateAdminCatalogModels', 'updateAdminCatalogVehicles',
  'updateAdminCatalogVehicleDetail', 'updateAdminCatalogOperations', 'updateAdminCatalogOperationDetail',
  'getAdminCatalogFormData', 'saveAdminLaborTime', 'setAdminLaborTimeStatus', 'editAdminLaborTime',
  'resetAdminCatalogForm', 'renderAdminTechnicalCatalog', 'renderAdminTechnicalCatalogList'];
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
const setup = `
import {validateLaborImport, buildLaborImportTemplate} from '/labor-catalog-import.mjs';
const technicalVehicleConfigs=${json(read('data/vehicle-configs.json'))};
const technicalLaborOperations=${json(read('data/labor-operations.json'))};
const batch=${json(read('docs/labor-research/ready-drafts.json'))};
const seed=validateLaborImport(batch,{vehicles:technicalVehicleConfigs,operations:technicalLaborOperations}).records.map(row=>({...row,status:'published'}));
const extraVehicle=technicalVehicleConfigs.find(row=>row.model==='T-Cross' && row.engine.startsWith('1.0'));
const extraOperation=technicalLaborOperations.find(row=>row.code==='SIN-003');
seed.unshift({...seed[0],id:'fixture-extra',vehicleId:extraVehicle.id,make:extraVehicle.make,model:extraVehicle.model,engine:extraVehicle.engine,fuel:extraVehicle.fuel,aspiration:extraVehicle.aspiration,yearStart:extraVehicle.yearStart,yearEnd:extraVehicle.yearEnd,serviceCode:extraOperation.code,system:extraOperation.system,subsystem:extraOperation.subsystem,description:extraOperation.description,timeMinutes:210,source:'Referência fictícia para a prévia local',notes:'Exemplo local para conferir o painel.'});
let adminLaborTimes=structuredClone(seed),adminCatalogEditingId='',adminCatalogPendingImport=null;
const ADMIN_CATALOG_PAGE_SIZES=[5,10,20];
let adminCatalogPage=1,adminCatalogPageSize=5,adminCatalogFilterKey='';
const currentUser={email:'admin@example.test'};
const isAdminUser=user=>user===currentUser;
const publishedLaborTimes=new Map();
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const firebaseError=error=>error.message;
const db={},TECHNICAL_CATALOG_COLLECTION='memory';
const collection=()=>({}),doc=(_db,_collection,id)=>({id}),serverTimestamp=()=>null;
let failNextSave=false;
const memory=new Map(seed.map(row=>[row.id,structuredClone(row)]));
const getDocs=async()=>({docs:[...memory].map(([id,data])=>({id,data:()=>structuredClone(data)}))});
const setDoc=async(ref,data)=>{if(failNextSave){failNextSave=false;throw new Error('Falha simulada');}memory.set(ref.id,structuredClone(data));};
const runTransaction=async(_db,callback)=>{const pending=[];await callback({get:async ref=>({exists:()=>memory.has(ref.id)}),set:(ref,data)=>pending.push([ref.id,data])});pending.forEach(([id,data])=>memory.set(id,structuredClone(data)));};
`;
const interaction = `
bindAdminTechnicalCatalog();
renderAdminTechnicalCatalog();
window.catalogFixture={
  rows:()=>structuredClone(adminLaborTimes),
  page:()=>({page:adminCatalogPage,size:adminCatalogPageSize}),
  replace:rows=>{adminLaborTimes=structuredClone(rows);memory.clear();rows.forEach(row=>memory.set(row.id,structuredClone(row)));renderAdminTechnicalCatalog();},
  failNext:()=>{failNextSave=true;},
  edit:editAdminLaborTime,
  save:saveAdminLaborTime,
  status:setAdminLaborTimeStatus,
  reset:()=>{adminLaborTimes=structuredClone(seed);memory.clear();seed.forEach(row=>memory.set(row.id,structuredClone(row)));adminCatalogPage=1;adminCatalogPageSize=5;adminCatalogFilterKey='';document.getElementById('adminCatalogSearch').value='';document.getElementById('adminCatalogStatus').value='';document.getElementById('adminCatalogPageSize').value='5';resetAdminCatalogForm();renderAdminTechnicalCatalog();}
};
document.getElementById('fixtureState').textContent='Prévia pronta: '+seed.length+' registros locais, sem conexão com Firebase.';
`;
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prévia local do catálogo administrativo</title><link rel="stylesheet" href="/style.css?v=138"></head><body data-page="admin"><main style="max-width:1240px;margin:24px auto;padding:16px"><p id="fixtureState">Carregando prévia local...</p>${section}</main><script type="module">${setup}\n${names.map(getFunction).join('\n')}\n${interaction}</script></body></html>`;
const output = path.join(root, 'tmp/labor-import-preview/catalog.html');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, html, 'utf8');
console.log(output);
