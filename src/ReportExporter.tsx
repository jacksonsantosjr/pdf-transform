/* ================================================================
   REPORT EXPORTER — Exportação de Relatório Completo
   Formatos: JSON, CSV, TXT  |  Preview  |  Customização
   ================================================================ */

import { useState, useMemo, useCallback } from "react";
import {
  FileJson,
  FileSpreadsheet,
  FileText,
  Download,
  Eye,
  EyeOff,
  Check,
  Copy,
  ChevronDown,
  Settings2,
  Calendar,
  Clock,
  Layers,
  Type,
  Hash,
  Image,
  Shield,
  Sparkles,
  FileDown,
} from "lucide-react";

/* ---- Types ---- */

interface PageInfo {
  pageNumber: number;
  width: number;
  height: number;
  characterCount: number;
  wordCount: number;
  hasText: boolean;
  hasImages: boolean;
  imageCount: number;
  textPreview: string;
  fullText: string;
}

interface SuitabilityRating {
  score: number;
  level: "excellent" | "good" | "fair" | "poor";
  reasons: string[];
  recommendations: string[];
}

interface ExtractedField {
  type: string;
  value: string;
  count: number;
  pages: number[];
}

interface ExtractionResult {
  fields: ExtractedField[];
  totalFound: number;
  summary: Record<string, number>;
}

interface PDFAnalysis {
  fileName: string;
  fileSize: number;
  pageCount: number;
  metadata: Record<string, string>;
  pages: PageInfo[];
  pdfType: string;
  suitability: SuitabilityRating;
  totalCharacters: number;
  totalWords: number;
  hasText: boolean;
  hasImages: boolean;
  pdfVersion: string;
  extractedFields: ExtractionResult | null;
}

type ExportFormat = "json" | "csv" | "txt";

interface ExportOptions {
  includeMetadata: boolean;
  includePageDetails: boolean;
  includeFullText: boolean;
  includeExtractedFields: boolean;
  includeSuitability: boolean;
  includeStatistics: boolean;
}

interface Props {
  analysis: PDFAnalysis;
  isDark: boolean;
  glassCard: string;
  txt: string;
  txt2: string;
  txt3: string;
}

/* ---- Helpers ---- */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(2) + " MB";
}

function formatTimestamp(): string {
  const now = new Date();
  return now.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatTimestampFile(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
}

function getPdfTypeLabel(type: string): string {
  switch (type) {
    case "native-text":
      return "Texto Nativo";
    case "scanned-image":
      return "Digitalizado (Imagem)";
    case "mixed":
      return "Misto";
    case "empty":
      return "Vazio";
    default:
      return type;
  }
}

function getLevelLabel(level: string): string {
  switch (level) {
    case "excellent":
      return "Excelente";
    case "good":
      return "Bom";
    case "fair":
      return "Regular";
    case "poor":
      return "Inadequado";
    default:
      return level;
  }
}

function getFieldTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    cpf: "CPF",
    cnpj: "CNPJ",
    email: "E-mail",
    telefone: "Telefone",
    data: "Data",
    valor_monetario: "Valor Monetário",
    url: "URL",
  };
  return labels[type] || type;
}

/* ---- Report Generators ---- */

function generateJsonReport(
  analysis: PDFAnalysis,
  options: ExportOptions
): string {
  const report: Record<string, any> = {
    _meta: {
      geradoPor: "PDF Analyzer Pro",
      versao: "1.0",
      dataHora: formatTimestamp(),
      formato: "JSON",
    },
    documento: {
      nomeArquivo: analysis.fileName,
      tamanho: analysis.fileSize,
      tamanhoFormatado: formatFileSize(analysis.fileSize),
      totalPaginas: analysis.pageCount,
      versaoPdf: analysis.pdfVersion,
      tipo: analysis.pdfType,
      tipoDescricao: getPdfTypeLabel(analysis.pdfType),
      possuiTexto: analysis.hasText,
      possuiImagens: analysis.hasImages,
      totalPalavras: analysis.totalWords,
      totalCaracteres: analysis.totalCharacters,
    },
  };

  if (options.includeSuitability) {
    report.adequacao = {
      pontuacao: analysis.suitability.score,
      nivel: analysis.suitability.level,
      nivelDescricao: getLevelLabel(analysis.suitability.level),
      razoes: analysis.suitability.reasons,
      recomendacoes: analysis.suitability.recommendations,
    };
  }

  if (options.includeMetadata) {
    report.metadados = analysis.metadata;
  }

  if (options.includeStatistics) {
    const textPages = analysis.pages.filter((p) => p.hasText).length;
    const imagePages = analysis.pages.filter(
      (p) => !p.hasText && p.hasImages
    ).length;
    const mixedPages = analysis.pages.filter(
      (p) => p.hasText && p.hasImages
    ).length;
    const emptyPages = analysis.pages.filter(
      (p) => !p.hasText && !p.hasImages
    ).length;
    const totalImages = analysis.pages.reduce((s, p) => s + p.imageCount, 0);
    const avgWords =
      analysis.pageCount > 0
        ? Math.round(analysis.totalWords / analysis.pageCount)
        : 0;

    report.estatisticas = {
      paginasTexto: textPages,
      paginasImagem: imagePages,
      paginasMistas: mixedPages,
      paginasVazias: emptyPages,
      totalImagens: totalImages,
      mediaPalavrasPorPagina: avgWords,
      tempoEstimadoLeitura: `${Math.max(1, Math.round(analysis.totalWords / 200))} minutos`,
      densidadeTexto: `${analysis.pageCount > 0 ? Math.round((textPages / analysis.pageCount) * 100) : 0}%`,
    };
  }

  if (options.includeExtractedFields && analysis.extractedFields) {
    report.camposExtraidos = {
      totalEncontrados: analysis.extractedFields.totalFound,
      resumo: Object.entries(analysis.extractedFields.summary)
        .filter(([, v]) => v > 0)
        .reduce(
          (acc, [k, v]) => {
            acc[getFieldTypeLabel(k)] = v;
            return acc;
          },
          {} as Record<string, number>
        ),
      campos: analysis.extractedFields.fields.map((f) => ({
        tipo: getFieldTypeLabel(f.type),
        valor: f.value,
        ocorrencias: f.count,
        paginas: f.pages,
      })),
    };
  }

  if (options.includePageDetails) {
    report.paginas = analysis.pages.map((p) => {
      const pageData: Record<string, any> = {
        numero: p.pageNumber,
        dimensoes: `${p.width}×${p.height} mm`,
        possuiTexto: p.hasText,
        possuiImagens: p.hasImages,
        totalPalavras: p.wordCount,
        totalCaracteres: p.characterCount,
        totalImagens: p.imageCount,
      };
      if (options.includeFullText && p.fullText) {
        pageData.textoCompleto = p.fullText;
      } else if (p.textPreview) {
        pageData.previewTexto = p.textPreview;
      }
      return pageData;
    });
  }

  return JSON.stringify(report, null, 2);
}

function generateCsvReport(
  analysis: PDFAnalysis,
  options: ExportOptions
): string {
  const lines: string[] = [];

  // BOM for UTF-8
  const bom = "\uFEFF";

  // Section 1: Document Info
  lines.push("=== INFORMAÇÕES DO DOCUMENTO ===");
  lines.push("Campo,Valor");
  lines.push(`Nome do Arquivo,"${analysis.fileName}"`);
  lines.push(`Tamanho,"${formatFileSize(analysis.fileSize)}"`);
  lines.push(`Páginas,${analysis.pageCount}`);
  lines.push(`Tipo,"${getPdfTypeLabel(analysis.pdfType)}"`);
  lines.push(`Versão PDF,"${analysis.pdfVersion}"`);
  lines.push(`Total Palavras,${analysis.totalWords}`);
  lines.push(`Total Caracteres,${analysis.totalCharacters}`);
  lines.push(`Possui Texto,${analysis.hasText ? "Sim" : "Não"}`);
  lines.push(`Possui Imagens,${analysis.hasImages ? "Sim" : "Não"}`);

  if (options.includeSuitability) {
    lines.push("");
    lines.push("=== ADEQUAÇÃO ===");
    lines.push("Campo,Valor");
    lines.push(`Pontuação,${analysis.suitability.score}`);
    lines.push(`Nível,"${getLevelLabel(analysis.suitability.level)}"`);
    for (const reason of analysis.suitability.reasons) {
      lines.push(`Razão,"${reason.replace(/"/g, '""')}"`);
    }
    for (const rec of analysis.suitability.recommendations) {
      lines.push(`Recomendação,"${rec.replace(/"/g, '""')}"`);
    }
  }

  if (options.includeMetadata) {
    lines.push("");
    lines.push("=== METADADOS ===");
    lines.push("Campo,Valor");
    for (const [key, value] of Object.entries(analysis.metadata)) {
      lines.push(`"${key}","${value.replace(/"/g, '""')}"`);
    }
  }

  if (options.includePageDetails) {
    lines.push("");
    lines.push("=== DETALHES POR PÁGINA ===");
    lines.push(
      "Página,Dimensões,Texto,Imagens,Palavras,Caracteres,Qtd Imagens"
    );
    for (const page of analysis.pages) {
      lines.push(
        `${page.pageNumber},"${page.width}×${page.height} mm",${page.hasText ? "Sim" : "Não"},${page.hasImages ? "Sim" : "Não"},${page.wordCount},${page.characterCount},${page.imageCount}`
      );
    }
  }

  if (options.includeExtractedFields && analysis.extractedFields) {
    lines.push("");
    lines.push("=== CAMPOS EXTRAÍDOS ===");
    lines.push("Tipo,Valor,Ocorrências,Páginas");
    for (const field of analysis.extractedFields.fields) {
      lines.push(
        `"${getFieldTypeLabel(field.type)}","${field.value.replace(/"/g, '""')}",${field.count},"${field.pages.join(", ")}"`
      );
    }
  }

  if (options.includeFullText) {
    lines.push("");
    lines.push("=== TEXTO EXTRAÍDO POR PÁGINA ===");
    lines.push("Página,Texto");
    for (const page of analysis.pages) {
      if (page.fullText) {
        lines.push(
          `${page.pageNumber},"${page.fullText.replace(/"/g, '""').replace(/\n/g, " ")}"`
        );
      }
    }
  }

  return bom + lines.join("\n");
}

function generateTxtReport(
  analysis: PDFAnalysis,
  options: ExportOptions
): string {
  const lines: string[] = [];
  const separator = "═".repeat(60);
  const thinSep = "─".repeat(60);

  lines.push(separator);
  lines.push("         PDF ANALYZER PRO — RELATÓRIO COMPLETO");
  lines.push(separator);
  lines.push(`  Gerado em: ${formatTimestamp()}`);
  lines.push("");

  // Document Info
  lines.push("┌" + "─".repeat(58) + "┐");
  lines.push("│  📄 INFORMAÇÕES DO DOCUMENTO" + " ".repeat(29) + "│");
  lines.push("└" + "─".repeat(58) + "┘");
  lines.push("");
  lines.push(`  Arquivo:       ${analysis.fileName}`);
  lines.push(`  Tamanho:       ${formatFileSize(analysis.fileSize)}`);
  lines.push(`  Páginas:       ${analysis.pageCount}`);
  lines.push(`  Tipo:          ${getPdfTypeLabel(analysis.pdfType)}`);
  lines.push(`  Versão PDF:    ${analysis.pdfVersion}`);
  lines.push(`  Palavras:      ${analysis.totalWords.toLocaleString("pt-BR")}`);
  lines.push(
    `  Caracteres:    ${analysis.totalCharacters.toLocaleString("pt-BR")}`
  );
  lines.push(`  Possui Texto:  ${analysis.hasText ? "Sim" : "Não"}`);
  lines.push(`  Possui Imagens:${analysis.hasImages ? " Sim" : " Não"}`);
  lines.push("");

  if (options.includeSuitability) {
    lines.push("┌" + "─".repeat(58) + "┐");
    lines.push("│  🎯 ANÁLISE DE ADEQUAÇÃO" + " ".repeat(33) + "│");
    lines.push("└" + "─".repeat(58) + "┘");
    lines.push("");
    lines.push(
      `  Pontuação:     ${analysis.suitability.score}/100 (${getLevelLabel(analysis.suitability.level)})`
    );
    lines.push("");
    lines.push("  Observações:");
    for (const reason of analysis.suitability.reasons) {
      lines.push(`    • ${reason}`);
    }
    if (analysis.suitability.recommendations.length > 0) {
      lines.push("");
      lines.push("  Recomendações:");
      for (const rec of analysis.suitability.recommendations) {
        lines.push(`    → ${rec}`);
      }
    }
    lines.push("");
  }

  if (options.includeMetadata) {
    lines.push("┌" + "─".repeat(58) + "┐");
    lines.push("│  📋 METADADOS DO DOCUMENTO" + " ".repeat(31) + "│");
    lines.push("└" + "─".repeat(58) + "┘");
    lines.push("");
    for (const [key, value] of Object.entries(analysis.metadata)) {
      const paddedKey = (key + ":").padEnd(20);
      lines.push(`  ${paddedKey} ${value}`);
    }
    lines.push("");
  }

  if (options.includeStatistics) {
    const textPages = analysis.pages.filter((p) => p.hasText).length;
    const imgPages = analysis.pages.filter(
      (p) => !p.hasText && p.hasImages
    ).length;
    const mixedPages = analysis.pages.filter(
      (p) => p.hasText && p.hasImages
    ).length;
    const emptyPages = analysis.pages.filter(
      (p) => !p.hasText && !p.hasImages
    ).length;
    const totalImages = analysis.pages.reduce((s, p) => s + p.imageCount, 0);

    lines.push("┌" + "─".repeat(58) + "┐");
    lines.push("│  📊 ESTATÍSTICAS" + " ".repeat(41) + "│");
    lines.push("└" + "─".repeat(58) + "┘");
    lines.push("");
    lines.push(`  Páginas com texto:     ${textPages}`);
    lines.push(`  Páginas com imagem:    ${imgPages}`);
    lines.push(`  Páginas mistas:        ${mixedPages}`);
    lines.push(`  Páginas vazias:        ${emptyPages}`);
    lines.push(`  Total de imagens:      ${totalImages}`);
    lines.push(
      `  Média palavras/pág:    ${analysis.pageCount > 0 ? Math.round(analysis.totalWords / analysis.pageCount) : 0}`
    );
    lines.push(
      `  Tempo est. leitura:    ${Math.max(1, Math.round(analysis.totalWords / 200))} minuto(s)`
    );
    lines.push(
      `  Densidade de texto:    ${analysis.pageCount > 0 ? Math.round((textPages / analysis.pageCount) * 100) : 0}%`
    );
    lines.push("");
  }

  if (options.includeExtractedFields && analysis.extractedFields) {
    lines.push("┌" + "─".repeat(58) + "┐");
    lines.push("│  🔍 CAMPOS EXTRAÍDOS" + " ".repeat(37) + "│");
    lines.push("└" + "─".repeat(58) + "┘");
    lines.push("");
    lines.push(
      `  Total encontrados: ${analysis.extractedFields.totalFound}`
    );
    lines.push("");

    // Group by type
    const grouped = new Map<string, ExtractedField[]>();
    for (const field of analysis.extractedFields.fields) {
      const key = field.type;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(field);
    }

    for (const [type, fields] of grouped) {
      lines.push(`  ${getFieldTypeLabel(type)} (${fields.length}):`);
      lines.push(`  ${thinSep.slice(0, 40)}`);
      for (const f of fields) {
        const pagesStr =
          f.pages.length <= 5
            ? f.pages.join(", ")
            : `${f.pages.slice(0, 5).join(", ")}...+${f.pages.length - 5}`;
        const countStr = f.count > 1 ? ` (${f.count}×)` : "";
        lines.push(`    ${f.value}${countStr}  [pág. ${pagesStr}]`);
      }
      lines.push("");
    }
  }

  if (options.includePageDetails) {
    lines.push("┌" + "─".repeat(58) + "┐");
    lines.push("│  📄 DETALHES POR PÁGINA" + " ".repeat(34) + "│");
    lines.push("└" + "─".repeat(58) + "┘");
    lines.push("");

    for (const page of analysis.pages) {
      lines.push(`  Página ${page.pageNumber}:`);
      lines.push(`    Dimensões:   ${page.width}×${page.height} mm`);
      lines.push(`    Palavras:    ${page.wordCount}`);
      lines.push(`    Caracteres:  ${page.characterCount}`);
      lines.push(`    Texto:       ${page.hasText ? "Sim" : "Não"}`);
      lines.push(`    Imagens:     ${page.hasImages ? `Sim (${page.imageCount})` : "Não"}`);

      if (options.includeFullText && page.fullText) {
        lines.push("    Texto completo:");
        const textLines = page.fullText.split("\n");
        for (const tl of textLines) {
          lines.push(`      ${tl}`);
        }
      } else if (page.textPreview) {
        lines.push(`    Preview:     ${page.textPreview.slice(0, 100)}...`);
      }
      lines.push("");
    }
  }

  lines.push(separator);
  lines.push("  Relatório gerado por PDF Analyzer Pro");
  lines.push("  Processamento 100% local e seguro");
  lines.push(separator);

  return lines.join("\n");
}

/* ================================================================
   FORMAT CARD COMPONENT
   ================================================================ */

function FormatCard({
  format,
  label,
  description,
  icon: Icon,
  color,
  bgColor,
  isActive,
  isDark,
  txt,
  txt3,
  onClick,
}: {
  format: ExportFormat;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  isActive: boolean;
  isDark: boolean;
  txt: string;
  txt3: string;
  onClick: (f: ExportFormat) => void;
}) {
  return (
    <button
      onClick={() => onClick(format)}
      className={`flex items-center gap-3.5 p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer text-left w-full
        ${
          isActive
            ? `${isDark ? "border-current/30" : "border-current/40"} shadow-lg scale-[1.02]`
            : isDark
              ? "border-white/5 hover:border-white/15 hover:bg-white/[0.02]"
              : "border-gray-100 hover:border-gray-200 hover:bg-gray-50/50"
        }`}
      style={isActive ? { borderColor: `${color}50`, backgroundColor: `${color}08` } : {}}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: bgColor }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-bold ${txt}`}>{label}</p>
        <p className={`text-[11px] ${txt3}`}>{description}</p>
      </div>
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200
          ${isActive ? "" : isDark ? "border-white/10" : "border-gray-200"}`}
        style={isActive ? { borderColor: color, backgroundColor: color } : {}}
      >
        {isActive && <Check className="w-3 h-3 text-white" />}
      </div>
    </button>
  );
}

/* ================================================================
   OPTION TOGGLE COMPONENT
   ================================================================ */

function OptionToggle({
  label,
  description,
  icon: Icon,
  enabled,
  isDark,
  txt,
  txt3,
  onToggle,
}: {
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  enabled: boolean;
  isDark: boolean;
  txt: string;
  txt3: string;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer w-full text-left
        ${
          enabled
            ? isDark
              ? "bg-indigo-500/10 ring-1 ring-indigo-500/20"
              : "bg-indigo-50 ring-1 ring-indigo-200"
            : isDark
              ? "bg-white/[0.02] hover:bg-white/[0.04]"
              : "bg-gray-50/50 hover:bg-gray-100/60"
        }`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
          ${enabled ? (isDark ? "bg-indigo-500/20" : "bg-indigo-100") : isDark ? "bg-white/5" : "bg-gray-100"}`}
      >
        <Icon
          className={`w-4 h-4 ${enabled ? (isDark ? "text-indigo-400" : "text-indigo-600") : txt3}`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-semibold ${txt}`}>{label}</p>
        <p className={`text-[10px] ${txt3}`}>{description}</p>
      </div>
      {/* Toggle Switch */}
      <div
        className={`w-9 h-5 rounded-full flex items-center transition-all duration-300 flex-shrink-0
          ${enabled ? "bg-indigo-500 justify-end" : isDark ? "bg-white/10 justify-start" : "bg-gray-200 justify-start"}`}
      >
        <div
          className={`w-4 h-4 rounded-full mx-0.5 shadow-sm transition-all duration-200
            ${enabled ? "bg-white" : isDark ? "bg-gray-400" : "bg-white"}`}
        />
      </div>
    </button>
  );
}

/* ================================================================
   MAIN REPORT EXPORTER COMPONENT
   ================================================================ */

export function ReportExporterSection({
  analysis,
  isDark,
  glassCard,
  txt,
  txt2,
  txt3,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("json");
  const [showPreview, setShowPreview] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exported, setExported] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    includeMetadata: true,
    includePageDetails: true,
    includeFullText: false,
    includeExtractedFields: true,
    includeSuitability: true,
    includeStatistics: true,
  });

  // Generate report content
  const reportContent = useMemo(() => {
    switch (format) {
      case "json":
        return generateJsonReport(analysis, options);
      case "csv":
        return generateCsvReport(analysis, options);
      case "txt":
        return generateTxtReport(analysis, options);
    }
  }, [analysis, format, options]);

  // Estimate file size
  const reportSize = useMemo(() => {
    const bytes = new TextEncoder().encode(reportContent).length;
    return formatFileSize(bytes);
  }, [reportContent]);

  // Count included sections
  const includedSections = useMemo(() => {
    return Object.values(options).filter(Boolean).length;
  }, [options]);

  // Toggle option
  const toggleOption = useCallback((key: keyof ExportOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Download handler
  const handleDownload = useCallback(() => {
    const mimeTypes: Record<ExportFormat, string> = {
      json: "application/json",
      csv: "text/csv;charset=utf-8",
      txt: "text/plain;charset=utf-8",
    };

    const extensions: Record<ExportFormat, string> = {
      json: ".json",
      csv: ".csv",
      txt: ".txt",
    };

    const blob = new Blob([reportContent], { type: mimeTypes[format] });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const baseName = analysis.fileName.replace(/\.pdf$/i, "");
    a.href = url;
    a.download = `${baseName}_relatorio_${formatTimestampFile()}${extensions[format]}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExported(true);
    setTimeout(() => setExported(false), 3000);
  }, [reportContent, format, analysis.fileName]);

  // Copy handler
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(reportContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = reportContent;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [reportContent]);

  // Report line count for preview
  const lineCount = reportContent.split("\n").length;

  return (
    <div
      className={`${glassCard} rounded-2xl overflow-hidden animate-fade-in-up animation-delay-400`}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between p-6 cursor-pointer transition-all duration-200
          ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50/50"}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/20">
            <FileDown className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="text-left">
            <h3 className={`text-base font-bold ${txt}`}>
              Exportar Relatório
            </h3>
            <p className={`text-xs ${txt3}`}>
              Gere relatório completo em JSON, CSV ou TXT
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {exported && (
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full animate-fade-in-up
                ${isDark ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-100 text-emerald-700"}`}
              style={{ animationDuration: "0.2s" }}
            >
              ✓ Exportado
            </span>
          )}
          <ChevronDown
            className={`w-5 h-5 transition-transform duration-300 ${txt3} ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div
          className={`border-t px-6 pb-6 space-y-5 ${isDark ? "border-white/5" : "border-gray-200/60"}`}
        >
          {/* Format Selector */}
          <div className="pt-5">
            <p
              className={`text-xs font-semibold uppercase tracking-wider mb-3 ${txt3}`}
            >
              Formato de Exportação
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormatCard
                format="json"
                label="JSON"
                description="Estruturado e programável"
                icon={FileJson}
                color="#f59e0b"
                bgColor={isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.08)"}
                isActive={format === "json"}
                isDark={isDark}
                txt={txt}
                txt3={txt3}
                onClick={setFormat}
              />
              <FormatCard
                format="csv"
                label="CSV"
                description="Compatível com Excel"
                icon={FileSpreadsheet}
                color="#10b981"
                bgColor={isDark ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.08)"}
                isActive={format === "csv"}
                isDark={isDark}
                txt={txt}
                txt3={txt3}
                onClick={setFormat}
              />
              <FormatCard
                format="txt"
                label="TXT"
                description="Relatório legível"
                icon={FileText}
                color="#6366f1"
                bgColor={isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)"}
                isActive={format === "txt"}
                isDark={isDark}
                txt={txt}
                txt3={txt3}
                onClick={setFormat}
              />
            </div>
          </div>

          {/* Options Toggle */}
          <div>
            <button
              onClick={() => setShowOptions(!showOptions)}
              className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-3 cursor-pointer transition-all duration-200
                ${isDark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              Personalizar Conteúdo
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${showOptions ? "rotate-180" : ""}`}
              />
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold
                  ${isDark ? "bg-indigo-500/15 text-indigo-400" : "bg-indigo-100 text-indigo-700"}`}
              >
                {includedSections} de 6
              </span>
            </button>

            {showOptions && (
              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-fade-in-up"
                style={{ animationDuration: "0.2s" }}
              >
                <OptionToggle
                  label="Metadados"
                  description="Título, autor, datas, produtor"
                  icon={Calendar}
                  enabled={options.includeMetadata}
                  isDark={isDark}
                  txt={txt}
                  txt3={txt3}
                  onToggle={() => toggleOption("includeMetadata")}
                />
                <OptionToggle
                  label="Adequação"
                  description="Score, nível, razões e recomendações"
                  icon={Shield}
                  enabled={options.includeSuitability}
                  isDark={isDark}
                  txt={txt}
                  txt3={txt3}
                  onToggle={() => toggleOption("includeSuitability")}
                />
                <OptionToggle
                  label="Estatísticas"
                  description="Distribuição, médias, tempo leitura"
                  icon={Hash}
                  enabled={options.includeStatistics}
                  isDark={isDark}
                  txt={txt}
                  txt3={txt3}
                  onToggle={() => toggleOption("includeStatistics")}
                />
                <OptionToggle
                  label="Campos Extraídos"
                  description="CPF, CNPJ, e-mails, telefones, etc."
                  icon={Sparkles}
                  enabled={options.includeExtractedFields}
                  isDark={isDark}
                  txt={txt}
                  txt3={txt3}
                  onToggle={() => toggleOption("includeExtractedFields")}
                />
                <OptionToggle
                  label="Detalhes por Página"
                  description="Dimensões, palavras, imagens por página"
                  icon={Layers}
                  enabled={options.includePageDetails}
                  isDark={isDark}
                  txt={txt}
                  txt3={txt3}
                  onToggle={() => toggleOption("includePageDetails")}
                />
                <OptionToggle
                  label="Texto Completo"
                  description="Inclui o texto extraído de cada página"
                  icon={Type}
                  enabled={options.includeFullText}
                  isDark={isDark}
                  txt={txt}
                  txt3={txt3}
                  onToggle={() => toggleOption("includeFullText")}
                />
              </div>
            )}
          </div>

          {/* Report Summary */}
          <div
            className={`flex flex-wrap items-center gap-x-5 gap-y-2 p-4 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-gray-50/80"}`}
          >
            <div className="flex items-center gap-2">
              <FileText className={`w-4 h-4 ${txt3}`} />
              <span className={`text-xs ${txt2}`}>
                <span className={`font-bold ${txt}`}>{lineCount}</span> linhas
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Image className={`w-4 h-4 ${txt3}`} />
              <span className={`text-xs ${txt2}`}>
                <span className={`font-bold ${txt}`}>{reportSize}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className={`w-4 h-4 ${txt3}`} />
              <span className={`text-xs ${txt2}`}>
                <span className={`font-bold ${txt}`}>{includedSections}</span>{" "}
                seções
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 ${txt3}`} />
              <span className={`text-xs ${txt2}`}>
                {formatTimestamp().split(" ")[1]}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Download Button */}
            <button
              onClick={handleDownload}
              className={`flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 cursor-pointer
                ${
                  exported
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25"
                    : "bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:shadow-xl hover:shadow-rose-500/25 hover:scale-[1.02]"
                }`}
            >
              {exported ? (
                <>
                  <Check className="w-5 h-5" />
                  Relatório Exportado!
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Baixar Relatório .{format.toUpperCase()}
                </>
              )}
            </button>

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className={`flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer
                ${
                  copied
                    ? "bg-emerald-500/15 text-emerald-500"
                    : isDark
                      ? "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar
                </>
              )}
            </button>

            {/* Preview Toggle */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer
                ${
                  showPreview
                    ? isDark
                      ? "bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/30"
                      : "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200"
                    : isDark
                      ? "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                }`}
            >
              {showPreview ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Ocultar
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Preview
                </>
              )}
            </button>
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div
              className="animate-fade-in-up"
              style={{ animationDuration: "0.25s" }}
            >
              <div className="flex items-center justify-between mb-2">
                <p
                  className={`text-xs font-semibold uppercase tracking-wider ${txt3}`}
                >
                  Preview do Relatório ({format.toUpperCase()})
                </p>
                <span className={`text-[10px] ${txt3}`}>
                  {lineCount} linhas · {reportSize}
                </span>
              </div>
              <div
                className={`relative rounded-xl overflow-hidden border ${isDark ? "border-white/5" : "border-gray-200"}`}
              >
                {/* Syntax highlight bar */}
                <div
                  className={`flex items-center gap-2 px-4 py-2.5 ${isDark ? "bg-gray-800/80" : "bg-gray-100"}`}
                >
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/70" />
                    <div className="w-3 h-3 rounded-full bg-amber-400/70" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400/70" />
                  </div>
                  <span className={`text-[10px] font-mono ml-2 ${txt3}`}>
                    {analysis.fileName.replace(/\.pdf$/i, "")}_relatorio.
                    {format}
                  </span>
                </div>

                {/* Content */}
                <pre
                  className={`p-4 text-xs leading-relaxed overflow-auto max-h-96 font-mono whitespace-pre-wrap break-words
                    ${isDark ? "bg-gray-900/50 text-gray-300" : "bg-white text-gray-700"}`}
                >
                  {reportContent.slice(0, 5000)}
                  {reportContent.length > 5000 && (
                    <span className={`${txt3} italic`}>
                      {"\n\n"}... ({lineCount - reportContent.slice(0, 5000).split("\n").length} linhas restantes — baixe para ver o conteúdo completo)
                    </span>
                  )}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
