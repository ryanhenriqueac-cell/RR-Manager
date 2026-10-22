export const LABOR_IMPORT_LIMIT = 100;

const upper = (value) => String(value || "").trim().toLocaleUpperCase("pt-BR").replace(/\bTROCAR\b/g, "SUBST.");
const plain = (value, max = 1000) => typeof value === "string" && value.trim().length > 0 && value.length <= max;
const dateIsValid = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const overlaps = (a, b) => a.vehicleId === b.vehicleId && a.serviceCode === b.serviceCode
  && a.yearStart <= b.yearEnd && a.yearEnd >= b.yearStart;
const sourceAddressIsValid = (value) => {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
};

export function validateLaborImport(payload, { vehicles = [], operations = [], existing = [] } = {}) {
  if (!payload || payload.schemaVersion !== 1 || !Array.isArray(payload.records)) {
    throw new Error("Use um arquivo de importação com schemaVersion 1 e uma lista records. Referências de pesquisa precisam ser concluídas antes de importar.");
  }
  if (!payload.records.length || payload.records.length > LABOR_IMPORT_LIMIT) {
    throw new Error(`Cada arquivo deve conter entre 1 e ${LABOR_IMPORT_LIMIT} tempos.`);
  }
  const vehicleMap = new Map(vehicles.map((item) => [item.id, item]));
  const operationMap = new Map(operations.filter((item) => item.active !== false).map((item) => [item.code, item]));
  const errors = [];
  const records = [];
  const active = existing.filter((item) => item.status !== "disabled");
  payload.records.forEach((item, index) => {
    const label = `Linha ${index + 1}`;
    const reject = (message) => { errors.push(`${label}: ${message}`); };
    if (!item || typeof item !== "object" || Array.isArray(item)) return reject("registro inválido.");
    const vehicle = vehicleMap.get(item.vehicleId);
    const operation = operationMap.get(item.serviceCode);
    if (!vehicle) return reject("veículo não encontrado na base.");
    if (!operation) return reject("operação inexistente ou inativa.");
    const requestedFuel = item.fuel === undefined ? vehicle.fuel : item.fuel;
    const allowedFuels = [vehicle.fuel, ...String(vehicle.fuel || "").split("/")].map((value) => String(value || "").trim());
    const fuel = allowedFuels.find((value) => upper(value) === upper(requestedFuel));
    if (!plain(requestedFuel, 80) || !fuel) return reject("combustível incompatível com a configuração do veículo.");
    if (!Number.isInteger(item.yearStart) || !Number.isInteger(item.yearEnd)
      || item.yearStart > item.yearEnd || item.yearStart < vehicle.yearStart || item.yearEnd > vehicle.yearEnd) {
      return reject(`os anos devem estar entre ${vehicle.yearStart} e ${vehicle.yearEnd}.`);
    }
    if (typeof item.timeHours !== "number" || !Number.isFinite(item.timeHours) || item.timeHours <= 0 || item.timeHours > 166.67) {
      return reject("informe horas decimais numéricas maiores que zero, até 166,67 h.");
    }
    const timeMinutes = Math.round(item.timeHours * 60);
    if (!timeMinutes) return reject("o tempo deve corresponder a pelo menos um minuto.");
    if (item.applicationVerified !== true || item.operationVerified !== true || item.reuseAllowed !== true) {
      return reject("confirme aplicação, escopo do serviço e condições de uso da referência.");
    }
    if (item.publicationEligible === false || (item.researchStatus && item.researchStatus !== "verified")) {
      return reject("a referência ainda possui pendências de pesquisa.");
    }
    const source = item.source;
    if (!source || !plain(source.title, 200) || !plain(source.url, 1000) || !dateIsValid(source.accessedOn)) {
      return reject("informe título, endereço da fonte e data da consulta (AAAA-MM-DD).");
    }
    let url;
    try { url = new URL(source.url); } catch { return reject("endereço da fonte inválido."); }
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return reject("use uma fonte HTTP/HTTPS sem credenciais no endereço.");
    if (!Number.isInteger(source.page) || source.page < 1) return reject("informe a página da fonte; para página web, use 1.");
    const supporting = source.supporting === undefined ? [] : source.supporting;
    if (!Array.isArray(supporting) || supporting.length > 3 || supporting.some((entry) => !entry
      || !plain(entry.title, 200) || !plain(entry.url, 1000) || !sourceAddressIsValid(entry.url)
      || !Number.isInteger(entry.page) || entry.page < 1)) return reject("informe até três fontes complementares com título, URL HTTP/HTTPS sem credenciais e página.");
    if (!plain(item.application, 500)) return reject("descreva a aplicação verificada: motor, geração e condições relevantes.");
    if (item.notes !== undefined && (typeof item.notes !== "string" || item.notes.length > 1000)) return reject("a observação deve ter até 1.000 caracteres.");
    if (`APLICAÇÃO: ${item.application.trim()}${item.notes?.trim() ? `\n${item.notes.trim()}` : ""}`.length > 1000) {
      return reject("aplicação e observação juntas devem ter até 1.000 caracteres.");
    }
    const record = {
      vehicleId: vehicle.id, make: vehicle.make, model: vehicle.model, engine: vehicle.engine,
      fuel: fuel.trim(), aspiration: vehicle.aspiration,
      yearStart: item.yearStart, yearEnd: item.yearEnd,
      serviceCode: operation.code, system: upper(operation.system), subsystem: upper(operation.subsystem),
      description: upper(operation.description), operationType: upper(operation.operationType), unit: upper(operation.unit),
      overlap: operation.overlap === true, timeMinutes,
      source: [`${source.title.trim()} | ${source.url.trim()} | p. ${source.page} | Consulta ${source.accessedOn}`,
        ...supporting.map((entry) => `Conferência: ${entry.title.trim()} | ${entry.url.trim()} | p. ${entry.page} | Consulta ${source.accessedOn}`)].join("\n"),
      notes: upper(`APLICAÇÃO: ${item.application.trim()}${item.notes?.trim() ? `\n${item.notes.trim()}` : ""}`),
      status: "draft"
    };
    // Stable IDs and a transaction prevent importing the same row twice or overwriting a previous import.
    record.id = `labor_import_${vehicle.id}_${operation.code}_${item.yearStart}_${item.yearEnd}`;
    if (active.some((other) => overlaps(record, other))) return reject("já existe tempo ativo para esse veículo, serviço e intervalo de anos.");
    if (records.some((other) => overlaps(record, other))) return reject("intervalo duplicado ou sobreposto dentro do arquivo.");
    records.push(record);
  });
  return { records, errors, valid: errors.length === 0 };
}

export function buildLaborImportTemplate(vehicle, operation) {
  return {
    schemaVersion: 1,
    records: [{
      vehicleId: vehicle?.id || "ID_DA_CONFIGURACAO", serviceCode: operation?.code || "CODIGO_DO_SERVICO",
      yearStart: vehicle?.yearStart || 2000, yearEnd: vehicle?.yearStart || 2000,
      timeHours: null,
      application: "Preencher motor, geração e condições confirmadas para o intervalo escolhido.",
      source: { title: "Título da publicação", url: "https://", page: 1, accessedOn: "AAAA-MM-DD" },
      notes: "Informar inclusões, exclusões e sobreposições.",
      applicationVerified: false, operationVerified: false, reuseAllowed: false
    }]
  };
}
