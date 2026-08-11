import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  collection,
  deleteField,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const APP_KEYS = ["rr_clientes", "rr_veiculos", "rr_servicos", "rr_orcamentos", "rr_financeiro"];
const APP_COLLECTIONS = { rr_clientes: "clientes", rr_veiculos: "veiculos", rr_servicos: "servicos", rr_orcamentos: "orcamentos", rr_financeiro: "financeiro" };
const APP_SCHEMA_VERSION = 2;
const MIGRATION_BATCH_SIZE = 400;
const SYNC_FLAG = "rr_firebase_loaded_user";
const REMEMBER_KEY = "rr_firebase_remember";
const ADMIN_WORKSPACE_KEY = "rr_admin_workspace_id";
const REGISTER_PREFILL_KEY = "rr_register_prefill";
const WORKSPACE_BRANDING_KEY = "rr_workspace_branding";
const ONBOARDING_EXPLORE_KEY = "rr_onboarding_explore_page";
const DEFAULT_WORKSHOP_TAGLINE = "Manuten\u00e7\u00e3o Especializada | Paix\u00e3o por Carros";
const DEFAULT_WORKSHOP_LOGO = "assets/logo-rr-manager.png";
const DEFAULT_PARTS_MARKUP_PERCENT = 35;
const DEFAULT_LABOR_HOUR_RATE = 120;
const DEFAULT_PIX_DISCOUNT_PERCENT = 3;
const DEFAULT_MACHINE_RATES = {
  debit: { 1: 1.37 },
  credit: { 1: 3.15, 2: 5.39, 3: 6.12, 4: 6.85, 5: 7.57, 6: 8.28, 7: 8.99, 8: 9.69, 9: 10.38, 10: 11.06, 11: 11.74, 12: 12.40 }
};
const MAX_LOGO_DIMENSION = 1000;
const MAX_LOGO_DATA_URL_LENGTH = 120000;
const ONBOARDING_VERSION = "manager_intro_v2";
const LEGAL_TERMS_VERSION = "1.1";
const LEGAL_PRIVACY_VERSION = "1.1";
const CONTRACT_DOCUMENT_URL = "contrato.html";
const ACCESS_STATUS = {
  PENDING: "pending",
  ACTIVE: "active",
  BLOCKED: "blocked"
};
const config = window.firebaseConfig || {};
const adminAccess = window.rrAdminAccess || {};
const ADMIN_EMAILS = Array.isArray(adminAccess.adminEmails)
  ? adminAccess.adminEmails.map((email) => normalizeEmail(email)).filter(Boolean)
  : [];
const configReady = Boolean(config.apiKey && config.apiKey !== "COLE_AQUI" && config.projectId && config.projectId !== "COLE_AQUI");
const isRegisterPage = document.body.dataset.page === "cadastro-acesso";

let auth;
let db;
let currentUser = null;
let activeWorkspaceId = null;
let activeWorkspaceEmail = "";
let saveTimer = null;
let saveQueue = Promise.resolve();
let cloudReady = false;
let syncingFromCloud = false;
let workspaceSchemaVersion = 1;
let collectionUnsubscribers = [];
const pendingCollectionChanges = new Map();
let adminWorkspaces = [];
let pendingAuthMessage = "";
let pendingAuthModal = null;
let creatingAccessRequest = false;
window.rrFirebaseReady = false;

buildAuthShell();

if (!configReady) {
  showAuthMessage("Configure o Firebase em firebase-config.js para ativar login e banco online.");
  setAppLocked(true);
} else {
  const app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
  patchLocalStorageSync();
  bindAuthEvents();

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    cloudReady = false;

    if (!user) {
      stopCollectionListeners();
      pendingCollectionChanges.clear();
      workspaceSchemaVersion = 1;
      sessionStorage.removeItem(SYNC_FLAG);
      sessionStorage.removeItem(ADMIN_WORKSPACE_KEY);
      localStorage.removeItem(WORKSPACE_BRANDING_KEY);
      activeWorkspaceId = null;
      activeWorkspaceEmail = "";
      setAppLocked(true);
      setAdminSelecting(false);
      setUserStatus("");
      if (pendingAuthMessage) {
        showAuthMessage(pendingAuthMessage);
        pendingAuthMessage = "";
      }
      if (pendingAuthModal) {
        const modal = pendingAuthModal;
        pendingAuthModal = null;
        await showAuthStatusModal(modal.title, modal.message);
      }
      return;
    }

    if (creatingAccessRequest) return;
    if (isRegisterPage) {
      await signOut(auth);
      return;
    }

    activeWorkspaceId = getWorkspaceId(user);
    activeWorkspaceEmail = "";

    if (isAdminUser(user) && !activeWorkspaceId) {
      setAppLocked(false);
      setAdminSelecting(true);
      setUserStatus(user.email);
      await renderAdminDashboard();
      return;
    }

    if (!isAdminUser(user)) {
      const accessStatus = await getWorkspaceAccessStatus(activeWorkspaceId);
      if (accessStatus === ACCESS_STATUS.PENDING || accessStatus === ACCESS_STATUS.BLOCKED) {
        const isPending = accessStatus === ACCESS_STATUS.PENDING;
        pendingAuthMessage = isPending
          ? "Seu acesso ainda está em análise."
          : "Seu acesso está bloqueado.";
        pendingAuthModal = {
          title: isPending ? "Acesso em análise" : "Acesso bloqueado",
          message: isPending
            ? "Seu cadastro foi recebido e ainda precisa ser liberado pelo RR Manager. Aguarde a confirmação para entrar no sistema."
            : "Seu acesso está bloqueado no momento. Entre em contato com o RR Manager para regularizar ou solicitar a liberação."
        };
        await signOut(auth);
        return;
      }
    }

    setAdminSelecting(false);
    setUserStatus(user.email);
    const loadedWorkspace = await loadCloudData(activeWorkspaceId);
    if (!loadedWorkspace) {
      setAppLocked(true);
      return;
    }
    setUserStatus(user.email);
    cloudReady = true;
    window.rrFirebaseReady = true;
    setAppLocked(false);
    startCollectionListeners(activeWorkspaceId);

    if (sessionStorage.getItem(SYNC_FLAG) !== activeWorkspaceId) {
      sessionStorage.setItem(SYNC_FLAG, activeWorkspaceId);
      window.location.reload();
      return;
    }

    await ensureLegalAcceptance(loadedWorkspace);
    maybeShowOnboarding(loadedWorkspace);
  });
}

function createPublicShareId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

window.rrPublishPublicOrcamento = async (data) => {
  if (!currentUser || !db) throw new Error("Login indisponível para publicar orçamento.");
  const id = createPublicShareId();
  await setDoc(doc(db, "public_orcamentos", id), {
    owner: activeWorkspaceId || currentUser.uid,
    ownerUid: currentUser.uid,
    createdAt: serverTimestamp(),
    data
  });
  return id;
};

function buildAuthShell() {
  const shell = document.createElement("div");
  shell.id = "firebaseAuthShell";
  shell.innerHTML = `
    <div class="auth-card">
      <img src="assets/logo-rr-manager.png" alt="RR Manager">
      <h1>${isRegisterPage ? "Criar acesso" : "RR Manager"}</h1>
      <p>${isRegisterPage ? "Preencha seu cadastro para solicitar a liberação do RR Manager." : "Entre para sincronizar clientes, orçamentos e financeiro na nuvem."}</p>
      <form id="firebaseLoginForm" ${isRegisterPage ? "hidden" : ""}>
        <input id="firebaseEmail" type="email" placeholder="E-mail" autocomplete="email" required>
        <div class="password-field">
          <input id="firebasePassword" type="password" placeholder="Senha" autocomplete="current-password" required>
          <button type="button" id="toggleFirebasePassword" aria-label="Mostrar senha" title="Mostrar senha">&#128065;</button>
        </div>
        <label class="remember-login">
          <input id="firebaseRemember" type="checkbox">
          <span>Lembrar meu acesso neste computador</span>
        </label>
        <button class="btn btn-primary" type="submit">Entrar</button>
        <button class="btn btn-ghost" type="button" id="firebaseForgotPassword">Esqueci minha senha</button>
        <button class="btn btn-muted" type="button" id="firebaseCreateAccount">Criar acesso</button>
        <a class="btn btn-ghost" href="index.html">Voltar &agrave; p&aacute;gina principal</a>
      </form>
      <form id="firebaseRegisterForm" class="auth-register-form" ${isRegisterPage ? "" : "hidden"}>
        <div class="auth-register-grid">
          <label>
            <span>Nome completo</span>
            <input id="registerName" type="text" placeholder="Digite seu nome completo" autocomplete="name">
          </label>
          <label>
            <span>Nome da empresa *</span>
            <input id="registerBusinessName" type="text" placeholder="Digite o nome da empresa" autocomplete="organization" required>
          </label>
          <label>
            <span>E-mail *</span>
            <input id="registerEmail" type="email" placeholder="Digite seu e-mail" autocomplete="email" required>
          </label>
          <label>
            <span>Telefone</span>
            <input id="registerPhone" type="tel" placeholder="(31) 99999-9999" autocomplete="tel" maxlength="15">
          </label>
          <label>
            <span>Documento</span>
            <div class="document-options">
              <label><input id="registerDocCpf" type="radio" name="registerDocType" value="CPF" checked> CPF</label>
              <label><input type="radio" name="registerDocType" value="CNPJ"> CNPJ</label>
            </div>
            <input id="registerDocument" type="text" placeholder="XXX.XXX.XXX-YY" maxlength="18">
            <small>Escolha CPF ou CNPJ acima e informe apenas números.</small>
          </label>
          <label>
            <span>Senha *</span>
            <div class="password-field">
              <input id="registerPassword" type="password" placeholder="Crie uma senha (mínimo de 8 dígitos)" autocomplete="new-password" required>
              <button type="button" class="toggle-password" data-password-target="registerPassword" aria-label="Mostrar senha" title="Mostrar senha">&#128065;</button>
            </div>
          </label>
          <label>
            <span>Confirme a senha *</span>
            <div class="password-field">
              <input id="registerPasswordConfirm" type="password" placeholder="Confirme a senha" autocomplete="new-password" required>
              <button type="button" class="toggle-password" data-password-target="registerPasswordConfirm" aria-label="Mostrar senha" title="Mostrar senha">&#128065;</button>
            </div>
          </label>
        </div>
        <p class="auth-legal-notice">Ao solicitar o acesso, você confirma que leu nossa <a href="privacidade.html" target="_blank" rel="noopener">Política de Privacidade</a>. O aceite dos <a href="termos.html" target="_blank" rel="noopener">Termos de Uso</a> será solicitado no primeiro acesso liberado.</p>
        <div class="auth-register-actions">
          <a class="btn btn-ghost" href="index.html">Voltar &agrave; p&aacute;gina principal</a>
          <button class="btn btn-muted" type="button" id="firebaseBackToLogin">Voltar</button>
          <button class="btn btn-primary" type="submit">Salvar cadastro</button>
        </div>
      </form>
      <span id="firebaseAuthMessage"></span>
    </div>
  `;
  document.body.appendChild(shell);
  hydrateRememberedLogin();
  hydrateRegisterPrefill();
  updateRegisterDocumentPlaceholder();
  document.body.classList.toggle("auth-registering", isRegisterPage);

  const adminShell = document.createElement("div");
  adminShell.id = "firebaseAdminShell";
  adminShell.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-header">
        <img src="assets/logo-rr-manager.png" alt="RR Manager">
        <div>
          <span>Admin RR</span>
          <h1>Painel de acessos</h1>
          <p>Escolha um cadastro para abrir o sistema completo.</p>
        </div>
      </div>
      <input id="firebaseAdminSearch" class="admin-search" type="search" placeholder="Buscar por e-mail ou empresa" autocomplete="off">
      <div id="firebaseAdminMessage" class="admin-message"></div>
      <div id="firebaseAdminList" class="admin-workspace-list"></div>
      <button class="btn btn-muted" type="button" id="firebaseAdminLogout">Sair</button>
    </div>
  `;
  document.body.appendChild(adminShell);

  const landingReturn = document.createElement("a");
  landingReturn.id = "firebaseLandingReturn";
  landingReturn.className = "btn btn-muted";
  landingReturn.href = "index.html";
  landingReturn.textContent = "Voltar à página principal";
  document.body.appendChild(landingReturn);
  const bar = document.createElement("div");
  bar.id = "firebaseUserBar";
  bar.innerHTML = `
    <span id="firebaseUserStatus"></span>
    <button class="btn btn-muted" type="button" id="rrOnboardingReplay" hidden>Tutorial</button>
    <button class="btn btn-muted" type="button" id="firebaseAdminBack" hidden>Admin</button>
    <button class="btn btn-muted" type="button" id="firebaseLogout">Sair</button>
  `;
  document.body.appendChild(bar);
}

function bindAuthEvents() {
  document.getElementById("firebaseLoginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    await login();
  });
  document.getElementById("firebaseRegisterForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitAccessRequest();
  });

  document.getElementById("firebaseCreateAccount").addEventListener("click", goToRegisterPage);
  document.getElementById("firebaseForgotPassword").addEventListener("click", resetPassword);
  document.getElementById("firebaseBackToLogin").addEventListener("click", showLoginForm);
  document.getElementById("firebaseLogout").addEventListener("click", logout);
  document.getElementById("firebaseAdminLogout").addEventListener("click", logout);
  document.getElementById("firebaseAdminBack").addEventListener("click", backToAdminDashboard);
  document.getElementById("rrOnboardingReplay").addEventListener("click", () => showOnboarding(true));
  document.getElementById("toggleFirebasePassword").addEventListener("click", () => togglePasswordVisibility("firebasePassword", "toggleFirebasePassword"));
  document.querySelectorAll("[data-password-target]").forEach((button) => {
    button.addEventListener("click", () => togglePasswordVisibility(button.dataset.passwordTarget, null, button));
  });
  document.querySelectorAll("input[name='registerDocType']").forEach((input) => {
    input.addEventListener("change", updateRegisterDocumentPlaceholder);
  });
  bindMaskedInput("registerPhone", formatCadastroPhone);
  bindMaskedInput("registerDocument", (value) => formatCadastroDocument(value, getRegisterDocType()));
  bindMeuCadastroEvents();
}

async function logout() {
  sessionStorage.removeItem(SYNC_FLAG);
  sessionStorage.removeItem(ADMIN_WORKSPACE_KEY);
  await signOut(auth);
}
async function login() {
  const emailInput = document.getElementById("firebaseEmail");
  const email = normalizeEmail(emailInput.value);
  const password = document.getElementById("firebasePassword").value;
  try {
    emailInput.value = email;
    showAuthMessage("Entrando...");
    const remember = document.getElementById("firebaseRemember").checked;
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    await signInWithEmailAndPassword(auth, email, password);
    saveRememberedLogin(email);
  } catch (error) {
    showAuthMessage(firebaseError(error));
  }
}

function goToRegisterPage() {
  const email = normalizeEmail(document.getElementById("firebaseEmail").value);
  sessionStorage.setItem(REGISTER_PREFILL_KEY, JSON.stringify({ email }));
  window.location.href = "cadastro-acesso.html";
}

async function resetPassword() {
  const emailInput = document.getElementById('firebaseEmail');
  const email = normalizeEmail(emailInput?.value);
  if (!email) {
    showAuthMessage('Informe seu e-mail para recuperar a senha.');
    emailInput?.focus();
    return;
  }
  const button = document.getElementById('firebaseForgotPassword');
  const confirmation = 'Se este e-mail estiver cadastrado, o link para criar uma nova senha será enviado. Confira também o spam.';
  button.disabled = true;
  showAuthMessage('Enviando link de recuperação...');
  try {
    auth.languageCode = 'pt-BR';
    await sendPasswordResetEmail(auth, email);
    showAuthMessage(confirmation);
  } catch (error) {
    showAuthMessage(error?.code?.includes('auth/user-not-found') ? confirmation : firebaseError(error));
  } finally {
    button.disabled = false;
  }
}

function showLoginForm() {
  sessionStorage.removeItem(REGISTER_PREFILL_KEY);
  window.location.href = "dashboard.html";
}

function hydrateRegisterPrefill() {
  if (!isRegisterPage) return;
  try {
    const saved = JSON.parse(sessionStorage.getItem(REGISTER_PREFILL_KEY)) || {};
    if (saved.email) document.getElementById("registerEmail").value = normalizeEmail(saved.email);
  } catch (error) {
    sessionStorage.removeItem(REGISTER_PREFILL_KEY);
  }
}

function updateRegisterDocumentPlaceholder() {
  const documentInput = document.getElementById("registerDocument");
  if (!documentInput) return;
  documentInput.placeholder = getDocumentPlaceholder(getRegisterDocType());
  documentInput.maxLength = getRegisterDocType() === "CNPJ" ? 18 : 14;
  documentInput.value = formatCadastroDocument(documentInput.value, getRegisterDocType());
}

function getRegisterDocType() {
  return document.querySelector("input[name='registerDocType']:checked")?.value || "CPF";
}

async function submitAccessRequest() {
  const emailInput = document.getElementById("registerEmail");
  const email = normalizeEmail(emailInput.value);
  const businessName = document.getElementById("registerBusinessName").value.trim();
  const password = document.getElementById("registerPassword").value;
  const passwordConfirm = document.getElementById("registerPasswordConfirm").value;
  try {
    emailInput.value = email;
    if (!email) {
      showAuthMessage("Informe um e-mail para criar o acesso.");
      return;
    }
    if (!businessName) {
      showAuthMessage("Informe o nome da empresa para identificar o cadastro.");
      return;
    }
    if (!password || password.length < 8) {
      showAuthMessage("Crie uma senha com pelo menos 8 dígitos.");
      return;
    }
    if (password !== passwordConfirm) {
      showAuthMessage("A confirmação de senha não confere.");
      return;
    }
    showAuthMessage("Enviando cadastro...");
    const existingMethods = await fetchSignInMethodsForEmail(auth, email);
    if (existingMethods.length) {
      showAuthMessage("Este e-mail já tem acesso. Use Entrar ou recupere a senha no Firebase.");
      return;
    }
    creatingAccessRequest = true;
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    currentUser = credential.user;
    activeWorkspaceId = currentUser.uid;
    activeWorkspaceEmail = currentUser.email;
    await saveAccessRequest(credential.user);
    pendingAuthMessage = "Cadastro concluído e enviado para análise. Aguarde a liberação do administrador.";
    await signOut(auth);
    sessionStorage.removeItem(REGISTER_PREFILL_KEY);
    await showAuthStatusModal(
      "Cadastro concluído",
      "Seu cadastro foi enviado e será analisado para confirmação de acesso."
    );
    window.location.href = "dashboard.html";
  } catch (error) {
    showAuthMessage(firebaseError(error));
  } finally {
    creatingAccessRequest = false;
  }
}

function hydrateRememberedLogin() {
  try {
    const saved = JSON.parse(localStorage.getItem(REMEMBER_KEY)) || {};
    if (!saved.email) return;
    document.getElementById("firebaseEmail").value = saved.email;
    document.getElementById("firebaseRemember").checked = true;
    localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email: saved.email }));
  } catch (error) {
    localStorage.removeItem(REMEMBER_KEY);
  }
}

function saveRememberedLogin(email) {
  const remember = document.getElementById("firebaseRemember").checked;
  if (!remember) {
    localStorage.removeItem(REMEMBER_KEY);
    return;
  }
  localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email }));
}

function togglePasswordVisibility(inputId = "firebasePassword", buttonId = "toggleFirebasePassword", buttonElement = null) {
  const password = document.getElementById(inputId);
  const button = buttonElement || document.getElementById(buttonId);
  if (!password || !button) return;
  const visible = password.type === "text";
  password.type = visible ? "password" : "text";
  button.innerHTML = visible ? "&#128065;" : "&#9679;";
  button.setAttribute("aria-label", visible ? "Mostrar senha" : "Ocultar senha");
  button.title = visible ? "Mostrar senha" : "Ocultar senha";
}

async function loadCloudData(uid) {
  try {
    showAuthMessage("Sincronizando dados...");
    const snap = await getDoc(doc(db, "workspaces", uid));
    if (!snap.exists()) {
      await saveLegacyCloudData();
      const workspace = { ownerEmail: activeWorkspaceEmail || currentUser.email };
      setWorkspaceBrandingContext(workspace);
      renderMeuCadastro(workspace);
      renderContractDocument(workspace);
      showAuthMessage("");
      return workspace;
    }

    const cloudData = snap.data() || {};
    activeWorkspaceEmail = cloudData.ownerEmail || activeWorkspaceEmail;
    setWorkspaceBrandingContext(cloudData);
    renderMeuCadastro(cloudData);
    renderContractDocument(cloudData);
    let data = cloudData.data || {};
    if (Number(cloudData.schemaVersion) >= APP_SCHEMA_VERSION) {
      workspaceSchemaVersion = APP_SCHEMA_VERSION;
      data = await loadV2Collections(uid);
      try {
        await cleanupVerifiedLegacyData(uid, cloudData, data);
      } catch (cleanupError) {
        console.warn("A limpeza dos dados antigos será tentada novamente no próximo acesso.", cleanupError);
      }
    } else {
      try {
        data = await migrateWorkspaceToV2(uid, cloudData);
        workspaceSchemaVersion = APP_SCHEMA_VERSION;
      } catch (migrationError) {
        workspaceSchemaVersion = 1;
        console.warn("Migração v2 adiada; usando sincronização compatível.", migrationError);
      }
    }
    syncingFromCloud = true;
    APP_KEYS.forEach((key) => {
      localStorage.setItem(key, JSON.stringify(Array.isArray(data[key]) ? data[key] : []));
    });
    syncingFromCloud = false;
    showAuthMessage("");
    return cloudData;
  } catch (error) {
    syncingFromCloud = false;
    showAuthMessage(firebaseError(error));
    return null;
  }
}

function getCollectionName(key) {
  return APP_COLLECTIONS[key];
}

function getRecordDocumentId(item, index, key) {
  return encodeURIComponent(String(item?.id || `${key}-${index + 1}`)).slice(0, 1200);
}

async function loadV2Collections(uid) {
  const entries = await Promise.all(APP_KEYS.map(async (key) => {
    const snap = await getDocs(collection(db, "workspaces", uid, getCollectionName(key)));
    return [key, snap.docs.map((record) => record.data())];
  }));
  return Object.fromEntries(entries);
}

async function migrateWorkspaceToV2(uid, workspace) {
  const legacyData = workspace.data || {};
  const operations = [];
  APP_KEYS.forEach((key) => {
    const items = Array.isArray(legacyData[key]) ? legacyData[key] : [];
    items.forEach((item, index) => {
      const value = item?.id ? item : { ...item, id: getRecordDocumentId(item, index, key) };
      operations.push({
        ref: doc(db, "workspaces", uid, getCollectionName(key), getRecordDocumentId(value, index, key)),
        value
      });
    });
  });

  for (let start = 0; start < operations.length; start += MIGRATION_BATCH_SIZE) {
    const batch = writeBatch(db);
    operations.slice(start, start + MIGRATION_BATCH_SIZE).forEach(({ ref, value }) => batch.set(ref, value));
    await batch.commit();
  }

  const migratedData = await loadV2Collections(uid);
  const stats = {};
  for (const key of APP_KEYS) {
    const expected = Array.isArray(legacyData[key]) ? legacyData[key].length : 0;
    const received = migratedData[key].length;
    if (received < expected) throw new Error(`Migração incompleta em ${key}: ${received} de ${expected}.`);
    stats[getCollectionName(key)] = received;
  }
  await setDoc(doc(db, "workspaces", uid), {
    schemaVersion: APP_SCHEMA_VERSION,
    stats,
    migration: { status: "verified", legacyDataRetained: true, verifiedAt: serverTimestamp() },
    updatedAt: serverTimestamp()
  }, { merge: true });
  return migratedData;
}

async function cleanupVerifiedLegacyData(uid, workspace, v2Data) {
  if (!workspace.data || workspace.migration?.legacyDataRetained !== true) return;
  const matches = APP_KEYS.every((key) => {
    const migratedIds = new Set(v2Data[key].map((item, index) => getRecordDocumentId(item, index, key)));
    const legacy = Array.isArray(workspace.data[key]) ? workspace.data[key] : [];
    return legacy.every((item, index) => migratedIds.has(getRecordDocumentId(item, index, key)));
  });
  if (!matches) return;
  await setDoc(doc(db, "workspaces", uid), {
    data: deleteField(),
    migration: { status: "complete", legacyDataRetained: false, completedAt: serverTimestamp() },
    updatedAt: serverTimestamp()
  }, { merge: true });
}

async function saveLegacyCloudData() {
  if (!currentUser || !db || !activeWorkspaceId) return;

  const data = {};
  APP_KEYS.forEach((key) => {
    data[key] = JSON.parse(localStorage.getItem(key)) || [];
  });

  await setDoc(doc(db, "workspaces", activeWorkspaceId), {
    owner: activeWorkspaceId,
    ownerUid: activeWorkspaceId,
    ownerEmail: activeWorkspaceEmail || currentUser.email,
    activeByAdmin: isAdminUser(currentUser),
    updatedAt: serverTimestamp(),
    data
  }, { merge: true });
}

async function flushV2Changes() {
  if (!currentUser || !db || !activeWorkspaceId || !pendingCollectionChanges.size) return;
  const changes = Array.from(pendingCollectionChanges.entries());
  pendingCollectionChanges.clear();
  try {
    for (const [key, change] of changes) {
      const operations = [
        ...Array.from(change.upserts.entries()).map(([id, value]) => ({ type: "set", id, value })),
        ...Array.from(change.deletes).map((id) => ({ type: "delete", id }))
      ];
      for (let start = 0; start < operations.length; start += MIGRATION_BATCH_SIZE) {
        const batch = writeBatch(db);
        operations.slice(start, start + MIGRATION_BATCH_SIZE).forEach((operation) => {
          const ref = doc(db, "workspaces", activeWorkspaceId, getCollectionName(key), operation.id);
          if (operation.type === "set") batch.set(ref, operation.value);
          else batch.delete(ref);
        });
        await batch.commit();
      }
      if (change.delta) {
        const collectionRef = collection(db, "workspaces", activeWorkspaceId, getCollectionName(key));
        const countSnapshot = await getCountFromServer(collectionRef);
        await setDoc(doc(db, "workspaces", activeWorkspaceId), {
          stats: { [getCollectionName(key)]: countSnapshot.data().count },
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    }
  } catch (error) {
    changes.forEach(([key, change]) => mergePendingChange(key, change));
    throw error;
  }
}

function mergePendingChange(key, incoming) {
  const current = pendingCollectionChanges.get(key) || { upserts: new Map(), deletes: new Set(), delta: 0 };
  incoming.upserts.forEach((value, id) => {
    current.deletes.delete(id);
    current.upserts.set(id, value);
  });
  incoming.deletes.forEach((id) => {
    current.upserts.delete(id);
    current.deletes.add(id);
  });
  current.delta += incoming.delta || 0;
  pendingCollectionChanges.set(key, current);
}

function persistCloudData() {
  clearTimeout(saveTimer);
  saveQueue = saveQueue.catch(() => {}).then(() => (
    workspaceSchemaVersion >= APP_SCHEMA_VERSION ? flushV2Changes() : saveLegacyCloudData()
  ));
  return saveQueue;
}

window.rrPersistAppData = async () => {
  if (cloudReady === false) throw new Error('A sincronizacao ainda nao esta pronta.');
  await persistCloudData();
};

function setWorkspaceBrandingContext(workspace = {}) {
  const registration = workspace.registration || {};
  localStorage.setItem(WORKSPACE_BRANDING_KEY, JSON.stringify({
    ownerEmail: workspace.ownerEmail || activeWorkspaceEmail || currentUser?.email || "",
    businessName: workspace.businessName || registration.empresa || "",
    reportName: workspace.reportName || "",
    logoUrl: workspace.logoUrl || "",
    tagline: workspace.tagline || "",
    pixKey: workspace.pixKey || "",
    pixName: workspace.pixName || "",
    pixCity: workspace.pixCity || "",
    partsMarkupPercent: normalizePartsMarkupPercent(workspace.partsMarkupPercent),
    laborHourRate: normalizeLaborHourRate(workspace.laborHourRate),
    paymentRates: normalizePaymentRates(workspace.paymentRates),
    registration
  }));
}

async function saveAccessRequest(user) {
  const docType = document.querySelector("input[name='registerDocType']:checked")?.value || "CPF";
  await setDoc(doc(db, "workspaces", user.uid), {
    owner: user.uid,
    ownerUid: user.uid,
    ownerEmail: user.email,
    businessName: document.getElementById("registerBusinessName").value.trim(),
    accessStatus: ACCESS_STATUS.PENDING,
    onboarding: {
      version: ONBOARDING_VERSION,
      managerIntroCompleted: false
    },
    registration: {
      empresa: document.getElementById("registerBusinessName").value.trim(),
      nome: document.getElementById("registerName").value.trim(),
      telefone: formatCadastroPhone(document.getElementById("registerPhone").value),
      documentoTipo: docType,
      documento: formatCadastroDocument(document.getElementById("registerDocument").value, docType),
      solicitadoEm: new Date().toISOString()
    },
    updatedAt: serverTimestamp(),
    data: APP_KEYS.reduce((acc, key) => ({ ...acc, [key]: [] }), {})
  }, { merge: true });
}

async function getWorkspaceAccessStatus(workspaceId) {
  const snap = await getDoc(doc(db, "workspaces", workspaceId));
  if (!snap.exists()) return ACCESS_STATUS.ACTIVE;
  return snap.data().accessStatus || ACCESS_STATUS.ACTIVE;
}

function showAuthStatusModal(title, message) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "auth-modal-overlay";
    overlay.innerHTML = `
      <div class="auth-modal">
        <img src="assets/logo-rr-manager.png" alt="RR Manager">
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(message)}</p>
        <button class="btn btn-primary" type="button">OK</button>
      </div>
    `;
    overlay.querySelector("button").addEventListener("click", () => {
      overlay.remove();
      resolve();
    });
    document.body.appendChild(overlay);
  });
}

function bindMeuCadastroEvents() {
  if (!document.getElementById("meuCadastroForm")) return;
  document.getElementById("meuCadastroForm").addEventListener("submit", saveMeuCadastro);
  document.getElementById("empresaPersonalizacaoForm")?.addEventListener("submit", saveEmpresaPersonalizacao);
  document.querySelectorAll("input[name='meuCadastroDocType']").forEach((input) => {
    input.addEventListener("change", updateMeuCadastroDocumentPlaceholder);
  });
  bindMaskedInput("meuCadastroTelefone", formatCadastroPhone);
  bindMaskedInput("meuCadastroDocumento", (value) => formatCadastroDocument(value, getMeuCadastroDocType()));
  ["meuCadastroNomeOrcamento", "meuCadastroTagline", "meuCadastroLogoUrl"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", updatePersonalizacaoPreview);
  });
  document.getElementById("meuCadastroLogoImport")?.addEventListener("click", () => {
    document.getElementById("meuCadastroLogoFile")?.click();
  });
  document.getElementById("meuCadastroLogoFile")?.addEventListener("change", handleMeuCadastroLogoImport);
}

function renderMeuCadastro(workspace = {}) {
  const form = document.getElementById("meuCadastroForm");
  if (!form) return;
  const registration = workspace.registration || {};
  const docType = registration.documentoTipo || "CPF";
  const businessName = workspace.businessName || registration.empresa || "";
  document.getElementById("meuCadastroEmpresa").value = businessName;
  document.getElementById("meuCadastroNome").value = registration.nome || "";
  document.getElementById("meuCadastroEmail").value = workspace.ownerEmail || activeWorkspaceEmail || currentUser?.email || "";
  document.getElementById("meuCadastroTelefone").value = formatCadastroPhone(registration.telefone || "");
  document.getElementById("meuCadastroDocumento").value = formatCadastroDocument(registration.documento || "", docType);
  setValueIfExists("meuCadastroNomeOrcamento", workspace.reportName || businessName);
  setValueIfExists("meuCadastroTagline", workspace.tagline || DEFAULT_WORKSHOP_TAGLINE);
  setValueIfExists("meuCadastroLogoUrl", workspace.logoUrl || DEFAULT_WORKSHOP_LOGO);
  setValueIfExists("meuCadastroPixChave", workspace.pixKey || "");
  setValueIfExists("meuCadastroPixNome", workspace.pixName || "");
  setValueIfExists("meuCadastroPixCidade", workspace.pixCity || "");
  document.getElementById("meuCadastroMargemPecas").value = normalizePartsMarkupPercent(workspace.partsMarkupPercent);
  document.getElementById("meuCadastroValorHora").value = normalizeLaborHourRate(workspace.laborHourRate);
  renderPaymentRates(workspace.paymentRates);
  const docTypeInput = document.querySelector(`input[name='meuCadastroDocType'][value='${docType}']`);
  if (docTypeInput) docTypeInput.checked = true;
  updateMeuCadastroDocumentPlaceholder();
  updatePersonalizacaoPreview();
  setMeuCadastroStatus("");
  setMeuCadastroPersonalizacaoStatus("");
}

function formatContractDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "Não registrada";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "America/Sao_Paulo"
  }).format(date);
}

function renderContractDocument(workspace = {}) {
  const root = document.getElementById("contractDocumentRoot");
  if (!root) return;
  const registration = workspace.registration || {};
  const acceptance = workspace.legalAcceptance || {};
  const businessName = workspace.businessName || registration.empresa || "Oficina contratante";
  const responsibleName = registration.nome || "Responsável legal não informado";
  const documentLabel = registration.documentoTipo || "CPF/CNPJ";
  const documentValue = registration.documento || "Não informado";
  const phone = registration.telefone || "Não informado";
  const email = workspace.ownerEmail || activeWorkspaceEmail || currentUser?.email || "Não informado";
  const issueDate = formatContractDate();
  const acceptanceDate = acceptance.acceptedAtClient
    ? formatContractDate(acceptance.acceptedAtClient)
    : "Pendente de aceite";
  const acceptanceYear = acceptance.acceptedAtClient
    ? new Date(acceptance.acceptedAtClient).getFullYear()
    : new Date().getFullYear();
  const contractNumber = `RRM-${String(activeWorkspaceId || currentUser?.uid || "CONTRATO").slice(0, 8).toUpperCase()}-${acceptanceYear}`;

  const pageHeader = (page, title) => `
    <header class="contract-page-header">
      <img src="assets/logo-rr-manager.png" alt="RR Manager">
      <div><strong>RR Manager</strong><span>Contrato de licenciamento de uso do software<br>e prestação de serviços</span></div>
      <b>${String(page).padStart(2, "0")}<small>de 08</small></b>
    </header>
    <div class="contract-page-heading"><span>${String(page).padStart(2, "0")}</span><h2>${title}</h2></div>
  `;
  const pageFooter = (page) => `
    <footer class="contract-page-footer">
      <strong>RR Automotive</strong>
      <span>rrreparacaomanager.com.br · (31) 99785-1561 · rrreparacaomanager@gmail.com · @rr.automotive</span>
      <b>Página ${page} de 8</b>
    </footer>
  `;

  root.innerHTML = `
    <article class="print-document contract-document">
      <section class="contract-sheet contract-cover">
        ${pageHeader(1, "Contrato RR Manager")}
        <div class="contract-cover-hero">
          <img src="assets/logo-rr-manager.png" alt="RR Automotive">
          <p>Software de gestão para oficinas</p>
          <h1>RR <span>Manager</span></h1>
          <h3>Contrato de licenciamento de uso do software<br>e prestação de serviços</h3>
        </div>
        <div class="contract-pillars">
          <div><b>✓</b><strong>Organização</strong><span>Informações centralizadas</span></div>
          <div><b>▥</b><strong>Gestão</strong><span>Controle para decidir melhor</span></div>
          <div><b>↗</b><strong>Agilidade</strong><span>Menos retrabalho na rotina</span></div>
          <div><b>◇</b><strong>Segurança</strong><span>Acesso individual à conta</span></div>
        </div>
        <div class="contract-cover-data">
          <div><strong>Número do contrato</strong><span>${escapeHtml(contractNumber)}</span></div>
          <div><strong>Versão do documento</strong><span>1.1</span></div>
          <div><strong>Data de emissão</strong><span>${escapeHtml(issueDate)}</span></div>
          <div><strong>Início da licença</strong><span>${escapeHtml(acceptanceDate)}</span></div>
          <small>O número usa o prefixo RRM, os 8 primeiros caracteres do identificador interno da conta e o ano de emissão.</small>
        </div>
        <blockquote>“Simplificar a gestão da oficina para que você tenha mais tempo, controle e clareza.”</blockquote>
        ${pageFooter(1)}
      </section>

      <section class="contract-sheet" data-pdf-page>
        ${pageHeader(2, "Dados da contratação")}
        <p class="contract-lead">Identificação da oficina contratante e da condição comercial vinculada a esta licença.</p>
        <div class="contract-two-columns">
          <div class="contract-section">
            <h3>2.1 Dados da oficina</h3>
            <div class="contract-data-grid single">
              <div><strong>Oficina / empresa</strong><span>${escapeHtml(businessName)}</span></div>
              <div><strong>Responsável legal</strong><span>${escapeHtml(responsibleName)}</span></div>
              <div><strong>${escapeHtml(documentLabel)}</strong><span>${escapeHtml(documentValue)}</span></div>
              <div><strong>Telefone / WhatsApp</strong><span>${escapeHtml(phone)}</span></div>
              <div><strong>E-mail de acesso</strong><span>${escapeHtml(email)}</span></div>
            </div>
          </div>
          <div class="contract-section contract-plan-card">
            <h3>2.2 Dados do plano</h3>
            <div><strong>Plano contratado</strong><span>Mensal · condição de lançamento</span></div>
            <div><strong>Valor inicial</strong><span>R$ 59,90 por mês durante 12 meses</span></div>
            <div><strong>Valor posterior</strong><span>R$ 79,90 por mês</span></div>
            <div><strong>Renovação</strong><span>Automática a cada 30 dias</span></div>
            <div><strong>Fidelidade</strong><span>Não há no plano mensal</span></div>
          </div>
        </div>
        <div class="contract-notice"><b>Importante:</b> ao concluir o aceite eletrônico, o cliente declara que leu os Termos de Uso, a Política de Privacidade e as condições deste contrato.</div>
        ${pageFooter(2)}
      </section>

      <section class="contract-sheet" data-pdf-page>
        ${pageHeader(3, "Sobre o RR Manager")}
        <p class="contract-lead">O RR Manager é uma plataforma web desenvolvida pela RR Automotive para centralizar informações e apoiar a rotina administrativa de oficinas automotivas.</p>
        <div class="contract-highlight">Mais organização, mais controle e mais tempo para atender seus clientes.</div>
        <h3 class="contract-grid-title">Recursos disponíveis atualmente</h3>
        <div class="contract-resource-grid">
          <div><b>CL</b><strong>Clientes</strong><span>Cadastro e consulta dos dados de atendimento.</span></div>
          <div><b>VE</b><strong>Veículos</strong><span>Dados técnicos e vínculo com seus proprietários.</span></div>
          <div><b>PS</b><strong>Peças e serviços</strong><span>Catálogo para agilizar a criação de orçamentos.</span></div>
          <div><b>OR</b><strong>Orçamentos</strong><span>Cálculos, personalização e acompanhamento de status.</span></div>
          <div><b>WA</b><strong>WhatsApp</strong><span>Compartilhamento de propostas e documentos.</span></div>
          <div><b>IN</b><strong>Inspeção</strong><span>Checklist automotivo com geração de PDF.</span></div>
          <div><b>FI</b><strong>Financeiro</strong><span>Registro de receitas, custos e despesas.</span></div>
          <div><b>RE</b><strong>Relatórios</strong><span>Resumo financeiro por períodos selecionados.</span></div>
          <div><b>NU</b><strong>Nuvem</strong><span>Sincronização dos dados da conta autenticada.</span></div>
        </div>
        ${pageFooter(3)}
      </section>

      <section class="contract-sheet" data-pdf-page>
        ${pageHeader(4, "Objeto e serviços")}
        <div class="contract-section"><h3>4.1 Objeto do contrato</h3><p>A RR Automotive concede à contratante licença limitada, não exclusiva, intransferível e revogável para acessar e utilizar o RR Manager durante a vigência da assinatura, conforme os limites deste documento.</p></div>
        <div class="contract-section"><h3>4.2 Serviços e funcionalidades incluídas</h3><div class="contract-feature-grid detailed">
          <span><strong>Gestão cadastral</strong> Clientes, veículos, peças e serviços.</span>
          <span><strong>Orçamentos</strong> Criação, cálculo e personalização.</span>
          <span><strong>Compartilhamento</strong> Envio pelo WhatsApp e links públicos.</span>
          <span><strong>Inspeções</strong> Checklist e relatório visual em PDF.</span>
          <span><strong>Financeiro</strong> Lançamentos e visão de resultados.</span>
          <span><strong>Documentos</strong> Impressão, PDF e compartilhamento móvel.</span>
          <span><strong>Personalização</strong> Logo, dados da empresa, Pix e taxas.</span>
          <span><strong>Sincronização</strong> Dados vinculados ao ambiente da oficina.</span>
        </div></div>
        <div class="contract-notice"><b>Limites do escopo:</b> funcionalidades futuras, integrações, emissão fiscal, estoque e ordem de serviço somente integrarão o contrato quando estiverem efetivamente disponibilizadas e comunicadas pela RR Automotive.</div>
        ${pageFooter(4)}
      </section>

      <section class="contract-sheet" data-pdf-page>
        ${pageHeader(5, "Cláusulas contratuais")}
        <div class="contract-clause-grid">
          <div><b>1</b><p><strong>Objeto</strong>Licenciamento do RR Manager e serviços associados descritos neste contrato.</p></div>
          <div><b>2</b><p><strong>Licenciamento</strong>Acesso não exclusivo, intransferível e limitado ao plano contratado.</p></div>
          <div><b>3</b><p><strong>Pagamento</strong>Valores, vencimentos e meios seguem a condição comercial vigente.</p></div>
          <div><b>4</b><p><strong>Suporte</strong>Atendimento pelos canais oficiais dentro da disponibilidade informada.</p></div>
          <div><b>5</b><p><strong>Segurança</strong>Medidas técnicas e administrativas compatíveis com a operação.</p></div>
          <div><b>6</b><p><strong>Atualizações</strong>Correções, melhorias e mudanças de segurança poderão ser realizadas.</p></div>
          <div><b>7</b><p><strong>Proteção de dados</strong>Tratamento conforme a LGPD, Termos e Política de Privacidade.</p></div>
          <div><b>8</b><p><strong>Propriedade intelectual</strong>Marca, código, design e conteúdos pertencem à RR Automotive.</p></div>
          <div><b>9</b><p><strong>Responsabilidade</strong>A oficina confere dados, cálculos, serviços e decisões comerciais.</p></div>
          <div><b>10</b><p><strong>Rescisão</strong>Permitida nos casos previstos neste contrato e na legislação.</p></div>
          <div class="wide"><b>11</b><p><strong>Legislação e foro</strong>Aplicam-se as leis brasileiras, respeitados os direitos legais de escolha de foro do consumidor quando aplicáveis.</p></div>
        </div>
        ${pageFooter(5)}
      </section>

      <section class="contract-sheet" data-pdf-page>
        ${pageHeader(6, "Condições comerciais")}
        <div class="contract-section"><h3>6.1 Licenciamento e cobrança</h3><p>O plano mensal concede acesso por períodos sucessivos de 30 dias. A condição promocional custa R$ 59,90 mensais durante os primeiros 12 meses. Depois desse período, passa a vigorar o preço oficial de R$ 79,90 mensais, sem prejuízo de reajustes futuros comunicados previamente.</p></div>
        <div class="contract-commercial-grid">
          <div><strong>Pagamento</strong><span>Pelos meios disponibilizados pela RR Automotive.</span></div>
          <div><strong>Vencimento</strong><span>Na data informada durante a contratação.</span></div>
          <div><strong>Reajuste</strong><span>Poderá ocorrer anualmente mediante comunicação prévia.</span></div>
          <div><strong>Inadimplência</strong><span>Poderá causar bloqueio após comunicação ao cliente.</span></div>
        </div>
        <div class="contract-section"><h3>6.2 Cancelamento e rescisão</h3><p>O cliente pode cancelar o plano mensal a qualquer momento. O cancelamento produz efeitos ao final do período já pago, sem devolução proporcional. A RR Automotive poderá rescindir ou suspender o acesso por inadimplência, uso indevido, risco à segurança ou violação contratual, observada comunicação quando cabível.</p></div>
        <div class="contract-section"><h3>6.3 Disponibilidade</h3><p>O funcionamento depende de internet, navegador, serviços de hospedagem, autenticação e banco de dados de terceiros. Manutenções e indisponibilidades poderão ocorrer; a RR Automotive buscará restabelecer o serviço e comunicar intervenções programadas relevantes.</p></div>
        ${pageFooter(6)}
      </section>

      <section class="contract-sheet" data-pdf-page>
        ${pageHeader(7, "Direitos e obrigações")}
        <div class="contract-two-columns obligations">
          <div class="contract-section"><h3>7.1 RR Automotive</h3><ul>
            <li>Disponibilizar acesso às funções incluídas no plano.</li>
            <li>Realizar correções e manutenções necessárias.</li>
            <li>Prestar orientação pelos canais oficiais.</li>
            <li>Adotar medidas razoáveis de proteção dos dados.</li>
            <li>Informar alterações contratuais ou comerciais relevantes.</li>
          </ul></div>
          <div class="contract-section"><h3>7.2 Cliente</h3><ul>
            <li>Usar a plataforma de forma legal e conforme este contrato.</li>
            <li>Manter cadastro e pagamentos atualizados.</li>
            <li>Proteger login, senha e acesso à conta.</li>
            <li>Conferir documentos antes de enviá-los.</li>
            <li>Possuir base legal para tratar dados de seus clientes.</li>
          </ul></div>
        </div>
        <div class="contract-section"><h3>7.3 Práticas proibidas</h3><div class="contract-prohibited-grid">
          <span>Compartilhar ou ceder acesso a terceiros não autorizados.</span><span>Realizar engenharia reversa ou distribuir o software.</span><span>Utilizar a plataforma para fraude ou finalidade ilícita.</span><span>Remover marcas ou tentar contornar controles de acesso.</span>
        </div></div>
        ${pageFooter(7)}
      </section>

      <section class="contract-sheet" data-pdf-page>
        ${pageHeader(8, "Disposições finais")}
        <div class="contract-clause-grid final">
          <div><b>8.1</b><p><strong>Legislação</strong>Este contrato é regido pelas leis da República Federativa do Brasil.</p></div>
          <div><b>8.2</b><p><strong>Alterações</strong>Mudanças específicas poderão ser formalizadas por escrito entre as partes.</p></div>
          <div><b>8.3</b><p><strong>Comunicações</strong>Serão realizadas por e-mail, sistema ou canais oficiais informados.</p></div>
          <div><b>8.4</b><p><strong>Independência</strong>Este contrato não cria vínculo empregatício ou societário.</p></div>
          <div><b>8.5</b><p><strong>Nulidade parcial</strong>A invalidade de uma disposição não prejudica as demais.</p></div>
          <div><b>8.6</b><p><strong>Integralidade</strong>Contrato, Termos e Política formam o acordo aplicável à licença.</p></div>
        </div>
        <section class="contract-acceptance-record">
          <h3>Registro eletrônico do aceite</h3>
          <div><strong>Contrato:</strong> ${escapeHtml(contractNumber)}</div>
          <div><strong>Data registrada:</strong> ${escapeHtml(acceptanceDate)}</div>
          <div><strong>Versão dos Termos:</strong> ${escapeHtml(acceptance.termsVersion || LEGAL_TERMS_VERSION)}</div>
          <div><strong>Versão da Privacidade:</strong> ${escapeHtml(acceptance.privacyVersion || LEGAL_PRIVACY_VERSION)}</div>
          <div class="wide"><strong>Usuário:</strong> ${escapeHtml(acceptance.acceptedByEmail || email)}</div>
        </section>
        <section class="contract-signatures">
          <div><span></span><strong>RR Automotive</strong><small>Contratada</small></div>
          <div><span></span><strong>${escapeHtml(responsibleName)}</strong><small>Responsável pela contratante</small></div>
        </section>
        ${pageFooter(8)}
      </section>
    </article>
  `;
}

function setValueIfExists(id, value) {
  const input = document.getElementById(id);
  if (input) input.value = value || "";
}

function updatePersonalizacaoPreview() {
  const companyName = document.getElementById("meuCadastroNomeOrcamento")?.value
    || document.getElementById("meuCadastroEmpresa")?.value
    || "Nome da empresa";
  const tagline = document.getElementById("meuCadastroTagline")?.value || DEFAULT_WORKSHOP_TAGLINE;
  const logoUrl = document.getElementById("meuCadastroLogoUrl")?.value || DEFAULT_WORKSHOP_LOGO;
  const previewName = document.getElementById("meuCadastroPreviewNome");
  const previewTagline = document.getElementById("meuCadastroPreviewTagline");
  const previewLogo = document.getElementById("meuCadastroLogoPreview");
  if (previewName) previewName.textContent = companyName;
  if (previewTagline) previewTagline.textContent = tagline;
  if (previewLogo) previewLogo.src = logoUrl;
}

async function handleMeuCadastroLogoImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    setMeuCadastroPersonalizacaoStatus("Escolha uma imagem PNG, JPG ou WebP.");
    return;
  }
  try {
    setMeuCadastroPersonalizacaoStatus("Preparando logo...");
    const logoDataUrl = await resizeLogoFile(file);
    setValueIfExists("meuCadastroLogoUrl", logoDataUrl);
    updatePersonalizacaoPreview();
    setMeuCadastroPersonalizacaoStatus("Logo importada. Clique em Salvar personalizacao.");
  } catch (error) {
    setMeuCadastroPersonalizacaoStatus("Nao foi possivel importar a logo.");
  } finally {
    event.target.value = "";
  }
}

function resizeLogoFile(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      let maxDimension = MAX_LOGO_DIMENSION;
      let quality = 0.92;
      let dataUrl = "";

      for (let attempt = 0; attempt < 10; attempt += 1) {
        const ratio = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.max(1, Math.round(image.naturalWidth * ratio));
        const height = Math.max(1, Math.round(image.naturalHeight * ratio));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.clearRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        dataUrl = canvas.toDataURL("image/webp", quality);
        if (dataUrl.length <= MAX_LOGO_DATA_URL_LENGTH) break;
        if (quality > 0.72) quality -= 0.08;
        else maxDimension = Math.max(900, Math.round(maxDimension * 0.82));
      }

      URL.revokeObjectURL(objectUrl);
      resolve(dataUrl);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("invalid-logo"));
    };
    image.src = objectUrl;
  });
}

function updateMeuCadastroDocumentPlaceholder() {
  const input = document.getElementById("meuCadastroDocumento");
  if (!input) return;
  input.placeholder = getDocumentPlaceholder(getMeuCadastroDocType());
  input.maxLength = getMeuCadastroDocType() === "CNPJ" ? 18 : 14;
  input.value = formatCadastroDocument(input.value, getMeuCadastroDocType());
}

function getMeuCadastroDocType() {
  return document.querySelector("input[name='meuCadastroDocType']:checked")?.value || "CPF";
}

function bindMaskedInput(inputId, formatter) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener("input", () => {
    input.value = formatter(input.value);
  });
}

function getDocumentPlaceholder(type) {
  return type === "CNPJ" ? "AA.AAA.AAA/AAAA-DV" : "XXX.XXX.XXX-YY";
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatCadastroPhone(value) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCadastroDocument(value, type) {
  const digits = onlyDigits(value).slice(0, type === "CNPJ" ? 14 : 11);
  if (type === "CNPJ") {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

async function saveMeuCadastro(event) {
  event.preventDefault();
  if (!currentUser || !db || !activeWorkspaceId) return;
  const businessName = document.getElementById("meuCadastroEmpresa").value.trim();
  if (!businessName) {
    setMeuCadastroStatus("Informe o nome da empresa.");
    return;
  }
  try {
    const snap = await getDoc(doc(db, "workspaces", activeWorkspaceId));
    const currentData = snap.exists() ? snap.data() || {} : {};
    const currentRegistration = currentData.registration || {};
    const docType = document.querySelector("input[name='meuCadastroDocType']:checked")?.value || "CPF";
    const customization = getEmpresaPersonalizacaoPayload(businessName);
    setMeuCadastroStatus("Salvando...");
    await setDoc(doc(db, "workspaces", activeWorkspaceId), {
      businessName,
      ...customization,
      registration: {
        ...currentRegistration,
        empresa: businessName,
        nome: document.getElementById("meuCadastroNome").value.trim(),
        telefone: formatCadastroPhone(document.getElementById("meuCadastroTelefone").value),
        documentoTipo: docType,
        documento: formatCadastroDocument(document.getElementById("meuCadastroDocumento").value, docType),
        atualizadoEm: new Date().toISOString()
      },
      updatedAt: serverTimestamp()
    }, { merge: true });
    setWorkspaceBrandingContext({
      ownerEmail: activeWorkspaceEmail || currentUser.email,
      businessName,
      ...customization,
      registration: {
        ...currentRegistration,
        empresa: businessName,
        nome: document.getElementById("meuCadastroNome").value.trim(),
        telefone: formatCadastroPhone(document.getElementById("meuCadastroTelefone").value),
        documentoTipo: docType,
        documento: formatCadastroDocument(document.getElementById("meuCadastroDocumento").value, docType)
      }
    });
    updatePersonalizacaoPreview();
    setMeuCadastroStatus("Cadastro salvo.");
  } catch (error) {
    setMeuCadastroStatus(firebaseError(error));
  }
}

function normalizePartsMarkupPercent(value) {
  if (value === "" || value === null || value === undefined) return DEFAULT_PARTS_MARKUP_PERCENT;
  const percent = Number(value);
  return Number.isFinite(percent) && percent >= 0 ? percent : DEFAULT_PARTS_MARKUP_PERCENT;
}

function normalizeLaborHourRate(value) {
  if (value === "" || value === null || value === undefined) return DEFAULT_LABOR_HOUR_RATE;
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 0 ? rate : DEFAULT_LABOR_HOUR_RATE;
}
function normalizeMachineRate(value, fallback) {
  if (value === "" || value === null || value === undefined) return fallback;
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 0 && rate < 100 ? rate : fallback;
}

function normalizePaymentRates(value = {}) {
  const debitSource = value.debit || {};
  const creditSource = value.credit || {};
  const credit = {};
  for (let installment = 1; installment <= 12; installment += 1) {
    credit[installment] = normalizeMachineRate(creditSource[installment], DEFAULT_MACHINE_RATES.credit[installment]);
  }
  return {
    pixDiscountPercent: normalizeMachineRate(value.pixDiscountPercent, DEFAULT_PIX_DISCOUNT_PERCENT),
    debit: { 1: normalizeMachineRate(debitSource[1], DEFAULT_MACHINE_RATES.debit[1]) },
    credit
  };
}

function renderPaymentRates(value = {}) {
  const rates = normalizePaymentRates(value);
  setValueIfExists("meuCadastroDescontoPix", rates.pixDiscountPercent);
  setValueIfExists("meuCadastroTaxaDebito", rates.debit[1]);
  for (let installment = 1; installment <= 12; installment += 1) {
    setValueIfExists(`meuCadastroTaxaCredito${installment}`, rates.credit[installment]);
  }
}

function getPaymentRatesPayload() {
  const credit = {};
  for (let installment = 1; installment <= 12; installment += 1) {
    credit[installment] = normalizeMachineRate(
      document.getElementById(`meuCadastroTaxaCredito${installment}`)?.value,
      DEFAULT_MACHINE_RATES.credit[installment]
    );
  }
  return {
    pixDiscountPercent: normalizeMachineRate(document.getElementById("meuCadastroDescontoPix")?.value, DEFAULT_PIX_DISCOUNT_PERCENT),
    debit: {
      1: normalizeMachineRate(document.getElementById("meuCadastroTaxaDebito")?.value, DEFAULT_MACHINE_RATES.debit[1])
    },
    credit
  };
}

function getEmpresaPersonalizacaoPayload(fallbackName = "") {
  const reportName = document.getElementById("meuCadastroNomeOrcamento")?.value.trim() || fallbackName;
  return {
    reportName,
    logoUrl: document.getElementById("meuCadastroLogoUrl")?.value.trim() || DEFAULT_WORKSHOP_LOGO,
    tagline: document.getElementById("meuCadastroTagline")?.value.trim() || DEFAULT_WORKSHOP_TAGLINE,
    pixKey: document.getElementById("meuCadastroPixChave")?.value.trim() || "",
    pixName: document.getElementById("meuCadastroPixNome")?.value.trim() || "",
    pixCity: document.getElementById("meuCadastroPixCidade")?.value.trim() || "",
    partsMarkupPercent: normalizePartsMarkupPercent(document.getElementById("meuCadastroMargemPecas")?.value),
    laborHourRate: normalizeLaborHourRate(document.getElementById("meuCadastroValorHora")?.value),
    paymentRates: getPaymentRatesPayload()
  };
}

async function saveEmpresaPersonalizacao(event) {
  event.preventDefault();
  if (!currentUser || !db || !activeWorkspaceId) return;
  const businessName = document.getElementById("meuCadastroEmpresa")?.value.trim() || "";
  const customization = getEmpresaPersonalizacaoPayload(businessName);
  try {
    setMeuCadastroPersonalizacaoStatus("Salvando...");
    await setDoc(doc(db, "workspaces", activeWorkspaceId), {
      ...customization,
      updatedAt: serverTimestamp()
    }, { merge: true });
    setWorkspaceBrandingContext({
      ownerEmail: activeWorkspaceEmail || currentUser.email,
      businessName,
      ...customization,
      registration: { empresa: businessName }
    });
    updatePersonalizacaoPreview();
    setMeuCadastroPersonalizacaoStatus("Personalizacao salva.");
  } catch (error) {
    setMeuCadastroPersonalizacaoStatus(firebaseError(error));
  }
}

function setMeuCadastroStatus(message) {
  const status = document.getElementById("meuCadastroStatus");
  if (status) status.textContent = message;
}

function setMeuCadastroPersonalizacaoStatus(message) {
  const status = document.getElementById("meuCadastroPersonalizacaoStatus");
  if (status) status.textContent = message;
}

function hasCurrentLegalAcceptance(workspace = {}) {
  const acceptance = workspace.legalAcceptance || {};
  return acceptance.termsVersion === LEGAL_TERMS_VERSION
    && acceptance.privacyVersion === LEGAL_PRIVACY_VERSION;
}

async function ensureLegalAcceptance(workspace = {}) {
  if (!currentUser || isAdminUser(currentUser) || !isOnboardingPage() || hasCurrentLegalAcceptance(workspace)) return;
  await showLegalAcceptanceModal();
}

function showLegalAcceptanceModal() {
  return new Promise((resolve) => {
    document.querySelector(".legal-acceptance-overlay")?.remove();
    document.body.classList.add("legal-acceptance-pending");

    const overlay = document.createElement("div");
    overlay.className = "legal-acceptance-overlay";
    overlay.innerHTML = `
      <div class="legal-acceptance-card" role="dialog" aria-modal="true" aria-labelledby="legalAcceptanceTitle">
        <div class="legal-acceptance-head">
          <img src="assets/logo-rr-manager.png" alt="RR Manager">
          <div>
            <span>PRIMEIRO ACESSO</span>
            <h2 id="legalAcceptanceTitle">Privacidade e Termos de Uso</h2>
          </div>
        </div>
        <p>Antes do tutorial, leia os documentos que explicam as regras do RR Manager e como os dados pessoais são tratados.</p>
        <div class="legal-acceptance-links">
          <a href="termos.html" target="_blank" rel="noopener">Ler Termos de Uso <small>versão ${LEGAL_TERMS_VERSION}</small></a>
          <a href="privacidade.html" target="_blank" rel="noopener">Ler Política de Privacidade <small>versão ${LEGAL_PRIVACY_VERSION}</small></a>
        </div>
        <label class="legal-acceptance-check"><input type="checkbox" data-legal-terms><span>Li e aceito os Termos de Uso.</span></label>
        <label class="legal-acceptance-check"><input type="checkbox" data-legal-privacy><span>Li e estou ciente da Política de Privacidade.</span></label>
        <p class="legal-acceptance-status" role="status"></p>
        <div class="legal-acceptance-actions">
          <button class="btn btn-muted" type="button" data-legal-logout>Sair</button>
          <button class="btn btn-muted" type="button" data-legal-contract disabled>Imprimir / gerar PDF do contrato</button>
          <button class="btn btn-primary" type="button" data-legal-accept disabled>Aceitar e continuar</button>
        </div>
      </div>
    `;

    const termsCheckbox = overlay.querySelector("[data-legal-terms]");
    const privacyCheckbox = overlay.querySelector("[data-legal-privacy]");
    const acceptButton = overlay.querySelector("[data-legal-accept]");
    const contractButton = overlay.querySelector("[data-legal-contract]");
    const logoutButton = overlay.querySelector("[data-legal-logout]");
    const status = overlay.querySelector(".legal-acceptance-status");

    function updateButton() {
      const confirmed = termsCheckbox.checked && privacyCheckbox.checked;
      acceptButton.disabled = !confirmed;
      contractButton.disabled = !confirmed;
    }

    termsCheckbox.addEventListener("change", updateButton);
    privacyCheckbox.addEventListener("change", updateButton);
    contractButton.addEventListener("click", () => {
      window.open(CONTRACT_DOCUMENT_URL, "_blank", "noopener");
    });
    logoutButton.addEventListener("click", async () => {
      overlay.remove();
      document.body.classList.remove("legal-acceptance-pending");
      await logout();
    });
    acceptButton.addEventListener("click", async () => {
      if (!termsCheckbox.checked || !privacyCheckbox.checked || !currentUser || !db || !activeWorkspaceId) return;
      acceptButton.disabled = true;
      logoutButton.disabled = true;
      status.textContent = "Registrando seu aceite...";
      try {
        await setDoc(doc(db, "workspaces", activeWorkspaceId), {
          legalAcceptance: {
            termsVersion: LEGAL_TERMS_VERSION,
            privacyVersion: LEGAL_PRIVACY_VERSION,
            acceptedAt: serverTimestamp(),
            acceptedAtClient: new Date().toISOString(),
            acceptedByUid: currentUser.uid,
            acceptedByEmail: currentUser.email || ""
          },
          updatedAt: serverTimestamp()
        }, { merge: true });
        overlay.remove();
        document.body.classList.remove("legal-acceptance-pending");
        resolve(true);
      } catch (error) {
        status.textContent = firebaseError(error);
        acceptButton.disabled = false;
        logoutButton.disabled = false;
      }
    });

    document.body.appendChild(overlay);
    termsCheckbox.focus();
  });
}

function isOnboardingPage() {
  return ["dashboard", "clientes", "orcamentos", "financeiro", "meu-cadastro", "servicos", "veiculos"].includes(document.body.dataset.page || "");
}

function isTutorialAvailablePage() {
  return isOnboardingPage() || document.body.dataset.page === "inspecao";
}

function getOnboardingLocalKey() {
  return `rr_onboarding_${ONBOARDING_VERSION}_${activeWorkspaceId || currentUser?.uid || "local"}`;
}

function getOnboardingStepKey() {
  return `${getOnboardingLocalKey()}_step`;
}

function maybeShowOnboarding(workspace = {}) {
  if (!currentUser || isAdminUser(currentUser) || !isOnboardingPage()) return;
  const explorePage = sessionStorage.getItem(ONBOARDING_EXPLORE_KEY);
  if (explorePage && window.location.pathname.endsWith(`/${explorePage}`)) {
    sessionStorage.removeItem(ONBOARDING_EXPLORE_KEY);
    return;
  }
  const onboarding = workspace?.onboarding || {};
  const completedInCloud = onboarding.version === ONBOARDING_VERSION && onboarding.managerIntroCompleted === true;
  const completed = completedInCloud || localStorage.getItem(getOnboardingLocalKey()) === "done";
  if (completed) return;
  const cloudStep = onboarding.version === ONBOARDING_VERSION ? Number(onboarding.managerIntroCurrentStep) : 0;
  setTimeout(() => showOnboarding(false, cloudStep), 650);
}

function getOnboardingSteps() {
  return [
    {
      title: "Bem-vindo ao RR Manager",
      text: "Conheça o fluxo completo para configurar sua oficina, atender o cliente e acompanhar o resultado financeiro.",
      details: ["O tutorial pode ser pausado e retomado.", "Use o botão Tutorial no topo sempre que quiser rever."],
      action: "Começar"
    },
    {
      title: "1. Configure sua oficina",
      text: "Em Meu cadastro, deixe os cálculos e documentos prontos antes do primeiro atendimento.",
      details: ["Dados, logo, frase e chave Pix.", "Margem das peças e valor da mão de obra.", "Desconto no Pix e taxas de débito e crédito."],
      href: "meu-cadastro.html",
      action: "Explorar Meu cadastro"
    },
    {
      title: "2. Cadastre clientes e veículos",
      text: "O cliente e o veículo formam a base dos orçamentos, inspeções e registros da oficina.",
      details: ["Cadastre telefone, documento, endereço e observações.", "Vincule marca, modelo, motor, ano, placa e detalhes do veículo."],
      href: "clientes.html",
      action: "Explorar Clientes"
    },
    {
      title: "3. Faça a inspeção automotiva",
      text: "Selecione cliente e veículo no orçamento para liberar a lista de inspeção.",
      details: ["Marque OK, Atenção ou Não se aplica.", "Registre reclamações, quilometragem, técnico e recomendações.", "No celular, compartilhe a inspeção diretamente em PDF."],
      href: "orcamentos.html",
      action: "Abrir área de Orçamentos"
    },
    {
      title: "4. Monte o orçamento",
      text: "Adicione peças e serviços enquanto o RR Manager calcula venda, custo e lucro estimado.",
      details: ["A margem configurada sugere o preço de venda da peça.", "Horas multiplicam o valor da mão de obra.", "O valor final manual é opcional e prevalece sobre o cálculo."],
      href: "orcamentos.html",
      action: "Explorar Orçamentos"
    },
    {
      title: "5. Envie e acompanhe a proposta",
      text: "Compartilhe uma apresentação profissional e acompanhe o orçamento até a decisão.",
      details: ["Envio pelo WhatsApp com link público.", "Impressão ou PDF personalizado.", "Histórico de versões para recuperar alterações anteriores."],
      href: "orcamentos.html",
      action: "Ver propostas"
    },
    {
      title: "6. Aprove e escolha o pagamento",
      text: "Ao aprovar, informe como o cliente pagará para calcular descontos, acréscimos e taxas.",
      details: ["Pix, débito, crédito parcelado ou link de pagamento.", "Decida se a taxa da maquininha será absorvida ou repassada."],
      href: "dashboard.html",
      action: "Explorar Dashboard"
    },
    {
      title: "7. Acompanhe o financeiro",
      text: "Orçamentos aprovados alimentam automaticamente receitas, custos das peças e taxas de pagamento.",
      details: ["Adicione também receitas, custos e despesas manuais.", "Use filtros por período para analisar o resultado."],
      href: "financeiro.html",
      action: "Explorar Financeiro"
    },
    {
      title: "8. Leia os indicadores e relatórios",
      text: "Use os números para entender a operação e tomar decisões com mais segurança.",
      details: ["Dashboard com saldo total, saldo mensal e conversão.", "Relatório financeiro com gráficos e geração de PDF."],
      href: "dashboard.html",
      action: "Ver indicadores"
    },
    {
      title: "9. Seus documentos e dados",
      text: "O RR Manager mantém os dados da oficina sincronizados na conta e reúne os documentos da assinatura.",
      details: ["Termos, Privacidade e contrato ficam vinculados ao aceite.", "O contrato pode ser consultado em Meu cadastro.", "Você pode rever este tutorial pelo botão Tutorial."],
      href: "meu-cadastro.html",
      action: "Ver documentos"
    }
  ];
}
function showOnboarding(force = false, cloudStep = 0) {
  if (!force && document.querySelector(".onboarding-overlay")) return;
  const steps = getOnboardingSteps();
  const savedStepValue = localStorage.getItem(getOnboardingStepKey());
  const savedStep = savedStepValue === null ? Number.NaN : Number(savedStepValue);
  const normalizedCloudStep = Number(cloudStep);
  const resumableStep = Number.isFinite(savedStep)
    ? savedStep
    : Number.isFinite(normalizedCloudStep) ? normalizedCloudStep : 0;
  let currentStep = force ? 0 : Math.max(0, Math.min(steps.length - 1, resumableStep));
  const overlay = document.createElement("div");
  overlay.className = "onboarding-overlay";
  overlay.innerHTML = `
    <div class="onboarding-card" role="dialog" aria-modal="true" aria-labelledby="onboardingTitle">
      <div class="onboarding-head">
        <img src="assets/logo-rr-manager.png" alt="RR Manager">
        <div>
          <span>Primeiro acesso guiado</span>
          <h2 id="onboardingTitle"></h2>
        </div>
      </div>
      <p id="onboardingText"></p>
      <ul class="onboarding-details" id="onboardingDetails"></ul>
      <div class="onboarding-progress" aria-hidden="true"></div>
      <div class="onboarding-step-label" id="onboardingStepLabel"></div>
      <ol class="onboarding-checklist"></ol>
      <div class="onboarding-actions">
        <button class="btn btn-muted" type="button" data-onboarding-skip>Pular tutorial</button>
        <button class="btn btn-muted" type="button" data-onboarding-later>Continuar depois</button>
        <button class="btn btn-muted" type="button" data-onboarding-back>Voltar</button>
        <a class="btn btn-ghost" data-onboarding-link hidden></a>
        <button class="btn btn-primary" type="button" data-onboarding-next>Próximo</button>
      </div>
    </div>
  `;

  const title = overlay.querySelector("#onboardingTitle");
  const text = overlay.querySelector("#onboardingText");
  const details = overlay.querySelector("#onboardingDetails");
  const progress = overlay.querySelector(".onboarding-progress");
  const stepLabel = overlay.querySelector("#onboardingStepLabel");
  const checklist = overlay.querySelector(".onboarding-checklist");
  const back = overlay.querySelector("[data-onboarding-back]");
  const next = overlay.querySelector("[data-onboarding-next]");
  const skip = overlay.querySelector("[data-onboarding-skip]");
  const later = overlay.querySelector("[data-onboarding-later]");
  const link = overlay.querySelector("[data-onboarding-link]");

  async function finish(skipped = false) {
    localStorage.setItem(getOnboardingLocalKey(), "done");
    localStorage.removeItem(getOnboardingStepKey());
    overlay.remove();
    if (!currentUser || !db || !activeWorkspaceId) return;
    await setDoc(doc(db, "workspaces", activeWorkspaceId), {
      onboarding: {
        version: ONBOARDING_VERSION,
        managerIntroCompleted: true,
        managerIntroSkipped: skipped,
        managerIntroCurrentStep: steps.length - 1,
        managerIntroCompletedAt: new Date().toISOString()
      },
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  async function continueLater() {
    localStorage.setItem(getOnboardingStepKey(), String(currentStep));
    overlay.remove();
    if (!currentUser || !db || !activeWorkspaceId) return;
    await setDoc(doc(db, "workspaces", activeWorkspaceId), {
      onboarding: {
        version: ONBOARDING_VERSION,
        managerIntroCompleted: false,
        managerIntroSkipped: false,
        managerIntroCurrentStep: currentStep,
        managerIntroUpdatedAt: new Date().toISOString()
      },
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  function render() {
    const step = steps[currentStep];
    localStorage.setItem(getOnboardingStepKey(), String(currentStep));
    title.textContent = step.title;
    text.textContent = step.text;
    details.innerHTML = (step.details || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    progress.style.setProperty("--onboarding-progress", `${((currentStep + 1) / steps.length) * 100}%`);
    stepLabel.textContent = `Etapa ${currentStep + 1} de ${steps.length}`;
    checklist.innerHTML = steps.map((item, index) => `
      <li class="${index < currentStep ? "done" : index === currentStep ? "active" : ""}">
        <span>${index + 1}</span>${escapeHtml(item.title.replace(/^\d+\.\s*/, ""))}
      </li>
    `).join("");
    back.disabled = currentStep === 0;
    next.textContent = currentStep === steps.length - 1 ? "Concluir" : "Proximo";
    if (step.href) {
      link.hidden = false;
      link.href = step.href;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = step.action;
      link.dataset.onboardingHref = step.href;
    } else {
      link.hidden = true;
      link.removeAttribute("href");
      link.removeAttribute("target");
      link.removeAttribute("rel");
      link.textContent = "";
      delete link.dataset.onboardingHref;
    }
  }

  back.addEventListener("click", () => {
    currentStep = Math.max(0, currentStep - 1);
    render();
  });
  link.addEventListener("click", () => {
    const href = link.dataset.onboardingHref;
    if (href) sessionStorage.setItem(ONBOARDING_EXPLORE_KEY, href);
  });
  later.addEventListener("click", continueLater);
  next.addEventListener("click", async () => {
    if (currentStep === steps.length - 1) {
      await finish(false);
      return;
    }
    currentStep += 1;
    render();
  });
  skip.addEventListener("click", () => finish(true));
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) continueLater();
  });

  document.body.appendChild(overlay);
  render();
}
function showAuthConfirmModal(title, message) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "auth-modal-overlay";
    overlay.innerHTML = `
      <div class="auth-modal">
        <img src="assets/logo-rr-manager.png" alt="RR Manager">
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(message)}</p>
        <div class="auth-modal-actions">
          <button class="btn btn-muted" type="button" data-confirm-value="false">Cancelar</button>
          <button class="btn btn-danger" type="button" data-confirm-value="true">Excluir</button>
        </div>
      </div>
    `;
    overlay.querySelectorAll("[data-confirm-value]").forEach((button) => {
      button.addEventListener("click", () => {
        const confirmed = button.dataset.confirmValue === "true";
        overlay.remove();
        resolve(confirmed);
      });
    });
    document.body.appendChild(overlay);
  });
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isAdminUser(user) {
  return ADMIN_EMAILS.includes(normalizeEmail(user?.email));
}

function getWorkspaceId(user) {
  if (!isAdminUser(user)) return user.uid;
  return sessionStorage.getItem(ADMIN_WORKSPACE_KEY) || "";
}

async function renderAdminDashboard() {
  if (!isAdminUser(currentUser)) return;
  const list = document.getElementById("firebaseAdminList");
  const message = document.getElementById("firebaseAdminMessage");
  const search = document.getElementById("firebaseAdminSearch");
  if (!list || !message) return;

  message.textContent = "Carregando cadastros...";
  list.innerHTML = "";
  if (search) search.value = "";

  try {
    const snap = await getDocs(collection(db, "workspaces"));
    adminWorkspaces = dedupeWorkspaces(snap.docs
      .map((item) => ({ id: item.id, ...(item.data() || {}) }))
      .filter((item) => item.ownerEmail || item.ownerUid || item.owner)
      .filter((item) => !ADMIN_EMAILS.includes(normalizeEmail(item.ownerEmail))));
    adminWorkspaces.sort(compareAdminWorkspacesByName);

    renderAdminWorkspaceList();
    if (search) search.oninput = renderAdminWorkspaceList;
  } catch (error) {
    message.textContent = firebaseError(error);
  }
}

function compareAdminWorkspacesByName(a, b) {
  const nameA = a.businessName || a.registration?.empresa || a.ownerEmail || a.id;
  const nameB = b.businessName || b.registration?.empresa || b.ownerEmail || b.id;
  return String(nameA).localeCompare(String(nameB), 'pt-BR', {
    sensitivity: 'base',
    numeric: true
  });
}

function renderAdminWorkspaceList() {
  const list = document.getElementById("firebaseAdminList");
  const message = document.getElementById("firebaseAdminMessage");
  const search = document.getElementById("firebaseAdminSearch");
  if (!list || !message) return;

  const query = normalizeEmail(search?.value || "");
  const filtered = adminWorkspaces.filter((workspace) => {
    const businessName = workspace.businessName || workspace.registration?.empresa || "";
    return normalizeEmail(`${workspace.ownerEmail || workspace.id} ${businessName}`).includes(query);
  });

  if (!adminWorkspaces.length) {
    message.textContent = "Nenhum cadastro encontrado ainda.";
    list.innerHTML = "";
    return;
  }

  message.textContent = query
    ? `${filtered.length} de ${adminWorkspaces.length} cadastro(s) encontrado(s).`
    : `${adminWorkspaces.length} cadastro(s) encontrado(s).`;

  if (!filtered.length) {
    list.innerHTML = `<div class="admin-empty">Nenhum cadastro encontrado para essa busca.</div>`;
    return;
  }

  list.innerHTML = filtered.map((workspace) => {
    const email = workspace.ownerEmail || "Sem e-mail salvo";
    const businessName = workspace.businessName || workspace.registration?.empresa || "";
    const clientes = Number(workspace.stats?.clientes ?? (Array.isArray(workspace.data?.rr_clientes) ? workspace.data.rr_clientes.length : 0));
    const orcamentos = Number(workspace.stats?.orcamentos ?? (Array.isArray(workspace.data?.rr_orcamentos) ? workspace.data.rr_orcamentos.length : 0));
    const accessStatus = workspace.accessStatus || ACCESS_STATUS.ACTIVE;
    const statusClass = accessStatus === ACCESS_STATUS.BLOCKED ? "is-blocked" : accessStatus === ACCESS_STATUS.PENDING ? "is-pending" : "is-active";
    return `
      <div class="admin-workspace-item">
        <button class="admin-workspace-open" type="button" data-workspace-id="${escapeHtml(workspace.id)}" data-workspace-email="${escapeHtml(email)}">
          <span class="admin-workspace-identity">
            ${businessName ? `<strong>${escapeHtml(businessName)}</strong>` : ""}
            <small>${escapeHtml(email)}</small>
          </span>
          <span>${clientes} clientes | ${orcamentos} orçamentos</span>
        </button>
        <div class="admin-access-row">
          <span class="admin-access-status ${statusClass}">${getAccessStatusText(accessStatus)}</span>
          <button class="btn btn-primary" type="button" data-access-action="${ACCESS_STATUS.ACTIVE}" data-workspace-id="${escapeHtml(workspace.id)}">Liberar acesso</button>
          <button class="btn btn-danger" type="button" data-access-action="${ACCESS_STATUS.BLOCKED}" data-workspace-id="${escapeHtml(workspace.id)}">Bloquear acesso</button>
          <button class="btn btn-muted" type="button" data-delete-workspace="${escapeHtml(workspace.id)}" data-workspace-email="${escapeHtml(email)}">Excluir cadastro</button>
        </div>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".admin-workspace-open").forEach((button) => {
    button.addEventListener("click", () => openAdminWorkspace(button.dataset.workspaceId, button.dataset.workspaceEmail));
  });
  list.querySelectorAll("[data-access-action]").forEach((button) => {
    button.addEventListener("click", () => updateWorkspaceAccess(button.dataset.workspaceId, button.dataset.accessAction));
  });
  list.querySelectorAll("[data-delete-workspace]").forEach((button) => {
    button.addEventListener("click", () => deleteWorkspace(button.dataset.deleteWorkspace, button.dataset.workspaceEmail));
  });
}

function getAccessStatusText(status) {
  if (status === ACCESS_STATUS.BLOCKED) return "Acesso bloqueado";
  if (status === ACCESS_STATUS.PENDING) return "Aguardando análise";
  return "Acesso liberado";
}

async function updateWorkspaceAccess(workspaceId, status) {
  await setDoc(doc(db, "workspaces", workspaceId), {
    accessStatus: status,
    accessUpdatedAt: serverTimestamp(),
    accessUpdatedBy: currentUser.email
  }, { merge: true });
  const workspace = adminWorkspaces.find((item) => item.id === workspaceId);
  if (workspace) workspace.accessStatus = status;
  renderAdminWorkspaceList();
}

async function deleteWorkspace(workspaceId, email) {
  const confirmed = await showAuthConfirmModal(
    "Excluir cadastro",
    `Deseja remover ${email || "este cadastro"} do painel admin? Essa ação apaga os dados salvos desse cadastro no Firestore.`
  );
  if (!confirmed) return;
  for (const collectionName of Object.values(APP_COLLECTIONS)) {
    const records = await getDocs(collection(db, "workspaces", workspaceId, collectionName));
    for (let start = 0; start < records.docs.length; start += MIGRATION_BATCH_SIZE) {
      const batch = writeBatch(db);
      records.docs.slice(start, start + MIGRATION_BATCH_SIZE).forEach((record) => batch.delete(record.ref));
      await batch.commit();
    }
  }
  await deleteDoc(doc(db, "workspaces", workspaceId));
  adminWorkspaces = adminWorkspaces.filter((item) => item.id !== workspaceId);
  renderAdminWorkspaceList();
}

function getWorkspaceDataScore(workspace) {
  if (workspace.stats) {
    return Object.values(APP_COLLECTIONS).reduce((total, name) => total + Number(workspace.stats[name] || 0), 0);
  }
  return APP_KEYS.reduce((total, key) => {
    const items = workspace.data?.[key];
    return total + (Array.isArray(items) ? items.length : 0);
  }, 0);
}

function dedupeWorkspaces(workspaces) {
  const byEmail = new Map();
  workspaces.forEach((workspace) => {
    const email = normalizeEmail(workspace.ownerEmail);
    const key = email || workspace.id;
    const current = byEmail.get(key);
    if (!current || getWorkspaceDataScore(workspace) > getWorkspaceDataScore(current)) {
      byEmail.set(key, workspace);
    }
  });
  return Array.from(byEmail.values());
}

async function openAdminWorkspace(workspaceId, workspaceEmail = "") {
  activeWorkspaceId = workspaceId;
  activeWorkspaceEmail = workspaceEmail;
  sessionStorage.setItem(ADMIN_WORKSPACE_KEY, workspaceId);
  sessionStorage.removeItem(SYNC_FLAG);
  setAdminSelecting(false);
  await loadCloudData(workspaceId);
  cloudReady = true;
  window.rrFirebaseReady = true;
  window.location.reload();
}

function backToAdminDashboard() {
  if (!isAdminUser(currentUser)) return;
  sessionStorage.removeItem(ADMIN_WORKSPACE_KEY);
  sessionStorage.removeItem(SYNC_FLAG);
  window.location.reload();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

function patchLocalStorageSync() {
  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (key, value) => {
    const previousValue = APP_KEYS.includes(key) ? localStorage.getItem(key) : null;
    originalSetItem(key, value);
    if (!APP_KEYS.includes(key) || !cloudReady || syncingFromCloud) return;
    if (workspaceSchemaVersion >= APP_SCHEMA_VERSION) queueCollectionDiff(key, previousValue, value);
    scheduleCloudSave();
  };
}

function queueCollectionDiff(key, previousJson, nextJson) {
  const parsedPrevious = JSON.parse(previousJson || "[]");
  const parsedNext = JSON.parse(nextJson || "[]");
  const previous = Array.isArray(parsedPrevious) ? parsedPrevious : [];
  const next = Array.isArray(parsedNext) ? parsedNext : [];
  const previousById = new Map(previous.map((item, index) => [getRecordDocumentId(item, index, key), item]));
  const nextById = new Map(next.map((item, index) => [getRecordDocumentId(item, index, key), item]));
  const change = { upserts: new Map(), deletes: new Set(), delta: next.length - previous.length };
  nextById.forEach((item, id) => {
    if (!previousById.has(id) || JSON.stringify(previousById.get(id)) !== JSON.stringify(item)) change.upserts.set(id, item);
  });
  previousById.forEach((_item, id) => {
    if (!nextById.has(id)) change.deletes.add(id);
  });
  if (change.upserts.size || change.deletes.size) mergePendingChange(key, change);
}

function stopCollectionListeners() {
  collectionUnsubscribers.forEach((unsubscribe) => unsubscribe());
  collectionUnsubscribers = [];
}

function startCollectionListeners(uid) {
  stopCollectionListeners();
  if (workspaceSchemaVersion < APP_SCHEMA_VERSION) return;
  APP_KEYS.forEach((key) => {
    const unsubscribe = onSnapshot(
      collection(db, "workspaces", uid, getCollectionName(key)),
      (snapshot) => {
        if (!cloudReady || pendingCollectionChanges.has(key)) return;
        const records = snapshot.docs.map((record) => record.data());
        const current = localStorage.getItem(key) || "[]";
        const next = JSON.stringify(records);
        if (current === next) return;
        syncingFromCloud = true;
        localStorage.setItem(key, next);
        syncingFromCloud = false;
        window.dispatchEvent(new CustomEvent("rr-cloud-data-updated", { detail: { key } }));
      },
      (error) => console.warn(`Sincronização em tempo real indisponível para ${key}.`, error)
    );
    collectionUnsubscribers.push(unsubscribe);
  });
}

function scheduleCloudSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    persistCloudData().catch((error) => showAuthMessage(firebaseError(error)));
  }, 450);
}

function setAppLocked(locked) {
  document.body.classList.toggle("auth-locked", locked);
  document.body.classList.toggle("auth-ready", !locked);
}

function setAdminSelecting(selecting) {
  document.body.classList.toggle("admin-selecting", selecting);
}

function setUserStatus(email) {
  const status = document.getElementById("firebaseUserStatus");
  const adminBack = document.getElementById("firebaseAdminBack");
  const onboardingReplay = document.getElementById("rrOnboardingReplay");
  const adminViewing = currentUser && isAdminUser(currentUser) && activeWorkspaceId;
  if (status) {
    const detail = adminViewing ? `Admin: ${activeWorkspaceEmail || activeWorkspaceId}` : "Status: Online";
    status.textContent = email ? detail : "";
  }
  if (adminBack) adminBack.hidden = !adminViewing;
  if (onboardingReplay) onboardingReplay.hidden = !email || adminViewing || !isTutorialAvailablePage();
  document.body.classList.toggle("firebase-logged-in", Boolean(email));
}

function showAuthMessage(message) {
  const element = document.getElementById("firebaseAuthMessage");
  if (element) element.textContent = message;
}

function firebaseError(error) {
  const code = error?.code || "";
  if (code.includes("auth/invalid-email")) return "Informe um e-mail valido.";
  if (code.includes("auth/too-many-requests")) return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  console.error("Firebase error:", error);
  if (code.includes("auth/unauthorized-domain")) return "Domínio não autorizado. Adicione ryanhenriqueac-cell.github.io no Firebase Authentication.";
  if (code.includes("auth/operation-not-allowed")) return "E-mail/senha não está ativo no Firebase Authentication.";
  if (code.includes("auth/network-request-failed")) return "Falha de internet ao conectar no Firebase.";
  if (code.includes("auth/invalid-api-key")) return "Chave apiKey inválida no firebase-config.js.";
  if (code.includes("auth/configuration-not-found")) return "Configuração de autenticação não encontrada no Firebase.";
  if (code.includes("auth/invalid-credential")) return "E-mail ou senha inválidos.";
  if (code.includes("auth/email-already-in-use")) return "Este e-mail já tem acesso.";
  if (code.includes("auth/weak-password")) return "Use uma senha com pelo menos 6 caracteres.";
  if (code.includes("permission-denied")) return "Sem permissão no Firestore. Confira as regras de segurança.";
  return `Erro no Firebase: ${code || error?.message || "sem código"}.`;
}
