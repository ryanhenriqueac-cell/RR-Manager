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
const CONTRACT_VERSION = "2.0";
const CONTRACT_PLAN = {
  code: "monthly_launch",
  name: "Mensal · condição de lançamento",
  promotionalPrice: 59.90,
  promotionalMonths: 12,
  regularPrice: 79.90,
  renewal: "Períodos sucessivos de 30 dias",
  loyalty: "Sem fidelidade no plano mensal"
};
const PLAN_CATALOG = {
  essential: {
    name: "Essencial",
    features: { core: true, financeiroBasico: true, dre: false, financeiroAvancado: false, notaFiscal: false, exportacaoContador: false, estoque: false }
  },
  pro: {
    name: "Pro",
    features: { core: true, financeiroBasico: true, dre: true, financeiroAvancado: true, notaFiscal: true, exportacaoContador: true, estoque: true }
  }
};
const DEFAULT_SUBSCRIPTION = {
  planId: "essential",
  billingCycle: "monthly",
  agreedPrice: 59.90,
  promotionalPrice: 59.90,
  promotionalMonths: 12,
  regularPrice: 79.90
};
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
const confirmedCollectionState = new Map();
let adminWorkspaces = [];
let activeWorkspaceSubscription = null;

function normalizeSubscription(subscription = {}) {
  const planId = PLAN_CATALOG[subscription.planId] ? subscription.planId : DEFAULT_SUBSCRIPTION.planId;
  const billingCycle = subscription.billingCycle === "annual" ? "annual" : "monthly";
  const annualDefault = billingCycle === "annual" ? 799 : DEFAULT_SUBSCRIPTION.agreedPrice;
  return {
    ...DEFAULT_SUBSCRIPTION,
    ...subscription,
    planId,
    billingCycle,
    agreedPrice: Number(subscription.agreedPrice ?? annualDefault),
    features: { ...PLAN_CATALOG[planId].features, ...(subscription.features || {}) }
  };
}

function getWorkspaceSubscription(workspace = {}) {
  return normalizeSubscription(workspace.subscription || {});
}

function getPlanName(subscription = {}) {
  return PLAN_CATALOG[normalizeSubscription(subscription).planId].name;
}

window.rrHasPlanFeature = (feature) => Boolean(activeWorkspaceSubscription?.features?.[feature]);
window.rrGetActivePlan = () => activeWorkspaceSubscription ? { ...activeWorkspaceSubscription } : null;
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

window.rrPublishPublicOrcamento = async (data, existingId = "") => {
  if (!currentUser || !db) throw new Error("Login indisponível para publicar orçamento.");
  const id = existingId || createPublicShareId();
  await setDoc(doc(db, "public_orcamentos", id), {
    owner: activeWorkspaceId || currentUser.uid,
    ownerUid: currentUser.uid,
    createdAt: serverTimestamp(),
    data
  });
  return id;
};

window.rrWatchPublicOrcamentoResponse = (id, callback) => {
  if (!db || !id || typeof callback !== "function") return () => {};
  return onSnapshot(doc(db, "public_orcamentos", id), (snapshot) => {
    const value = snapshot.exists() ? snapshot.data() : {};
    callback({
      response: value.clientResponse || "",
      respondedAt: value.clientRespondedAt?.toDate?.()?.toISOString?.() || ""
    });
  }, (error) => console.warn("Não foi possível acompanhar a indicação do cliente.", error));
};
window.dispatchEvent(new CustomEvent("rr-public-response-api-ready"));

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
    confirmedCollectionState.clear();
    const snap = await getDoc(doc(db, "workspaces", uid));
    if (!snap.exists()) {
      await saveLegacyCloudData();
      const workspace = { ownerEmail: activeWorkspaceEmail || currentUser.email };
      setWorkspaceBrandingContext(workspace);
      renderMeuCadastro(workspace);
      renderContractDocument(workspace);
      dispatchWorkspaceReady();
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
      const serialized = JSON.stringify(Array.isArray(data[key]) ? data[key] : []);
      localStorage.setItem(key, serialized);
      confirmedCollectionState.set(key, serialized);
    });
    syncingFromCloud = false;
    dispatchWorkspaceReady();
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
      confirmedCollectionState.set(key, localStorage.getItem(key) || "[]");
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

window.rrPersistAppData = async (storageKey = "") => {
  if (cloudReady === false) throw new Error('A sincronizacao ainda nao esta pronta.');
  if (workspaceSchemaVersion >= APP_SCHEMA_VERSION) {
    const keys = APP_KEYS.includes(storageKey) ? [storageKey] : APP_KEYS;
    keys.forEach((key) => {
      if (pendingCollectionChanges.has(key)) return;
      queueCollectionDiff(
        key,
        confirmedCollectionState.get(key) || "[]",
        localStorage.getItem(key) || "[]"
      );
    });
  }
  await persistCloudData();
};

function setWorkspaceBrandingContext(workspace = {}) {
  const registration = workspace.registration || {};
  activeWorkspaceSubscription = getWorkspaceSubscription(workspace);
  document.body.dataset.plan = activeWorkspaceSubscription.planId;
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
    registration,
    subscription: activeWorkspaceSubscription
  }));
  window.dispatchEvent(new CustomEvent("rr-plan-ready", { detail: { ...activeWorkspaceSubscription } }));
}

function dispatchWorkspaceReady() {
  if (!activeWorkspaceSubscription) return;
  window.dispatchEvent(new CustomEvent("rr-workspace-ready", { detail: { ...activeWorkspaceSubscription } }));
}

async function saveAccessRequest(user) {
  const docType = document.querySelector("input[name='registerDocType']:checked")?.value || "CPF";
  await setDoc(doc(db, "workspaces", user.uid), {
    owner: user.uid,
    ownerUid: user.uid,
    ownerEmail: user.email,
    businessName: document.getElementById("registerBusinessName").value.trim(),
    accessStatus: ACCESS_STATUS.PENDING,
    subscription: normalizeSubscription(),
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

function buildContractNumber(acceptedAtClient = "") {
  const acceptedDate = acceptedAtClient ? new Date(acceptedAtClient) : new Date();
  const year = Number.isNaN(acceptedDate.getTime()) ? new Date().getFullYear() : acceptedDate.getFullYear();
  const accountId = String(activeWorkspaceId || currentUser?.uid || "CONTRATO").slice(0, 8).toUpperCase();
  return `RRM-${accountId}-${year}`;
}

function buildWorkspaceContractPlan(workspace = {}) {
  const subscription = getWorkspaceSubscription(workspace);
  const planName = `RR Manager ${getPlanName(subscription)}`;
  if (subscription.billingCycle === "annual") {
    return {
      code: `${subscription.planId}_annual`,
      name: `${planName} · anual`,
      billingCycle: "annual",
      agreedPrice: subscription.agreedPrice,
      renewal: "Períodos sucessivos de 12 meses",
      loyalty: "Vigência anual contratada"
    };
  }
  const hasLaunchCondition = subscription.planId === "essential" && Number(subscription.promotionalMonths) > 0;
  return {
    code: `${subscription.planId}_monthly`,
    name: `${planName} · mensal${hasLaunchCondition ? " · condição de lançamento" : ""}`,
    billingCycle: "monthly",
    agreedPrice: subscription.agreedPrice,
    promotionalPrice: hasLaunchCondition ? subscription.promotionalPrice : subscription.agreedPrice,
    promotionalMonths: hasLaunchCondition ? subscription.promotionalMonths : 0,
    regularPrice: hasLaunchCondition ? subscription.regularPrice : subscription.agreedPrice,
    renewal: "Períodos sucessivos de 30 dias",
    loyalty: "Sem fidelidade no plano mensal"
  };
}

function buildContractSnapshot(workspace = {}, acceptedAtClient = "") {
  const registration = workspace.registration || {};
  const acceptedAt = acceptedAtClient || new Date().toISOString();
  return {
    contractVersion: CONTRACT_VERSION,
    contractNumber: buildContractNumber(acceptedAt),
    issuedAtClient: acceptedAt,
    contractor: {
      businessName: workspace.businessName || registration.empresa || "Oficina contratante",
      responsibleName: registration.nome || "Responsável legal não informado",
      documentType: registration.documentoTipo || "CPF/CNPJ",
      documentValue: registration.documento || "Não informado",
      phone: registration.telefone || "Não informado",
      email: workspace.ownerEmail || activeWorkspaceEmail || currentUser?.email || "Não informado"
    },
    provider: {
      tradeName: "RR Automotive",
      productName: "RR Manager",
      productLegalName: "RR Manager — Software de Gestão de Oficinas",
      representativeName: "Ryan Henrique Alves Costa",
      nationality: "brasileiro",
      maritalStatus: "solteiro",
      profession: "engenheiro eletrônico e de telecomunicações",
      documentType: "CPF",
      documentValue: "***.181.376-**",
      address: "Rua Santo Amaro, 46, Sagrada Família, Belo Horizonte/MG, CEP 31035-320, Brasil",
      website: "rrreparacaomanager.com.br",
      email: "rrreparacaomanager@gmail.com",
      phone: "(31) 99785-1561",
      supportHours: "segunda a sexta-feira, das 8h às 18h, exceto feriados",
      paymentMethods: "cartão de crédito, boleto bancário e Pix",
      venue: "Belo Horizonte/MG"
    },
    plan: buildWorkspaceContractPlan(workspace)
  };
}

function renderContractDocument(workspace = {}) {
  const root = document.getElementById("contractDocumentRoot");
  if (!root) return;
  const acceptance = workspace.legalAcceptance || {};
  const subscriptionRevision = workspace.subscription?.revision || "";
  const hasCurrentContractSnapshot = acceptance.contractSnapshot?.contractVersion === CONTRACT_VERSION
    && (!subscriptionRevision || acceptance.subscriptionRevision === subscriptionRevision);
  const snapshot = hasCurrentContractSnapshot
    ? acceptance.contractSnapshot
    : buildContractSnapshot(workspace, "");
  const contractor = snapshot.contractor || {};
  const plan = snapshot.plan || CONTRACT_PLAN;
  const provider = snapshot.provider || {};
  const businessName = contractor.businessName || "Oficina contratante";
  const responsibleName = contractor.responsibleName || "Responsável legal não informado";
  const documentLabel = contractor.documentType || "CPF/CNPJ";
  const documentValue = contractor.documentValue || "Não informado";
  const phone = contractor.phone || "Não informado";
  const email = contractor.email || "Não informado";
  const issueDate = formatContractDate(snapshot.issuedAtClient);
  const acceptanceDate = hasCurrentContractSnapshot && acceptance.acceptedAtClient
    ? formatContractDate(acceptance.acceptedAtClient)
    : "Pendente de aceite";
  const contractNumber = snapshot.contractNumber
    || buildContractNumber(hasCurrentContractSnapshot ? acceptance.acceptedAtClient : "");
  const isAnnualPlan = plan.billingCycle === "annual";
  const planInitialValue = isAnnualPlan
    ? `R$ ${Number(plan.agreedPrice || 0).toFixed(2).replace(".", ",")} por ano`
    : plan.promotionalMonths > 0
      ? `R$ ${Number(plan.promotionalPrice || 0).toFixed(2).replace(".", ",")} por mês durante ${plan.promotionalMonths} meses`
      : `R$ ${Number(plan.agreedPrice || plan.regularPrice || 0).toFixed(2).replace(".", ",")} por mês`;
  const planLaterValue = isAnnualPlan
    ? "Renovação pelo valor anual vigente, mediante comunicação prévia de reajuste"
    : plan.promotionalMonths > 0
      ? `R$ ${Number(plan.regularPrice || 0).toFixed(2).replace(".", ",")} por mês`
      : "Mantém o valor contratado, sujeito aos reajustes previstos";
  const planCommercialClause = isAnnualPlan
    ? `A condição comercial registrada neste contrato é <strong>${escapeHtml(plan.name)}</strong>, pelo valor de <strong>${escapeHtml(planInitialValue)}</strong>. A renovação ocorre por ${escapeHtml(plan.renewal.toLowerCase())}.`
    : plan.promotionalMonths > 0
      ? `A condição comercial registrada neste contrato é <strong>${escapeHtml(plan.name)}</strong>, pelo valor de <strong>${escapeHtml(planInitialValue)}</strong>. Encerrado o período promocional, o valor passa a <strong>${escapeHtml(planLaterValue)}</strong>. A renovação ocorre por ${escapeHtml(plan.renewal.toLowerCase())}.`
      : `A condição comercial registrada neste contrato é <strong>${escapeHtml(plan.name)}</strong>, pelo valor de <strong>${escapeHtml(planInitialValue)}</strong>. A renovação ocorre por ${escapeHtml(plan.renewal.toLowerCase())}.`;

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
          <div><strong>Versão do documento</strong><span>${CONTRACT_VERSION}</span></div>
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
            <div><strong>Plano contratado</strong><span>${escapeHtml(plan.name)}</span></div>
            <div><strong>Valor contratado</strong><span>${escapeHtml(planInitialValue)}</span></div>
            <div><strong>Condição posterior</strong><span>${escapeHtml(planLaterValue)}</span></div>
            <div><strong>Renovação</strong><span>${escapeHtml(plan.renewal)}</span></div>
            <div><strong>Fidelidade</strong><span>${escapeHtml(plan.loyalty)}</span></div>
          </div>
        </div>
        <div class="contract-section">
          <h3>2.3 Identificação da contratada</h3>
          <p><strong>${escapeHtml(provider.representativeName || "Ryan Henrique Alves Costa")}</strong>, ${escapeHtml(provider.nationality || "brasileiro")}, ${escapeHtml(provider.maritalStatus || "solteiro")}, ${escapeHtml(provider.profession || "engenheiro eletrônico e de telecomunicações")}, inscrito no ${escapeHtml(provider.documentType || "CPF")} sob o nº ${escapeHtml(provider.documentValue || "***.181.376-**")}, atuando comercialmente sob o nome <strong>${escapeHtml(provider.tradeName || "RR Automotive")}</strong>, com endereço em ${escapeHtml(provider.address || "Belo Horizonte/MG")}.</p>
        </div>
        <div class="contract-notice"><b>Importante:</b> ao concluir o aceite eletrônico, o cliente declara que leu os Termos de Uso, a Política de Privacidade e as condições deste contrato.</div>
        ${pageFooter(2)}
      </section>

      <section class="contract-sheet" data-pdf-page>
        ${pageHeader(3, "Objeto e licença de uso")}
        <div class="contract-section"><h3>1. Identificação e formação do contrato</h3><p><strong>${escapeHtml(provider.representativeName || "Ryan Henrique Alves Costa")}</strong>, atuando comercialmente sob o nome <strong>${escapeHtml(provider.tradeName || "RR Automotive")}</strong> e responsável pelo produto <strong>${escapeHtml(provider.productLegalName || "RR Manager — Software de Gestão de Oficinas")}</strong>, doravante denominado <strong>CONTRATADA</strong>, e <strong>${escapeHtml(businessName)}</strong>, identificada na página anterior, doravante denominada <strong>CONTRATANTE</strong>, celebram este Contrato de Licenciamento de Uso de Software e Prestação de Serviços.</p></div>
        <div class="contract-section"><h3>2. Objeto</h3><p>A CONTRATADA concede à CONTRATANTE licença de uso do <strong>${escapeHtml(provider.productLegalName || "RR Manager — Software de Gestão de Oficinas")}</strong>, plataforma eletrônica destinada ao apoio da gestão administrativa e comercial de oficinas e estabelecimentos automotivos. O sistema não executa serviços mecânicos, diagnósticos ou reparos e não substitui avaliação técnica profissional.</p></div>
        <div class="contract-section"><h3>3. Licença de uso</h3><p>A licença é limitada, não exclusiva, pessoal, intransferível e condicionada à vigência da assinatura. A contratação não transfere código-fonte, marca, tecnologia ou qualquer direito de propriedade intelectual.</p></div>
        <div class="contract-section"><h3>4. Usos proibidos</h3><ul><li>Copiar, modificar, distribuir, revender ou sublicenciar o software.</li><li>Realizar engenharia reversa ou tentar obter o código-fonte.</li><li>Burlar mecanismos de segurança, acessar dados de terceiros ou utilizar o sistema para fraude ou finalidade ilícita.</li><li>Compartilhar credenciais com pessoas não autorizadas.</li></ul></div>
        <div class="contract-notice"><b>Resumo:</b> a oficina recebe o direito de usar o RR Manager durante a assinatura; o software e sua tecnologia continuam pertencendo à RR Automotive.</div>
        ${pageFooter(3)}
      </section>

      <section class="contract-sheet" data-pdf-page>
        ${pageHeader(4, "Funcionalidades e operação")}
        <div class="contract-section"><h3>5. Funcionalidades efetivamente disponíveis</h3><p>Integram o serviço somente as funcionalidades disponibilizadas no plano e acessíveis à CONTRATANTE no momento da utilização:</p><div class="contract-feature-grid detailed">
          <span><strong>Gestão cadastral</strong> Clientes, veículos, peças e serviços.</span>
          <span><strong>Orçamentos</strong> Criação, cálculo e personalização.</span>
          <span><strong>Compartilhamento</strong> Envio pelo WhatsApp e links públicos.</span>
          <span><strong>Inspeções</strong> Checklist e relatório visual em PDF.</span>
          <span><strong>Financeiro</strong> Lançamentos e visão de resultados.</span>
          <span><strong>Documentos</strong> Impressão, PDF e compartilhamento móvel.</span>
          <span><strong>Personalização</strong> Logo, dados da empresa, Pix e taxas.</span>
          <span><strong>Sincronização</strong> Dados vinculados ao ambiente da oficina.</span>
        </div></div>
        <div class="contract-section"><h3>6. Atualizações</h3><p>A CONTRATADA poderá corrigir, aprimorar, modificar ou atualizar o sistema para melhorar segurança, desempenho e usabilidade. Recursos futuros somente integrarão o serviço quando forem efetivamente disponibilizados. Funções obsoletas ou incompatíveis com fornecedores externos poderão ser descontinuadas, com comunicação prévia quando razoavelmente possível.</p></div>
        <div class="contract-section"><h3>7. Disponibilidade e suporte</h3><p>A CONTRATADA empregará esforços razoáveis para manter o serviço funcional. Poderão ocorrer manutenções, falhas de internet, indisponibilidade de hospedagem, autenticação, banco de dados, comunicação ou outros fornecedores, incidentes de segurança e eventos fora de seu controle. O suporte oferece orientação sobre as funções disponíveis pelos canais oficiais, de <strong>${escapeHtml(provider.supportHours || "segunda a sexta-feira, das 8h às 18h, exceto feriados")}</strong>, em prazos compatíveis com a natureza e complexidade da solicitação.</p></div>
        <div class="contract-notice"><b>Limites do escopo:</b> emissão fiscal, estoque, ordem de serviço, múltiplos usuários e outras funções futuras não integram este contrato enquanto não estiverem disponíveis e comunicadas.</div>
        ${pageFooter(4)}
      </section>

      <section class="contract-sheet" data-pdf-page>
        ${pageHeader(5, "Condições comerciais")}
        <div class="contract-section"><h3>8. Plano, preço e renovação</h3><p>${planCommercialClause}</p></div>
        <div class="contract-section"><h3>9. Pagamento e reajuste</h3><p>O pagamento ocorrerá por <strong>${escapeHtml(provider.paymentMethods || "cartão de crédito, boleto bancário ou Pix")}</strong>, conforme a opção disponibilizada, e no vencimento informado na contratação. Valores vencidos permanecem devidos. Os preços poderão ser reajustados anualmente mediante comunicação prévia, podendo ser utilizado o IPCA ou índice oficial equivalente como referência. Mudanças de plano ou serviços opcionais serão apresentadas antes da contratação.</p></div>
        <div class="contract-section"><h3>10. Inadimplência</h3><p>O atraso poderá resultar em comunicação de cobrança e suspensão do acesso após prazo razoável para regularização. A suspensão não cancela valores já constituídos. Situações de fraude, risco à segurança ou uso ilícito poderão gerar bloqueio imediato.</p></div>
        <div class="contract-section"><h3>11. Cancelamento</h3><p>O plano mensal não possui fidelidade e pode ser cancelado pelos canais oficiais. O cancelamento produz efeitos ao final do período já pago e, salvo cobrança indevida ou hipótese legal, não gera devolução proporcional. Valores vencidos e obrigações anteriores permanecem exigíveis.</p></div>
        <div class="contract-section"><h3>12. Rescisão</h3><p>O contrato poderá ser encerrado por cancelamento, acordo entre as partes, inadimplência, uso ilícito, violação grave, comprometimento da segurança, infração à propriedade intelectual ou demais hipóteses legais.</p></div>
        ${pageFooter(5)}
      </section>

      <section class="contract-sheet" data-pdf-page>
        ${pageHeader(6, "Responsabilidades e documentos")}
        <div class="contract-section"><h3>13. Responsabilidades da contratante</h3><p>A CONTRATANTE é responsável pela veracidade, necessidade, atualização e legalidade das informações inseridas, pela proteção de suas credenciais e pela conferência de orçamentos, peças, serviços, valores, taxas, descontos, documentos, diagnósticos e relatórios antes de utilizá-los ou enviá-los.</p></div>
        <div class="contract-section"><h3>14. Serviços automotivos</h3><p>A CONTRATANTE permanece exclusivamente responsável pela avaliação, qualidade, segurança, preço e execução dos serviços prestados aos seus clientes. O RR Manager é ferramenta de apoio e não toma decisões técnicas ou comerciais de forma autônoma.</p></div>
        <div class="contract-section"><h3>15. Orçamentos, inspeções e financeiro</h3><p>Os resultados dependem dos dados e parâmetros configurados pela oficina. A CONTRATADA não garante preços de peças, mão de obra, tributos, descontos ou diagnósticos. A emissão do orçamento não representa aprovação automática pelo cliente final. As inspeções registram informações inseridas pela oficina e não substituem desmontagem ou diagnóstico especializado. Os controles financeiros não constituem serviço contábil, fiscal ou financeiro.</p></div>
        <div class="contract-section"><h3>16. WhatsApp, links e terceiros</h3><p>Compartilhamentos dependem das regras e disponibilidade do WhatsApp, navegador, Firebase e outros fornecedores. A CONTRATANTE deve conferir destinatários, evitar dados desnecessários e utilizar links públicos de forma lícita. A CONTRATADA não responde por bloqueios ou falhas de terceiros que não decorram de conduta própria.</p></div>
        <div class="contract-notice"><b>Responsabilidade operacional:</b> antes de enviar qualquer documento, a oficina deve revisar cliente, veículo, itens, valores, forma de pagamento e destinatário.</div>
        ${pageFooter(6)}
      </section>

      <section class="contract-sheet" data-pdf-page>
        ${pageHeader(7, "Dados, segurança e propriedade")}
        <div class="contract-section"><h3>17. Titularidade dos dados</h3><p>Os dados inseridos permanecem pertencentes à CONTRATANTE ou aos respectivos titulares. A CONTRATADA não adquire sua propriedade e os utiliza somente para fornecer, manter, proteger, desenvolver e prestar suporte ao RR Manager, conforme a Política de Privacidade.</p></div>
        <div class="contract-section"><h3>18. LGPD</h3><p>As partes observarão a Lei nº 13.709/2018. Em relação aos dados de clientes, funcionários e fornecedores inseridos pela oficina, a CONTRATANTE atuará, em regra, como Controladora e a CONTRATADA como Operadora. A oficina deve possuir base legal, informar os titulares quando necessário, limitar os dados ao necessário e atender solicitações sob sua responsabilidade.</p></div>
        <div class="contract-section"><h3>19. Segurança e incidentes</h3><p>A CONTRATADA adotará medidas técnicas e administrativas razoáveis considerando a natureza dos dados e os riscos envolvidos. A CONTRATANTE deverá proteger senhas, dispositivos e acessos. As partes cooperarão na avaliação e contenção de incidentes relevantes e nas providências legalmente exigidas.</p></div>
        <div class="contract-section"><h3>20. Cópia, retenção e exclusão</h3><p>Antes do encerramento definitivo, a CONTRATANTE poderá solicitar uma cópia de seus dados dentro das possibilidades técnicas e legais. Após o cancelamento, informações poderão ser eliminadas ou anonimizadas quando não forem mais necessárias, ressalvadas obrigações legais, prevenção a fraudes, exercício de direitos e ciclos técnicos de segurança.</p></div>
        <div class="contract-section"><h3>21. Propriedade intelectual e confidencialidade</h3><p>Código, marca, interface, design, documentação e funcionalidades pertencem à CONTRATADA. As partes preservarão informações comerciais, técnicas e estratégicas não públicas, exceto quando a divulgação for autorizada ou legalmente exigida.</p></div>
        ${pageFooter(7)}
      </section>

      <section class="contract-sheet" data-pdf-page>
        ${pageHeader(8, "Disposições finais")}
        <div class="contract-section contract-final-compact"><h3>22. Limitação de responsabilidade</h3><p>Na extensão permitida por lei, a CONTRATADA não responde por informações incorretas, decisões e serviços da oficina, preços definidos pela CONTRATANTE, credenciais compartilhadas, uso inadequado ou falhas externas. Esta cláusula não exclui responsabilidades que não possam ser afastadas pela legislação.</p></div>
        <div class="contract-section contract-final-compact"><h3>23. Documentos integrantes e prevalência</h3><p>Integram a contratação: (i) condição comercial específica registrada; (ii) este Contrato; (iii) Termos de Uso; e (iv) Política de Privacidade nas matérias de dados. Essa é a ordem de prevalência em caso de conflito, respeitada a legislação.</p></div>
        <div class="contract-section contract-final-compact"><h3>24. Alterações e comunicações</h3><p>Mudanças relevantes serão identificadas por versão e comunicadas pelo sistema, e-mail ou canais oficiais, podendo exigir novo aceite. Alterações de preço serão informadas previamente. A CONTRATANTE deve manter seus contatos atualizados.</p></div>
        <div class="contract-section contract-final-compact"><h3>25. Vigência e efeitos do encerramento</h3><p>A vigência começa no aceite eletrônico e permanece enquanto houver assinatura ativa. Obrigações de pagamento, propriedade intelectual, confidencialidade, dados e responsabilidades sobrevivem pelo período necessário.</p></div>
        <div class="contract-section contract-final-compact"><h3>26. Disposições gerais e foro</h3><p>Eventos inevitáveis fora do controle razoável afastam responsabilidade na medida legal. O contrato não cria sociedade, franquia, representação ou vínculo trabalhista. A invalidade de uma cláusula não prejudica as demais. Aplicam-se as leis brasileiras. Fica eleito o foro de <strong>${escapeHtml(provider.venue || "Belo Horizonte/MG")}</strong>, sem prejuízo de outro foro que seja obrigatório pela legislação aplicável.</p></div>
        <section class="contract-acceptance-record">
          <h3>Registro eletrônico do aceite</h3>
          <div><strong>Contrato:</strong> ${escapeHtml(contractNumber)}</div>
          <div><strong>Versão:</strong> ${escapeHtml(acceptance.contractVersion || CONTRACT_VERSION)}</div>
          <div><strong>Data registrada:</strong> ${escapeHtml(acceptanceDate)}</div>
          <div><strong>Versão dos Termos:</strong> ${escapeHtml(acceptance.termsVersion || LEGAL_TERMS_VERSION)}</div>
          <div><strong>Versão da Privacidade:</strong> ${escapeHtml(acceptance.privacyVersion || LEGAL_PRIVACY_VERSION)}</div>
          <div class="wide"><strong>Usuário:</strong> ${escapeHtml(acceptance.acceptedByEmail || email)}</div>
          <div class="wide"><strong>Método:</strong> ${escapeHtml(acceptance.acceptanceMethod || "Aceite eletrônico autenticado")}</div>
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
    setMeuCadastroPersonalizacaoStatus("Logo importada. Clique em Salvar personalização.");
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
    setMeuCadastroPersonalizacaoStatus("Personalização salva.");
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
  const subscriptionRevision = workspace.subscription?.revision || "";
  return acceptance.termsVersion === LEGAL_TERMS_VERSION
    && acceptance.privacyVersion === LEGAL_PRIVACY_VERSION
    && acceptance.contractVersion === CONTRACT_VERSION
    && acceptance.contractSnapshot?.contractVersion === CONTRACT_VERSION
    && (!subscriptionRevision || acceptance.subscriptionRevision === subscriptionRevision);
}

async function ensureLegalAcceptance(workspace = {}) {
  if (!currentUser || isAdminUser(currentUser) || !isOnboardingPage() || hasCurrentLegalAcceptance(workspace)) return;
  await showLegalAcceptanceModal(workspace);
}

function showLegalAcceptanceModal(workspace = {}) {
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
        <p>Antes do tutorial, leia os documentos que explicam a contratação, as regras do RR Manager e como os dados pessoais são tratados.</p>
        <div class="legal-acceptance-links">
          <a href="contrato.html" target="_blank" rel="noopener">Ler Contrato <small>versão ${CONTRACT_VERSION}</small></a>
          <a href="termos.html" target="_blank" rel="noopener">Ler Termos de Uso <small>versão ${LEGAL_TERMS_VERSION}</small></a>
          <a href="privacidade.html" target="_blank" rel="noopener">Ler Política de Privacidade <small>versão ${LEGAL_PRIVACY_VERSION}</small></a>
        </div>
        <label class="legal-acceptance-check"><input type="checkbox" data-legal-contract-accept><span>Li e aceito o Contrato de Licenciamento.</span></label>
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

    const contractCheckbox = overlay.querySelector("[data-legal-contract-accept]");
    const termsCheckbox = overlay.querySelector("[data-legal-terms]");
    const privacyCheckbox = overlay.querySelector("[data-legal-privacy]");
    const acceptButton = overlay.querySelector("[data-legal-accept]");
    const contractButton = overlay.querySelector("[data-legal-contract]");
    const logoutButton = overlay.querySelector("[data-legal-logout]");
    const status = overlay.querySelector(".legal-acceptance-status");

    function updateButton() {
      const confirmed = contractCheckbox.checked && termsCheckbox.checked && privacyCheckbox.checked;
      acceptButton.disabled = !confirmed;
      contractButton.disabled = !confirmed;
    }

    contractCheckbox.addEventListener("change", updateButton);
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
      if (!contractCheckbox.checked || !termsCheckbox.checked || !privacyCheckbox.checked || !currentUser || !db || !activeWorkspaceId) return;
      acceptButton.disabled = true;
      logoutButton.disabled = true;
      status.textContent = "Registrando seu aceite...";
      try {
        const acceptedAtClient = new Date().toISOString();
        const contractSnapshot = buildContractSnapshot(workspace, acceptedAtClient);
        await setDoc(doc(db, "workspaces", activeWorkspaceId), {
          legalAcceptance: {
            contractVersion: CONTRACT_VERSION,
            termsVersion: LEGAL_TERMS_VERSION,
            privacyVersion: LEGAL_PRIVACY_VERSION,
            acceptedAt: serverTimestamp(),
            acceptedAtClient,
            acceptedByUid: currentUser.uid,
            acceptedByEmail: currentUser.email || "",
            acceptanceMethod: "Authenticated checkbox confirmation",
            subscriptionRevision: workspace.subscription?.revision || "",
            contractSnapshot
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
    contractCheckbox.focus();
  });
}

function isOnboardingPage() {
  return ["dashboard", "clientes", "orcamentos", "financeiro", "dre", "meu-cadastro", "servicos", "veiculos"].includes(document.body.dataset.page || "");
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
      text: "Adicione peças, mão de obra e serviços terceirizados enquanto o RR Manager calcula venda, custo e lucro estimado.",
      details: ["A margem configurada sugere o preço de venda da peça.", "Horas multiplicam o valor da mão de obra.", "Nos terceirizados, informe o custo e o valor cobrado.", "O valor final manual é opcional e prevalece sobre o cálculo."],
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
      text: "Orçamentos aprovados alimentam automaticamente receitas, custos das peças, serviços terceirizados e taxas de pagamento.",
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
    const subscription = getWorkspaceSubscription(workspace);
    return `
      <div class="admin-workspace-item">
        <button class="admin-workspace-open" type="button" data-workspace-id="${escapeHtml(workspace.id)}" data-workspace-email="${escapeHtml(email)}">
          <span class="admin-workspace-identity">
            ${businessName ? `<strong>${escapeHtml(businessName)}</strong>` : ""}
            <small>${escapeHtml(email)}</small>
          </span>
          <span>${clientes} clientes | ${orcamentos} orçamentos</span>
        </button>
        <div class="admin-plan-row" data-plan-workspace="${escapeHtml(workspace.id)}">
          <label>Plano
            <select data-plan-field="planId">
              <option value="essential"${subscription.planId === "essential" ? " selected" : ""}>Essencial</option>
              <option value="pro"${subscription.planId === "pro" ? " selected" : ""}>Pro</option>
            </select>
          </label>
          <label>Cobrança
            <select data-plan-field="billingCycle">
              <option value="monthly"${subscription.billingCycle === "monthly" ? " selected" : ""}>Mensal</option>
              <option value="annual"${subscription.billingCycle === "annual" ? " selected" : ""}>Anual</option>
            </select>
          </label>
          <label>Valor contratado
            <input data-plan-field="agreedPrice" type="number" min="0.01" step="0.01" value="${Number(subscription.agreedPrice).toFixed(2)}">
          </label>
          <button class="btn btn-ghost" type="button" data-save-plan="${escapeHtml(workspace.id)}">Salvar plano</button>
        </div>
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
  list.querySelectorAll("[data-save-plan]").forEach((button) => {
    button.addEventListener("click", () => updateWorkspacePlan(button.dataset.savePlan));
  });
  list.querySelectorAll("[data-plan-field='billingCycle']").forEach((select) => {
    select.addEventListener("change", () => {
      const row = select.closest("[data-plan-workspace]");
      const price = row?.querySelector("[data-plan-field='agreedPrice']");
      if (price) price.value = select.value === "annual" ? "799.00" : "59.90";
    });
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

async function updateWorkspacePlan(workspaceId) {
  const row = document.querySelector(`[data-plan-workspace="${workspaceId}"]`);
  if (!row) return;
  const planId = row.querySelector("[data-plan-field='planId']")?.value;
  const billingCycle = row.querySelector("[data-plan-field='billingCycle']")?.value;
  const agreedPrice = Number(row.querySelector("[data-plan-field='agreedPrice']")?.value);
  if (!PLAN_CATALOG[planId] || !Number.isFinite(agreedPrice) || agreedPrice <= 0) {
    await showAuthStatusModal("Plano inválido", "Selecione o plano e informe um valor contratado maior que zero.");
    return;
  }
  const previous = adminWorkspaces.find((item) => item.id === workspaceId);
  const revision = new Date().toISOString();
  const subscription = normalizeSubscription({
    ...(previous?.subscription || {}),
    planId,
    billingCycle,
    agreedPrice,
    features: PLAN_CATALOG[planId].features,
    revision,
    updatedAtClient: revision,
    updatedBy: currentUser.email || ""
  });
  await setDoc(doc(db, "workspaces", workspaceId), {
    subscription,
    subscriptionUpdatedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
  if (previous) previous.subscription = subscription;
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
        confirmedCollectionState.set(key, next);
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
    const planName = activeWorkspaceSubscription ? getPlanName(activeWorkspaceSubscription) : "Essencial";
    const detail = adminViewing ? `Admin: ${activeWorkspaceEmail || activeWorkspaceId} · Plano ${planName}` : `Plano ${planName} · Online`;
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
