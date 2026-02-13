import { useState, useCallback, useRef, useEffect } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sun,
  Moon,
  Download,
  Loader2,
  FileSearch,
  Zap,
  Info,
  ChevronRight,
  Sparkles,
  ArrowRight,
  BarChart3,
  Clock,
  Layers,
  RefreshCw,
  Shield,
  Type,
  Image,
  FileWarning,
} from "lucide-react";

/* ================================================================
   TYPES
   ================================================================ */

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
}

interface SuitabilityRating {
  score: number;
  level: "excellent" | "good" | "fair" | "poor";
  reasons: string[];
  recommendations: string[];
}

type PDFType = "native-text" | "scanned-image" | "mixed" | "empty";

interface PDFAnalysis {
  fileName: string;
  fileSize: number;
  pageCount: number;
  metadata: Record<string, string>;
  pages: PageInfo[];
  pdfType: PDFType;
  suitability: SuitabilityRating;
  totalCharacters: number;
  totalWords: number;
  hasText: boolean;
  hasImages: boolean;
  pdfVersion: string;
}

type AppState =
  | "idle"
  | "analyzing"
  | "analyzed"
  | "converting"
  | "converted"
  | "error";

/* ================================================================
   HELPERS
   ================================================================ */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(2) + " MB";
}

function formatPdfDate(dateStr: string): string {
  if (!dateStr || dateStr === "N/A") return "N/A";
  try {
    const cleaned = dateStr.replace(/^D:/, "");
    const year = cleaned.slice(0, 4);
    const month = cleaned.slice(4, 6);
    const day = cleaned.slice(6, 8);
    const hour = cleaned.slice(8, 10) || "00";
    const min = cleaned.slice(10, 12) || "00";
    if (year && month && day) {
      return `${day}/${month}/${year} ${hour}:${min}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

function getPdfjsLib(): any {
  return (window as any).pdfjsLib;
}

function getTesseract(): any {
  return (window as any).Tesseract;
}

/* ================================================================
   PDF ANALYSIS
   ================================================================ */

async function analyzePDF(
  file: File,
  onProgress: (progress: number, message: string) => void
): Promise<PDFAnalysis> {
  const pdfjs = getPdfjsLib();
  if (!pdfjs) {
    throw new Error(
      "Motor PDF.js não disponível. Verifique sua conexão com a internet e recarregue a página."
    );
  }

  onProgress(5, "Carregando arquivo...");
  const arrayBuffer = await file.arrayBuffer();

  onProgress(10, "Abrindo documento PDF...");
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) })
    .promise;

  onProgress(15, "Extraindo metadados...");
  const meta = await pdf.getMetadata().catch(() => ({ info: {} }));
  const info = meta?.info || {};

  const metadata: Record<string, string> = {
    Título: info.Title || "N/A",
    Autor: info.Author || "N/A",
    Assunto: info.Subject || "N/A",
    Criador: info.Creator || "N/A",
    Produtor: info.Producer || "N/A",
    "Data de Criação": formatPdfDate(info.CreationDate || ""),
    "Última Modificação": formatPdfDate(info.ModDate || ""),
    "Palavras-chave": info.Keywords || "N/A",
  };

  const pages: PageInfo[] = [];
  let totalChars = 0;
  let totalWords = 0;
  let hasAnyText = false;
  let hasAnyImages = false;

  for (let i = 1; i <= pdf.numPages; i++) {
    const pct = 15 + (i / pdf.numPages) * 75;
    onProgress(pct, `Analisando página ${i} de ${pdf.numPages}...`);

    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });

    const textItems = textContent.items
      .filter((item: any) => item.str)
      .map((item: any) => item.str);
    const text = textItems.join(" ").trim();
    const charCount = text.replace(/\s/g, "").length;
    const wordCount = text
      .split(/\s+/)
      .filter((w: string) => w.length > 0).length;

    let imageCount = 0;
    try {
      const opList = await page.getOperatorList();
      const OPS = pdfjs.OPS;
      if (OPS) {
        for (const fn of opList.fnArray) {
          if (
            fn === OPS.paintImageXObject ||
            fn === OPS.paintJpegXObject ||
            fn === OPS.paintImageXObjectRepeat
          ) {
            imageCount++;
          }
        }
      }
    } catch {
      /* ignore */
    }

    const pageHasText = charCount > 10;
    const pageHasImages = imageCount > 0;

    pages.push({
      pageNumber: i,
      width: Math.round(viewport.width * 0.3528),
      height: Math.round(viewport.height * 0.3528),
      characterCount: charCount,
      wordCount,
      hasText: pageHasText,
      hasImages: pageHasImages,
      imageCount,
      textPreview: text.slice(0, 300) + (text.length > 300 ? "..." : ""),
    });

    totalChars += charCount;
    totalWords += wordCount;
    if (pageHasText) hasAnyText = true;
    if (pageHasImages) hasAnyImages = true;
  }

  onProgress(92, "Classificando tipo de PDF...");

  const textPagesCount = pages.filter((p) => p.hasText).length;
  const scannedPagesCount = pages.filter(
    (p) => !p.hasText && p.hasImages
  ).length;

  let pdfType: PDFType;
  if (pages.length === 0 || (totalChars === 0 && !hasAnyImages)) {
    pdfType = "empty";
  } else if (scannedPagesCount === 0 && textPagesCount > 0) {
    pdfType = "native-text";
  } else if (textPagesCount === 0 && scannedPagesCount > 0) {
    pdfType = "scanned-image";
  } else if (textPagesCount > 0 && scannedPagesCount > 0) {
    pdfType = "mixed";
  } else {
    pdfType = "empty";
  }

  onProgress(96, "Calculando adequação...");

  const reasons: string[] = [];
  const recommendations: string[] = [];
  let score: number;

  switch (pdfType) {
    case "native-text":
      score = 95;
      reasons.push("PDF contém texto nativo selecionável");
      reasons.push("Texto pode ser copiado e extraído diretamente");
      reasons.push(
        `${totalWords.toLocaleString("pt-BR")} palavras detectadas em ${textPagesCount} página(s)`
      );
      if (hasAnyImages) {
        reasons.push("Imagens incorporadas detectadas (não afetam a extração)");
      }
      break;
    case "scanned-image":
      score = 12;
      reasons.push("PDF contém apenas imagens (digitalizado/escaneado)");
      reasons.push("Texto NÃO é selecionável ou pesquisável");
      reasons.push("Extração direta de texto não é possível");
      recommendations.push(
        "Converter para PDF com texto nativo via reconhecimento óptico (OCR)"
      );
      recommendations.push(
        "O processo de OCR identificará e reconhecerá o texto nas imagens"
      );
      break;
    case "mixed":
      score = Math.round(20 + (textPagesCount / pages.length) * 60);
      reasons.push("PDF contém mistura de texto nativo e páginas digitalizadas");
      reasons.push(
        `${textPagesCount} de ${pages.length} páginas contêm texto extraível`
      );
      reasons.push(
        `${scannedPagesCount} página(s) são imagens sem texto selecionável`
      );
      recommendations.push(
        "Converter via OCR para tornar todas as páginas pesquisáveis"
      );
      break;
    case "empty":
      score = 0;
      reasons.push("Nenhum conteúdo detectável no PDF");
      reasons.push("Não foi encontrado texto nem imagens");
      recommendations.push(
        "Verifique se o arquivo PDF é válido e não está corrompido"
      );
      break;
  }

  const filledMeta = Object.values(metadata).filter(
    (v) => v && v !== "N/A"
  ).length;
  if (filledMeta >= 5) {
    score = Math.min(100, score + 3);
    reasons.push("Metadados do documento bem preenchidos");
  }

  let level: SuitabilityRating["level"];
  if (score >= 80) level = "excellent";
  else if (score >= 60) level = "good";
  else if (score >= 40) level = "fair";
  else level = "poor";

  onProgress(100, "Análise concluída!");

  return {
    fileName: file.name,
    fileSize: file.size,
    pageCount: pdf.numPages,
    metadata,
    pages,
    pdfType,
    suitability: { score, level, reasons, recommendations },
    totalCharacters: totalChars,
    totalWords: totalWords,
    hasText: hasAnyText,
    hasImages: hasAnyImages,
    pdfVersion: info.PDFFormatVersion || "N/A",
  };
}

/* ================================================================
   PDF CONVERSION (OCR)
   ================================================================ */

async function convertToNativeTextPDF(
  file: File,
  onProgress: (progress: number, message: string) => void
): Promise<Blob> {
  const pdfjs = getPdfjsLib();
  const tesseract = getTesseract();

  if (!pdfjs) {
    throw new Error("PDF.js não disponível. Verifique sua conexão.");
  }
  if (!tesseract) {
    throw new Error(
      "Tesseract.js (OCR) não disponível. Verifique sua conexão com a internet e recarregue a página."
    );
  }

  onProgress(2, "Carregando arquivo PDF...");
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) })
    .promise;

  onProgress(5, "Preparando novo documento...");
  const newPdf = await PDFDocument.create();
  const font = await newPdf.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= pdf.numPages; i++) {
    const base = 5 + ((i - 1) / pdf.numPages) * 90;

    onProgress(base, `Renderizando página ${i} de ${pdf.numPages}...`);

    const page = await pdf.getPage(i);
    const origViewport = page.getViewport({ scale: 1 });
    const renderViewport = page.getViewport({ scale: 2.5 });

    // Check if page already has text
    const textContent = await page.getTextContent();
    const existingText = textContent.items
      .map((item: any) => item.str)
      .join(" ")
      .trim();
    const pageHasText = existingText.replace(/\s/g, "").length > 20;

    // Render to canvas
    const canvas = document.createElement("canvas");
    canvas.width = renderViewport.width;
    canvas.height = renderViewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas não disponível");

    await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;

    let finalText: string;

    if (pageHasText) {
      onProgress(
        base + 8,
        `Página ${i}: texto nativo detectado, pulando OCR...`
      );
      finalText = existingText;
    } else {
      onProgress(base + 3, `OCR página ${i} de ${pdf.numPages}...`);
      const result = await tesseract.recognize(canvas, "por+eng", {
        logger: (m: any) => {
          if (m.status === "recognizing text") {
            const p = base + 3 + (m.progress * 85) / pdf.numPages;
            onProgress(
              Math.min(p, 95),
              `OCR página ${i}: ${Math.round(m.progress * 100)}%`
            );
          } else if (m.status === "loading language traineddata") {
            onProgress(base + 1, "Carregando modelo de idioma OCR...");
          }
        },
      });
      finalText = result.data.text;
    }

    // Create new page
    const pageW = origViewport.width;
    const pageH = origViewport.height;
    const newPage = newPdf.addPage([pageW, pageH]);

    // Embed page image as JPEG
    const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.88);
    const imgResp = await fetch(jpegDataUrl);
    const imgBytes = await imgResp.arrayBuffer();
    const jpgImage = await newPdf.embedJpg(new Uint8Array(imgBytes));

    newPage.drawImage(jpgImage, {
      x: 0,
      y: 0,
      width: pageW,
      height: pageH,
    });

    // Add invisible text layer
    if (finalText.trim()) {
      const fontSize = 8;
      const lines = finalText.split("\n").filter((l: string) => l.trim());
      let y = pageH - 15;

      for (const line of lines) {
        if (y < 10) break;
        try {
          const cleanLine = line.replace(/[^\x20-\x7E\xA0-\xFF]/g, "").trim();
          if (cleanLine) {
            newPage.drawText(cleanLine, {
              x: 10,
              y,
              size: fontSize,
              font,
              color: rgb(0, 0, 0),
              opacity: 0.01,
            });
          }
        } catch {
          /* skip */
        }
        y -= fontSize * 1.3;
      }
    }

    // Clean up
    canvas.width = 0;
    canvas.height = 0;
  }

  onProgress(97, "Finalizando documento PDF...");
  const pdfBytes = await newPdf.save();

  onProgress(100, "Conversão concluída com sucesso!");
  return new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
}

/* ================================================================
   THEME HOOK
   ================================================================ */

function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("pdf-analyzer-theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("pdf-analyzer-theme", isDark ? "dark" : "light");
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((d) => !d) };
}

/* ================================================================
   SUITABILITY GAUGE COMPONENT
   ================================================================ */

function SuitabilityGauge({
  score,
  level,
  isDark,
}: {
  score: number;
  level: string;
  isDark: boolean;
}) {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);

  const color =
    level === "excellent"
      ? "#10b981"
      : level === "good"
        ? "#3b82f6"
        : level === "fair"
          ? "#f59e0b"
          : "#ef4444";

  const levelLabel =
    level === "excellent"
      ? "Excelente"
      : level === "good"
        ? "Bom"
        : level === "fair"
          ? "Regular"
          : "Inadequado";

  return (
    <div className="flex items-center gap-5">
      <div className="relative w-28 h-28 flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle
            cx="64"
            cy="64"
            r={r}
            strokeWidth="10"
            fill="none"
            className={isDark ? "stroke-gray-700/50" : "stroke-gray-200"}
          />
          <circle
            cx="64"
            cy="64"
            r={r}
            strokeWidth="10"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="animate-gauge"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
          >
            {score}
          </span>
        </div>
      </div>
      <div>
        <p className={`text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          Adequação
        </p>
        <p className="text-xl font-bold mt-0.5" style={{ color }}>
          {levelLabel}
        </p>
        <p className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          para extração de dados
        </p>
      </div>
    </div>
  );
}

/* ================================================================
   MAIN APP COMPONENT
   ================================================================ */

export function App() {
  const { isDark, toggle: toggleTheme } = useTheme();

  const [state, setState] = useState<AppState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<PDFAnalysis | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [convertedUrl, setConvertedUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [expandedPages, setExpandedPages] = useState<Set<number>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Style helpers
  const glass = isDark ? "glass-dark" : "glass-light";
  const glassCard = isDark ? "glass-card-dark" : "glass-card-light";
  const txt = isDark ? "text-white" : "text-gray-900";
  const txt2 = isDark ? "text-gray-400" : "text-gray-600";
  const txt3 = isDark ? "text-gray-500" : "text-gray-400";

  /* ---- handlers ---- */

  const handleFile = useCallback(async (f: File) => {
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError("Por favor, selecione um arquivo PDF válido.");
      setState("error");
      return;
    }

    setFile(f);
    setState("analyzing");
    setProgress(0);
    setProgressMsg("Iniciando análise...");
    setError("");
    setConvertedUrl("");
    setExpandedPages(new Set());

    try {
      const result = await analyzePDF(f, (p, m) => {
        setProgress(p);
        setProgressMsg(m);
      });
      setAnalysis(result);
      setState("analyzed");
    } catch (err: any) {
      setError(err?.message || "Erro desconhecido ao analisar o PDF.");
      setState("error");
    }
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) return;

    setState("converting");
    setProgress(0);
    setProgressMsg("Iniciando conversão OCR...");

    try {
      const blob = await convertToNativeTextPDF(file, (p, m) => {
        setProgress(p);
        setProgressMsg(m);
      });
      const url = URL.createObjectURL(blob);
      setConvertedUrl(url);
      setState("converted");
    } catch (err: any) {
      setError(err?.message || "Erro na conversão OCR.");
      setState("error");
    }
  }, [file]);

  const reset = useCallback(() => {
    setState("idle");
    setFile(null);
    setAnalysis(null);
    setError("");
    setProgress(0);
    setProgressMsg("");
    setExpandedPages(new Set());
    if (convertedUrl) URL.revokeObjectURL(convertedUrl);
    setConvertedUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [convertedUrl]);

  const togglePage = (n: number) => {
    setExpandedPages((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  // scroll to results on analysis complete
  useEffect(() => {
    if (state === "analyzed" && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [state]);

  /* ---- type helpers ---- */

  const typeConfig: Record<
    PDFType,
    {
      label: string;
      sublabel: string;
      colorClass: string;
      bgClass: string;
      badgeClass: string;
      icon: React.ReactNode;
    }
  > = {
    "native-text": {
      label: "Texto Nativo",
      sublabel: "Adequado para extração",
      colorClass: "text-emerald-500",
      bgClass: "bg-emerald-500/10",
      badgeClass: isDark
        ? "bg-emerald-500/20 text-emerald-400"
        : "bg-emerald-100 text-emerald-700",
      icon: <Type className="w-6 h-6 text-emerald-500" />,
    },
    "scanned-image": {
      label: "Digitalizado",
      sublabel: "Necessita conversão OCR",
      colorClass: "text-red-500",
      bgClass: "bg-red-500/10",
      badgeClass: isDark
        ? "bg-red-500/20 text-red-400"
        : "bg-red-100 text-red-700",
      icon: <Image className="w-6 h-6 text-red-500" />,
    },
    mixed: {
      label: "Misto",
      sublabel: "Parcialmente extraível",
      colorClass: "text-amber-500",
      bgClass: "bg-amber-500/10",
      badgeClass: isDark
        ? "bg-amber-500/20 text-amber-400"
        : "bg-amber-100 text-amber-700",
      icon: <Layers className="w-6 h-6 text-amber-500" />,
    },
    empty: {
      label: "Vazio",
      sublabel: "Sem conteúdo detectável",
      colorClass: "text-gray-500",
      bgClass: "bg-gray-500/10",
      badgeClass: isDark
        ? "bg-gray-500/20 text-gray-400"
        : "bg-gray-200 text-gray-600",
      icon: <FileWarning className="w-6 h-6 text-gray-500" />,
    },
  };

  /* ================================================================
     RENDER
     ================================================================ */

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${isDark ? "bg-gray-950" : "bg-gray-50"}`}
    >
      {/* ---- Animated Background ---- */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full blur-[130px] animate-blob ${isDark ? "bg-indigo-900/20" : "bg-indigo-300/30"}`}
        />
        <div
          className={`absolute top-[30%] -right-[20%] w-[65%] h-[65%] rounded-full blur-[130px] animate-blob animation-delay-2000 ${isDark ? "bg-purple-900/15" : "bg-purple-300/25"}`}
        />
        <div
          className={`absolute -bottom-[30%] left-[15%] w-[70%] h-[70%] rounded-full blur-[130px] animate-blob animation-delay-4000 ${isDark ? "bg-cyan-900/12" : "bg-cyan-300/20"}`}
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* ---- Header ---- */}
        <header className={`sticky top-0 z-50 ${glass}`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
                <FileSearch className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className={`text-lg font-bold tracking-tight ${txt}`}>
                  PDF Analyzer Pro
                </h1>
                <p className={`text-[11px] tracking-wide ${txt3}`}>
                  Análise & Conversão Inteligente
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {state !== "idle" && (
                <button
                  onClick={reset}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer
                    ${isDark ? "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700"}`}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Novo</span>
                </button>
              )}

              <button
                onClick={toggleTheme}
                className={`p-2.5 rounded-xl transition-all duration-300 cursor-pointer
                  ${isDark ? "bg-white/5 hover:bg-white/10 text-yellow-400" : "bg-gray-100 hover:bg-gray-200 text-indigo-600"}`}
                aria-label="Alternar tema"
              >
                {isDark ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* ---- Main Content ---- */}
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
          {/* ==== IDLE STATE ==== */}
          {state === "idle" && (
            <div className="max-w-2xl mx-auto animate-fade-in-up">
              {/* Hero */}
              <div className="text-center mb-10">
                <div
                  className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-6
                  ${isDark ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-indigo-50 text-indigo-600 border border-indigo-200"}`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Análise inteligente de documentos PDF
                </div>
                <h2
                  className={`text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 leading-tight ${txt}`}
                >
                  Analise seus{" "}
                  <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    arquivos PDF
                  </span>
                </h2>
                <p className={`text-lg ${txt2} max-w-lg mx-auto`}>
                  Identifique o tipo, extraia campos e informações, e converta
                  PDFs digitalizados em texto nativo pesquisável.
                </p>
              </div>

              {/* Upload Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleFile(f);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`relative cursor-pointer rounded-3xl border-2 border-dashed p-12 sm:p-16 transition-all duration-300
                  ${glassCard}
                  ${
                    dragOver
                      ? "border-indigo-500 scale-[1.02] shadow-2xl shadow-indigo-500/20"
                      : isDark
                        ? "border-white/10 hover:border-indigo-400/50"
                        : "border-gray-300 hover:border-indigo-400"
                  }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />

                <div className="flex flex-col items-center gap-5">
                  <div
                    className={`p-6 rounded-2xl transition-all duration-300 animate-float
                      ${dragOver ? "bg-indigo-500/20" : isDark ? "bg-white/5" : "bg-indigo-50"}`}
                  >
                    <Upload
                      className={`w-10 h-10 ${dragOver ? "text-indigo-400" : isDark ? "text-indigo-400" : "text-indigo-500"}`}
                    />
                  </div>

                  <div className="text-center">
                    <p className={`text-xl font-semibold ${txt}`}>
                      {dragOver
                        ? "Solte o arquivo aqui"
                        : "Arraste seu PDF aqui"}
                    </p>
                    <p className={`mt-1.5 text-sm ${txt2}`}>
                      ou clique para selecionar um arquivo
                    </p>
                  </div>

                  <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium
                      ${isDark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500"}`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Processamento 100% local e seguro
                  </div>
                </div>
              </div>

              {/* Features grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
                {[
                  {
                    icon: FileSearch,
                    title: "Análise Completa",
                    desc: "Identifica tipo, campos e metadados",
                  },
                  {
                    icon: Zap,
                    title: "OCR Inteligente",
                    desc: "Converte imagens em texto nativo",
                  },
                  {
                    icon: Shield,
                    title: "100% Seguro",
                    desc: "Nenhum dado sai do seu navegador",
                  },
                ].map(({ icon: Icon, title, desc }) => (
                  <div
                    key={title}
                    className={`${glassCard} rounded-2xl p-5 text-center transition-all duration-300 hover:scale-105`}
                  >
                    <div
                      className={`w-10 h-10 mx-auto mb-3 rounded-xl flex items-center justify-center ${isDark ? "bg-indigo-500/10" : "bg-indigo-50"}`}
                    >
                      <Icon
                        className={`w-5 h-5 ${isDark ? "text-indigo-400" : "text-indigo-600"}`}
                      />
                    </div>
                    <p className={`text-sm font-semibold ${txt}`}>{title}</p>
                    <p className={`text-xs mt-1 ${txt3}`}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==== ANALYZING / CONVERTING STATE ==== */}
          {(state === "analyzing" || state === "converting") && (
            <div className="max-w-lg mx-auto text-center animate-scale-in">
              <div className={`${glassCard} rounded-3xl p-12`}>
                <div className="relative w-28 h-28 mx-auto mb-6">
                  <Loader2
                    className={`w-28 h-28 animate-spin ${isDark ? "text-indigo-400/30" : "text-indigo-200"}`}
                    strokeWidth={1.5}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-xl font-bold ${txt}`}>
                      {Math.round(progress)}%
                    </span>
                  </div>
                </div>

                <h3 className={`text-xl font-bold mb-2 ${txt}`}>
                  {state === "analyzing"
                    ? "Analisando PDF..."
                    : "Convertendo com OCR..."}
                </h3>
                <p className={`text-sm mb-6 ${txt2}`}>{progressMsg}</p>

                <div
                  className={`h-2.5 rounded-full overflow-hidden ${isDark ? "bg-gray-700/50" : "bg-gray-200"}`}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {state === "converting" && (
                  <p className={`text-xs mt-4 ${txt3}`}>
                    💡 O OCR pode levar alguns minutos dependendo do tamanho do
                    documento
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ==== ERROR STATE ==== */}
          {state === "error" && (
            <div className="max-w-lg mx-auto text-center animate-scale-in">
              <div className={`${glassCard} rounded-3xl p-12`}>
                <div
                  className={`w-20 h-20 mx-auto mb-5 rounded-2xl flex items-center justify-center ${isDark ? "bg-red-500/10" : "bg-red-50"}`}
                >
                  <XCircle className="w-10 h-10 text-red-500" />
                </div>
                <h3 className={`text-xl font-bold mb-2 ${txt}`}>
                  Ops! Algo deu errado
                </h3>
                <p className={`text-sm mb-6 ${txt2}`}>{error}</p>
                <button
                  onClick={reset}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium
                    hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 hover:scale-105 cursor-pointer"
                >
                  Tentar Novamente
                </button>
              </div>
            </div>
          )}

          {/* ==== RESULTS STATE ==== */}
          {(state === "analyzed" || state === "converted") && analysis && (
            <div ref={resultsRef} className="space-y-6">
              {/* ---- Top 3 cards ---- */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Type Card */}
                <div
                  className={`${glassCard} rounded-2xl p-6 animate-fade-in-up`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className={`text-xs font-medium uppercase tracking-wider ${txt3}`}>
                        Tipo de PDF
                      </p>
                      <h3 className={`text-2xl font-bold mt-1.5 ${txt}`}>
                        {typeConfig[analysis.pdfType].label}
                      </h3>
                    </div>
                    <div
                      className={`p-3 rounded-xl ${typeConfig[analysis.pdfType].bgClass}`}
                    >
                      {typeConfig[analysis.pdfType].icon}
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-2 text-sm ${typeConfig[analysis.pdfType].colorClass}`}
                  >
                    {analysis.pdfType === "native-text" ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : analysis.pdfType === "scanned-image" ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <Info className="w-4 h-4" />
                    )}
                    <span className="font-medium">
                      {typeConfig[analysis.pdfType].sublabel}
                    </span>
                  </div>
                </div>

                {/* Suitability Gauge */}
                <div
                  className={`${glassCard} rounded-2xl p-6 flex items-center animate-fade-in-up animation-delay-200`}
                >
                  <SuitabilityGauge
                    score={analysis.suitability.score}
                    level={analysis.suitability.level}
                    isDark={isDark}
                  />
                </div>

                {/* Stats Card */}
                <div
                  className={`${glassCard} rounded-2xl p-6 animate-fade-in-up animation-delay-400`}
                >
                  <p className={`text-xs font-medium uppercase tracking-wider mb-4 ${txt3}`}>
                    Estatísticas
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      {
                        icon: Layers,
                        label: "Páginas",
                        value: analysis.pageCount.toString(),
                      },
                      {
                        icon: Type,
                        label: "Palavras",
                        value: analysis.totalWords.toLocaleString("pt-BR"),
                      },
                      {
                        icon: BarChart3,
                        label: "Caracteres",
                        value: analysis.totalCharacters.toLocaleString("pt-BR"),
                      },
                      {
                        icon: FileText,
                        label: "Tamanho",
                        value: formatFileSize(analysis.fileSize),
                      },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                            ${isDark ? "bg-white/5" : "bg-gray-100"}`}
                        >
                          <Icon
                            className={`w-4 h-4 ${isDark ? "text-indigo-400" : "text-indigo-500"}`}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-[10px] uppercase tracking-wider ${txt3}`}>
                            {label}
                          </p>
                          <p className={`text-sm font-bold truncate ${txt}`}>
                            {value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ---- Conversion CTA ---- */}
              {(analysis.pdfType === "scanned-image" ||
                analysis.pdfType === "mixed") &&
                state !== "converted" && (
                  <div
                    className={`animate-fade-in-up animation-delay-200 rounded-2xl p-6 border-2
                      ${isDark ? "border-indigo-500/30 bg-indigo-500/5 backdrop-blur-xl" : "border-indigo-200 bg-indigo-50/60 backdrop-blur-xl"}`}
                  >
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
                          <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className={`font-bold text-lg ${txt}`}>
                            Converter para Texto Nativo
                          </h3>
                          <p className={`text-sm ${txt2}`}>
                            Use reconhecimento óptico (OCR) para tornar o texto
                            pesquisável e extraível
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleConvert}
                        className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600
                          text-white font-semibold hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300
                          hover:scale-105 flex-shrink-0 cursor-pointer"
                      >
                        <Zap className="w-5 h-5" />
                        Converter com OCR
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

              {/* ---- Converted Success ---- */}
              {state === "converted" && convertedUrl && (
                <div
                  className={`animate-scale-in rounded-2xl p-6 border-2
                    ${isDark ? "border-emerald-500/30 bg-emerald-500/5 backdrop-blur-xl" : "border-emerald-200 bg-emerald-50/60 backdrop-blur-xl"}`}
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className={`font-bold text-lg ${txt}`}>
                          Conversão Concluída!
                        </h3>
                        <p className={`text-sm ${txt2}`}>
                          O PDF agora contém uma camada de texto nativo
                          pesquisável
                        </p>
                      </div>
                    </div>
                    <a
                      href={convertedUrl}
                      download={`${analysis.fileName.replace(/\.pdf$/i, "")}_texto_nativo.pdf`}
                      className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600
                        text-white font-semibold hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300
                        hover:scale-105 flex-shrink-0"
                    >
                      <Download className="w-5 h-5" />
                      Baixar PDF Convertido
                    </a>
                  </div>
                </div>
              )}

              {/* ---- Analysis + Metadata ---- */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Suitability Reasons */}
                <div
                  className={`${glassCard} rounded-2xl p-6 animate-fade-in-up animation-delay-400`}
                >
                  <h3
                    className={`text-base font-bold mb-4 flex items-center gap-2.5 ${txt}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? "bg-indigo-500/10" : "bg-indigo-50"}`}
                    >
                      <CheckCircle2
                        className={`w-4 h-4 ${isDark ? "text-indigo-400" : "text-indigo-600"}`}
                      />
                    </div>
                    Análise de Adequação
                  </h3>
                  <div className="space-y-2.5">
                    {analysis.suitability.reasons.map((r, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2.5 text-sm ${txt2}`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                            r.includes("NÃO") || r.includes("Nenhum")
                              ? "bg-red-500"
                              : r.includes("mistura") || r.includes("Parcial")
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                          }`}
                        />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                  {analysis.suitability.recommendations.length > 0 && (
                    <div
                      className={`mt-5 pt-5 border-t ${isDark ? "border-white/5" : "border-gray-200/80"}`}
                    >
                      <p
                        className={`text-xs font-semibold uppercase tracking-wider mb-3 ${txt3}`}
                      >
                        Recomendações
                      </p>
                      <div className="space-y-2">
                        {analysis.suitability.recommendations.map((r, i) => (
                          <div
                            key={i}
                            className={`flex items-start gap-2.5 text-sm ${txt2}`}
                          >
                            <ArrowRight
                              className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isDark ? "text-indigo-400" : "text-indigo-500"}`}
                            />
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div
                  className={`${glassCard} rounded-2xl p-6 animate-fade-in-up animation-delay-600`}
                >
                  <h3
                    className={`text-base font-bold mb-4 flex items-center gap-2.5 ${txt}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? "bg-indigo-500/10" : "bg-indigo-50"}`}
                    >
                      <Info
                        className={`w-4 h-4 ${isDark ? "text-indigo-400" : "text-indigo-600"}`}
                      />
                    </div>
                    Metadados do Documento
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(analysis.metadata).map(([key, value]) => (
                      <div
                        key={key}
                        className={`flex justify-between items-start gap-4 py-1.5 border-b last:border-0 ${isDark ? "border-white/5" : "border-gray-100"}`}
                      >
                        <span
                          className={`text-xs font-medium flex-shrink-0 ${txt3}`}
                        >
                          {key}
                        </span>
                        <span
                          className={`text-sm text-right font-medium truncate max-w-[60%] ${txt}`}
                          title={value}
                        >
                          {value}
                        </span>
                      </div>
                    ))}
                    <div
                      className={`flex justify-between items-start gap-4 py-1.5`}
                    >
                      <span
                        className={`text-xs font-medium flex-shrink-0 ${txt3}`}
                      >
                        Versão PDF
                      </span>
                      <span className={`text-sm text-right font-medium ${txt}`}>
                        {analysis.pdfVersion}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ---- Pages Overview ---- */}
              <div className={`${glassCard} rounded-2xl p-6 animate-fade-in-up animation-delay-600`}>
                <h3
                  className={`text-base font-bold mb-5 flex items-center gap-2.5 ${txt}`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? "bg-indigo-500/10" : "bg-indigo-50"}`}
                  >
                    <Layers
                      className={`w-4 h-4 ${isDark ? "text-indigo-400" : "text-indigo-600"}`}
                    />
                  </div>
                  Visão Geral das Páginas
                  <span
                    className={`ml-auto text-xs font-normal px-3 py-1 rounded-full ${isDark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500"}`}
                  >
                    {analysis.pageCount} página
                    {analysis.pageCount !== 1 ? "s" : ""}
                  </span>
                </h3>

                <div className="space-y-2.5">
                  {analysis.pages.map((page) => (
                    <div
                      key={page.pageNumber}
                      className={`rounded-xl transition-all duration-200
                        ${isDark ? "bg-white/[0.03] hover:bg-white/[0.06]" : "bg-gray-50/80 hover:bg-gray-100"}`}
                    >
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer select-none"
                        onClick={() => togglePage(page.pageNumber)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold
                              ${
                                page.hasText
                                  ? isDark
                                    ? "bg-emerald-500/15 text-emerald-400"
                                    : "bg-emerald-100 text-emerald-700"
                                  : isDark
                                    ? "bg-red-500/15 text-red-400"
                                    : "bg-red-100 text-red-700"
                              }`}
                          >
                            {page.pageNumber}
                          </div>
                          <div>
                            <p className={`text-sm font-semibold ${txt}`}>
                              Página {page.pageNumber}
                            </p>
                            <div
                              className={`flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs ${txt3}`}
                            >
                              <span>
                                {page.wordCount.toLocaleString("pt-BR")} palavras
                              </span>
                              <span>
                                {page.characterCount.toLocaleString("pt-BR")} chars
                              </span>
                              {page.hasImages && (
                                <span>
                                  {page.imageCount}{" "}
                                  {page.imageCount === 1
                                    ? "imagem"
                                    : "imagens"}
                                </span>
                              )}
                              <span>
                                {page.width}×{page.height} mm
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {page.hasText && (
                            <span
                              className={`hidden sm:inline-flex text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider
                                ${isDark ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-100 text-emerald-700"}`}
                            >
                              Texto
                            </span>
                          )}
                          {page.hasImages && (
                            <span
                              className={`hidden sm:inline-flex text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider
                                ${isDark ? "bg-blue-500/15 text-blue-400" : "bg-blue-100 text-blue-700"}`}
                            >
                              Imagens
                            </span>
                          )}
                          {!page.hasText && !page.hasImages && (
                            <span
                              className={`hidden sm:inline-flex text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider
                                ${isDark ? "bg-gray-500/15 text-gray-400" : "bg-gray-200 text-gray-600"}`}
                            >
                              Vazio
                            </span>
                          )}
                          <ChevronRight
                            className={`w-4 h-4 transition-transform duration-200 ${txt3}
                              ${expandedPages.has(page.pageNumber) ? "rotate-90" : ""}`}
                          />
                        </div>
                      </div>

                      {expandedPages.has(page.pageNumber) && (
                        <div
                          className={`px-4 pb-4 pt-0 animate-fade-in-up`}
                          style={{ animationDuration: "0.3s" }}
                        >
                          <div
                            className={`border-t pt-3 ${isDark ? "border-white/5" : "border-gray-200/80"}`}
                          >
                            {page.textPreview ? (
                              <>
                                <p
                                  className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${txt3}`}
                                >
                                  Preview do conteúdo
                                </p>
                                <p
                                  className={`text-sm leading-relaxed ${txt2} whitespace-pre-wrap break-words`}
                                >
                                  {page.textPreview}
                                </p>
                              </>
                            ) : (
                              <p className={`text-sm italic ${txt3}`}>
                                {page.hasImages
                                  ? "Esta página contém apenas imagem(ns) — texto não detectável sem OCR"
                                  : "Nenhum conteúdo detectado nesta página"}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ---- File Info Footer ---- */}
              <div className={`${glassCard} rounded-2xl p-4`}>
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                  {[
                    { icon: FileText, text: analysis.fileName },
                    { icon: BarChart3, text: formatFileSize(analysis.fileSize) },
                    {
                      icon: Clock,
                      text:
                        analysis.metadata["Data de Criação"] !== "N/A"
                          ? analysis.metadata["Data de Criação"]
                          : "Data desconhecida",
                    },
                    {
                      icon: Layers,
                      text: `${analysis.pageCount} página${analysis.pageCount !== 1 ? "s" : ""}`,
                    },
                  ].map(({ icon: Icon, text }, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 text-xs ${txt3}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[200px]">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ---- Footer ---- */}
        <footer
          className={`mt-auto py-4 text-center text-xs ${txt3}`}
        >
          PDF Analyzer Pro — Processamento 100% local e seguro
        </footer>
      </div>
    </div>
  );
}
