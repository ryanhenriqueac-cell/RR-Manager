const STORAGE_KEYS = {
  clientes: "rr_clientes",
  veiculos: "rr_veiculos",
  servicos: "rr_servicos",
  orcamentos: "rr_orcamentos",
  financeiro: "rr_financeiro"
};

const legacyKeys = {
  clientes: "clientes"
};

const VALOR_HORA_PADRAO = 120;
const DEFAULT_PARTS_MARKUP_PERCENT = 35;
const PIX_CONFIG = {
  chave: "",
  nome: "",
  cidade: "BRASIL"
};

const WORKSPACE_BRANDING_KEY = "rr_workspace_branding";
const DEFAULT_DOCUMENT_BRANDING = {
  companyName: "RR Manager",
  reportName: "RR Manager",
  tagline: "Manuten\u00e7\u00e3o especializada | Paix\u00e3o por carros",
  logoUrl: "assets/logo-rr-manager.png"
};
const INSPECTION_SECTIONS = [
  {
    title: "1. Teste de rodagem",
    items: [
      "Funcionamento da embreagem",
      "Direção alinhada e sem puxar",
      "Freios sem ruídos ou trepidação",
      "Ruídos na dianteira ou traseira",
      "Motor sem falhas, engasgos ou ruídos",
      "Ar-condicionado refrigerando",
      "Luzes de aviso no painel",
      "Temperatura de funcionamento normal"
    ]
  },
  {
    title: "2. Elétrica, interior e diagnóstico",
    items: [
      "Faróis, lanternas, setas e luzes de freio",
      "Luzes internas e iluminação do painel",
      "Buzina, rádio e alarme",
      "Vidros, travas e limpadores",
      "Palhetas do para-brisa",
      "Filtro de cabine",
      "Scanner e códigos de falha (DTC)",
      "Aviso ou etiqueta de revisão"
    ]
  },
  {
    title: "3. Rodas, direção e suspensão",
    items: [
      "Pneus, desgaste e calibragem",
      "Aperto e condição das rodas",
      "Rolamentos de roda",
      "Pivôs e terminais de direção",
      "Caixa de direção e coifas",
      "Amortecedores e kits dianteiros",
      "Amortecedores e kits traseiros",
      "Buchas, bieletas e barra estabilizadora"
    ]
  },
  {
    title: "4. Sistema de freios",
    items: [
      "Discos e pastilhas dianteiras",
      "Discos, tambores, lonas ou pastilhas traseiras",
      "Pinças, êmbolos e folgas",
      "Flexíveis e tubulações",
      "Cilindros de roda",
      "Freio de estacionamento",
      "Nível e condição do fluido de freio"
    ]
  },
  {
    title: "5. Cofre do motor",
    items: [
      "Bateria e terminais",
      "Chicotes, mangueiras e abraçadeiras",
      "Correia de acessórios e correia dentada",
      "Filtro de ar e caixa do filtro",
      "Velas, cabos e bobinas",
      "Corpo de borboleta",
      "Sistema de arrefecimento e reservatório",
      "Óleo do motor, filtros e demais fluidos",
      "Coxins e suportes do motor/câmbio"
    ]
  },
  {
    title: "6. Parte inferior e finalização",
    items: [
      "Vazamentos de óleo, combustível ou fluidos",
      "Coifas internas e externas",
      "Escapamento, suportes e defletores",
      "Trincas, rupturas ou danos inferiores",
      "Óleo do câmbio e possíveis vazamentos",
      "Reaperto das rodas",
      "Peças e acabamentos remontados",
      "Teste final após a inspeção"
    ]
  }
];
const DOCUMENT_BRANDING_PATCHES = {
  "ryanhenriqueac@gmail.com": {
    companyName: "RR Repara\u00e7\u00e3o Automotiva",
    reportName: "RR Repara\u00e7\u00e3o Manager",
    tagline: "Manuten\u00e7\u00e3o especializada | Paix\u00e3o por carros",
    logoUrl: "assets/logo-rr.png"
  },
  "nicolylmrocha@gmail.com": {
    tagline: "Manuten\u00e7\u00e3o especializada | Paix\u00e3o por carros",
    logoUrl: "assets/logo-rr-iphones.png"
  }
};
const PAYMENT_RATES = {
  pix: { label: "Pix com 3% de desconto", installments: { 1: 0 }, discountPercent: 3 },
  debit: { label: "Débito", installments: { 1: 1.37 } },
  credit: {
    label: "Crédito maquininha",
    installments: {
      1: 3.15,
      2: 5.39,
      3: 6.12,
      4: 6.85,
      5: 7.57,
      6: 8.28,
      7: 8.99,
      8: 9.69,
      9: 10.38,
      10: 11.06,
      11: 11.74,
      12: 12.40
    }
  },
  link: {
    label: "Link de pagamento",
    installments: {
      1: 4.20,
      2: 6.09,
      3: 7.01,
      4: 7.91,
      5: 8.80,
      6: 9.67,
      7: 12.59,
      8: 13.42,
      9: 14.25,
      10: 15.06,
      11: 15.87,
      12: 16.66
    }
  }
};

const formatCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const page = document.body.dataset.page;
let clienteCarrosDraft = [];
const publicOrcamentoResponses = new Map();
const publicOrcamentoResponseWatchers = new Map();
let orcamentoPecasDraft = [];
let orcamentoServicosDraft = [];
let orcamentoTerceirizadosDraft = [];
let ultimoRelatorioFinanceiro = null;
const FINANCE_CATEGORIES = {
  Receita: {
    "Receita operacional": ["Serviços automotivos", "Venda de peças", "Outras receitas operacionais"],
    "Outras receitas": ["Aporte de capital", "Reembolso", "Outras receitas"]
  },
  Despesa: {
    "Estrutura": ["Aluguel e condomínio", "Água e energia", "Internet e telefone", "Limpeza", "Manutenção da oficina"],
    "Pessoal": ["Salários e encargos", "Pró-labore", "Benefícios e treinamentos"],
    "Administrativo": ["Contabilidade", "Marketing", "Software e assinaturas", "Material de escritório"],
    "Operação": ["Ferramentas e equipamentos", "Materiais de consumo", "Transporte e combustível", "Fretes"],
    "Tributos": ["Impostos e taxas"],
    "Outras despesas": ["Outras despesas"]
  }
};
const DRE_CATEGORY_COLORS = ["#f1c75b", "#4fd1a1", "#5ba8ff", "#b58cff", "#ff8f8f", "#ffad5b", "#67d6dc", "#d98ecb", "#9fc968", "#e9d66b"];
let pendingVariableRecurrence = null;

document.addEventListener("DOMContentLoaded", () => {
  migrateLegacyData();
  setActiveMenu();
  bindClearButtons();

  if (page === "dashboard") initDashboard();
  if (page === "clientes") initClientes();
  if (page === "orcamentos") initOrcamentos();
  if (page === "financeiro") initFinanceiro();
  if (page === "dre") initDre();
  if (page === "orcamento-print") initOrcamentoPrint();
  if (page === "orcamento-publico") initOrcamentoPublico();
  if (page === "financeiro-print") initFinanceiroPrint();
  if (page === "dre-print") initDrePrint();
  if (page === "inspecao") initInspecao();
  if (page === "contrato") initContrato();
});

window.addEventListener("rr-cloud-data-updated", (event) => {
  const key = event.detail?.key;
  if (page === "dashboard") initDashboard();
  if (page === "clientes" && (key === STORAGE_KEYS.clientes || key === STORAGE_KEYS.veiculos)) renderClientes();
  if (page === "orcamentos" && key === STORAGE_KEYS.orcamentos) renderOrcamentos();
  if (page === "financeiro" && key === STORAGE_KEYS.financeiro) refreshFinanceiro();
  if (page === "dre" && (key === STORAGE_KEYS.financeiro || key === STORAGE_KEYS.orcamentos)) renderDre();
});

function readData(type) {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS[type])) || [];
}

function writeData(type, data) {
  localStorage.setItem(STORAGE_KEYS[type], JSON.stringify(data));
}

async function persistSavedData(type = "") {
  if (typeof window.rrPersistAppData !== 'function') throw new Error('Firebase indisponivel.');
  await window.rrPersistAppData(STORAGE_KEYS[type] || "");
}

function compareClientesByName(a, b) {
  return String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR', {
    sensitivity: 'base',
    numeric: true
  });
}

function setFormSaving(form, saving, label) {
  const button = form?.querySelector('button[type=submit]');
  if (!button) return;
  if (saving) button.dataset.originalLabel = button.textContent;
  button.textContent = saving ? label : button.dataset.originalLabel;
  button.disabled = saving;
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function money(value) {
  return formatCurrency.format(parseDecimal(value));
}

function parseDecimal(value) {
  const text = String(value ?? "").trim();
  if (!text) return 0;
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseInteger(value) {
  return Math.max(0, Math.trunc(parseDecimal(value)));
}

function formatDateBR(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function sanitizePrintTitle(value) {
  return String(value || "")
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getMonthNameBR(date) {
  const [, month] = String(date || "").split("-");
  const months = [
    "JANEIRO",
    "FEVEREIRO",
    "MARÇO",
    "ABRIL",
    "MAIO",
    "JUNHO",
    "JULHO",
    "AGOSTO",
    "SETEMBRO",
    "OUTUBRO",
    "NOVEMBRO",
    "DEZEMBRO"
  ];
  return months[Number(month) - 1] || "GERAL";
}

function formatPhoneBR(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)})${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)})${digits.slice(2, 6)}-${digits.slice(6)}`;
  return value || "";
}

function formatPlateBR(value) {
  const text = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  if (text.length <= 3) return text;
  return `${text.slice(0, 3)}-${text.slice(3)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function byId(id) {
  return document.getElementById(id);
}

function setValue(id, value) {
  const element = byId(id);
  if (element) element.value = value ?? "";
}

function getValue(id) {
  return byId(id)?.value.trim() || "";
}

function setText(id, value) {
  const element = byId(id);
  if (element) element.textContent = value;
}

function normalizeCarro(carro) {
  return {
    id: carro.id || createId("car"),
    marca: carro.marca || "",
    modelo: carro.modelo || carro.nome || "",
    motor: carro.motor || "",
    ano: carro.ano || "",
    placa: formatPlateBR(carro.placa),
    obs: carro.obs || ""
  };
}

function migrateLegacyData() {
  const clientesAtuais = readData("clientes");
  let precisaSalvar = false;

  if (!clientesAtuais.length && localStorage.getItem(legacyKeys.clientes)) {
    const clientesAntigos = JSON.parse(localStorage.getItem(legacyKeys.clientes)) || [];
    const clientes = clientesAntigos.map((cliente) => ({
      id: createId("cli"),
      nome: cliente.nome || "",
      telefone: cliente.telefone || "",
      email: "",
      documento: "",
      endereco: "",
      obs: cliente.obs || "",
      carros: cliente.veiculo || cliente.placa ? [normalizeCarro({ modelo: cliente.veiculo, placa: cliente.placa })] : []
    }));
    writeData("clientes", clientes);
  }

  const clientesDepois = readData("clientes").map((cliente) => {
    if (Array.isArray(cliente.carros)) return cliente;
    precisaSalvar = true;
    return { ...cliente, carros: [] };
  });

  const veiculosSoltos = readData("veiculos");
  if (veiculosSoltos.length) {
    veiculosSoltos.forEach((veiculo) => {
      const cliente = clientesDepois.find((item) => item.id === veiculo.clienteId);
      if (!cliente) return;
      const jaExiste = cliente.carros.some((carro) => carro.id === veiculo.id || carro.placa === veiculo.placa);
      if (!jaExiste) {
        cliente.carros.push(normalizeCarro({ ...veiculo, id: veiculo.id }));
        precisaSalvar = true;
      }
    });
  }

  if (precisaSalvar) writeData("clientes", clientesDepois);

  const orcamentos = readData("orcamentos");
  let maiorNumero = 0;
  let precisaSalvarOrcamentos = false;
  orcamentos.forEach((orcamento) => {
    if (Number(orcamento.numero) > maiorNumero) maiorNumero = Number(orcamento.numero);
  });
  orcamentos.forEach((orcamento) => {
    if (!orcamento.numero) {
      maiorNumero += 1;
      orcamento.numero = maiorNumero;
      precisaSalvarOrcamentos = true;
    }
  });
  if (precisaSalvarOrcamentos) writeData("orcamentos", orcamentos);
}

function setActiveMenu() {
  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.classList.toggle("active", link.dataset.nav === page);
  });
}

function bindClearButtons() {
  document.querySelectorAll("[data-clear-form]").forEach((button) => {
    button.addEventListener("click", () => {
      const form = byId(button.dataset.clearForm);
      form.reset();
      form.querySelectorAll("input[type='hidden']").forEach((input) => (input.value = ""));
      if (button.dataset.clearForm === "clienteForm") {
        clienteCarrosDraft = [];
        renderClienteCarrosDraft();
      }
      if (button.dataset.clearForm === "orcamentoForm") {
        resetOrcamentoDrafts();
        setValue("orcamentoData", today());
        byId("orcamentoCliente")?.dispatchEvent(new Event("change"));
      }
    });
  });
}

function fillSelect(id, items, placeholder, getLabel) {
  const select = byId(id);
  if (!select) return;

  select.innerHTML = `<option value="">${placeholder}</option>`;
  items.forEach((item) => {
    select.innerHTML += `<option value="${item.id}">${escapeHtml(getLabel(item))}</option>`;
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeEmailKey(email) {
  return String(email || "").trim().toLowerCase();
}

function getStoredWorkspaceBranding() {
  try {
    return JSON.parse(localStorage.getItem(WORKSPACE_BRANDING_KEY)) || {};
  } catch (error) {
    localStorage.removeItem(WORKSPACE_BRANDING_KEY);
    return {};
  }
}

function getPartsMarkupPercent() {
  const stored = getStoredWorkspaceBranding();
  const percent = Number(stored.partsMarkupPercent);
  return Number.isFinite(percent) && percent >= 0 ? percent : DEFAULT_PARTS_MARKUP_PERCENT;
}

function getLaborHourRate() {
  const stored = getStoredWorkspaceBranding();
  const rate = Number(stored.laborHourRate);
  return Number.isFinite(rate) && rate >= 0 ? rate : VALOR_HORA_PADRAO;
}
function getPaymentRates() {
  const stored = getStoredWorkspaceBranding();
  const custom = stored.paymentRates || {};
  const pixDiscountPercent = Number(custom.pixDiscountPercent);
  const discountPercent = Number.isFinite(pixDiscountPercent) && pixDiscountPercent >= 0
    ? pixDiscountPercent
    : PAYMENT_RATES.pix.discountPercent;
  return {
    ...PAYMENT_RATES,
    pix: {
      ...PAYMENT_RATES.pix,
      label: discountPercent > 0 ? `Pix com ${String(discountPercent).replace(".", ",")}% de desconto` : "Pix",
      discountPercent
    },
    debit: {
      ...PAYMENT_RATES.debit,
      installments: { ...PAYMENT_RATES.debit.installments, ...(custom.debit || {}) }
    },
    credit: {
      ...PAYMENT_RATES.credit,
      installments: { ...PAYMENT_RATES.credit.installments, ...(custom.credit || {}) }
    }
  };
}

function getDocumentBranding(source = {}) {
  const stored = getStoredWorkspaceBranding();
  const incoming = source.branding || source.b || {};
  const registration = stored.registration || {};
  const email = normalizeEmailKey(incoming.ownerEmail || stored.ownerEmail || stored.email);
  const patch = DOCUMENT_BRANDING_PATCHES[email] || {};
  const companyName = incoming.companyName || stored.reportName || stored.businessName || registration.empresa || patch.companyName || DEFAULT_DOCUMENT_BRANDING.companyName;
  const reportName = incoming.reportName || stored.reportName || companyName || patch.reportName || DEFAULT_DOCUMENT_BRANDING.reportName;
  return {
    companyName,
    reportName,
    tagline: incoming.tagline || stored.tagline || patch.tagline || DEFAULT_DOCUMENT_BRANDING.tagline,
    logoUrl: incoming.logoUrl || stored.logoUrl || patch.logoUrl || DEFAULT_DOCUMENT_BRANDING.logoUrl,
    pixKey: incoming.pixKey || stored.pixKey || "",
    pixName: incoming.pixName || stored.pixName || companyName || PIX_CONFIG.nome,
    pixCity: incoming.pixCity || stored.pixCity || PIX_CONFIG.cidade,
    ownerEmail: email
  };
}

function getPublicDocumentBranding() {
  const branding = getDocumentBranding();
  return {
    ownerEmail: branding.ownerEmail,
    companyName: branding.companyName,
    reportName: branding.reportName,
    tagline: branding.tagline,
    logoUrl: branding.logoUrl,
    pixKey: branding.pixKey,
    pixName: branding.pixName,
    pixCity: branding.pixCity
  };
}

function getCliente(id) {
  return readData("clientes").find((item) => item.id === id);
}

function getClienteNome(id) {
  return getCliente(id)?.nome || "Cliente não informado";
}

function getCarro(clienteId, carroId) {
  return getCliente(clienteId)?.carros?.find((carro) => carro.id === carroId);
}

function getCarroNome(clienteId, carroId) {
  const carro = getCarro(clienteId, carroId);
  if (!carro) return "Carro não informado";
  return [carro.marca, carro.modelo, carro.motor, carro.ano].filter(Boolean).join(" ") || "Carro sem descrição";
}

function getCarroDetalhes(clienteId, carroId) {
  const carro = getCarro(clienteId, carroId);
  if (!carro) return "Carro não informado";
  return [getCarroNome(clienteId, carroId), carro.placa ? `Placa ${carro.placa}` : ""].filter(Boolean).join(" | ");
}

function getWhatsAppPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits.length >= 12 ? digits : "";
}

function onlyAscii(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

function pixTlv(id, value) {
  const text = String(value ?? "");
  return `${id}${String(text.length).padStart(2, "0")}${text}`;
}

function pixCrc16(payload) {
  let crc = 0xffff;
  for (let index = 0; index < payload.length; index += 1) {
    crc ^= payload.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function buildPixPayload(value, txid = "***", pixConfig = PIX_CONFIG) {
  const merchantAccount = pixTlv("00", "br.gov.bcb.pix") + pixTlv("01", pixConfig.chave);
  const amount = parseDecimal(value).toFixed(2);
  const payloadSemCrc = [
    pixTlv("00", "01"),
    pixTlv("26", merchantAccount),
    pixTlv("52", "0000"),
    pixTlv("53", "986"),
    pixTlv("54", amount),
    pixTlv("58", "BR"),
    pixTlv("59", onlyAscii(pixConfig.nome).slice(0, 25).toUpperCase()),
    pixTlv("60", onlyAscii(pixConfig.cidade).slice(0, 15).toUpperCase()),
    pixTlv("62", pixTlv("05", onlyAscii(txid).replace(/\W/g, "").slice(0, 25) || "***")),
    "6304"
  ].join("");
  return `${payloadSemCrc}${pixCrc16(payloadSemCrc)}`;
}

function buildPixPaymentHtml(orcamento, totalFinal) {
  const podeMostrarPix = orcamento.publicCliente ? orcamento.pixEnabled === true : orcamento.status === "Aprovado";
  if (!podeMostrarPix) return "";

  const branding = getDocumentBranding(orcamento);
  const pixConfig = {
    chave: branding.pixKey,
    nome: branding.pixName || branding.companyName,
    cidade: branding.pixCity || PIX_CONFIG.cidade
  };
  if (!pixConfig.chave) return "";

  const numero = String(orcamento.numero || "").padStart(4, "0");
  const payload = buildPixPayload(totalFinal, `ORC${numero}`, pixConfig);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=170x170&margin=8&data=${encodeURIComponent(payload)}`;

  return `
    <aside class="pix-payment">
      <div>
        <span>Pagamento Pix</span>
        <strong>${money(totalFinal)}</strong>
        <small>Escaneie o QR Code ou use o Pix copia e cola.</small>
      </div>
      <img src="${qrUrl}" alt="QR Code Pix para pagamento do orcamento ${numero}">
      <p>${escapeHtml(payload)}</p>
      <small>Chave Pix: ${escapeHtml(pixConfig.chave)}</small>
    </aside>
  `;
}

function encodePublicPayload(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodePublicPayload(value) {
  const base64 = String(value || "").replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function buildPublicOrcamentoData(orcamento) {
  const cliente = getCliente(orcamento.clienteId) || {};
  const carro = getCarro(orcamento.clienteId, orcamento.carroId || orcamento.veiculoId) || {};
  const pecas = Array.isArray(orcamento.pecas) ? orcamento.pecas.filter((peca) => String(peca.nome || "").trim()) : [];
  const servicos = Array.isArray(orcamento.servicos) ? orcamento.servicos.filter((servico) => String(servico.descricao || "").trim()) : [];
  const terceirizados = Array.isArray(orcamento.terceirizados) ? orcamento.terceirizados.filter((servico) => String(servico.descricao || "").trim()) : [];
  const branding = getPublicDocumentBranding();

  return {
    b: branding,
    c: {
      n: cliente.nome || "",
      t: cliente.telefone || "",
      e: cliente.email || ""
    },
    v: {
      m: carro.marca || "",
      o: carro.modelo || "",
      r: carro.motor || "",
      a: carro.ano || "",
      p: carro.placa || ""
    },
    o: {
      n: orcamento.numero,
      d: orcamento.data,
      st: orcamento.status,
      p: pecas.map((peca) => ({
        n: peca.nome || "",
        q: parseInteger(peca.quantidade),
        v: parseDecimal(peca.valorUnitario)
      })),
      s: servicos.map((servico) => ({
        d: servico.descricao || "",
        h: parseDecimal(servico.horas),
        v: parseDecimal(servico.valorHora)
      })),
      x: terceirizados.map((servico) => ({
        d: servico.descricao || "",
        v: parseDecimal(servico.valor)
      })),
      f: parseDecimal(orcamento.valorFinalManual),
      t: getOrcamentoTotal(orcamento),
      pg: orcamento.status === "Aprovado",
      pk: Boolean(branding.pixKey)
    }
  };
}

function normalizePublicOrcamentoData(data) {
  if (data.orcamento) {
    return {
      branding: data.branding || data.b || {},
      cliente: data.cliente || {},
      carro: data.carro || {},
      orcamento: {
        ...(data.orcamento || {}),
        pixEnabled: data.orcamento?.pixConfigured === true
      }
    };
  }

  return {
    branding: data.b || {},
    cliente: {
      nome: data.c?.n || "",
      telefone: data.c?.t || "",
      email: data.c?.e || ""
    },
    carro: {
      marca: data.v?.m || "",
      modelo: data.v?.o || "",
      motor: data.v?.r || "",
      ano: data.v?.a || "",
      placa: data.v?.p || ""
    },
    orcamento: {
      numero: data.o?.n,
      data: data.o?.d,
      status: data.o?.st,
      pecas: (data.o?.p || []).map((peca) => ({
        nome: peca.n || "",
        quantidade: parseInteger(peca.q),
        valorUnitario: parseDecimal(peca.v)
      })),
      servicos: (data.o?.s || []).map((servico) => ({
        descricao: servico.d || "",
        horas: parseDecimal(servico.h),
        valorHora: parseDecimal(servico.v)
      })),
      terceirizados: (data.o?.x || []).map((servico) => ({
        descricao: servico.d || "",
        valor: parseDecimal(servico.v)
      })),
      valorFinalManual: parseDecimal(data.o?.f),
      total: parseDecimal(data.o?.t),
      pixEnabled: data.o?.pg === true && data.o?.pk === true
    }
  };
}

function buildOrcamentoWhatsAppMessage(orcamento, publicUrl) {
  const branding = getDocumentBranding(orcamento);
  const pixDiscountPercent = getPaymentRates().pix.discountPercent;
  const pixDiscountLabel = String(pixDiscountPercent).replace(".", ",");
  const clienteNome = getClienteNome(orcamento.clienteId);
  const carro = getCarroDetalhes(orcamento.clienteId, orcamento.carroId || orcamento.veiculoId);
  const numero = String(orcamento.numero || "").padStart(4, "0");
  const total = money(getOrcamentoTotal(orcamento));
  const message = [
    `Olá, ${clienteNome}!`,
    "",
    `Segue o pré-orçamento #${numero} da ${branding.companyName}:`,
    `Veículo: ${carro}`,
    `Valor total: ${total}`,
    "Parcelado em até 3x NO CARTÃO SEM JUROS",
    pixDiscountPercent > 0 ? `À vista ${pixDiscountLabel}% de DESCONTO` : "À vista no Pix",
    "Aguardo 😉👍",
    "Não trabalho com peças fornecidas",
    ""
  ];

  if (publicUrl) {
    message.push("Visualizar orçamento:", publicUrl, "");
  }

  message.push("Qualquer dúvida, fico à disposição.");
  return message.join("\n");
}

function getOrcamentoWhatsAppButton(orcamento) {
  const cliente = getCliente(orcamento.clienteId);
  if (!getWhatsAppPhone(cliente?.telefone)) return `<button class="btn btn-muted" type="button" disabled title="Cadastre um telefone válido no cliente">WhatsApp</button>`;
  return `<button class="btn btn-whatsapp" type="button" onclick="sendOrcamentoWhatsApp('${orcamento.id}')">WhatsApp</button>`;
}

function waitForPublicOrcamentoPublisher(timeout = 6000) {
  if (window.rrPublishPublicOrcamento) return Promise.resolve(window.rrPublishPublicOrcamento);

  return new Promise((resolve) => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (window.rrPublishPublicOrcamento) {
        clearInterval(timer);
        resolve(window.rrPublishPublicOrcamento);
        return;
      }

      if (Date.now() - startedAt >= timeout) {
        clearInterval(timer);
        resolve(null);
      }
    }, 150);
  });
}

function publicOrcamentoErrorMessage(error) {
  const code = error?.code || "";
  if (code.includes("permission-denied")) {
    return "O Firebase bloqueou a criação do link curto. Libere a coleção public_orcamentos nas regras do Firestore.";
  }
  if (code.includes("network") || code.includes("unavailable")) {
    return "Falha de internet ao gerar o link curto. Confira a conexão e tente novamente.";
  }
  return "Não consegui gerar o link curto do orçamento. Tente novamente em alguns segundos.";
}

async function sendOrcamentoWhatsApp(id) {
  const whatsappWindow = window.open("about:blank", "_blank");
  const orcamento = readData("orcamentos").find((item) => item.id === id);
  if (!orcamento) {
    whatsappWindow?.close();
    return;
  }

  const cliente = getCliente(orcamento.clienteId);
  const phone = getWhatsAppPhone(cliente?.telefone);
  if (!phone) {
    whatsappWindow?.close();
    await rrAlert("Cadastre um telefone válido no cliente antes de enviar pelo WhatsApp.", "WhatsApp");
    return;
  }

  let publicUrl = "";
  let publishError = null;
  try {
    const publishPublicOrcamento = await waitForPublicOrcamentoPublisher();
    if (publishPublicOrcamento) {
      const publicId = await publishPublicOrcamento(buildPublicOrcamentoData(orcamento), orcamento.publicShareId || "");
      orcamento.publicShareId = publicId;
      writeData("orcamentos", readData("orcamentos").map((item) => item.id === orcamento.id ? { ...item, publicShareId: publicId } : item));
      await persistSavedData("orcamentos");
      publicUrl = new URL(`orcamento-publico.html?id=${encodeURIComponent(publicId)}`, window.location.href).href;
      if (document.body.dataset.page === "dashboard") initDashboard();
    }
  } catch (error) {
    console.error("Erro ao publicar link curto do orçamento:", error);
    publishError = error;
  }

  if (!publicUrl) {
    whatsappWindow?.close();
    await rrAlert(publicOrcamentoErrorMessage(publishError), "Link do orçamento");
    return;
  }

  const message = buildOrcamentoWhatsAppMessage(orcamento, publicUrl);
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  if (whatsappWindow) {
    whatsappWindow.opener = null;
    whatsappWindow.location.href = whatsappUrl;
  } else {
    window.location.href = whatsappUrl;
  }
}

function badgeClass(status) {
  const value = String(status).toLowerCase();
  if (value.includes("aprovado") && !value.includes("não")) return "success";
  if (value.includes("não aprovado") || value.includes("recusado") || value.includes("despesa") || value.includes("custo")) return "danger";
  if (value.includes("receita") || value.includes("concluído") || value.includes("entregue")) return "success";
  return "warning";
}

function emptyRow(colspan, message) {
  return `<tr><td colspan="${colspan}" class="muted">${message}</td></tr>`;
}

function rrModal({ title, message = "", eyebrow = "RR Manager", options = [] }) {
  return new Promise((resolve) => {
    const previousActiveElement = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "rr-modal-overlay";
    const buttons = options.length ? options : [{ label: "OK", value: true, variant: "primary" }];
    overlay.innerHTML = `
      <div class="rr-modal" role="dialog" aria-modal="true" aria-labelledby="rrModalTitle">
        <div class="rr-modal-header">
          <img src="assets/logo-rr-manager.png" alt="RR Manager">
          <div>
            <span>${escapeHtml(eyebrow)}</span>
            <h2 id="rrModalTitle">${escapeHtml(title)}</h2>
          </div>
        </div>
        <div class="rr-modal-body">${message}</div>
        <div class="rr-modal-actions">
          ${buttons.map((option, index) => `<button class="btn ${option.variant === "danger" ? "btn-danger" : option.variant === "muted" ? "btn-muted" : "btn-primary"}" type="button" data-modal-option="${index}">${escapeHtml(option.label)}</button>`).join("")}
        </div>
      </div>
    `;

    const close = (value) => {
      document.removeEventListener("keydown", onKeydown);
      overlay.remove();
      previousActiveElement?.focus?.();
      resolve(value);
    };
    const onKeydown = (event) => {
      if (event.key === "Escape") close(null);
    };

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close(null);
    });
    overlay.querySelectorAll("[data-modal-option]").forEach((button) => {
      button.addEventListener("click", () => close(buttons[Number(button.dataset.modalOption)]?.value));
    });
    document.addEventListener("keydown", onKeydown);
    document.body.appendChild(overlay);
    overlay.querySelector("button")?.focus();
  });
}

function modalText(text) {
  return `<p>${escapeHtml(text)}</p>`;
}

function modalList(items) {
  return `<div class="rr-modal-list">${items.map((item) => `<div>${item}</div>`).join("")}</div>`;
}

function rrAlert(message, title = "Aviso") {
  return rrModal({ title, message: modalText(message), options: [{ label: "OK", value: true, variant: "primary" }] });
}

function rrConfirm(message, title = "Confirmar", danger = false) {
  return rrModal({
    title,
    message: modalText(message),
    options: [
      { label: danger ? "Excluir" : "Confirmar", value: true, variant: danger ? "danger" : "primary" },
      { label: "Cancelar", value: false, variant: "muted" }
    ]
  });
}

function getApprovedOrcamentos() {
  return readData("orcamentos").filter((orcamento) => orcamento.status === "Aprovado");
}

function getPecasCusto(orcamento) {
  const pecas = Array.isArray(orcamento.pecas) ? orcamento.pecas : [];
  return pecas.filter((peca) => String(peca.nome || "").trim()).reduce((sum, peca) => sum + parseInteger(peca.quantidade) * parseDecimal(peca.custoUnitario), 0);
}

function getTerceirizadosCusto(orcamento) {
  const terceirizados = Array.isArray(orcamento.terceirizados) ? orcamento.terceirizados : [];
  return terceirizados.filter((servico) => String(servico.descricao || "").trim()).reduce((sum, servico) => sum + parseDecimal(servico.custo), 0);
}

function getPaymentFee(orcamento) {
  return parseDecimal(orcamento.pagamento?.taxaValor);
}

function getPaymentSurcharge(orcamento) {
  return parseDecimal(orcamento.pagamento?.acrescimoValor);
}

function getPaymentDiscount(orcamento) {
  if (orcamento.pagamento?.tipo !== "pix") return 0;
  if (orcamento.pagamento?.descontoValor !== undefined) {
    return parseDecimal(orcamento.pagamento.descontoValor);
  }
  return getOrcamentoTotal(orcamento) * 0.03;
}

function getPaymentDiscountPercent(orcamento) {
  if (orcamento.pagamento?.tipo !== "pix") return 0;
  if (orcamento.pagamento?.descontoPercentual !== undefined) {
    return parseDecimal(orcamento.pagamento.descontoPercentual);
  }
  const total = getOrcamentoTotal(orcamento);
  const discount = getPaymentDiscount(orcamento);
  return total > 0 && discount > 0 ? (discount / total) * 100 : 3;
}

function getOrcamentoReceita(orcamento) {
  return Math.max(0, getOrcamentoTotal(orcamento) - getPaymentDiscount(orcamento) + getPaymentSurcharge(orcamento));
}

function getServiceCosts(orcamento) {
  return getPecasCusto(orcamento) + getTerceirizadosCusto(orcamento) + getPaymentFee(orcamento);
}

function buildPaymentInfo(type, installments, total, taxaRepassada = false, descontoAplicado = true) {
  const config = getPaymentRates()[type];
  if (!config) return null;

  const parcelas = Number(installments) || 1;
  const taxaPercentual = Number(config.installments[parcelas]);
  if (!Number.isFinite(taxaPercentual)) return null;

  const valorTotal = parseDecimal(total);
  const taxaDecimal = taxaPercentual / 100;
  const podeRepassar = taxaRepassada && taxaDecimal > 0 && taxaDecimal < 1;
  const totalCobrado = podeRepassar ? valorTotal / (1 - taxaDecimal) : valorTotal;
  const acrescimoValor = Math.max(0, totalCobrado - valorTotal);
  const taxaValor = (totalCobrado * taxaPercentual) / 100;
  const descontoPercentualConfigurado = Number(config.discountPercent || 0);
  const descontoPercentual = type === "pix" && !descontoAplicado ? 0 : descontoPercentualConfigurado;
  const descontoValor = (valorTotal * descontoPercentual) / 100;
  return {
    tipo: type,
    parcelas,
    taxaPercentual,
    taxaValor,
    taxaRepassada: podeRepassar,
    acrescimoValor,
    totalCobrado,
    descontoPercentual,
    descontoValor,
    label: type === "pix"
      ? (descontoPercentual > 0 ? config.label : "Pix sem desconto")
      : type === "debit" ? config.label : `${config.label} ${parcelas}x`
  };
}

async function askPixDiscount(total) {
  const discountPercent = Number(getPaymentRates().pix.discountPercent || 0);
  if (discountPercent <= 0) return false;
  const discountLabel = String(discountPercent).replace(".", ",");
  const discountValue = (parseDecimal(total) * discountPercent) / 100;
  return rrModal({
    title: "Desconto no Pix",
    eyebrow: "Pagamento",
    message: `
      <p>Deseja aplicar o desconto de ${escapeHtml(discountLabel)}% ao cliente?</p>
      <div class="rr-modal-note">Com desconto: <strong>${money(Math.max(0, total - discountValue))}</strong> | Valor integral: <strong>${money(total)}</strong></div>
    `,
    options: [
      { label: "Aplicar desconto", value: true, variant: "primary" },
      { label: "Manter valor integral", value: false, variant: "muted" },
      { label: "Cancelar", value: null, variant: "muted" }
    ]
  });
}

async function askTaxPassThrough(type, installments) {
  const defaultPassThrough = (type === "credit" || type === "link") && Number(installments) > 3;
  return rrModal({
    title: "Taxa de pagamento",
    eyebrow: "Financeiro",
    message: `
      <p>Deseja repassar a taxa para o cliente?</p>
      <div class="rr-modal-note">Sugestão: até 3x fica como custo da oficina; acima de 3x pode ser repassado.</div>
    `,
    options: [
      { label: defaultPassThrough ? "Repassar taxa" : "Não repassar", value: defaultPassThrough, variant: "primary" },
      { label: defaultPassThrough ? "Não repassar" : "Repassar taxa", value: !defaultPassThrough, variant: "muted" },
      { label: "Cancelar", value: null, variant: "muted" }
    ]
  });
}

async function askInstallments(type) {
  const config = getPaymentRates()[type];
  const options = Object.entries(config.installments).map(([parcelas, taxa]) => ({
    label: `${parcelas}x (${String(taxa).replace(".", ",")}%)`,
    value: Number(parcelas),
    variant: parcelas === "1" ? "primary" : "muted"
  }));
  options.push({ label: "Cancelar", value: null, variant: "muted" });
  return rrModal({
    title: `Parcelas - ${config.label}`,
    eyebrow: "Pagamento",
    message: `<p>Escolha em quantas vezes o cliente vai pagar.</p>`,
    options
  });
}

async function askPaymentInfo(total) {
  const pixDiscountPercent = Number(getPaymentRates().pix.discountPercent || 0);
  const pixOptionLabel = pixDiscountPercent > 0
    ? `Pix (${String(pixDiscountPercent).replace(".", ",")}% desc.)`
    : "Pix";
  const option = await rrModal({
    title: "Forma de pagamento",
    eyebrow: "Aprovação",
    message: `
      <p>Escolha como esse orçamento será recebido.</p>
      <div class="rr-modal-note">Total do orçamento: <strong>${money(total)}</strong></div>
    `,
    options: [
      { label: pixOptionLabel, value: "1", variant: "primary" },
      { label: "Débito", value: "2", variant: "muted" },
      { label: "Crédito", value: "3", variant: "muted" },
      { label: "Link pagamento", value: "4", variant: "muted" },
      { label: "Cancelar", value: null, variant: "muted" }
    ]
  });
  if (option === null) return null;

  if (option === "1") {
    const descontoAplicado = await askPixDiscount(total);
    return descontoAplicado === null ? null : buildPaymentInfo("pix", 1, total, false, descontoAplicado);
  }
  if (option === "2") {
    const taxaRepassada = await askTaxPassThrough("debit", 1);
    return taxaRepassada === null ? null : buildPaymentInfo("debit", 1, total, taxaRepassada);
  }
  if (option === "3" || option === "4") {
    const type = option === "3" ? "credit" : "link";
    const installments = await askInstallments(type);
    if (!installments) return null;
    const taxaRepassada = await askTaxPassThrough(type, installments);
    return taxaRepassada === null ? null : buildPaymentInfo(type, installments, total, taxaRepassada);
  }

  return null;
}

function getFinancialSummary() {
  const manual = readData("financeiro");
  const aprovados = getApprovedOrcamentos();
  const receitasManuais = manual.filter((item) => item.tipo === "Receita");
  const despesasManuais = manual.filter((item) => item.tipo === "Despesa");
  const receitasAutomaticas = aprovados.reduce((sum, orcamento) => sum + getOrcamentoReceita(orcamento), 0);
  const receitasExtras = receitasManuais.reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const custosServicos = aprovados.reduce((sum, orcamento) => sum + getServiceCosts(orcamento), 0);
  const despesas = despesasManuais.reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const receitas = receitasAutomaticas + receitasExtras;
  return {
    receitas,
    receitasAutomaticas,
    receitasExtras,
    custoPecas: custosServicos,
    custosServicos,
    despesas,
    lucro: receitas - custosServicos - despesas
  };
}

function getCurrentMonthFinancialSummary() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const summary = getFinanceiroLancamentos()
    .filter((item) => String(item.data || "").slice(0, 7) === currentMonth)
    .reduce((acc, item) => {
      const impact = getLancamentoImpacto(item);
      acc.receitas += impact.receitas;
      acc.custos += impact.custos;
      acc.despesas += impact.despesas;
      return acc;
    }, { receitas: 0, custos: 0, despesas: 0 });

  summary.lucro = summary.receitas - summary.custos - summary.despesas;
  summary.monthName = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(now);
  return summary;
}

function getNextOrcamentoNumber(orcamentos) {
  return orcamentos.reduce((max, orcamento) => Math.max(max, Number(orcamento.numero) || 0), 0) + 1;
}

function initDashboard() {
  const clientes = readData("clientes");
  const orcamentos = readData("orcamentos");
  const totalCarros = clientes.reduce((sum, cliente) => sum + (cliente.carros?.length || 0), 0);
  const aprovados = orcamentos.filter((item) => item.status === "Aprovado").length;
  const naoAprovados = orcamentos.filter((item) => item.status === "Não aprovado").length;
  const decididos = aprovados + naoAprovados;
  const pendentes = orcamentos.filter((item) => item.status === "Pré-orçamento");
  const financeiro = getFinancialSummary();
  const financeiroMes = getCurrentMonthFinancialSummary();

  setText("totalClientes", clientes.length);
  setText("totalCarros", totalCarros);
  setText("totalPreDashboard", pendentes.length);
  setText("saldoFinanceiro", money(financeiro.lucro));
  setText("saldoMesTitulo", `Saldo de ${financeiroMes.monthName}`);
  setText("saldoFinanceiroMes", money(financeiroMes.lucro));
  setText("orcamentosPre", orcamentos.filter((item) => item.status === "Pré-orçamento").length);
  setText("orcamentosAprovados", aprovados);
  setText("orcamentosNaoAprovados", naoAprovados);
  setText("taxaConversao", decididos ? `${Math.round((aprovados / decididos) * 100)}%` : "0%");

  renderDashboardOrcamentos(pendentes);
}

function renderDashboardOrcamentos(pendentes) {
  const container = byId("dashboardOrcamentos");
  if (!container) return;

  container.innerHTML = pendentes.length
    ? pendentes.map((orcamento) => `
      <div class="timeline-item action-item">
        <strong>${escapeHtml(getClienteNome(orcamento.clienteId))}</strong>
        <span>${escapeHtml(getCarroDetalhes(orcamento.clienteId, orcamento.carroId || orcamento.veiculoId))} | ${money(getOrcamentoTotal(orcamento))}</span>
        ${getPublicOrcamentoResponseHtml(orcamento)}
        <div class="actions">
          <button class="btn btn-primary" type="button" onclick="updateOrcamentoStatus('${orcamento.id}', 'Aprovado')">Aprovar</button>
          <button class="btn btn-danger" type="button" onclick="updateOrcamentoStatus('${orcamento.id}', 'Não aprovado')">Não aprovado</button>
          ${getOrcamentoWhatsAppButton(orcamento)}
          <a class="btn btn-muted" href="orcamentos.html?editar=${orcamento.id}">Editar</a>
          <a class="btn btn-ghost" href="orcamento-imprimir.html?id=${orcamento.id}">Imprimir</a>
        </div>
      </div>
    `).join("")
    : `<div class="empty-state muted">Nenhum pré-orçamento aguardando decisão.</div>`;

  watchPublicOrcamentoResponses(pendentes);
}

function getPublicOrcamentoResponseHtml(orcamento) {
  const response = publicOrcamentoResponses.get(orcamento.publicShareId)?.response;
  if (!response) return "";
  const approved = response === "approved";
  return `<div class="client-response-hint ${approved ? "is-approved" : "is-rejected"}">
    <span>Indicação do cliente</span>
    <strong>${approved ? "Quer aprovar" : "Não quer aprovar"}</strong>
    <small>Confirme a decisão nos botões abaixo.</small>
  </div>`;
}

function watchPublicOrcamentoResponses(orcamentos) {
  if (typeof window.rrWatchPublicOrcamentoResponse !== "function") return;
  orcamentos.forEach((orcamento) => {
    const shareId = orcamento.publicShareId;
    if (!shareId || publicOrcamentoResponseWatchers.has(shareId)) return;
    const unsubscribe = window.rrWatchPublicOrcamentoResponse(shareId, (value) => {
      publicOrcamentoResponses.set(shareId, value);
      if (document.body.dataset.page === "dashboard") renderDashboardOrcamentos(readData("orcamentos").filter((item) => item.status === "Pré-orçamento"));
    });
    publicOrcamentoResponseWatchers.set(shareId, unsubscribe);
  });
}

window.addEventListener("rr-public-response-api-ready", () => {
  if (document.body.dataset.page === "dashboard") initDashboard();
});

async function updateOrcamentoStatus(id, status) {
  const orcamentos = readData("orcamentos");
  const index = orcamentos.findIndex((orcamento) => orcamento.id === id);
  if (index < 0) return;
  const pagamento = status === "Aprovado" ? await askPaymentInfo(getOrcamentoTotal(orcamentos[index])) : null;
  if (status === "Aprovado" && !pagamento) return;

  orcamentos[index] = {
    ...orcamentos[index],
    status,
    decidedAt: new Date().toISOString(),
    pagamento
  };
  writeData("orcamentos", orcamentos);
  await persistSavedData("orcamentos");
  initDashboard();
}

function initClientes() {
  clienteCarrosDraft = [blankCarro()];
  byId("addCarroCliente").addEventListener("click", () => {
    syncClienteCarrosDraft();
    clienteCarrosDraft.push(blankCarro());
    renderClienteCarrosDraft();
  });
  byId("clienteForm").addEventListener("submit", saveCliente);
  byId("clienteTelefone").addEventListener("input", (event) => {
    event.target.value = formatPhoneBR(event.target.value);
  });
  byId("buscaClientes").addEventListener("input", renderClientes);
  renderClienteCarrosDraft();
  renderClientes();
}

function blankCarro() {
  return { id: createId("car"), marca: "", modelo: "", motor: "", ano: "", placa: "", obs: "" };
}

function syncClienteCarrosDraft() {
  clienteCarrosDraft = [...document.querySelectorAll("[data-carro-index]")].map((row) => ({
    id: row.dataset.carroId || createId("car"),
    marca: row.querySelector("[data-field='marca']").value.trim(),
    modelo: row.querySelector("[data-field='modelo']").value.trim(),
    motor: row.querySelector("[data-field='motor']").value.trim(),
    ano: row.querySelector("[data-field='ano']").value.trim(),
    placa: formatPlateBR(row.querySelector("[data-field='placa']").value),
    obs: row.querySelector("[data-field='obs']").value.trim()
  }));
}

function renderClienteCarrosDraft() {
  const container = byId("clienteCarros");
  if (!container) return;

  container.innerHTML = clienteCarrosDraft.map((carro, index) => `
    <div class="nested-item" data-carro-index="${index}" data-carro-id="${escapeHtml(carro.id)}">
      <label>Marca<input data-field="marca" value="${escapeHtml(carro.marca)}" placeholder="Ex: Honda"></label>
      <label>Carro<input data-field="modelo" value="${escapeHtml(carro.modelo)}" placeholder="Ex: Civic"></label>
      <label>Motor<input data-field="motor" value="${escapeHtml(carro.motor)}" placeholder="Ex: 2.0 Flex"></label>
      <label>Ano<input data-field="ano" value="${escapeHtml(carro.ano)}" placeholder="Ex: 2019"></label>
      <label>Placa<input data-field="placa" value="${escapeHtml(formatPlateBR(carro.placa))}" placeholder="ABC-1D23" maxlength="8" oninput="this.value = formatPlateBR(this.value)"></label>
      <label>Observações<input data-field="obs" value="${escapeHtml(carro.obs)}" placeholder="Detalhes do carro"></label>
      <button class="btn btn-danger" type="button" onclick="removeCarroCliente(${index})">Remover</button>
    </div>
  `).join("");
}

function removeCarroCliente(index) {
  syncClienteCarrosDraft();
  clienteCarrosDraft.splice(index, 1);
  if (!clienteCarrosDraft.length) clienteCarrosDraft.push(blankCarro());
  renderClienteCarrosDraft();
}

async function saveCliente(event) {
  event.preventDefault();
  const form = event.currentTarget;
  setFormSaving(form, true, 'Salvando...');
  syncClienteCarrosDraft();

  const clientes = readData("clientes");
  const id = getValue("clienteId") || createId("cli");
  const cliente = {
    id,
    nome: getValue("clienteNome"),
    telefone: formatPhoneBR(getValue("clienteTelefone")),
    email: getValue("clienteEmail"),
    documento: getValue("clienteDocumento"),
    endereco: getValue("clienteEndereco"),
    obs: getValue("clienteObs"),
    carros: clienteCarrosDraft.filter((carro) => carro.marca || carro.modelo || carro.motor || carro.ano || carro.placa || carro.obs).map(normalizeCarro)
  };

  const index = clientes.findIndex((item) => item.id === id);
  if (index >= 0) clientes[index] = cliente;
  else clientes.push(cliente);

  writeData("clientes", clientes);
  try {
    await persistSavedData("clientes");
  } catch (error) {
    setValue('clienteId', id);
    await rrAlert('Falha ao confirmar o cliente na nuvem. Confira sua internet e tente novamente.', 'Cliente nao salvo');
    setFormSaving(form, false);
    return;
  }
  form.reset();
  setValue("clienteId", "");
  clienteCarrosDraft = [blankCarro()];
  renderClienteCarrosDraft();
  renderClientes();
  setFormSaving(form, false);
}

function renderClientes() {
  const termo = getValue("buscaClientes").toLowerCase();
  const clientes = readData("clientes")
    .filter((cliente) => JSON.stringify(cliente).toLowerCase().includes(termo))
    .sort(compareClientesByName);
  byId("clientesTabela").innerHTML = clientes.length ? clientes.map((cliente) => {
    const carros = cliente.carros?.length
      ? cliente.carros.map((carro) => `<span class="mini-line">${escapeHtml([carro.marca, carro.modelo, carro.motor, carro.ano].filter(Boolean).join(" "))}</span>`).join("")
      : `<span class="muted">Nenhum carro cadastrado</span>`;

    return `
      <tr>
        <td><strong>${escapeHtml(cliente.nome)}</strong><div class="muted">${escapeHtml(cliente.obs || "")}</div></td>
        <td>${escapeHtml(cliente.telefone)}<div class="muted">${escapeHtml(cliente.email || "")}</div></td>
        <td>${carros}</td>
        <td>${escapeHtml(cliente.endereco || "-")}</td>
        <td class="actions"><button class="btn btn-muted" onclick="editCliente('${cliente.id}')">Editar</button><button class="btn btn-danger" onclick="deleteItem('clientes','${cliente.id}', renderClientes)">Excluir</button></td>
      </tr>`;
  }).join("") : emptyRow(5, "Nenhum cliente encontrado.");
}

function editCliente(id) {
  const cliente = getCliente(id);
  if (!cliente) return;
  setValue("clienteId", cliente.id);
  setValue("clienteNome", cliente.nome);
  setValue("clienteTelefone", cliente.telefone);
  setValue("clienteEmail", cliente.email);
  setValue("clienteDocumento", cliente.documento);
  setValue("clienteEndereco", cliente.endereco);
  setValue("clienteObs", cliente.obs);
  clienteCarrosDraft = cliente.carros?.length ? cliente.carros.map(normalizeCarro) : [blankCarro()];
  renderClienteCarrosDraft();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function initOrcamentos() {
  hydrateClienteCarroSelects("orcamentoCliente", "orcamentoCarro");
  setValue("orcamentoData", today());
  resetOrcamentoDrafts();
  const clienteSelect = byId("orcamentoCliente");
  const carroSelect = byId("orcamentoCarro");
  const inspectionButton = byId("gerarInspecao");
  clienteSelect.addEventListener("change", () => {
    hydrateClienteCarroSelects("orcamentoCliente", "orcamentoCarro");
    updateOrcamentoInspectionButton();
  });
  carroSelect.addEventListener("change", updateOrcamentoInspectionButton);
  inspectionButton.addEventListener("click", () => {
    if (!clienteSelect.value || !carroSelect.value) return;
    const params = new URLSearchParams({ cliente: clienteSelect.value, carro: carroSelect.value });
    params.set("rev", "5");
    window.location.href = `inspecao.html?${params.toString()}`;
  });
  updateOrcamentoInspectionButton();
  byId("addPeca").addEventListener("click", () => {
    syncOrcamentoDrafts();
    orcamentoPecasDraft.push(blankPeca());
    renderOrcamentoDrafts();
  });
  byId("addServicoOrcamento").addEventListener("click", () => {
    syncOrcamentoDrafts();
    orcamentoServicosDraft.push(blankServicoOrcamento());
    renderOrcamentoDrafts();
  });
  byId("addServicoTerceirizado").addEventListener("click", () => {
    syncOrcamentoDrafts();
    orcamentoTerceirizadosDraft.push(blankServicoTerceirizado());
    renderOrcamentoDrafts();
  });
  byId("orcamentoForm").addEventListener("input", handleOrcamentoFormInput);
  byId("orcamentoForm").addEventListener("submit", saveOrcamento);
  byId("buscaOrcamentos").addEventListener("input", renderOrcamentos);
  renderOrcamentos();

  const editarId = new URLSearchParams(window.location.search).get("editar");
  if (editarId) editOrcamento(editarId);
}

function updateOrcamentoInspectionButton() {
  const button = byId("gerarInspecao");
  if (!button) return;
  button.disabled = !(getValue("orcamentoCliente") && getValue("orcamentoCarro"));
}

function handleOrcamentoFormInput(event) {
  const costInput = event.target.closest("[data-field='custoUnitario']");
  if (costInput) {
    const row = costInput.closest("[data-peca-index]");
    const saleInput = row?.querySelector("[data-field='valorUnitario']");
    if (saleInput) {
      const saleValue = parseDecimal(costInput.value) * (1 + getPartsMarkupPercent() / 100);
      saleInput.value = saleValue.toFixed(2);
      markZeroInput(saleInput);
    }
  }
  updateOrcamentoPreview();
}

function resetOrcamentoDrafts() {
  orcamentoPecasDraft = [blankPeca()];
  orcamentoServicosDraft = [blankServicoOrcamento()];
  orcamentoTerceirizadosDraft = [blankServicoTerceirizado()];
  renderOrcamentoDrafts();
}

function blankPeca() {
  return { id: createId("pec"), nome: "", quantidade: 1, custoUnitario: 0, valorUnitario: 0 };
}

function blankServicoOrcamento() {
  return { id: createId("mao"), descricao: "", horas: 1, valorHora: getLaborHourRate() };
}

function blankServicoTerceirizado() {
  return { id: createId("ter"), descricao: "", custo: 0, valor: 0 };
}

function zeroInputClass(value) {
  return parseDecimal(value) === 0 ? " zero-value" : "";
}

function moneyDraftInput(field, value) {
  const numericValue = parseDecimal(value);
  return `<input class="money-draft-input${zeroInputClass(numericValue)}" data-field="${field}" type="number" min="0" step="0.01" value="${numericValue}" onfocus="clearZeroInput(this)" onblur="restoreZeroInput(this)" oninput="markZeroInput(this)">`;
}

function clearZeroInput(input) {
  if (parseDecimal(input.value) !== 0) return;
  input.value = "";
  input.classList.remove("zero-value");
}

function restoreZeroInput(input) {
  if (String(input.value).trim()) {
    markZeroInput(input);
    return;
  }
  input.value = "0";
  input.classList.add("zero-value");
}

function markZeroInput(input) {
  input.classList.toggle("zero-value", parseDecimal(input.value) === 0);
}

function syncOrcamentoDrafts() {
  orcamentoPecasDraft = [...document.querySelectorAll("[data-peca-index]")].map((row) => ({
    id: row.dataset.pecaId || createId("pec"),
    nome: row.querySelector("[data-field='nome']").value.trim(),
    quantidade: parseInteger(row.querySelector("[data-field='quantidade']").value),
    custoUnitario: parseDecimal(row.querySelector("[data-field='custoUnitario']").value),
    valorUnitario: parseDecimal(row.querySelector("[data-field='valorUnitario']").value)
  }));

  orcamentoServicosDraft = [...document.querySelectorAll("[data-servico-orcamento-index]")].map((row) => ({
    id: row.dataset.servicoId || createId("mao"),
    descricao: row.querySelector("[data-field='descricao']").value.trim(),
    horas: parseDecimal(row.querySelector("[data-field='horas']").value),
    valorHora: parseDecimal(row.querySelector("[data-field='valorHora']").value) || getLaborHourRate()
  }));

  orcamentoTerceirizadosDraft = [...document.querySelectorAll("[data-terceirizado-index]")].map((row) => ({
    id: row.dataset.terceirizadoId || createId("ter"),
    descricao: row.querySelector("[data-field='descricao']").value.trim(),
    custo: parseDecimal(row.querySelector("[data-field='custo']").value),
    valor: parseDecimal(row.querySelector("[data-field='valor']").value)
  }));
}

function renderOrcamentoDrafts() {
  const pecasContainer = byId("orcamentoPecasLista");
  const servicosContainer = byId("orcamentoServicosLista");
  const terceirizadosContainer = byId("orcamentoTerceirizadosLista");
  if (!pecasContainer || !servicosContainer || !terceirizadosContainer) return;

  pecasContainer.innerHTML = orcamentoPecasDraft.map((peca, index) => `
    <div class="nested-item peca-item" data-peca-index="${index}" data-peca-id="${escapeHtml(peca.id)}">
      <label>Peça<input data-field="nome" value="${escapeHtml(peca.nome)}" placeholder="Ex: Pastilha de freio"></label>
      <label>Qtd<input data-field="quantidade" type="number" min="0" step="1" value="${parseInteger(peca.quantidade)}"></label>
      <label>Custo unitário${moneyDraftInput("custoUnitario", peca.custoUnitario)}</label>
      <label>Venda unitária${moneyDraftInput("valorUnitario", peca.valorUnitario)}</label>
      <strong class="line-total">${money(parseInteger(peca.quantidade) * parseDecimal(peca.valorUnitario))}</strong>
      <button class="btn btn-danger" type="button" onclick="removePeca(${index})">Remover</button>
    </div>
  `).join("");

  servicosContainer.innerHTML = orcamentoServicosDraft.map((servico, index) => `
    <div class="nested-item servico-orcamento-item" data-servico-orcamento-index="${index}" data-servico-id="${escapeHtml(servico.id)}">
      <label>Serviço<input data-field="descricao" value="${escapeHtml(servico.descricao)}" placeholder="Ex: Revisão de freios"></label>
      <label>Horas<input data-field="horas" type="number" min="0" step="0.01" value="${parseDecimal(servico.horas)}"></label>
      <label>Valor/hora<input data-field="valorHora" type="number" min="0" step="0.01" value="${servico.valorHora}"></label>
      <strong class="line-total">${money(parseDecimal(servico.horas) * parseDecimal(servico.valorHora))}</strong>
      <button class="btn btn-danger" type="button" onclick="removeServicoOrcamento(${index})">Remover</button>
    </div>
  `).join("");

  terceirizadosContainer.innerHTML = orcamentoTerceirizadosDraft.map((servico, index) => `
    <div class="nested-item terceirizado-item" data-terceirizado-index="${index}" data-terceirizado-id="${escapeHtml(servico.id)}">
      <label>Serviço terceirizado<input data-field="descricao" value="${escapeHtml(servico.descricao)}" placeholder="Ex: Retífica do cabeçote"></label>
      <label>Custo${moneyDraftInput("custo", servico.custo)}</label>
      <label>Valor cobrado${moneyDraftInput("valor", servico.valor)}</label>
      <strong class="line-total">${money(parseDecimal(servico.valor))}</strong>
      <button class="btn btn-danger" type="button" onclick="removeServicoTerceirizado(${index})">Remover</button>
    </div>
  `).join("");

  updateOrcamentoPreview();
}

function removePeca(index) {
  syncOrcamentoDrafts();
  orcamentoPecasDraft.splice(index, 1);
  if (!orcamentoPecasDraft.length) orcamentoPecasDraft.push(blankPeca());
  renderOrcamentoDrafts();
}

function removeServicoOrcamento(index) {
  syncOrcamentoDrafts();
  orcamentoServicosDraft.splice(index, 1);
  if (!orcamentoServicosDraft.length) orcamentoServicosDraft.push(blankServicoOrcamento());
  renderOrcamentoDrafts();
}

function removeServicoTerceirizado(index) {
  syncOrcamentoDrafts();
  orcamentoTerceirizadosDraft.splice(index, 1);
  if (!orcamentoTerceirizadosDraft.length) orcamentoTerceirizadosDraft.push(blankServicoTerceirizado());
  renderOrcamentoDrafts();
}

function calculateOrcamentoTotals(pecas = orcamentoPecasDraft, servicos = orcamentoServicosDraft, terceirizados = orcamentoTerceirizadosDraft) {
  pecas = pecas.filter((peca) => String(peca.nome || "").trim());
  servicos = servicos.filter((servico) => String(servico.descricao || "").trim());
  terceirizados = terceirizados.filter((servico) => String(servico.descricao || "").trim());
  const totalPecas = pecas.reduce((sum, peca) => sum + parseInteger(peca.quantidade) * parseDecimal(peca.valorUnitario), 0);
  const totalCustoPecas = pecas.reduce((sum, peca) => sum + parseInteger(peca.quantidade) * parseDecimal(peca.custoUnitario), 0);
  const totalServicos = servicos.reduce((sum, servico) => sum + parseDecimal(servico.horas) * parseDecimal(servico.valorHora), 0);
  const totalTerceirizados = terceirizados.reduce((sum, servico) => sum + parseDecimal(servico.valor), 0);
  const totalCustoTerceirizados = terceirizados.reduce((sum, servico) => sum + parseDecimal(servico.custo), 0);
  const total = totalPecas + totalServicos + totalTerceirizados;
  return { totalPecas, totalCustoPecas, totalServicos, totalTerceirizados, totalCustoTerceirizados, total, lucroEstimado: total - totalCustoPecas - totalCustoTerceirizados };
}

function updateOrcamentoPreview() {
  syncOrcamentoDrafts();
  const totals = calculateOrcamentoTotals();
  const valorFinal = parseDecimal(getValue("orcamentoValorFinal"));
  const totalFinal = valorFinal > 0 ? valorFinal : totals.total;
  setText("totalPecasPreview", money(totals.totalPecas));
  setText("totalCustoPecasPreview", money(totals.totalCustoPecas));
  setText("totalServicosPreview", money(totals.totalServicos));
  setText("totalTerceirizadosPreview", money(totals.totalTerceirizados));
  setText("totalCustoTerceirizadosPreview", money(totals.totalCustoTerceirizados));
  setText("totalOrcamentoPreview", money(totalFinal));
  setText("lucroOrcamentoPreview", money(totalFinal - totals.totalCustoPecas - totals.totalCustoTerceirizados));
  document.querySelectorAll("[data-peca-index]").forEach((row, index) => {
    row.querySelector(".line-total").textContent = money(parseInteger(orcamentoPecasDraft[index].quantidade) * parseDecimal(orcamentoPecasDraft[index].valorUnitario));
  });
  document.querySelectorAll("[data-servico-orcamento-index]").forEach((row, index) => {
    row.querySelector(".line-total").textContent = money(parseDecimal(orcamentoServicosDraft[index].horas) * parseDecimal(orcamentoServicosDraft[index].valorHora));
  });
  document.querySelectorAll("[data-terceirizado-index]").forEach((row, index) => {
    row.querySelector(".line-total").textContent = money(orcamentoTerceirizadosDraft[index].valor);
  });
}

function cloneOrcamentoVersion(orcamento) {
  if (!orcamento) return null;
  const {
    historicoVersoes,
    ...snapshot
  } = orcamento;
  return {
    ...snapshot,
    versionId: createId("ver"),
    savedAt: new Date().toISOString()
  };
}

function isSameOrcamentoVersion(a, b) {
  if (!a || !b) return false;
  const fields = ["clienteId", "carroId", "veiculoId", "data", "status", "valorFinalManual", "total"];
  const basicFieldsMatch = fields.every((field) => String(a[field] ?? "") === String(b[field] ?? ""));
  return basicFieldsMatch
    && JSON.stringify(a.pecas || []) === JSON.stringify(b.pecas || [])
    && JSON.stringify(a.servicos || []) === JSON.stringify(b.servicos || [])
    && JSON.stringify(a.terceirizados || []) === JSON.stringify(b.terceirizados || []);
}

async function saveOrcamento(event) {
  event.preventDefault();
  const form = event.currentTarget;
  setFormSaving(form, true, 'Salvando...');
  syncOrcamentoDrafts();
  const pecas = orcamentoPecasDraft.filter((peca) => peca.nome);
  const servicos = orcamentoServicosDraft.filter((servico) => servico.descricao);
  const terceirizados = orcamentoTerceirizadosDraft.filter((servico) => servico.descricao);
  const totals = calculateOrcamentoTotals(pecas, servicos, terceirizados);
  const orcamentos = readData("orcamentos");
  const id = getValue("orcamentoId") || createId("orc");
  const existente = orcamentos.find((item) => item.id === id);
  const valorFinalManual = parseDecimal(getValue("orcamentoValorFinal"));
  const totalFinal = valorFinalManual > 0 ? valorFinalManual : totals.total;
  const status = existente?.status === "Aprovado" ? "Pré-orçamento" : existente?.status || "Pré-orçamento";
  const orcamento = {
    id,
    numero: existente?.numero || getNextOrcamentoNumber(orcamentos),
    clienteId: getValue("orcamentoCliente"),
    carroId: getValue("orcamentoCarro"),
    data: getValue("orcamentoData"),
    status,
    pecas,
    servicos,
    terceirizados,
    totalPecas: totals.totalPecas,
    totalCustoPecas: totals.totalCustoPecas,
    totalServicos: totals.totalServicos,
    totalTerceirizados: totals.totalTerceirizados,
    totalCustoTerceirizados: totals.totalCustoTerceirizados,
    totalCalculado: totals.total,
    valorFinalManual,
    total: totalFinal,
    lucroEstimado: totalFinal - totals.totalCustoPecas - totals.totalCustoTerceirizados,
    historicoVersoes: existente?.historicoVersoes || []
  };
  if (existente && !isSameOrcamentoVersion(existente, orcamento)) {
    orcamento.historicoVersoes = [
      cloneOrcamentoVersion(existente),
      ...(existente.historicoVersoes || [])
    ].filter(Boolean).slice(0, 12);
  }
  if (existente?.status && existente.status !== "Aprovado") orcamento.decidedAt = existente.decidedAt;
  const index = orcamentos.findIndex((item) => item.id === id);
  if (index >= 0) orcamentos[index] = orcamento;
  else orcamentos.push(orcamento);
  writeData("orcamentos", orcamentos);
  try {
    await persistSavedData("orcamentos");
  } catch (error) {
    setValue('orcamentoId', id);
    await rrAlert('Falha ao confirmar o orcamento na nuvem. Confira sua internet e tente novamente.', 'Orcamento nao salvo');
    setFormSaving(form, false);
    return;
  }
  form.reset();
  setValue("orcamentoId", "");
  setValue("orcamentoData", today());
  hydrateClienteCarroSelects("orcamentoCliente", "orcamentoCarro");
  updateOrcamentoInspectionButton();
  resetOrcamentoDrafts();
  renderOrcamentos();
  setFormSaving(form, false);
}

function renderOrcamentos() {
  const termo = getValue("buscaOrcamentos").toLowerCase();
  const orcamentos = readData("orcamentos").filter((orcamento) => `${JSON.stringify(orcamento)} ${getClienteNome(orcamento.clienteId)} ${getCarroNome(orcamento.clienteId, orcamento.carroId || orcamento.veiculoId)}`.toLowerCase().includes(termo));
  byId("orcamentosTabela").innerHTML = orcamentos.length ? orcamentos.map((orcamento) => `
    <tr>
      <td><strong>${String(orcamento.numero || "").padStart(4, "0")}</strong></td>
      <td>${escapeHtml(getClienteNome(orcamento.clienteId))}</td>
      <td>${escapeHtml(getCarroDetalhes(orcamento.clienteId, orcamento.carroId || orcamento.veiculoId))}</td>
      <td><span class="badge ${badgeClass(orcamento.status)}">${escapeHtml(orcamento.status)}</span></td>
      <td>${money(getOrcamentoTotal(orcamento))}</td>
      <td>${escapeHtml(formatDateBR(orcamento.data) || "-")}</td>
      <td class="actions">
        <button class="btn btn-muted" onclick="editOrcamento('${orcamento.id}')">Editar</button>
        ${(orcamento.historicoVersoes || []).length ? `<button class="btn btn-ghost" onclick="restoreOrcamentoVersion('${orcamento.id}')">Versões</button>` : ""}
        <a class="btn btn-ghost" href="orcamento-imprimir.html?id=${orcamento.id}">Imprimir</a>
        <button class="btn btn-danger" onclick="deleteItem('orcamentos','${orcamento.id}', renderOrcamentos)">Excluir</button>
      </td>
    </tr>`).join("") : emptyRow(7, "Nenhum orçamento encontrado.");
}

function getOrcamentoTotal(orcamento) {
  const valorFinalManual = parseDecimal(orcamento.valorFinalManual);
  if (valorFinalManual > 0) return valorFinalManual;
  if (Array.isArray(orcamento.pecas) || Array.isArray(orcamento.servicos) || Array.isArray(orcamento.terceirizados)) {
    return calculateOrcamentoTotals(
      Array.isArray(orcamento.pecas) ? orcamento.pecas : [],
      Array.isArray(orcamento.servicos) ? orcamento.servicos : [],
      Array.isArray(orcamento.terceirizados) ? orcamento.terceirizados : []
    ).total;
  }
  if (orcamento.total !== undefined) return parseDecimal(orcamento.total);
  return (Number(orcamento.pecas) || 0) + (Number(orcamento.maoObra) || 0);
}

function editOrcamento(id) {
  const orcamento = readData("orcamentos").find((item) => item.id === id);
  if (!orcamento) return;
  loadOrcamentoIntoForm(orcamento);
}

function loadOrcamentoIntoForm(orcamento) {
  setValue("orcamentoId", orcamento.id);
  setValue("orcamentoCliente", orcamento.clienteId);
  hydrateClienteCarroSelects("orcamentoCliente", "orcamentoCarro", orcamento.carroId || orcamento.veiculoId);
  updateOrcamentoInspectionButton();
  setValue("orcamentoData", orcamento.data);
  setValue("orcamentoValorFinal", orcamento.valorFinalManual || "");
  orcamentoPecasDraft = Array.isArray(orcamento.pecas) ? orcamento.pecas.map((peca) => ({ custoUnitario: 0, ...peca })) : [{ ...blankPeca(), nome: "Peças", quantidade: 1, valorUnitario: Number(orcamento.pecas) || 0 }];
  orcamentoServicosDraft = Array.isArray(orcamento.servicos) ? orcamento.servicos : [{ ...blankServicoOrcamento(), descricao: "Mão de obra", horas: 1, valorHora: Number(orcamento.maoObra) || getLaborHourRate() }];
  orcamentoTerceirizadosDraft = Array.isArray(orcamento.terceirizados) && orcamento.terceirizados.length ? orcamento.terceirizados : [blankServicoTerceirizado()];
  renderOrcamentoDrafts();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function restoreOrcamentoVersion(id) {
  const orcamento = readData("orcamentos").find((item) => item.id === id);
  const versoes = orcamento?.historicoVersoes || [];
  if (!versoes.length) {
    await rrAlert("Este orçamento ainda não tem versões anteriores salvas.", "Versões");
    return;
  }
  const options = versoes.map((versao, index) => {
    const data = formatDateBR((versao.savedAt || "").slice(0, 10)) || "sem data";
    return {
      label: `${data} | ${money(getOrcamentoTotal(versao))}`,
      value: index,
      variant: index === 0 ? "primary" : "muted"
    };
  });
  options.push({ label: "Cancelar", value: null, variant: "muted" });
  const index = await rrModal({
    title: "Versões do orçamento",
    eyebrow: "Histórico",
    message: modalList(versoes.map((versao, index) => {
      const data = formatDateBR((versao.savedAt || "").slice(0, 10)) || "sem data";
      return `<strong>${index + 1}. ${data}</strong><span>${versao.status || "-"} | ${money(getOrcamentoTotal(versao))}</span>`;
    })),
    options
  });
  if (index === null) return;
  const versao = versoes[index];
  if (!versao) {
    await rrAlert("Versão não encontrada.", "Versões");
    return;
  }
  loadOrcamentoIntoForm({
    ...orcamento,
    ...versao,
    id: orcamento.id,
    numero: orcamento.numero,
    status: "Pré-orçamento",
    historicoVersoes: orcamento.historicoVersoes || []
  });
  await rrAlert("Versão carregada no formulário. Revise e clique em Salvar orçamento para confirmar.", "Versões");
}

function printOrcamento(id) {
  window.location.href = `orcamento-imprimir.html?id=${encodeURIComponent(id)}`;
}

function getInspectionDraftKey(clienteId, carroId, date = today()) {
  return `rr_inspecao_draft_${clienteId}_${carroId}_${date}`;
}

function readInspectionDraft(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key)) || {};
  } catch (error) {
    sessionStorage.removeItem(key);
    return {};
  }
}

function getInspectionStatusOptions(selected = "") {
  return [
    ["", "Não verificado"],
    ["ok", "OK"],
    ["attention", "Atenção"],
    ["na", "Não se aplica"]
  ].map(([value, label]) => `<option value="${value}"${selected === value ? " selected" : ""}>${label}</option>`).join("");
}

function getInspectionStatusPrintHtml(status) {
  const options = [
    ["ok", "OK"],
    ["attention", "ATENÇÃO"],
    ["na", "N/A"]
  ];
  return options.map(([value, label]) => `${status === value ? "&#9746;" : "&#9744;"} ${label}`).join("&nbsp;&nbsp;");
}
function getInspectionStatusPrintText(status) {
  return [
    ["ok", "OK"],
    ["attention", "ATENÇÃO"],
    ["na", "N/A"]
  ].map(([value, label]) => `${status === value ? "\u2612" : "\u2610"}${label}`).join(" ");
}

function toggleInspectionPrintLabels(enabled) {
  document.querySelectorAll(".inspection-table tbody tr").forEach((row) => {
    const label = row.querySelector(".inspection-item-cell > span:first-child");
    const select = row.querySelector("[data-inspection-status]");
    const note = row.querySelector("[data-inspection-note]")?.value.trim() || "";
    if (!label || !select) return;
    if (enabled) {
      label.dataset.screenText = label.textContent;
      label.textContent = `${label.textContent} | ${getInspectionStatusPrintText(select.value)}${note ? ` | ${note}` : ""}`;
      row.classList.toggle("has-print-note", Boolean(note));
    } else if (label.dataset.screenText) {
      label.textContent = label.dataset.screenText;
      delete label.dataset.screenText;
      row.classList.remove("has-print-note");
    }
  });

  document.querySelectorAll(".inspection-table th:first-child > span:first-child").forEach((heading) => {
    if (enabled) {
      heading.dataset.screenText = heading.textContent;
      heading.textContent = "Item verificado | Resultado";
    } else if (heading.dataset.screenText) {
      heading.textContent = heading.dataset.screenText;
      delete heading.dataset.screenText;
    }
  });
}
function buildInspectionSectionHtml(section, sectionIndex, draft) {
  return `
    <section class="inspection-section">
      <h3>${escapeHtml(section.title)}</h3>
      <div class="inspection-table-wrap">
        <table class="inspection-table">
          <thead><tr><th><span>Item verificado</span><span class="inspection-print-result-heading">Resultado</span></th><th>Resultado</th><th>Observação</th></tr></thead>
          <tbody>
            ${section.items.map((item, itemIndex) => {
              const id = `${sectionIndex}-${itemIndex}`;
              const status = draft.items?.[id]?.status || "";
              const note = draft.items?.[id]?.note || "";
              return `
                <tr data-print-status="${status || "pending"}">
                  <td class="inspection-item-cell">
                    <span>${escapeHtml(item)}</span>
                  </td>
                  <td class="inspection-result-cell">
                    <select data-inspection-status="${id}" class="inspection-status status-${status || "pending"}" aria-label="Resultado de ${escapeHtml(item)}">
                      ${getInspectionStatusOptions(status)}
                    </select>
                    <span class="inspection-print-status" data-inspection-status-print="${id}" aria-hidden="true">${getInspectionStatusPrintHtml(status)}</span>
                  </td>
                  <td class="inspection-note-cell">
                    <input data-inspection-note="${id}" value="${escapeHtml(note)}" placeholder="Detalhes, lado ou medida">
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function collectInspectionDraft(root) {
  const draft = { fields: {}, items: {} };
  root.querySelectorAll("[data-inspection-field]").forEach((input) => {
    draft.fields[input.dataset.inspectionField] = input.value;
  });
  root.querySelectorAll("[data-inspection-status]").forEach((select) => {
    const id = select.dataset.inspectionStatus;
    draft.items[id] = {
      status: select.value,
      note: root.querySelector(`[data-inspection-note="${id}"]`)?.value || ""
    };
  });
  return draft;
}

function prepareInspectionForExport(root) {
  root.querySelectorAll("input").forEach((input) => input.setAttribute("value", input.value));
  root.querySelectorAll("textarea").forEach((textarea) => {
    textarea.textContent = textarea.value;
  });
  root.querySelectorAll("select").forEach((select) => {
    Array.from(select.options).forEach((option) => {
      if (option.value === select.value) option.setAttribute("selected", "");
      else option.removeAttribute("selected");
    });
  });
  root.querySelectorAll("[data-inspection-status]").forEach((select) => {
    select.closest("tr")?.setAttribute("data-print-status", select.value || "pending");
    const output = root.querySelector(`[data-inspection-status-print="${select.dataset.inspectionStatus}"]`);
    if (output) output.innerHTML = getInspectionStatusPrintHtml(select.value);
  });
}

function initInspecao() {
  const params = new URLSearchParams(window.location.search);
  const clienteId = params.get("cliente") || "";
  const carroId = params.get("carro") || "";
  const cliente = getCliente(clienteId);
  const carro = getCarro(clienteId, carroId);
  const root = byId("printRoot");
  const printButton = byId("printButton");
  const clearButton = byId("clearInspectionButton");
  setupMobilePrintButtonLabel();

  if (!cliente || !carro) {
    root.innerHTML = `<section class="print-document"><h1>Lista de inspeção indisponível</h1><p>Selecione novamente o cliente e o veículo na tela de orçamentos.</p></section>`;
    if (printButton) printButton.disabled = true;
    if (clearButton) clearButton.disabled = true;
    return;
  }

  const branding = getDocumentBranding();
  const logoUrl = new URL(branding.logoUrl, window.location.href).href;
  const draftKey = getInspectionDraftKey(clienteId, carroId);
  const draft = readInspectionDraft(draftKey);
  const fields = draft.fields || {};
  const vehicleName = [carro.marca, carro.modelo, carro.motor, carro.ano].filter(Boolean).join(" ");

  root.innerHTML = `
    <article class="print-document inspection-document">
      <header class="print-header inspection-print-header">
        <img src="${logoUrl}" alt="${escapeHtml(branding.companyName)}">
        <div>
          <h1>${escapeHtml(branding.companyName)}</h1>
          <p>${escapeHtml(branding.tagline)}</p>
          <p><strong>Inspeção preventiva do veículo</strong></p>
        </div>
      </header>

      <h2>Lista de inspeção automotiva</h2>

      <section class="print-info-grid inspection-client-grid">
        <div><strong>Cliente</strong>${escapeHtml(cliente.nome || "")}<br>${escapeHtml(formatPhoneBR(cliente.telefone))}<br>${escapeHtml(cliente.email || "")}</div>
        <div><strong>Veículo</strong>${escapeHtml(vehicleName)}<br>${escapeHtml(carro.placa ? `Placa: ${carro.placa}` : "")}</div>
      </section>

      <section class="inspection-meta-grid">
        <label><strong>Data</strong><input type="date" data-inspection-field="date" value="${escapeHtml(fields.date || today())}"></label>
        <label><strong>Quilometragem</strong><input type="number" min="0" data-inspection-field="km" value="${escapeHtml(fields.km || carro.km || "")}" placeholder="Km atual"></label>
        <label><strong>Técnico responsável</strong><input data-inspection-field="technician" value="${escapeHtml(fields.technician || "")}" placeholder="Nome do técnico"></label>
      </section>

      <section class="inspection-opening">
        <label><strong>Reclamações relatadas pelo cliente</strong><textarea data-inspection-field="complaints" rows="2" placeholder="Descreva os sintomas informados pelo cliente">${escapeHtml(fields.complaints || "")}</textarea></label>
      </section>

      <div class="inspection-legend">
        <span><i class="ok"></i>OK</span>
        <span><i class="attention"></i>Atenção</span>
        <span><i class="na"></i>Não se aplica</span>
      </div>

      <div class="inspection-sections-grid">
        ${INSPECTION_SECTIONS.map((section, index) => buildInspectionSectionHtml(section, index, draft)).join("")}
      </div>

      <section class="inspection-conclusion">
        <h3>Conclusão da inspeção</h3>
        <label><strong>Recomendações e observações gerais</strong><textarea data-inspection-field="conclusion" rows="4" placeholder="Serviços recomendados, prioridades e orientações ao cliente">${escapeHtml(fields.conclusion || "")}</textarea></label>
        <div class="inspection-signatures">
          <span>Assinatura do técnico</span>
          <span>Ciência do cliente</span>
        </div>
      </section>

      <footer class="print-footer">Esta inspeção registra condições visíveis no momento da avaliação. Alguns defeitos podem exigir desmontagem ou diagnóstico complementar.</footer>
    </article>
  `;

  prepareInspectionForExport(root);
  const saveDraft = () => sessionStorage.setItem(draftKey, JSON.stringify(collectInspectionDraft(root)));
  root.addEventListener("input", saveDraft);
  root.addEventListener("change", (event) => {
    if (event.target.matches("[data-inspection-status]")) {
      event.target.className = `inspection-status status-${event.target.value || "pending"}`;
    }
    prepareInspectionForExport(root);
    saveDraft();
  });
  root.addEventListener("input", () => prepareInspectionForExport(root));

  const title = sanitizePrintTitle(`RR - Lista de inspeção ${cliente.nome} ${carro.placa || vehicleName}`);
  printButton?.addEventListener("click", () => {
    saveDraft();
    prepareInspectionForExport(root);
    handlePrintDocumentAction(title);
  });
  clearButton?.addEventListener("click", async () => {
    const confirmed = await rrConfirm("Deseja limpar todas as marcações e observações desta inspeção?", "Limpar inspeção", true);
    if (!confirmed) return;
    sessionStorage.removeItem(draftKey);
    window.location.reload();
  });
}

function initOrcamentoPrint() {
  const id = new URLSearchParams(window.location.search).get("id");
  const orcamento = readData("orcamentos").find((item) => item.id === id);
  const root = byId("printRoot");
  const printButton = byId("printButton");
  setupMobilePrintButtonLabel();

  if (printButton) {
    const clienteNome = sanitizePrintTitle(getClienteNome(orcamento?.clienteId)).toUpperCase();
    const title = sanitizePrintTitle(`RR - Orçamento do Serviço Automotivo ${clienteNome}`);
    printButton.addEventListener("click", () => handlePrintDocumentAction(title));
  }

  if (!orcamento) {
    root.innerHTML = `<section class="print-document"><h1>Orçamento não encontrado</h1><p>Volte para a lista e tente novamente.</p></section>`;
    return;
  }

  root.innerHTML = buildOrcamentoPrintHtml(orcamento);
}

function initOrcamentoPublico() {
  const root = byId("printRoot");
  setupMobilePrintButtonLabel();
  const dataParam = new URLSearchParams(window.location.hash.slice(1)).get("d");
  const publicId = new URLSearchParams(window.location.search).get("id");

  window.renderPublicOrcamentoData = renderPublicOrcamentoData;
  window.renderPublicOrcamentoResponse = renderPublicOrcamentoResponse;
  window.showPublicOrcamentoError = showPublicOrcamentoError;
  document.querySelectorAll("[data-public-response]").forEach((button) => {
    button.addEventListener("click", () => submitPublicOrcamentoResponse(button.dataset.publicResponse));
  });

  if (dataParam) {
    try {
      renderPublicOrcamentoData(decodePublicPayload(dataParam));
    } catch (error) {
      showPublicOrcamentoError("Confira se o link recebido está completo.");
    }
    return;
  }

  if (publicId) {
    root.innerHTML = `<section class="print-document"><h1>Carregando orçamento...</h1><p>Aguarde um instante.</p></section>`;
    if (window.rrPendingPublicOrcamentoData) renderPublicOrcamentoData(window.rrPendingPublicOrcamentoData);
    window.addEventListener("rr-public-orcamento-loaded", (event) => renderPublicOrcamentoData(event.detail), { once: true });
    return;
  }

  showPublicOrcamentoError("Confira se o link recebido está completo.");
}

function renderPublicOrcamentoData(rawData) {
  const root = byId("printRoot");
  const printButton = byId("printButton");
  try {
    const data = normalizePublicOrcamentoData(rawData);
    const orcamento = {
      ...data.orcamento,
      publicCliente: data.cliente,
      publicCarro: data.carro,
      branding: data.branding
    };
    const clienteNome = sanitizePrintTitle(data.cliente?.nome).toUpperCase();
    const title = sanitizePrintTitle(`RR - Orçamento do Serviço Automotivo ${clienteNome}`);
    printButton?.addEventListener("click", () => handlePrintDocumentAction(title));
    root.innerHTML = buildOrcamentoPrintHtml(orcamento);
  } catch (error) {
    showPublicOrcamentoError("Confira se o link recebido está completo.");
  }
}

function showPublicOrcamentoError(message) {
  const root = byId("printRoot");
  root.innerHTML = `<section class="print-document"><h1>Orçamento indisponível</h1><p>${escapeHtml(message)}</p></section>`;
}

function buildOrcamentoPrintHtml(orcamento) {
  const cliente = orcamento.publicCliente || getCliente(orcamento.clienteId);
  const carro = orcamento.publicCarro || getCarro(orcamento.clienteId, orcamento.carroId || orcamento.veiculoId);
  const pecas = Array.isArray(orcamento.pecas) ? orcamento.pecas.filter((peca) => String(peca.nome || "").trim()) : [];
  const servicos = Array.isArray(orcamento.servicos) ? orcamento.servicos.filter((servico) => String(servico.descricao || "").trim()) : [];
  const terceirizados = Array.isArray(orcamento.terceirizados) ? orcamento.terceirizados.filter((servico) => String(servico.descricao || "").trim()) : [];
  const totals = calculateOrcamentoTotals(pecas, servicos, terceirizados);
  const totalFinal = getOrcamentoTotal(orcamento);
  const descontoPix = getPaymentDiscount(orcamento);
  const descontoPixPercentual = getPaymentDiscountPercent(orcamento);
  const descontoPixLabel = String(Number(descontoPixPercentual.toFixed(2))).replace(".", ",");
  const acrescimoPagamento = getPaymentSurcharge(orcamento);
  const totalPix = Math.max(0, totalFinal - descontoPix);
  const totalComPagamento = Math.max(0, totalFinal + acrescimoPagamento);
  const branding = getDocumentBranding(orcamento);
  const logoUrl = new URL(branding.logoUrl, window.location.href).href;
  const manyPartsClass = pecas.length >= 14 ? " has-many-parts" : "";

  return `
    <article class="print-document${manyPartsClass}">
      <header class="print-header">
        <img src="${logoUrl}" alt="${escapeHtml(branding.companyName)}">
        <div>
          <h1>${escapeHtml(branding.companyName)}</h1>
          <p>${escapeHtml(branding.tagline)}</p>
          <p>Status: <strong>${escapeHtml(orcamento.status)}</strong></p>
        </div>
      </header>

      <h2>Orçamento do Serviço Automotivo</h2>

      <section class="print-info-grid">
        <div><strong>Cliente</strong>${escapeHtml(cliente?.nome || "")}<br>${escapeHtml(formatPhoneBR(cliente?.telefone))}<br>${escapeHtml(cliente?.email || "")}</div>
        <div><strong>Carro</strong>${escapeHtml([carro?.marca, carro?.modelo, carro?.motor, carro?.ano].filter(Boolean).join(" "))}<br>${escapeHtml(carro?.placa ? `Placa: ${carro.placa}` : "")}</div>
        <div><strong>Data</strong>${escapeHtml(formatDateBR(orcamento.data))}</div>
        <div><strong>Número do orçamento</strong>${String(orcamento.numero || "").padStart(4, "0")}</div>
      </section>

      ${pecas.length ? `<section class="print-parts-section">
        <h3>Peças</h3>
        <table class="print-table">
          <thead><tr><th>Item</th><th>Qtd</th><th>Valor unit.</th><th>Total</th></tr></thead>
          <tbody>${pecas.map((peca) => `<tr><td>${escapeHtml(peca.nome)}</td><td class="right">${parseInteger(peca.quantidade)}</td><td class="right">${money(peca.valorUnitario)}</td><td class="right">${money(parseInteger(peca.quantidade) * parseDecimal(peca.valorUnitario))}</td></tr>`).join("")}</tbody>
        </table>
      </section>` : ""}

      ${servicos.length ? `<section class="print-services-section">
        <h3>Mão de obra</h3>
        <table class="print-table">
          <thead><tr><th>Serviço</th><th>Horas</th><th>Valor/hora</th><th>Total</th></tr></thead>
          <tbody>${servicos.map((servico) => `<tr><td>${escapeHtml(servico.descricao)}</td><td class="right">${parseDecimal(servico.horas)}</td><td class="right">${money(servico.valorHora)}</td><td class="right">${money(parseDecimal(servico.horas) * parseDecimal(servico.valorHora))}</td></tr>`).join("")}</tbody>
        </table>
      </section>` : ""}

      ${terceirizados.length ? `<section class="print-outsourced-section">
        <h3>Serviços terceirizados</h3>
        <table class="print-table">
          <thead><tr><th>Serviço</th><th class="right">Valor</th></tr></thead>
          <tbody>${terceirizados.map((servico) => `<tr><td>${escapeHtml(servico.descricao)}</td><td class="right">${money(servico.valor)}</td></tr>`).join("")}</tbody>
        </table>
      </section>` : ""}

      <h3 class="print-payment-title">Resumo e pagamento</h3>
      <section class="print-payment-row print-payment-section">
        <div class="print-totals">
        ${pecas.length ? `<div><span>Total peças</span><strong>${money(totals.totalPecas)}</strong></div>` : ""}
        ${servicos.length ? `<div><span>Total mão de obra</span><strong>${money(totals.totalServicos)}</strong></div>` : ""}
        ${terceirizados.length ? `<div><span>Total terceirizados</span><strong>${money(totals.totalTerceirizados)}</strong></div>` : ""}
        ${orcamento.valorFinalManual ? `<div><span>Total calculado</span><strong>${money(totals.total)}</strong></div>` : ""}
        <div><span>Total geral</span><strong>${money(totalFinal)}</strong></div>
        ${acrescimoPagamento > 0 ? `<div><span>Taxa de parcelamento</span><strong>+ ${money(acrescimoPagamento)}</strong></div><div><span>Total a pagar</span><strong>${money(totalComPagamento)}</strong></div>` : ""}
        ${descontoPix > 0 ? `<div><span>Desconto Pix (${descontoPixLabel}%)</span><strong>- ${money(descontoPix)}</strong></div><div><span>Total no Pix</span><strong>${money(totalPix)}</strong></div>` : ""}
        </div>
        ${buildPixPaymentHtml(orcamento, descontoPix > 0 ? totalPix : totalFinal)}
      </section>

      <footer class="print-footer">Orçamento sujeito à aprovação. Valores podem mudar após desmontagem ou diagnóstico complementar.</footer>
    </article>
  `;
}

function getFinanceiroTipoSelecionado() {
  return document.querySelector("input[name='financeiroTipo']:checked")?.value || "Despesa";
}

function hydrateFinanceiroClassificacao(selectedGroup = "", selectedCategory = "") {
  const tipo = getFinanceiroTipoSelecionado();
  const groups = FINANCE_CATEGORIES[tipo] || FINANCE_CATEGORIES.Despesa;
  const groupSelect = byId("financeiroGrupo");
  const categorySelect = byId("financeiroCategoria");
  if (!groupSelect || !categorySelect) return;
  const categoryGroup = Object.entries(groups).find(([, categories]) => categories.includes(selectedCategory))?.[0];
  const group = groups[selectedGroup] ? selectedGroup : categoryGroup || Object.keys(groups)[0];
  groupSelect.innerHTML = Object.keys(groups).map((name) => `<option value="${escapeHtml(name)}"${name === group ? " selected" : ""}>${escapeHtml(name)}</option>`).join("");
  const categories = groups[group] || [];
  const isCustom = Boolean(selectedCategory && !categories.includes(selectedCategory));
  categorySelect.innerHTML = categories.map((name) => `<option value="${escapeHtml(name)}"${name === selectedCategory ? " selected" : ""}>${escapeHtml(name)}</option>`).join("") + `<option value="__other__"${isCustom ? " selected" : ""}>Outra categoria...</option>`;
  setValue("financeiroCategoriaOutra", isCustom ? selectedCategory : "");
  updateFinanceiroOutraCategoria();
}

function updateFinanceiroOutraCategoria() {
  const custom = getValue("financeiroCategoria") === "__other__";
  const label = byId("financeiroCategoriaOutraLabel");
  if (label) label.hidden = !custom;
  if (!custom) setValue("financeiroCategoriaOutra", "");
}

function getFinanceiroCategoriaValue() {
  return getValue("financeiroCategoria") === "__other__" ? getValue("financeiroCategoriaOutra").trim() : getValue("financeiroCategoria");
}

function getRecurringMonthKey(date) {
  return String(date || "").slice(0, 7);
}

function getRecurringDate(monthKey, day) {
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(Math.max(Number(day) || 1, 1), lastDay)).padStart(2, "0")}`;
}

function getRecurringMonths(template, throughDate = today()) {
  const recurrence = template.recorrencia || {};
  const start = recurrence.start || template.data;
  const end = recurrence.end && recurrence.end < throughDate ? recurrence.end : throughDate;
  if (!start || !end || start > end) return [];
  const months = [];
  let [year, month] = getRecurringMonthKey(start).split("-").map(Number);
  const endKey = getRecurringMonthKey(end);
  for (let guard = 0; guard < 240; guard += 1) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const occurrenceDate = getRecurringDate(key, recurrence.day);
    if (key > endKey || (recurrence.end && occurrenceDate > recurrence.end)) break;
    if (occurrenceDate >= start && occurrenceDate <= throughDate) months.push({ key, date: occurrenceDate });
    month += 1; if (month > 12) { month = 1; year += 1; }
  }
  return months;
}

async function processRecurringFinancialEntries() {
  if (window.rrHasPlanFeature?.("recorrencias") !== true) return false;
  const financeiro = readData("financeiro");
  const existingKeys = new Set(financeiro.map((item) => item.recurrenceOccurrenceKey).filter(Boolean));
  const generated = [];
  financeiro.filter((item) => item.recorrencia?.active && item.recorrencia.mode === "fixed").forEach((template) => {
    getRecurringMonths(template).forEach((occurrence) => {
      const key = `${template.id}_${occurrence.key}`;
      if (existingKeys.has(key)) return;
      existingKeys.add(key);
      generated.push({ ...template, id: createId("fin"), data: occurrence.date, recorrencia: undefined, recurrenceTemplateId: template.id, recurrenceOccurrenceKey: key, automaticoRecorrencia: true });
    });
  });
  if (!generated.length) return false;
  writeData("financeiro", [...financeiro, ...generated]);
  await persistSavedData("financeiro");
  return true;
}

function getVariableRecurrencePending(template) {
  if (!template.recorrencia?.active || template.recorrencia.mode !== "variable") return null;
  const occurrence = getRecurringMonths(template).at(-1);
  if (!occurrence) return null;
  const key = `${template.id}_${occurrence.key}`;
  return readData("financeiro").some((item) => item.recurrenceOccurrenceKey === key) ? null : { ...occurrence, key };
}

function applyFinanceRecurringAccess(event) {
  const allowed = event?.detail?.features?.recorrencias === true;
  byId("financeiroRecorrenciaPro").hidden = !allowed;
  byId("financeiroRecorrenciasPanel").hidden = !allowed;
  if (!allowed) return;
  processRecurringFinancialEntries().finally(() => { renderFinanceiro(); renderFinanceiroRelatorio(); renderFinanceiroRecorrencias(); });
}

function renderFinanceiroRecorrencias() {
  const root = byId("financeiroRecorrenciasLista");
  if (!root) return;
  const templates = readData("financeiro").filter((item) => item.recorrencia);
  root.innerHTML = templates.map((item) => {
    const pending = getVariableRecurrencePending(item);
    return `<article class="recurring-item"><div><strong>${escapeHtml(item.descricao)}</strong><span>${escapeHtml(item.categoria || "-")} · dia ${item.recorrencia.day} · ${item.recorrencia.mode === "fixed" ? "valor fixo" : "valor variável"}</span><small>${money(item.valor)} · ${item.recorrencia.active ? "Ativo" : "Pausado"}</small></div><div class="actions">${pending ? `<button class="btn btn-primary" type="button" onclick="launchVariableRecurrence('${item.id}','${pending.key}','${pending.date}')">Informar valor do mês</button>` : ""}<button class="btn btn-muted" type="button" onclick="toggleFinanceRecurrence('${item.id}')">${item.recorrencia.active ? "Pausar" : "Reativar"}</button></div></article>`;
  }).join("") || `<div class="empty-state muted">Nenhum lançamento recorrente configurado.</div>`;
}

function launchVariableRecurrence(templateId, key, date) {
  const item = readData("financeiro").find((entry) => entry.id === templateId);
  if (!item) return;
  pendingVariableRecurrence = { templateId, key };
  setValue("financeiroId", ""); setValue("financeiroData", date); setValue("financeiroDescricao", item.descricao); setValue("financeiroValor", item.valor);
  byId(item.tipo === "Receita" ? "financeiroTipoReceita" : "financeiroTipoDespesa").checked = true;
  hydrateFinanceiroClassificacao(item.grupo || "", item.categoria || "");
  byId("financeiroRepetir").checked = false; byId("financeiroRecorrenciaCampos").hidden = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function toggleFinanceRecurrence(templateId) {
  const financeiro = readData("financeiro"); const item = financeiro.find((entry) => entry.id === templateId);
  if (!item?.recorrencia) return;
  item.recorrencia.active = !item.recorrencia.active;
  writeData("financeiro", financeiro); await persistSavedData("financeiro"); renderFinanceiroRecorrencias();
}

function initFinanceiro() {
  setValue("financeiroData", today());
  setDefaultReportDates();
  hydrateFinanceiroClassificacao();
  setValue("financeiroRecorrenciaInicio", today());
  byId("financeiroRepetir").addEventListener("change", () => { byId("financeiroRecorrenciaCampos").hidden = !byId("financeiroRepetir").checked; });
  window.addEventListener("rr-workspace-ready", applyFinanceRecurringAccess);
  document.querySelectorAll("input[name='financeiroTipo']").forEach((input) => input.addEventListener("change", () => hydrateFinanceiroClassificacao()));
  byId("financeiroGrupo").addEventListener("change", () => hydrateFinanceiroClassificacao(getValue("financeiroGrupo")));
  byId("financeiroCategoria").addEventListener("change", updateFinanceiroOutraCategoria);
  byId("financeiroForm").addEventListener("submit", saveFinanceiro);
  byId("buscaFinanceiro").addEventListener("input", renderFinanceiro);
  byId("financeiroRelatorioForm").addEventListener("submit", (event) => {
    event.preventDefault();
    renderFinanceiroRelatorio();
  });
  byId("limparRelatorio").addEventListener("click", () => {
    setValue("relatorioInicio", "");
    setValue("relatorioFim", "");
    renderFinanceiroRelatorio();
  });
  byId("imprimirRelatorioFinanceiro").addEventListener("click", imprimirRelatorioFinanceiro);
  renderFinanceiro();
  renderFinanceiroRelatorio();
}

async function saveFinanceiro(event) {
  event.preventDefault();
  setFormSaving(event.target, true, "Salvando...");
  try {
    const financeiro = readData("financeiro");
    const id = getValue("financeiroId") || createId("fin");
    const tipo = document.querySelector("input[name='financeiroTipo']:checked")?.value || "Despesa";
    const categoria = getFinanceiroCategoriaValue();
    if (!categoria) throw new Error("Informe a categoria do lançamento.");
    const lancamento = {
      id,
      tipo,
      data: getValue("financeiroData"),
      descricao: getValue("financeiroDescricao"),
      grupo: getValue("financeiroGrupo"),
      categoria,
      valor: Number(getValue("financeiroValor")) || 0
    };
    if (pendingVariableRecurrence) {
      lancamento.recurrenceTemplateId = pendingVariableRecurrence.templateId;
      lancamento.recurrenceOccurrenceKey = pendingVariableRecurrence.key;
    }
    if (byId("financeiroRepetir")?.checked && window.rrHasPlanFeature?.("recorrencias") === true) {
      const existingTemplate = financeiro.find((item) => item.id === id)?.recorrencia;
      lancamento.recorrencia = {
        active: existingTemplate?.active !== false,
        mode: getValue("financeiroRecorrenciaModo") || "fixed",
        day: Math.min(31, Math.max(1, parseInteger(getValue("financeiroRecorrenciaDia")) || 1)),
        start: getValue("financeiroRecorrenciaInicio") || lancamento.data,
        end: getValue("financeiroRecorrenciaFim") || ""
      };
      lancamento.recurrenceOccurrenceKey = `${id}_${getRecurringMonthKey(lancamento.data)}`;
    }
    const index = financeiro.findIndex((item) => item.id === id);
    if (index >= 0) financeiro[index] = lancamento;
    else financeiro.push(lancamento);
    writeData("financeiro", financeiro);
    await persistSavedData("financeiro");
    if (lancamento.recorrencia?.mode === "fixed") await processRecurringFinancialEntries();
    event.target.reset();
    setValue("financeiroId", "");
    setValue("financeiroData", today());
    byId("financeiroTipoDespesa").checked = true;
    pendingVariableRecurrence = null;
    hydrateFinanceiroClassificacao();
    setValue("financeiroRecorrenciaInicio", today());
    byId("financeiroRecorrenciaCampos").hidden = true;
    renderFinanceiro();
    renderFinanceiroRelatorio();
    renderFinanceiroRecorrencias();
  } catch (error) {
    await rrAlert(error.message || "Não foi possível salvar o lançamento.", "Erro ao salvar");
  } finally {
    setFormSaving(event.target, false);
  }
}

function renderFinanceiro() {
  const termo = getValue("buscaFinanceiro").toLowerCase();
  const resumo = getFinancialSummary();
  const financeiro = getFinanceiroLancamentos()
    .filter((item) => JSON.stringify(item).toLowerCase().includes(termo));

  setText("totalReceitas", money(resumo.receitas));
  setText("totalCustoPecas", money(resumo.custoPecas));
  setText("totalDespesas", money(resumo.despesas));
  setText("saldoFinanceiroPagina", money(resumo.lucro));

  byId("financeiroTabela").innerHTML = financeiro.length ? financeiro.map((item) => `
    <tr>
      <td><strong>${escapeHtml(item.descricao)}</strong></td>
      <td><span class="badge ${badgeClass(item.tipo)}">${escapeHtml(item.tipo)}</span></td>
      <td>${escapeHtml(item.categoria || "-")}</td>
      <td>${escapeHtml(formatDateBR(item.data) || "-")}</td>
      <td>${money(item.valor)}</td>
      <td class="actions">${item.automatico ? `<span class="muted">Automático</span>` : `<button class="btn btn-muted" onclick="editFinanceiro('${item.id}')">Editar</button><button class="btn btn-danger" onclick="deleteItem('financeiro','${item.id}', refreshFinanceiro)">Excluir</button>`}</td>
    </tr>`).join("") : emptyRow(6, "Nenhum lançamento encontrado.");
}

function getFinanceiroLancamentos() {
  const manuais = readData("financeiro");
  const aprovados = getApprovedOrcamentos();
  const receitasAutomaticas = aprovados.map((orcamento) => ({
    id: `receita_${orcamento.id}`,
    tipo: "Receita automática",
    data: orcamento.decidedAt?.slice(0, 10) || orcamento.data || "",
    descricao: getPaymentDiscount(orcamento) > 0
      ? `Orçamento aprovado (${orcamento.pagamento?.label || "Pix com 3% de desconto"}) - ${getClienteNome(orcamento.clienteId)}`
      : `Orçamento aprovado - ${getClienteNome(orcamento.clienteId)}`,
    categoria: getCarroDetalhes(orcamento.clienteId, orcamento.carroId || orcamento.veiculoId),
    valor: getOrcamentoReceita(orcamento),
    automatico: true
  }));
  const custosAutomaticos = aprovados
    .map((orcamento) => ({
      id: `custo_${orcamento.id}`,
      tipo: "Custo de serviços",
      data: orcamento.decidedAt?.slice(0, 10) || orcamento.data || "",
      descricao: `Peças do serviço - ${getClienteNome(orcamento.clienteId)}`,
      categoria: getCarroDetalhes(orcamento.clienteId, orcamento.carroId || orcamento.veiculoId),
      valor: getPecasCusto(orcamento),
      automatico: true
    }))
    .filter((item) => item.valor > 0);
  const custosTerceirizadosAutomaticos = aprovados
    .map((orcamento) => ({
      id: `terceirizados_${orcamento.id}`,
      tipo: "Custo de serviços",
      data: orcamento.decidedAt?.slice(0, 10) || orcamento.data || "",
      descricao: `Serviços terceirizados - ${getClienteNome(orcamento.clienteId)}`,
      categoria: getCarroDetalhes(orcamento.clienteId, orcamento.carroId || orcamento.veiculoId),
      valor: getTerceirizadosCusto(orcamento),
      automatico: true
    }))
    .filter((item) => item.valor > 0);
  const taxasAutomaticas = aprovados
    .map((orcamento) => ({
      id: `taxa_${orcamento.id}`,
      tipo: "Custo de serviços",
      data: orcamento.decidedAt?.slice(0, 10) || orcamento.data || "",
      descricao: `Taxa de pagamento (${orcamento.pagamento?.label || "forma não informada"}${orcamento.pagamento?.taxaRepassada ? " - repassada ao cliente" : ""}) - ${getClienteNome(orcamento.clienteId)}`,
      categoria: getCarroDetalhes(orcamento.clienteId, orcamento.carroId || orcamento.veiculoId),
      valor: getPaymentFee(orcamento),
      automatico: true
    }))
    .filter((item) => item.valor > 0);

  return [...receitasAutomaticas, ...custosAutomaticos, ...custosTerceirizadosAutomaticos, ...taxasAutomaticas, ...manuais]
    .sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));
}

function setDefaultReportDates() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  setValue("relatorioInicio", `${year}-${month}-01`);
  setValue("relatorioFim", `${year}-${month}-${String(lastDay).padStart(2, "0")}`);
}

function isDateInRange(date, start, end) {
  if (!date) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

function getMonthLabel(date) {
  if (!date) return "Sem data";
  const [year, month] = date.split("-");
  if (!year || !month) return "Sem data";
  return `${month}/${year}`;
}

function getLancamentoImpacto(item) {
  if (item.tipo.includes("Receita")) return { receitas: Number(item.valor) || 0, custos: 0, despesas: 0 };
  if (item.tipo.includes("Custo")) return { receitas: 0, custos: Number(item.valor) || 0, despesas: 0 };
  return { receitas: 0, custos: 0, despesas: Number(item.valor) || 0 };
}

function getFinanceiroRelatorioData(startOverride = null, endOverride = null) {
  const start = startOverride ?? getValue("relatorioInicio");
  const end = endOverride ?? getValue("relatorioFim");
  const lancamentos = getFinanceiroLancamentos().filter((item) => isDateInRange(item.data, start, end));
  const resumo = lancamentos.reduce((acc, item) => {
    const impacto = getLancamentoImpacto(item);
    acc.receitas += impacto.receitas;
    acc.custos += impacto.custos;
    acc.despesas += impacto.despesas;
    return acc;
  }, { receitas: 0, custos: 0, despesas: 0 });
  resumo.lucro = resumo.receitas - resumo.custos - resumo.despesas;

  const meses = {};
  lancamentos.forEach((item) => {
    const key = item.data ? item.data.slice(0, 7) : "sem-data";
    const impacto = getLancamentoImpacto(item);
    meses[key] ||= { label: getMonthLabel(item.data), receitas: 0, custos: 0, despesas: 0 };
    meses[key].receitas += impacto.receitas;
    meses[key].custos += impacto.custos;
    meses[key].despesas += impacto.despesas;
  });

  const mesesLista = Object.entries(meses)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, valores]) => ({
      ...valores,
      lucro: valores.receitas - valores.custos - valores.despesas
    }));

  return { start, end, lancamentos, resumo, meses: mesesLista };
}

function renderFinanceiroRelatorio() {
  const relatorio = getFinanceiroRelatorioData();
  ultimoRelatorioFinanceiro = relatorio;
  const { start, end, lancamentos, resumo, meses } = relatorio;
  const periodo = start || end
    ? `${formatDateBR(start) || "Início"} até ${formatDateBR(end) || "hoje"}`
    : "Todo o histórico financeiro";

  setText("financeiroRelatorioStatus", `${periodo} | ${lancamentos.length} lançamento(s) analisado(s)`);

  byId("financeiroRelatorioResumo").innerHTML = `
    <article class="mini-stat"><span>Receitas</span><strong>${money(resumo.receitas)}</strong></article>
    <article class="mini-stat"><span>Custos</span><strong>${money(resumo.custos)}</strong></article>
    <article class="mini-stat"><span>Despesas</span><strong>${money(resumo.despesas)}</strong></article>
    <article class="mini-stat highlight"><span>Lucro</span><strong>${money(resumo.lucro)}</strong></article>
  `;

  byId("financeiroRelatorioMeses").innerHTML = meses.map((valores) => `
    <tr>
      <td><strong>${escapeHtml(valores.label)}</strong></td>
      <td>${money(valores.receitas)}</td>
      <td>${money(valores.custos)}</td>
      <td>${money(valores.despesas)}</td>
      <td>${money(valores.lucro)}</td>
    </tr>
  `).join("") || emptyRow(5, "Nenhum lançamento neste período.");

  renderFinanceiroGraficos(relatorio);
}

function renderFinanceiroGraficos(relatorio) {
  const { resumo, meses } = relatorio;
  const valoresDonut = [
    { label: "Receitas", valor: resumo.receitas, color: "#4fd1a1" },
    { label: "Custos", valor: resumo.custos, color: "#f1c75b" },
    { label: "Despesas", valor: resumo.despesas, color: "#ef6262" }
  ];
  const totalDonut = valoresDonut.reduce((sum, item) => sum + Math.max(item.valor, 0), 0);
  let acumulado = 0;
  const segmentos = valoresDonut.map((item) => {
    const inicio = totalDonut ? (acumulado / totalDonut) * 360 : 0;
    acumulado += Math.max(item.valor, 0);
    const fim = totalDonut ? (acumulado / totalDonut) * 360 : 0;
    return `${item.color} ${inicio}deg ${fim}deg`;
  }).join(", ");

  byId("financeiroDonut").style.background = totalDonut
    ? `conic-gradient(${segmentos})`
    : "conic-gradient(rgba(255,255,255,0.12) 0deg 360deg)";
  byId("financeiroDonut").innerHTML = `<span>${money(resumo.lucro)}<small>Lucro líquido</small></span>`;
  byId("financeiroLegenda").innerHTML = valoresDonut.map((item) => `
    <div>
      <i style="background:${item.color}"></i>
      <span>${item.label}</span>
      <strong>${money(item.valor)}</strong>
    </div>
  `).join("");

  const series = [
    { key: "receitas", label: "Receitas", colorClass: "income" },
    { key: "custos", label: "Custos", colorClass: "cost" },
    { key: "despesas", label: "Despesas", colorClass: "expense" },
    { key: "lucro", label: "Lucro", colorClass: "profit" }
  ];
  const maiorValor = Math.max(
    ...meses.flatMap((mes) => series.map((serie) => Math.abs(mes[serie.key]) || 0)),
    1
  );

  byId("financeiroBarras").innerHTML = meses.length ? `
    <div class="bar-legend">
      ${series.map((serie) => `<span><i class="${serie.colorClass}"></i>${serie.label}</span>`).join("")}
    </div>
    <div class="monthly-bars">
      ${meses.map((mes) => {
        const bars = series.map((serie) => {
          const value = Number(mes[serie.key]) || 0;
          const altura = value === 0 ? 4 : Math.max(12, Math.round((Math.abs(value) / maiorValor) * 150));
          const negative = value < 0 ? " negative" : "";
          return `<span class="${serie.colorClass}${negative}" style="height:${altura}px" title="${serie.label}: ${money(value)}"></span>`;
        }).join("");
        return `
          <div class="month-group">
            <div class="month-bars">${bars}</div>
            <strong>${escapeHtml(mes.label)}</strong>
            <small>${money(mes.lucro)}</small>
          </div>
        `;
      }).join("")}
    </div>
  ` : `<div class="chart-empty">Sem dados para gráfico neste período.</div>`;
}

function imprimirRelatorioFinanceiro() {
  const params = new URLSearchParams();
  const start = getValue("relatorioInicio");
  const end = getValue("relatorioFim");
  if (start) params.set("inicio", start);
  if (end) params.set("fim", end);
  window.location.href = `relatorio-financeiro.html${params.toString() ? `?${params}` : ""}`;
}

function printDocument(title) {
  const originalTitle = document.title;
  const isInspectionPrint = page === "inspecao";
  document.title = sanitizePrintTitle(title) || originalTitle;
  if (isInspectionPrint) toggleInspectionPrintLabels(true);
  const restoreTitle = () => {
    document.title = originalTitle;
    if (isInspectionPrint) toggleInspectionPrintLabels(false);
    window.removeEventListener("afterprint", restoreTitle);
  };
  window.addEventListener("afterprint", restoreTitle);
  window.print();
  setTimeout(restoreTitle, 30000);
}

function isMobilePrintView() {
  return window.matchMedia("(max-width: 760px)").matches;
}

function loadExternalScript(src, globalCheck) {
  if (globalCheck?.()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function ensurePdfShareLibraries() {
  await loadExternalScript(
    "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
    () => Boolean(window.html2canvas)
  );
  await loadExternalScript(
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
    () => Boolean(window.jspdf?.jsPDF)
  );
}

function getPdfShareBreakData(documentEl, scale) {
  const rootRect = documentEl.getBoundingClientRect();
  const offsetElements = Array.from(documentEl.querySelectorAll(".print-info-grid, section, h3, thead, tr, .print-payment-title, .print-payment-row, .print-totals, .pix-payment, .print-footer, .report-print-summary, .report-chart-card"));
  const avoidElements = Array.from(documentEl.querySelectorAll("tr, .print-totals, .pix-payment, .print-footer, .report-chart-card"));
  const forcedElements = Array.from(documentEl.querySelectorAll(".has-many-parts .print-services-section, .has-many-parts .print-payment-section, [data-pdf-page]"));
  const toRange = (element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: Math.round((rect.top - rootRect.top) * scale),
      bottom: Math.round((rect.bottom - rootRect.top) * scale)
    };
  };
  const ranges = avoidElements.map(toRange).filter((range) => range.top > 0 && range.bottom > range.top);
  return {
    offsets: offsetElements.map(toRange).filter((range) => range.top > 0).map((range) => range.top).sort((a, b) => a - b),
    forcedOffsets: forcedElements.map(toRange).filter((range) => range.top > 0).map((range) => range.top).sort((a, b) => a - b),
    ranges
  };
}

function getPdfShareSliceHeight(sourceY, pageHeightPx, canvasHeight, breakData) {
  const targetY = Math.min(sourceY + pageHeightPx, canvasHeight);
  if (targetY >= canvasHeight) return canvasHeight - sourceY;
  const minY = sourceY + Math.round(pageHeightPx * 0.78);
  const pageBoundary = breakData.forcedOffsets.find((offset) => Math.abs(offset - targetY) <= 32);
  if (pageBoundary) return Math.max(1, pageBoundary - sourceY);
  const forcedBreak = breakData.forcedOffsets
    .filter((offset) => offset > sourceY + Math.round(pageHeightPx * 0.52) && offset < targetY - 24)
    .pop();
  if (forcedBreak) return Math.max(1, forcedBreak - sourceY);

  const containingRange = breakData.ranges
    .filter((range) => range.top > sourceY + 24 && range.top < targetY && range.bottom > targetY)
    .sort((a, b) => b.top - a.top)[0];
  if (containingRange) return Math.max(1, containingRange.top - sourceY);

  const safeBreak = breakData.offsets
    .filter((offset) => offset > minY && offset < targetY - 24)
    .pop();
  return Math.max(1, (safeBreak || targetY) - sourceY);
}

function parseMoneyValue(text) {
  const normalized = String(text || "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  return Number(normalized) || 0;
}

function preparePdfShareDonut(documentEl) {
  const donut = documentEl.querySelector(".report-donut");
  if (!donut) return;
  const legendItems = Array.from(documentEl.querySelectorAll(".report-legend div")).map((item) => ({
    color: item.querySelector("i")?.style.background || "#d4dce8",
    value: Math.max(0, parseMoneyValue(item.querySelector("strong")?.textContent))
  }));
  const total = legendItems.reduce((sum, item) => sum + item.value, 0);
  let offset = 0;
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const circles = total
    ? legendItems.map((item) => {
        const length = (item.value / total) * circumference;
        const circle = `<circle cx="50" cy="50" r="${radius}" fill="none" stroke="${item.color}" stroke-width="28" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}" transform="rotate(-90 50 50)"/>`;
        offset += length;
        return circle;
      }).join("")
    : `<circle cx="50" cy="50" r="${radius}" fill="none" stroke="#edf2f7" stroke-width="28"/>`;
  donut.insertAdjacentHTML("afterbegin", `<svg class="report-donut-svg" viewBox="0 0 100 100" aria-hidden="true">${circles}<circle cx="50" cy="50" r="24" fill="#fff" stroke="#d4dce8" stroke-width="1"/></svg>`);
}

function prepareInspectionPdfClone(documentEl) {
  const dateInput = documentEl.querySelector('[data-inspection-field="date"]');
  if (dateInput) {
    const formattedDate = formatDateBR(dateInput.value);
    dateInput.type = "text";
    dateInput.value = formattedDate;
    dateInput.setAttribute("value", formattedDate);
  }

  ["km", "technician"].forEach((field) => {
    const input = documentEl.querySelector(`[data-inspection-field="${field}"]`);
    if (input && !input.value.trim()) input.removeAttribute("placeholder");
  });

  documentEl.querySelectorAll(".inspection-table th:first-child > span:first-child").forEach((heading) => {
    heading.textContent = "Item verificado | Resultado";
  });
}
async function createPdfFileFromDocument(title) {
  await ensurePdfShareLibraries();
  const documentEl = document.querySelector(".print-document, .finance-report-document");
  if (!documentEl) throw new Error("Documento indisponivel.");
  const renderHost = document.createElement("div");
  const isInspectionPdf = page === "inspecao";
  let clonedDocument;
  if (isInspectionPdf) toggleInspectionPrintLabels(true);
  try {
    clonedDocument = documentEl.cloneNode(true);
  } finally {
    if (isInspectionPdf) toggleInspectionPrintLabels(false);
  }
  renderHost.className = "pdf-share-render-host";
  clonedDocument.classList.add("pdf-share-document");
  if (isInspectionPdf) prepareInspectionPdfClone(clonedDocument);
  preparePdfShareDonut(clonedDocument);
  renderHost.appendChild(clonedDocument);
  document.body.appendChild(renderHost);

  try {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const documentRect = clonedDocument.getBoundingClientRect();
    const contentBottom = isInspectionPdf
      ? Math.max(...Array.from(clonedDocument.querySelectorAll("*")).map((element) => element.getBoundingClientRect().bottom - documentRect.top))
      : 0;
    const captureHeight = Math.ceil(Math.max(clonedDocument.scrollHeight, documentRect.height, contentBottom)) + (isInspectionPdf ? 24 : 0);
    const canvas = await window.html2canvas(clonedDocument, {
      backgroundColor: "#ffffff",
      scale: isInspectionPdf ? 1.25 : 2,
      useCORS: true,
      windowWidth: 794,
      width: clonedDocument.scrollWidth,
      height: captureHeight
    });

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = 210;
    const pageHeight = 297;
    const pageHeightPx = Math.ceil((canvas.width * pageHeight) / pageWidth);
    const canvasScale = canvas.width / clonedDocument.scrollWidth;
    const breakData = getPdfShareBreakData(clonedDocument, canvasScale);
    if (isInspectionPdf) {
      const fitScale = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
      const renderWidth = canvas.width * fitScale;
      const renderHeight = canvas.height * fitScale;
      const offsetX = (pageWidth - renderWidth) / 2;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", offsetX, 0, renderWidth, renderHeight);
    } else {
      let sourceY = 0;
      let pageIndex = 0;

      while (sourceY < canvas.height) {
        const sliceHeight = getPdfShareSliceHeight(sourceY, pageHeightPx, canvas.height, breakData);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = pageHeightPx;
        const context = pageCanvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        context.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(pageCanvas.toDataURL("image/png"), "PNG", 0, 0, pageWidth, pageHeight);
        sourceY += sliceHeight;
        pageIndex += 1;
      }
    }

    const fileName = `${sanitizePrintTitle(title) || "RR - Documento"}.pdf`;
    const blob = pdf.output("blob");
    return new File([blob], fileName, { type: "application/pdf" });
  } finally {
    renderHost.remove();
  }
}

async function sharePrintDocument(title) {
  const printButton = byId("printButton");
  try {
    if (printButton) {
      printButton.disabled = true;
      printButton.textContent = "Gerando PDF...";
    }
    const file = await createPdfFileFromDocument(title);
    const shareData = { files: [file] };

    if (navigator.canShare?.(shareData) && navigator.share) {
      await navigator.share(shareData);
      return;
    }
  } catch (error) {
    if (error?.name === "AbortError") return;
  } finally {
    if (printButton) {
      printButton.disabled = false;
      printButton.textContent = isMobilePrintView() ? "Compartilhar PDF" : "Imprimir / Salvar PDF";
    }
  }

  printDocument(title);
}

function handlePrintDocumentAction(title) {
  if (isMobilePrintView()) {
    sharePrintDocument(title);
    return;
  }
  printDocument(title);
}

function setupMobilePrintButtonLabel() {
  const printButton = byId("printButton");
  if (!printButton) return;
  const mobileQuery = window.matchMedia("(max-width: 760px)");
  const updateLabel = () => {
    printButton.textContent = mobileQuery.matches ? "Compartilhar PDF" : "Imprimir / Salvar PDF";
  };
  updateLabel();
  mobileQuery.addEventListener?.("change", updateLabel);
}

function getDreRevenueBreakdown(orcamento) {
  const totals = calculateOrcamentoTotals(Array.isArray(orcamento.pecas) ? orcamento.pecas : [], Array.isArray(orcamento.servicos) ? orcamento.servicos : [], Array.isArray(orcamento.terceirizados) ? orcamento.terceirizados : []);
  const totalOrcamento = getOrcamentoTotal(orcamento);
  if (totals.total <= 0) return { pecas: 0, maoObra: 0, terceirizados: 0, outros: totalOrcamento };
  const factor = totalOrcamento / totals.total;
  return {
    pecas: totals.totalPecas * factor,
    maoObra: totals.totalServicos * factor,
    terceirizados: totals.totalTerceirizados * factor,
    outros: 0
  };
}

function getDreCostAlerts(orcamentos) {
  return orcamentos.flatMap((orcamento) => {
    const reference = `Orçamento ${String(orcamento.numero || "").padStart(4, "0")} · ${getClienteNome(orcamento.clienteId)}`;
    const parts = (Array.isArray(orcamento.pecas) ? orcamento.pecas : [])
      .filter((item) => String(item.nome || "").trim() && parseDecimal(item.custoUnitario) <= 0)
      .map((item) => ({ orcamentoId: orcamento.id, reference, message: `Peça sem custo: ${item.nome}` }));
    const outsourced = (Array.isArray(orcamento.terceirizados) ? orcamento.terceirizados : [])
      .filter((item) => String(item.descricao || "").trim() && parseDecimal(item.custo) <= 0)
      .map((item) => ({ orcamentoId: orcamento.id, reference, message: `Serviço terceirizado sem custo: ${item.descricao}` }));
    return [...parts, ...outsourced];
  });
}

function getDreData(start, end) {
  const lancamentos = getFinanceiroLancamentos().filter((item) => isDateInRange(item.data, start, end));
  const manuais = readData("financeiro").filter((item) => isDateInRange(item.data, start, end));
  const receitasManuaisItems = manuais.filter((item) => item.tipo.includes("Receita"));
  const outrasReceitas = receitasManuaisItems.reduce((sum, item) => sum + parseDecimal(item.valor), 0);
  const custoPecas = lancamentos.filter((item) => String(item.id).startsWith("custo_")).reduce((sum, item) => sum + parseDecimal(item.valor), 0);
  const custoTerceirizados = lancamentos.filter((item) => String(item.id).startsWith("terceirizados_")).reduce((sum, item) => sum + parseDecimal(item.valor), 0);
  const taxas = lancamentos.filter((item) => String(item.id).startsWith("taxa_")).reduce((sum, item) => sum + parseDecimal(item.valor), 0);
  const despesasItems = lancamentos.filter((item) => !item.tipo.includes("Receita") && !item.tipo.includes("Custo"));
  const despesas = despesasItems.reduce((sum, item) => sum + parseDecimal(item.valor), 0);
  const aprovados = getApprovedOrcamentos().filter((orcamento) => isDateInRange(orcamento.decidedAt?.slice(0, 10) || orcamento.data, start, end));
  const receitasPorArea = aprovados.reduce((acc, orcamento) => {
    const breakdown = getDreRevenueBreakdown(orcamento);
    acc.pecas += breakdown.pecas; acc.maoObra += breakdown.maoObra; acc.terceirizados += breakdown.terceirizados; acc.outros += breakdown.outros;
    return acc;
  }, { pecas: 0, maoObra: 0, terceirizados: 0, outros: 0 });
  const descontos = aprovados.reduce((sum, orcamento) => sum + getPaymentDiscount(orcamento), 0);
  const acrescimos = aprovados.reduce((sum, orcamento) => sum + getPaymentSurcharge(orcamento), 0);
  const receitaBruta = receitasPorArea.pecas + receitasPorArea.maoObra + receitasPorArea.terceirizados + receitasPorArea.outros + outrasReceitas;
  const receitaLiquida = receitaBruta - descontos + acrescimos;
  const custosDiretos = custoPecas + custoTerceirizados + taxas;
  const lucroBruto = receitaLiquida - custosDiretos;
  const resultado = lucroBruto - despesas;
  const margemBruta = receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0;
  const margemLiquida = receitaLiquida > 0 ? (resultado / receitaLiquida) * 100 : 0;
  const ticketMedio = aprovados.length ? aprovados.reduce((sum, item) => sum + getOrcamentoReceita(item), 0) / aprovados.length : 0;
  const categorias = despesasItems.reduce((acc, item) => {
    const categoria = String(item.categoria || "Outras despesas").trim() || "Outras despesas";
    acc[categoria] = (acc[categoria] || 0) + parseDecimal(item.valor);
    return acc;
  }, {});
  const categoriasItens = despesasItems.reduce((acc, item) => {
    const categoria = String(item.categoria || "Outras despesas").trim() || "Outras despesas";
    (acc[categoria] ||= []).push(item);
    return acc;
  }, {});
  const detalhes = aprovados.map((orcamento) => {
    const receita = getOrcamentoReceita(orcamento); const custos = getServiceCosts(orcamento); const lucro = receita - custos;
    return { orcamento, receita, custos, lucro, margem: receita > 0 ? (lucro / receita) * 100 : 0, data: orcamento.decidedAt?.slice(0, 10) || orcamento.data || "" };
  }).sort((a, b) => String(b.data).localeCompare(String(a.data)));
  return { start, end, receitaBruta, receitasPorArea, outrasReceitas, receitasManuaisItems, descontos, acrescimos, receitaLiquida, custoPecas, custoTerceirizados, taxas, custosDiretos, lucroBruto, despesas, resultado, margemBruta, margemLiquida, ticketMedio, categorias, categoriasItens, lancamentos, aprovados, detalhes, alertas: getDreCostAlerts(aprovados) };
}

function getPreviousDrePeriod(start, end) {
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return { start: "", end: "" };
  const days = Math.max(1, Math.round((endDate - startDate) / 86400000) + 1);
  const previousEnd = new Date(startDate); previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd); previousStart.setDate(previousStart.getDate() - days + 1);
  const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { start: iso(previousStart), end: iso(previousEnd) };
}

function percentChange(current, previous) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function initDre() {
  setDefaultDreDates();
  byId("dreForm")?.addEventListener("submit", (event) => { event.preventDefault(); renderDre(); });
  document.querySelectorAll("[data-dre-period]").forEach((button) => button.addEventListener("click", () => setDreQuickPeriod(button.dataset.drePeriod)));
  byId("drePdf")?.addEventListener("click", () => {
    const params = new URLSearchParams({ inicio: getValue("dreInicio"), fim: getValue("dreFim") });
    window.location.href = `dre-imprimir.html?${params.toString()}`;
  });
  byId("dreCsv")?.addEventListener("click", exportDreCsv);
  window.addEventListener("rr-workspace-ready", applyDrePlanAccess);
}

function setDefaultDreDates() {
  const now = new Date();
  const year = now.getFullYear(); const month = String(now.getMonth() + 1).padStart(2, "0");
  setValue("dreInicio", `${year}-${month}-01`);
  setValue("dreFim", `${year}-${month}-${String(new Date(year, now.getMonth() + 1, 0).getDate()).padStart(2, "0")}`);
}

async function applyDrePlanAccess(event) {
  const allowed = event?.detail?.features?.dre === true || window.rrHasPlanFeature?.("dre") === true;
  if (byId("dreLoading")) byId("dreLoading").hidden = true;
  if (byId("dreUpgrade")) byId("dreUpgrade").hidden = allowed;
  if (byId("dreContent")) byId("dreContent").hidden = !allowed;
  if (allowed) {
    await processRecurringFinancialEntries();
    renderDre();
  }
}

function renderDre() {
  if (!byId("dreContent") || byId("dreContent").hidden) return;
  const start = getValue("dreInicio"); const end = getValue("dreFim");
  const dre = getDreData(start, end);
  const previousPeriod = getPreviousDrePeriod(start, end);
  const previous = getDreData(previousPeriod.start, previousPeriod.end);
  setText("dreStatus", `${formatDateBR(start)} até ${formatDateBR(end)} · ${dre.aprovados.length} orçamento(s) aprovado(s) · ${dre.lancamentos.length} lançamento(s)`);
  byId("dreCards").innerHTML = `<article class="stat-card"><span>Receita líquida</span><strong>${money(dre.receitaLiquida)}</strong><small>${percentChange(dre.receitaLiquida, previous.receitaLiquida).toFixed(1).replace(".", ",")}% vs. período anterior</small></article><article class="stat-card"><span>Lucro bruto</span><strong>${money(dre.lucroBruto)}</strong><small>Margem de ${dre.margemBruta.toFixed(1).replace(".", ",")}%</small></article><article class="stat-card"><span>Ticket médio</span><strong>${money(dre.ticketMedio)}</strong><small>${dre.aprovados.length} orçamento(s) aprovado(s)</small></article><article class="stat-card"><span>Despesas operacionais</span><strong>${money(dre.despesas)}</strong><small>Saídas manuais do período</small></article><article class="stat-card highlight ${dre.resultado < 0 ? "negative-result" : ""}"><span>Resultado líquido</span><strong>${money(dre.resultado)}</strong><small>${dre.resultado < 0 ? "Prejuízo" : "Margem"} de ${dre.margemLiquida.toFixed(1).replace(".", ",")}%</small></article>`;
  byId("dreStatement").innerHTML = buildDreStatementRows(dre);
  const change = percentChange(dre.resultado, previous.resultado);
  byId("dreComparison").innerHTML = `<div class="dre-comparison-value ${change >= 0 ? "positive" : "negative"}"><strong>${change >= 0 ? "+" : ""}${change.toFixed(1).replace(".", ",")}%</strong><span>Resultado comparado ao período anterior</span></div><div class="dre-compare-bars"><div><span>Período anterior</span><b>${money(previous.resultado)}</b></div><div><span>Período atual</span><b>${money(dre.resultado)}</b></div></div><small>${formatDateBR(previousPeriod.start)} até ${formatDateBR(previousPeriod.end)}</small>`;
  const categories = Object.entries(dre.categorias).sort((a, b) => b[1] - a[1]);
  byId("dreCategories").innerHTML = categories.map(([name, value], index) => {
    const percent = dre.despesas ? (value / dre.despesas) * 100 : 0;
    const color = DRE_CATEGORY_COLORS[index % DRE_CATEGORY_COLORS.length];
    return `<button type="button" class="dre-category-item" data-dre-category="${escapeHtml(name)}" style="--category-color:${color}"><span><i class="dre-category-dot"></i>${escapeHtml(name)}</span><strong>${money(value)} <small>${percent.toFixed(1).replace(".", ",")}% do total</small></strong><i class="dre-category-track"><b style="width:${Math.max(2, percent)}%"></b></i></button>`;
  }).join("") || `<p class="muted">Nenhuma despesa operacional no período.</p>`;
  byId("dreCategoryDetails").hidden = true;
  byId("dreCategoryDetails").innerHTML = "";
  document.querySelectorAll("[data-dre-category]").forEach((button) => button.addEventListener("click", () => renderDreCategoryDetails(button.dataset.dreCategory, dre.categoriasItens[button.dataset.dreCategory] || [])));
  byId("dreOrcamentos").innerHTML = dre.detalhes.map(({ orcamento, receita, custos, margem, data }) => `<tr><td>${escapeHtml(formatDateBR(data) || "-")}</td><td><strong>${String(orcamento.numero || "").padStart(4, "0")}</strong></td><td><strong>${escapeHtml(getClienteNome(orcamento.clienteId))}</strong><br><small class="muted">${escapeHtml(getCarroDetalhes(orcamento.clienteId, orcamento.carroId || orcamento.veiculoId))}</small></td><td>${money(receita)}</td><td>${money(custos)}</td><td class="${margem >= 0 ? "dre-margin-positive" : "dre-margin-negative"}">${margem.toFixed(1).replace(".", ",")}%</td><td><a class="btn btn-muted" href="orcamento-imprimir.html?id=${encodeURIComponent(orcamento.id)}">Abrir orçamento</a></td></tr>`).join("") || emptyRow(7, "Nenhum orçamento aprovado no período.");
  byId("dreAlerts").innerHTML = dre.alertas.length ? dre.alertas.map((alerta) => `<div class="dre-alert-item"><div><strong>${escapeHtml(alerta.message)}</strong><br><span>${escapeHtml(alerta.reference)}</span></div><a class="btn btn-muted" href="orcamentos.html?editar=${encodeURIComponent(alerta.orcamentoId)}">Corrigir</a></div>`).join("") : `<div class="dre-alert-ok">Todos os custos de peças e serviços terceirizados estão preenchidos neste período.</div>`;
}

function renderDreCategoryDetails(category, items) {
  const container = byId("dreCategoryDetails"); if (!container) return;
  const total = items.reduce((sum, item) => sum + parseDecimal(item.valor), 0);
  container.hidden = false;
  container.innerHTML = `<h3>${escapeHtml(category)} · ${money(total)}</h3><div class="table-wrap"><table><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>${items.map((item) => `<tr><td>${escapeHtml(formatDateBR(item.data) || "-")}</td><td>${escapeHtml(item.descricao || "Sem descrição")}</td><td>${money(item.valor)}</td></tr>`).join("") || emptyRow(3, "Nenhum lançamento nesta categoria.")}</tbody></table></div>`;
}

function setDreQuickPeriod(period) {
  const now = new Date(); let start; let end;
  if (period === "previous-month") {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1); end = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (period === "quarter") {
    start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1); end = now;
  } else if (period === "year") {
    start = new Date(now.getFullYear(), 0, 1); end = now;
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }
  const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  setValue("dreInicio", iso(start)); setValue("dreFim", iso(end)); renderDre();
}

function csvCell(value) {
  const raw = String(value ?? "");
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

function exportDreCsv() {
  const dre = getDreData(getValue("dreInicio"), getValue("dreFim"));
  const rows = [["Tipo", "Data", "Referência", "Categoria", "Descrição", "Receita", "Custo/Despesa", "Resultado"]];
  dre.detalhes.forEach(({ orcamento, receita, custos, lucro, data }) => rows.push(["Orçamento aprovado", formatDateBR(data), String(orcamento.numero || "").padStart(4, "0"), "Serviço", getClienteNome(orcamento.clienteId), receita.toFixed(2), custos.toFixed(2), lucro.toFixed(2)]));
  dre.receitasManuaisItems.forEach((item) => rows.push(["Receita manual", formatDateBR(item.data), item.id || "", item.categoria || "Outras receitas", item.descricao || "", parseDecimal(item.valor).toFixed(2), "0.00", parseDecimal(item.valor).toFixed(2)]));
  Object.entries(dre.categoriasItens).forEach(([categoria, items]) => items.forEach((item) => rows.push(["Despesa operacional", formatDateBR(item.data), item.id || "", categoria, item.descricao || "", "0.00", parseDecimal(item.valor).toFixed(2), (-parseDecimal(item.valor)).toFixed(2)])));
  const content = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = `DRE-${dre.start || "inicio"}-a-${dre.end || "fim"}.csv`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildDreStatementRows(dre) {
  const row = (label, value, className = "") => `<div class="${className}"><span>${label}</span><strong>${money(value)}</strong></div>`;
  return row("Receita com peças", dre.receitasPorArea.pecas) + row("Receita com mão de obra", dre.receitasPorArea.maoObra) + row("Receita com serviços terceirizados", dre.receitasPorArea.terceirizados) + row("Outras receitas e ajustes", dre.receitasPorArea.outros + dre.outrasReceitas) + row("Receita bruta", dre.receitaBruta, "dre-total") + row("(-) Descontos concedidos", -dre.descontos) + row("(+) Acréscimos repassados", dre.acrescimos) + row("Receita líquida", dre.receitaLiquida, "dre-total") + row("(-) Custo das peças", -dre.custoPecas) + row("(-) Serviços terceirizados", -dre.custoTerceirizados) + row("(-) Taxas de pagamento", -dre.taxas) + row("Lucro bruto", dre.lucroBruto, "dre-total") + row("(-) Despesas operacionais", -dre.despesas) + row("Resultado líquido", dre.resultado, `dre-final${dre.resultado < 0 ? " negative-result" : ""}`);
}

function renderPublicOrcamentoResponse(response = "") {
  const panel = byId("publicBudgetDecision");
  const prompt = byId("publicBudgetDecisionPrompt");
  const result = byId("publicBudgetDecisionResult");
  if (!panel || !prompt || !result) return;
  panel.hidden = false;
  const approved = response === "approved";
  const rejected = response === "rejected";
  prompt.hidden = approved || rejected;
  result.hidden = !approved && !rejected;
  if (approved || rejected) {
    result.className = `public-budget-decision-result ${approved ? "is-approved" : "is-rejected"}`;
    result.innerHTML = `<strong>${approved ? "Você indicou que deseja aprovar" : "Você indicou que não deseja aprovar"}</strong>
      <span>Sua resposta foi enviada para a oficina. A confirmação final será feita por ela.</span>
      <button class="btn btn-muted" type="button" data-change-public-response>Alterar resposta</button>`;
    result.querySelector("[data-change-public-response]")?.addEventListener("click", clearPublicOrcamentoResponse);
  }
}

async function clearPublicOrcamentoResponse(event) {
  const button = event.currentTarget;
  const panel = byId("publicBudgetDecision");
  const prompt = byId("publicBudgetDecisionPrompt");
  const result = byId("publicBudgetDecisionResult");
  button.disabled = true;
  panel?.classList.add("is-saving");
  try {
    if (typeof window.rrClearPublicOrcamentoResponse !== "function") throw new Error("Serviço indisponível.");
    await window.rrClearPublicOrcamentoResponse();
    result.hidden = true;
    prompt.hidden = false;
  } catch (error) {
    button.disabled = false;
    await rrAlert("Não foi possível limpar a resposta anterior. Confira a internet e tente novamente.", "Resposta não alterada");
  } finally {
    panel?.classList.remove("is-saving");
  }
}

async function submitPublicOrcamentoResponse(response) {
  const buttons = [...document.querySelectorAll("[data-public-response]")];
  const panel = byId("publicBudgetDecision");
  buttons.forEach((button) => { button.disabled = true; });
  panel?.classList.add("is-saving");
  try {
    if (typeof window.rrSubmitPublicOrcamentoResponse !== "function") throw new Error("Serviço indisponível.");
    await window.rrSubmitPublicOrcamentoResponse(response);
    renderPublicOrcamentoResponse(response);
  } catch (error) {
    await rrAlert("Não foi possível enviar sua indicação. Confira a internet e tente novamente.", "Resposta não enviada");
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
    panel?.classList.remove("is-saving");
  }
}

function initContrato() {
  const printButton = byId("printButton");
  setupMobilePrintButtonLabel();
  printButton?.addEventListener("click", () => handlePrintDocumentAction("RR - Contrato RR Manager"));
}

function initFinanceiroPrint() {
  const root = byId("printRoot");
  const printButton = byId("printButton");
  setupMobilePrintButtonLabel();
  const params = new URLSearchParams(window.location.search);
  const start = params.get("inicio") || "";
  const end = params.get("fim") || "";
  const relatorio = getFinanceiroRelatorioData(start, end);

  if (printButton) {
    const title = sanitizePrintTitle(`RR - Relatório financeiro mês ${getMonthNameBR(start || end)}`);
    printButton.addEventListener("click", () => handlePrintDocumentAction(title));
  }
  root.innerHTML = buildFinanceiroReportHtml(relatorio);
}

function buildFinanceiroReportHtml(relatorio) {
  const { start, end, resumo, meses, lancamentos } = relatorio;
  const periodo = start || end
    ? `${formatDateBR(start) || "Início"} até ${formatDateBR(end) || "hoje"}`
    : "Todo o histórico financeiro";
  const branding = getDocumentBranding();
  const logoUrl = branding.logoUrl;
  const valoresDonut = [
    { label: "Receitas", valor: resumo.receitas, color: "#4fd1a1" },
    { label: "Custos", valor: resumo.custos, color: "#f1c75b" },
    { label: "Despesas", valor: resumo.despesas, color: "#ef6262" }
  ];
  const totalDonut = valoresDonut.reduce((sum, item) => sum + Math.max(item.valor, 0), 0);
  let acumulado = 0;
  const segmentos = valoresDonut.map((item) => {
    const inicio = totalDonut ? (acumulado / totalDonut) * 360 : 0;
    acumulado += Math.max(item.valor, 0);
    const fim = totalDonut ? (acumulado / totalDonut) * 360 : 0;
    return `${item.color} ${inicio}deg ${fim}deg`;
  }).join(", ");
  const series = [
    { key: "receitas", label: "Receitas", className: "income" },
    { key: "custos", label: "Custos", className: "cost" },
    { key: "despesas", label: "Despesas", className: "expense" },
    { key: "lucro", label: "Lucro", className: "profit" }
  ];
  const maiorValor = Math.max(
    ...meses.flatMap((mes) => series.map((serie) => Math.abs(mes[serie.key]) || 0)),
    1
  );

  return `
    <article class="finance-report-document">
      <header class="print-header report-print-header">
        <img src="${logoUrl}" alt="${escapeHtml(branding.companyName)}">
        <div>
          <h1>${escapeHtml(branding.reportName)}</h1>
          <p>Relatório financeiro</p>
          <p>Período: <strong>${escapeHtml(periodo)}</strong></p>
        </div>
      </header>

      <section class="report-print-summary">
        <div><span>Receitas</span><strong>${money(resumo.receitas)}</strong></div>
        <div><span>Custos</span><strong>${money(resumo.custos)}</strong></div>
        <div><span>Despesas</span><strong>${money(resumo.despesas)}</strong></div>
        <div class="highlight"><span>Lucro</span><strong>${money(resumo.lucro)}</strong></div>
      </section>

      <section class="report-print-charts">
        <div class="report-chart-card">
          <h2>Distribuição do período</h2>
          <div class="report-donut" style="background:${totalDonut ? `conic-gradient(${segmentos})` : "#edf2f7"}">
            <span>${money(resumo.lucro)}<small>Lucro líquido</small></span>
          </div>
          <div class="report-legend">
            ${valoresDonut.map((item) => `<div><i style="background:${item.color}"></i><span>${item.label}</span><strong>${money(item.valor)}</strong></div>`).join("")}
          </div>
        </div>

        <div class="report-chart-card">
          <h2>Evolução mensal</h2>
          <div class="report-bars-legend">
            ${series.map((serie) => `<span><i class="${serie.className}"></i>${serie.label}</span>`).join("")}
          </div>
          <div class="report-monthly-bars">
            ${meses.length ? meses.map((mes) => {
              const bars = series.map((serie) => {
                const value = Number(mes[serie.key]) || 0;
                const altura = value === 0 ? 4 : Math.max(10, Math.round((Math.abs(value) / maiorValor) * 112));
                return `<span class="${serie.className}" style="height:${altura}px" title="${serie.label}: ${money(value)}"></span>`;
              }).join("");
              return `<div class="report-month-group"><div>${bars}</div><strong>${escapeHtml(mes.label)}</strong><small>${money(mes.lucro)}</small></div>`;
            }).join("") : `<p class="muted">Sem dados no período.</p>`}
          </div>
        </div>
      </section>

      <section class="report-table-section">
        <h2>Resultado por mês</h2>
        <table class="print-table">
          <thead><tr><th>Mês</th><th>Receitas</th><th>Custos</th><th>Despesas</th><th>Lucro</th></tr></thead>
          <tbody>${meses.map((mes) => `<tr><td>${escapeHtml(mes.label)}</td><td>${money(mes.receitas)}</td><td>${money(mes.custos)}</td><td>${money(mes.despesas)}</td><td>${money(mes.lucro)}</td></tr>`).join("") || `<tr><td colspan="5">Sem lançamentos no período.</td></tr>`}</tbody>
        </table>
      </section>

      <section class="report-table-section report-transactions-section">
        <h2>Lançamentos analisados</h2>
        <table class="print-table">
          <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Categoria</th><th>Valor</th></tr></thead>
          <tbody>${lancamentos.map((item) => `<tr><td>${escapeHtml(formatDateBR(item.data))}</td><td>${escapeHtml(item.tipo)}</td><td>${escapeHtml(item.descricao)}</td><td>${escapeHtml(item.categoria || "-")}</td><td>${money(item.valor)}</td></tr>`).join("") || `<tr><td colspan="5">Sem lançamentos no período.</td></tr>`}</tbody>
        </table>
      </section>
    </article>
  `;
}

function editFinanceiro(id) {
  const item = readData("financeiro").find((lancamento) => lancamento.id === id);
  if (!item) return;
  setValue("financeiroId", item.id);
  setValue("financeiroData", item.data);
  setValue("financeiroDescricao", item.descricao);
  setValue("financeiroValor", item.valor);
  byId(item.tipo === "Receita" ? "financeiroTipoReceita" : "financeiroTipoDespesa").checked = true;
  hydrateFinanceiroClassificacao(item.grupo || "", item.categoria || "");
  const recurrence = item.recorrencia;
  byId("financeiroRepetir").checked = Boolean(recurrence);
  byId("financeiroRecorrenciaCampos").hidden = !recurrence;
  setValue("financeiroRecorrenciaModo", recurrence?.mode || "fixed");
  setValue("financeiroRecorrenciaDia", recurrence?.day || 1);
  setValue("financeiroRecorrenciaInicio", recurrence?.start || item.data || today());
  setValue("financeiroRecorrenciaFim", recurrence?.end || "");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function refreshFinanceiro() {
  renderFinanceiro();
  renderFinanceiroRelatorio();
  renderFinanceiroRecorrencias();
}

function hydrateClienteCarroSelects(clienteSelectId, carroSelectId, selectedCarroId = "") {
  const clientes = readData("clientes").sort(compareClientesByName);
  const clienteSelect = byId(clienteSelectId);
  const selectedClienteId = clienteSelect?.value || "";
  fillSelect(clienteSelectId, clientes, "Selecione um cliente", (cliente) => cliente.nome);
  setValue(clienteSelectId, selectedClienteId);

  const cliente = getCliente(getValue(clienteSelectId));
  const carros = cliente?.carros || [];
  fillSelect(carroSelectId, carros, "Selecione um carro", (carro) => [carro.marca, carro.modelo, carro.motor, carro.ano, carro.placa].filter(Boolean).join(" "));
  if (selectedCarroId) setValue(carroSelectId, selectedCarroId);
}

async function deleteItem(type, id, callback) {
  const confirmed = await rrConfirm("Deseja excluir este registro? Essa ação não pode ser desfeita.", "Excluir registro", true);
  if (!confirmed) return;
  writeData(type, readData(type).filter((item) => item.id !== id));
  await persistSavedData(type);
  callback();
}

function initDrePrint() {
  const root = byId("printRoot");
  const printButton = byId("printButton");
  setupMobilePrintButtonLabel();
  const params = new URLSearchParams(window.location.search);
  const start = params.get("inicio") || ""; const end = params.get("fim") || "";
  root.innerHTML = `<section class="print-document"><h1>Carregando DRE...</h1><p>Aguarde a validação do Plano Pro.</p></section>`;
  if (printButton) printButton.disabled = true;
  window.addEventListener("rr-workspace-ready", (event) => {
    const allowed = event.detail?.features?.dre === true;
    if (!allowed) {
      root.innerHTML = `<section class="print-document"><h1>Recurso do Plano Pro</h1><p>O DRE gerencial não está disponível no plano atual.</p></section>`;
      return;
    }
    const dre = getDreData(start, end);
    root.innerHTML = buildDrePrintHtml(dre);
    if (printButton) {
      printButton.disabled = false;
      printButton.addEventListener("click", () => handlePrintDocumentAction(`RR - DRE gerencial ${getMonthNameBR(start || end)}`), { once: true });
    }
  }, { once: true });
}

function buildDrePrintHtml(dre) {
  const branding = getDocumentBranding();
  const categories = Object.entries(dre.categorias).sort((a, b) => b[1] - a[1]);
  const generatedAt = new Date().toLocaleString("pt-BR");
  const budgetRows = dre.detalhes.map(({ orcamento, receita, custos, lucro, margem, data }) => `<tr><td>${escapeHtml(formatDateBR(data) || "-")}</td><td>${String(orcamento.numero || "").padStart(4, "0")}</td><td>${escapeHtml(getClienteNome(orcamento.clienteId))}</td><td>${money(receita)}</td><td>${money(custos)}</td><td>${money(lucro)} (${margem.toFixed(1).replace(".", ",")}%)</td></tr>`).join("") || `<tr><td colspan="6">Sem orçamentos aprovados no período.</td></tr>`;
  const alertRows = dre.alertas.map((alerta) => `<tr><td>${escapeHtml(alerta.reference)}</td><td>${escapeHtml(alerta.message)}</td></tr>`).join("");
  return `<article class="finance-report-document dre-print-document">
    <header class="print-header report-print-header"><img src="${branding.logoUrl}" alt="${escapeHtml(branding.companyName)}"><div><h1>${escapeHtml(branding.reportName)}</h1><p>DRE gerencial realizado</p><p>Período: <strong>${escapeHtml(formatDateBR(dre.start))} até ${escapeHtml(formatDateBR(dre.end))}</strong></p><p>Gerado em: <strong>${escapeHtml(generatedAt)}</strong> · ${dre.aprovados.length} orçamento(s) considerado(s)</p></div></header>
    <section class="report-print-summary"><div><span>Receita líquida</span><strong>${money(dre.receitaLiquida)}</strong></div><div><span>Lucro bruto</span><strong>${money(dre.lucroBruto)}</strong></div><div><span>Ticket médio</span><strong>${money(dre.ticketMedio)}</strong></div><div class="highlight ${dre.resultado < 0 ? "negative-result" : ""}"><span>Resultado líquido</span><strong>${money(dre.resultado)}</strong></div></section>
    <section class="report-table-section"><h2>Demonstração do resultado</h2><div class="dre-statement print-dre-statement">${buildDreStatementRows(dre)}</div></section>
    <section class="report-table-section"><h2>Orçamentos que formam o resultado</h2><table class="print-table"><thead><tr><th>Data</th><th>Orçamento</th><th>Cliente</th><th>Receita</th><th>Custos</th><th>Lucro / margem</th></tr></thead><tbody>${budgetRows}</tbody></table></section>
    <section class="report-table-section"><h2>Despesas operacionais por categoria</h2><table class="print-table"><thead><tr><th>Categoria</th><th>% do total de despesas</th><th>Valor</th></tr></thead><tbody>${categories.map(([name, value]) => `<tr><td>${escapeHtml(name)}</td><td>${dre.despesas ? ((value / dre.despesas) * 100).toFixed(1).replace(".", ",") : "0,0"}%</td><td>${money(value)}</td></tr>`).join("") || `<tr><td colspan="3">Sem despesas operacionais no período.</td></tr>`}</tbody></table></section>
    ${alertRows ? `<section class="report-table-section"><h2>Avisos de custos não informados</h2><table class="print-table"><thead><tr><th>Orçamento</th><th>Aviso</th></tr></thead><tbody>${alertRows}</tbody></table></section>` : ""}
    <footer class="print-footer">Critério gerencial adotado: orçamento aprovado representa serviço realizado e valor recebido na data da aprovação. Não substitui demonstrações contábeis elaboradas por profissional habilitado.</footer>
  </article>`;
}
