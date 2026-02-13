/* ================================================================
   FIELD EXTRACTOR — Extração Inteligente de Campos
   Detecta: CPF, CNPJ, E-mails, Telefones, Datas, Valores Monetários, URLs
   ================================================================ */

export interface ExtractedField {
  type: FieldType;
  value: string;
  count: number;
  pages: number[];
}

export type FieldType =
  | "cpf"
  | "cnpj"
  | "email"
  | "telefone"
  | "data"
  | "valor_monetario"
  | "url";

export interface FieldTypeInfo {
  type: FieldType;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  bgColorDark: string;
  textColorDark: string;
  description: string;
}

export const FIELD_TYPE_INFO: Record<FieldType, FieldTypeInfo> = {
  cpf: {
    type: "cpf",
    label: "CPF",
    icon: "🪪",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    bgColorDark: "bg-blue-500/15",
    textColorDark: "text-blue-400",
    description: "Cadastro de Pessoa Física",
  },
  cnpj: {
    type: "cnpj",
    label: "CNPJ",
    icon: "🏢",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    bgColorDark: "bg-purple-500/15",
    textColorDark: "text-purple-400",
    description: "Cadastro Nacional de Pessoa Jurídica",
  },
  email: {
    type: "email",
    label: "E-mail",
    icon: "📧",
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
    bgColorDark: "bg-emerald-500/15",
    textColorDark: "text-emerald-400",
    description: "Endereço de e-mail",
  },
  telefone: {
    type: "telefone",
    label: "Telefone",
    icon: "📞",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    bgColorDark: "bg-amber-500/15",
    textColorDark: "text-amber-400",
    description: "Número de telefone",
  },
  data: {
    type: "data",
    label: "Data",
    icon: "📅",
    color: "text-cyan-600",
    bgColor: "bg-cyan-100",
    bgColorDark: "bg-cyan-500/15",
    textColorDark: "text-cyan-400",
    description: "Data identificada",
  },
  valor_monetario: {
    type: "valor_monetario",
    label: "Valor Monetário",
    icon: "💰",
    color: "text-green-600",
    bgColor: "bg-green-100",
    bgColorDark: "bg-green-500/15",
    textColorDark: "text-green-400",
    description: "Valor em moeda",
  },
  url: {
    type: "url",
    label: "URL",
    icon: "🔗",
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
    bgColorDark: "bg-indigo-500/15",
    textColorDark: "text-indigo-400",
    description: "Endereço web",
  },
};

/* ---- Regex Patterns ---- */

// CPF: 000.000.000-00 or 00000000000
const CPF_REGEX = /\b(\d{3}\.\d{3}\.\d{3}-\d{2})\b/g;
const CPF_RAW_REGEX = /\b(\d{11})\b/g;

// CNPJ: 00.000.000/0000-00 or 00000000000000
const CNPJ_REGEX = /\b(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/g;
const CNPJ_RAW_REGEX = /\b(\d{14})\b/g;

// E-mail
const EMAIL_REGEX = /\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b/g;

// Telefone brasileiro: (00) 00000-0000, (00) 0000-0000, +55 (00) 00000-0000, etc.
const PHONE_REGEX =
  /(?:\+55\s?)?(?:\(?\d{2}\)?\s?)(?:\d{4,5}[-.\s]?\d{4})\b/g;

// Datas: dd/mm/aaaa, dd-mm-aaaa, dd.mm.aaaa, aaaa-mm-dd, dd de mês de aaaa
const DATE_NUMERIC_REGEX =
  /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/g;
const DATE_ISO_REGEX =
  /\b(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/g;
const DATE_WRITTEN_REGEX =
  /\b(\d{1,2}\s+de\s+(?:janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+\d{4})\b/gi;

// Valores monetários: R$ 1.000,00 / R$1000,00 / R$ 1.000 / 1.000,00
const CURRENCY_REGEX =
  /R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?\b/g;
const CURRENCY_PLAIN_REGEX =
  /\b\d{1,3}(?:\.\d{3})+,\d{2}\b/g;

// URLs
const URL_REGEX =
  /\b(https?:\/\/[^\s<>"{}|\\^\[\]`]+)\b/gi;
const WWW_REGEX =
  /\b(www\.[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}[^\s<>"{}|\\^\[\]`]*)\b/gi;

/* ---- Validation helpers ---- */

function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * (10 - i);
  }
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i]) * (11 - i);
  }
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(digits[10])) return false;

  return true;
}

function isValidCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * weights1[i];
  }
  let rest = sum % 11;
  const d1 = rest < 2 ? 0 : 11 - rest;
  if (parseInt(digits[12]) !== d1) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(digits[i]) * weights2[i];
  }
  rest = sum % 11;
  const d2 = rest < 2 ? 0 : 11 - rest;
  if (parseInt(digits[13]) !== d2) return false;

  return true;
}

function isPlausibleDate(dateStr: string): boolean {
  // Check basic numeric date patterns
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length !== 3) return false;

  const nums = parts.map((p) => parseInt(p));
  // dd/mm/yyyy format
  if (nums[2] >= 1900 && nums[2] <= 2100) {
    return nums[0] >= 1 && nums[0] <= 31 && nums[1] >= 1 && nums[1] <= 12;
  }
  // yyyy-mm-dd format
  if (nums[0] >= 1900 && nums[0] <= 2100) {
    return nums[1] >= 1 && nums[1] <= 12 && nums[2] >= 1 && nums[2] <= 31;
  }
  // dd/mm/yy format
  if (nums[2] >= 0 && nums[2] <= 99) {
    return nums[0] >= 1 && nums[0] <= 31 && nums[1] >= 1 && nums[1] <= 12;
  }
  return false;
}

/* ---- Main extraction function ---- */

export interface ExtractionResult {
  fields: ExtractedField[];
  totalFound: number;
  summary: Record<FieldType, number>;
}

interface PageText {
  pageNumber: number;
  text: string;
}

export function extractFieldsFromPages(pagesText: PageText[]): ExtractionResult {
  // We'll collect unique values per type, tracking pages and count
  const fieldMap = new Map<string, ExtractedField>();

  function addField(type: FieldType, value: string, pageNumber: number) {
    const key = `${type}::${value}`;
    if (fieldMap.has(key)) {
      const existing = fieldMap.get(key)!;
      existing.count++;
      if (!existing.pages.includes(pageNumber)) {
        existing.pages.push(pageNumber);
      }
    } else {
      fieldMap.set(key, {
        type,
        value,
        count: 1,
        pages: [pageNumber],
      });
    }
  }

  for (const { pageNumber, text } of pagesText) {
    if (!text.trim()) continue;

    // --- CPF (formatted) ---
    const cpfMatches = text.matchAll(CPF_REGEX);
    for (const m of cpfMatches) {
      if (isValidCPF(m[1])) {
        addField("cpf", m[1], pageNumber);
      }
    }

    // --- CPF (raw 11 digits) - only if looks like CPF context ---
    const cpfRawMatches = text.matchAll(CPF_RAW_REGEX);
    for (const m of cpfRawMatches) {
      // Check if it's surrounded by CPF context
      const idx = m.index ?? 0;
      const context = text.slice(Math.max(0, idx - 30), idx).toLowerCase();
      if (context.includes("cpf") && isValidCPF(m[1])) {
        const formatted = `${m[1].slice(0, 3)}.${m[1].slice(3, 6)}.${m[1].slice(6, 9)}-${m[1].slice(9)}`;
        addField("cpf", formatted, pageNumber);
      }
    }

    // --- CNPJ (formatted) ---
    const cnpjMatches = text.matchAll(CNPJ_REGEX);
    for (const m of cnpjMatches) {
      if (isValidCNPJ(m[1])) {
        addField("cnpj", m[1], pageNumber);
      }
    }

    // --- CNPJ (raw 14 digits) ---
    const cnpjRawMatches = text.matchAll(CNPJ_RAW_REGEX);
    for (const m of cnpjRawMatches) {
      const idx = m.index ?? 0;
      const context = text.slice(Math.max(0, idx - 30), idx).toLowerCase();
      if (context.includes("cnpj") && isValidCNPJ(m[1])) {
        const d = m[1];
        const formatted = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
        addField("cnpj", formatted, pageNumber);
      }
    }

    // --- E-mail ---
    const emailMatches = text.matchAll(EMAIL_REGEX);
    for (const m of emailMatches) {
      addField("email", m[1].toLowerCase(), pageNumber);
    }

    // --- Telefone ---
    const phoneMatches = text.matchAll(PHONE_REGEX);
    for (const m of phoneMatches) {
      const cleaned = m[0].trim();
      // Basic validation: at least 10 digits
      const digits = cleaned.replace(/\D/g, "");
      if (digits.length >= 10 && digits.length <= 13) {
        addField("telefone", cleaned, pageNumber);
      }
    }

    // --- Datas (numeric) ---
    const dateNumMatches = text.matchAll(DATE_NUMERIC_REGEX);
    for (const m of dateNumMatches) {
      if (isPlausibleDate(m[1])) {
        addField("data", m[1], pageNumber);
      }
    }

    // --- Datas (ISO) ---
    const dateIsoMatches = text.matchAll(DATE_ISO_REGEX);
    for (const m of dateIsoMatches) {
      if (isPlausibleDate(m[1])) {
        addField("data", m[1], pageNumber);
      }
    }

    // --- Datas (written: "10 de janeiro de 2024") ---
    const dateWrittenMatches = text.matchAll(DATE_WRITTEN_REGEX);
    for (const m of dateWrittenMatches) {
      addField("data", m[1], pageNumber);
    }

    // --- Valores Monetários (R$) ---
    const currencyMatches = text.matchAll(CURRENCY_REGEX);
    for (const m of currencyMatches) {
      addField("valor_monetario", m[0].trim(), pageNumber);
    }

    // --- Valores Monetários (plain: 1.000,00) ---
    const currencyPlainMatches = text.matchAll(CURRENCY_PLAIN_REGEX);
    for (const m of currencyPlainMatches) {
      // Avoid duplicates with R$ prefix matches
      const val = m[0];
      const idx = m.index ?? 0;
      const before = text.slice(Math.max(0, idx - 5), idx);
      if (!before.includes("R$")) {
        addField("valor_monetario", val, pageNumber);
      }
    }

    // --- URLs ---
    const urlMatches = text.matchAll(URL_REGEX);
    for (const m of urlMatches) {
      addField("url", m[1], pageNumber);
    }

    const wwwMatches = text.matchAll(WWW_REGEX);
    for (const m of wwwMatches) {
      addField("url", m[1], pageNumber);
    }
  }

  const fields = Array.from(fieldMap.values());

  // Build summary
  const summary: Record<FieldType, number> = {
    cpf: 0,
    cnpj: 0,
    email: 0,
    telefone: 0,
    data: 0,
    valor_monetario: 0,
    url: 0,
  };

  for (const f of fields) {
    summary[f.type]++;
  }

  return {
    fields,
    totalFound: fields.length,
    summary,
  };
}
