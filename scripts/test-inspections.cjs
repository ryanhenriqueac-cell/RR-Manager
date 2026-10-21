// Isolated DOM tests: no Firebase connection or real customer data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require(process.env.RR_JSDOM_PATH || 'jsdom');
const base = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(base, 'script.js'), 'utf8');
const client = { id: 'cli_a', nome: 'Cliente teste', carros: [
  { id: 'car_a', marca: 'Honda', modelo: 'Civic', placa: 'ABC1D23' },
  { id: 'car_b', marca: 'Fiat', modelo: 'Uno', placa: 'DEF4G56' }
] };
let checks = 0;
const check = (value, expected, label) => { assert.deepEqual(value, expected, label); checks++; };
const dump = store => Object.fromEntries(Array.from({length: store.length}, (_, i) => [store.key(i), store.getItem(store.key(i))]));
async function page(file, query = '', local = {}, session = {}) {
  const dom = new JSDOM(fs.readFileSync(path.join(base, file), 'utf8'), {
    url: `https://example.test/${file}${query}`, runScripts: 'outside-only'
  });
  if (dom.window.document.readyState === 'loading') await new Promise(resolve => dom.window.document.addEventListener('DOMContentLoaded', resolve, {once:true}));
  const w = dom.window;
  w.scrollTo = () => {};
  w.matchMedia = () => ({matches:false,addEventListener(){},removeEventListener(){}});
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.fetch = async () => ({ok:true, json:async()=>[]});
  const seed = { rr_cache_context: 'owner:workspace', rr_workspace_branding: '{}', rr_clientes: JSON.stringify([client]), ...local };
  Object.entries(seed).forEach(([k,v]) => w.localStorage.setItem(k,v));
  Object.entries(session).forEach(([k,v]) => w.sessionStorage.setItem(k,v));
  w.eval(source);
  w.rrHasPermission = () => true;
  w.rrGetActor = () => ({uid:'owner'});
  w.rrGetAssignableTeam = () => [{email:'tecnico@example.test',name:'Técnico'}];
  w.rrPersistAppData = async () => {};
  w.rrAlert = async () => {};
  w.rrConfirm = async () => true;
  return w;
}
const value = (w,id,v) => { w.document.getElementById(id).value = v; };
const change = (w,id) => w.document.getElementById(id).dispatchEvent(new w.Event('change',{bubbles:true}));
const input = (w,selector,v) => {const el=w.document.querySelector(selector); el.value=v; el.dispatchEvent(new w.Event('input',{bubbles:true}));};
(async () => {
  const w = await page('orcamentos.html');
  w.initOrcamentos();
  value(w,'orcamentoCliente','cli_a'); change(w,'orcamentoCliente');
  value(w,'orcamentoCarro','car_a'); change(w,'orcamentoCarro');
  value(w,'orcamentoQuilometragem','123456'); value(w,'orcamentoData','2026-10-20');
  value(w,'orcamentoResponsavel','tecnico@example.test'); value(w,'orcamentoValorFinal','678.90');
  input(w,'[data-field="nome"]','Pastilha');
  input(w,'[data-field="custoUnitario"]','50'); input(w,'[data-field="valorUnitario"]','80');
  input(w,'[data-servico-orcamento-index] [data-field="descricao"]','Freios');
  input(w,'[data-servico-orcamento-index] [data-field="horas"]','2');
  input(w,'[data-terceirizado-index] [data-field="descricao"]','Alinhamento');
  input(w,'[data-terceirizado-index] [data-field="custo"]','40');
  input(w,'[data-terceirizado-index] [data-field="valor"]','60');
  value(w,'orcamentoId','orc_draft'); w.saveBudgetDraft();
  value(w,'orcamentoInspecaoId','insp_a'); w.saveBudgetDraft();
  const local = dump(w.localStorage), session = dump(w.sessionStorage);
  const i = await page('inspecao.html','?cliente=cli_a&carro=car_a&orcamento=orc_draft&inspecao=insp_a&voltar=orcamento',local,session);
  i.initInspecao();
  check(i.document.getElementById('saveInspectionButton').hidden,false,'Budget inspections can be saved');
  input(i,'[data-inspection-field="complaints"]','Ruído ao frear');
  input(i,'[data-inspection-field="km"]','123456');
  const select = i.document.querySelector('[data-inspection-status]');
  select.value='attention'; select.dispatchEvent(new i.Event('change',{bubbles:true}));
  const status = select.value;
  input(i,'[data-inspection-note]','Conferir freio');
  await i.document.getElementById('saveInspectionButton').onclick();
  const record = i.readData('inspecoes')[0];
  check(record.orcamentoId,'orc_draft','Stable link before budget is saved');
  check(record.fields.complaints,'Ruído ao frear','Inspection fields persisted');
  check(record.items[select.dataset.inspectionStatus].status,status,'Inspection checklist persisted');
  check(record.updatedBy.uid,'owner','Actor attached to cloud record');
  const r = await page('orcamentos.html','?retomar=1',dump(i.localStorage),dump(i.sessionStorage));
  r.initOrcamentos();
  for(const [id,expected] of Object.entries({orcamentoId:'orc_draft',orcamentoInspecaoId:'insp_a',orcamentoCliente:'cli_a',orcamentoCarro:'car_a',orcamentoQuilometragem:'123456',orcamentoData:'2026-10-20',orcamentoResponsavel:'tecnico@example.test',orcamentoValorFinal:'678.90'})) check(r.document.getElementById(id).value,expected,`${id} restored`);
  check(r.document.querySelector('[data-field="nome"]').value,'PASTILHA','Parts restored');
  check(r.document.querySelector('[data-servico-orcamento-index] [data-field="descricao"]').value,'FREIOS','Labor restored');
  check(r.document.querySelector('[data-terceirizado-index] [data-field="descricao"]').value,'ALINHAMENTO','Outsourced work restored');
  r.dispatchEvent(new r.CustomEvent('rr-workspace-ready'));
  check(r.document.getElementById('orcamentoCarro').value,'car_a','Cloud hydration preserves vehicle');
  await r.saveOrcamento({preventDefault(){},currentTarget:r.document.getElementById('orcamentoForm')});
  check(r.readData('orcamentos')[0].id,'orc_draft','Saving retains inspection budget identity');
  check(r.readData('orcamentos')[0].total,678.9,'Manual total retained');
  check(r.document.getElementById('orcamentoId').value,'','Saved form reset');
  check(r.sessionStorage.getItem(r.budgetDraftKey()),null,'Saved draft removed');
  const savedLocal = dump(r.localStorage);
  const reopened = await page('inspecao.html','?inspecao=insp_a',savedLocal,{});
  reopened.initInspecao();
  check(reopened.document.querySelector('[data-inspection-field="complaints"]').value,'Ruído ao frear','Inspection reopens without session storage');
  input(reopened,'[data-inspection-field="conclusion"]','Trocar pastilhas');
  reopened.rrPersistAppData = async()=>{throw new Error('offline');};
  await reopened.document.getElementById('saveInspectionButton').onclick();
  check(reopened.readData('inspecoes')[0].fields.conclusion,'','Failed save rolls back cloud cache');
  check(Object.keys(dump(reopened.sessionStorage)).some(k=>k.startsWith('rr_inspecao_draft_')),true,'Failed save keeps recoverable draft');
  reopened.initInspecao();
  check(reopened.document.querySelector('[data-inspection-field="conclusion"]').value,'Trocar pastilhas','Reinitialization preserves unsaved inspection');
  const budgets = r.readData('orcamentos');
  budgets.push({...budgets[0],id:'orc_b',numero:2,status:'Aprovado',carroId:'car_b'});
  budgets.push({...budgets[0],id:'orc_c',numero:3,status:'Não aprovado'});
  budgets.push({...budgets[0],id:'orc_other',numero:4,clienteId:'other'});
  savedLocal.rr_orcamentos=JSON.stringify(budgets);
  const h = await page('clientes.html','',savedLocal,{});
  h.renderClientes(); h.openClienteHistorico('cli_a');
  if (process.env.RR_PREVIEW_DIR) {
    const dir=path.resolve(process.env.RR_PREVIEW_DIR);
    fs.mkdirSync(path.join(dir,'assets'),{recursive:true});
    for(const file of ['script.js','style.css']) fs.copyFileSync(path.join(base,file),path.join(dir,file));
    fs.copyFileSync(path.join(base,'assets/logo-rr-manager.png'),path.join(dir,'assets/logo-rr-manager.png'));
    const seed=JSON.stringify(savedLocal).replaceAll('<','\\u003c');
    const html=fs.readFileSync(path.join(base,'clientes.html'),'utf8')
      .replace(/<script[^>]+src="(?:firebase-config|firebase-sync)\.js[^>]*><\/script>/g,'')
      .replace('<script src="script.js',`<script>localStorage.clear();for(const [k,v] of Object.entries(${seed}))localStorage.setItem(k,v);sessionStorage.setItem('rr_validated_access',JSON.stringify({uid:'owner',workspaceId:'workspace'}));window.fetch=async()=>({ok:true,json:async()=>[]});</script><script src="script.js`)
      .replace('</body>','<script>document.addEventListener("DOMContentLoaded",()=>openClienteHistorico("cli_a"));</script></body>');
    fs.writeFileSync(path.join(dir,'clientes.html'),html);
  }
  check(h.document.querySelectorAll('.history-record').length,3,'History excludes other clients');
  check(h.document.getElementById('historicoRegistros').textContent.includes('Sem inspeção vinculada'),true,'Inspections remain optional');
  check(h.document.querySelectorAll('a[href*="inspecao.html"]').length,1,'Inspection linked to matching budget only');
  value(h,'historicoStatus','Aprovado'); h.renderClienteHistorico();
  check(h.document.querySelectorAll('.history-record').length,1,'Approved status filter');
  value(h,'historicoCarro','car_a'); h.renderClienteHistorico();
  check(h.document.querySelectorAll('.history-record').length,0,'Vehicle and status filters combined');
  h.rrHasPermission=p=>p==='clientesVer'; h.renderClienteHistorico();
  check(h.document.querySelectorAll('.history-record').length,0,'History honors budget permission');
  const isolated=await page('orcamentos.html','',{...local,rr_cache_context:'other:other'},session);
  isolated.initOrcamentos();
  check(isolated.document.getElementById('orcamentoCliente').value,'','Draft isolated by account and workspace');
  const edit=await page('orcamentos.html','?editar=orc_b',savedLocal,session);
  edit.initOrcamentos();
  check(edit.document.getElementById('orcamentoId').value,'orc_b','Explicit edit opens requested budget instead of another draft');
  const guarded=await page('orcamentos.html','?editar=orc_draft',savedLocal,{});
  guarded.initOrcamentos();
  value(guarded,'orcamentoCarro','car_b'); change(guarded,'orcamentoCarro');
  check(guarded.document.getElementById('orcamentoCarro').value,'car_a','Saved inspection cannot be reassigned to another vehicle');
  [w,i,r,reopened,h,isolated,edit,guarded].forEach(win=>win.close());
  console.log(`PASS: ${checks} inspection, draft, history and permission checks.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
