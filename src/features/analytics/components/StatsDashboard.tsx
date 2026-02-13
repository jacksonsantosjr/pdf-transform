/* ================================================================
   STATS DASHBOARD — Gráficos Visuais & Métricas Detalhadas
   ================================================================ */

import { useState, useMemo } from "react";
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Type,
  Image,
  Hash,
  Eye,
  EyeOff,
  Activity,
  Maximize2,
  AlignLeft,
} from "lucide-react";

/* ---- Types ---- */

import { PageInfo } from "../../pdf-analysis/types/pdfAnalysis.types";
import { FieldType } from "../../field-extraction/utils/fieldExtractor";

interface StatsDashboardProps {
  pages: PageInfo[];
  totalCharacters: number;
  totalWords: number;
  fileSize: number;
  pageCount: number;
  hasText: boolean;
  hasImages: boolean;
  pdfType: string;
  extractionSummary: Record<FieldType, number> | null;
  isDark: boolean;
  glassCard: string;
  txt: string;
  txt2: string;
  txt3: string;
}

/* ---- Helper ---- */

function formatNumber(n: number): string {
  return n.toLocaleString("pt-BR");
}

/* ================================================================
   ANIMATED BAR COMPONENT
   ================================================================ */

function AnimatedBar({
  value,
  maxValue,
  label,
  sublabel,
  color,
  isDark,
  txt,
  txt3,
  index,
}: {
  value: number;
  maxValue: number;
  label: string;
  sublabel?: string;
  color: string;
  isDark: boolean;
  txt: string;
  txt3: string;
  index: number;
}) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div
      className="animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-sm font-medium truncate ${txt}`}>{label}</span>
          {sublabel && (
            <span className={`text-[10px] ${txt3}`}>{sublabel}</span>
          )}
        </div>
        <span className={`text-sm font-bold tabular-nums ${txt}`}>
          {formatNumber(value)}
        </span>
      </div>
      <div
        className={`h-3 rounded-full overflow-hidden ${isDark ? "bg-white/[0.06]" : "bg-gray-100"}`}
      >
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${Math.max(pct, 1)}%`,
            background: color,
            animationDelay: `${index * 60 + 200}ms`,
          }}
        />
      </div>
    </div>
  );
}

/* ================================================================
   DONUT CHART COMPONENT (Pure SVG)
   ================================================================ */

function DonutChart({
  segments,
  centerLabel,
  centerValue,
  isDark,
  txt,
  txt3,
  size = 160,
}: {
  segments: { label: string; value: number; color: string }[];
  centerLabel: string;
  centerValue: string;
  isDark: boolean;
  txt: string;
  txt3: string;
  size?: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span className={`text-sm ${txt3}`}>Sem dados</span>
      </div>
    );
  }

  const r = 54;
  const circumference = 2 * Math.PI * r;
  let accumulated = 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
          {/* Background ring */}
          <circle
            cx="64"
            cy="64"
            r={r}
            strokeWidth="16"
            fill="none"
            className={isDark ? "stroke-gray-800/50" : "stroke-gray-100"}
          />
          {/* Segments */}
          {segments.map((seg, i) => {
            const pct = seg.value / total;
            const dashLen = circumference * pct;
            const dashOffset = circumference * accumulated;
            accumulated += pct;

            return (
              <circle
                key={i}
                cx="64"
                cy="64"
                r={r}
                strokeWidth="16"
                fill="none"
                stroke={seg.color}
                strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                strokeDashoffset={-dashOffset}
                strokeLinecap="butt"
                className="transition-all duration-1000 ease-out"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            );
          })}
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${txt}`}>{centerValue}</span>
          <span className={`text-[10px] ${txt3}`}>{centerLabel}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className={`text-[11px] font-medium ${txt3}`}>
              {seg.label}
              <span className={`ml-1 font-bold ${txt}`}>{seg.value}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   PAGE HEATMAP COMPONENT
   ================================================================ */

function PageHeatmap({
  pages,
  metric,
  isDark,
  txt3,
}: {
  pages: PageInfo[];
  metric: "words" | "characters" | "images";
  isDark: boolean;
  txt?: string;
  txt3: string;
}) {
  const values = pages.map((p) =>
    metric === "words"
      ? p.wordCount
      : metric === "characters"
        ? p.characterCount
        : p.imageCount
  );
  const maxVal = Math.max(...values, 1);

  const metricLabel =
    metric === "words"
      ? "Palavras"
      : metric === "characters"
        ? "Caracteres"
        : "Imagens";

  function getHeatColor(val: number): string {
    const intensity = val / maxVal;
    if (isDark) {
      if (intensity === 0) return "rgba(255,255,255,0.03)";
      if (intensity < 0.25) return "rgba(99,102,241,0.15)";
      if (intensity < 0.5) return "rgba(99,102,241,0.3)";
      if (intensity < 0.75) return "rgba(99,102,241,0.5)";
      return "rgba(99,102,241,0.75)";
    } else {
      if (intensity === 0) return "rgba(0,0,0,0.03)";
      if (intensity < 0.25) return "rgba(99,102,241,0.1)";
      if (intensity < 0.5) return "rgba(99,102,241,0.25)";
      if (intensity < 0.75) return "rgba(99,102,241,0.45)";
      return "rgba(99,102,241,0.7)";
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className={`text-xs font-semibold uppercase tracking-wider ${txt3}`}>
          Mapa de Calor — {metricLabel} por Página
        </p>
        <p className={`text-[10px] ${txt3}`}>
          Máx: {formatNumber(maxVal)}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {pages.map((page, i) => {
          const val = values[i];
          return (
            <div
              key={page.pageNumber}
              className="relative group cursor-default"
              title={`Pág. ${page.pageNumber}: ${formatNumber(val)} ${metricLabel.toLowerCase()}`}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all duration-200 hover:scale-110"
                style={{ backgroundColor: getHeatColor(val) }}
              >
                <span
                  className={
                    val / maxVal > 0.5
                      ? "text-white"
                      : isDark
                        ? "text-gray-400"
                        : "text-gray-600"
                  }
                >
                  {page.pageNumber}
                </span>
              </div>

              {/* Tooltip */}
              <div
                className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap z-50
                  opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150
                  ${isDark ? "bg-gray-800 text-white shadow-xl border border-white/10" : "bg-white text-gray-900 shadow-xl border border-gray-200"}`}
              >
                <div className="font-bold">Pág. {page.pageNumber}</div>
                <div>{formatNumber(val)} {metricLabel.toLowerCase()}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Scale legend */}
      <div className="flex items-center gap-2 mt-3">
        <span className={`text-[10px] ${txt3}`}>Menos</span>
        <div className="flex gap-0.5">
          {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
            <div
              key={i}
              className="w-5 h-3 rounded-sm"
              style={{
                backgroundColor: isDark
                  ? intensity === 0
                    ? "rgba(255,255,255,0.03)"
                    : `rgba(99,102,241,${intensity * 0.75})`
                  : intensity === 0
                    ? "rgba(0,0,0,0.03)"
                    : `rgba(99,102,241,${intensity * 0.7})`,
              }}
            />
          ))}
        </div>
        <span className={`text-[10px] ${txt3}`}>Mais</span>
      </div>
    </div>
  );
}

/* ================================================================
   MINI STAT CARD
   ================================================================ */

function MiniStat({
  icon: Icon,
  label,
  value,
  sub,
  color,
  isDark,
  txt,
  txt3,
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: string;
  sub?: string;
  color: string;
  isDark: boolean;
  txt: string;
  txt3: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 hover:scale-[1.02]
        ${isDark ? "bg-white/[0.03] hover:bg-white/[0.06]" : "bg-gray-50/80 hover:bg-gray-100"}`}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}18` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className={`text-[10px] uppercase tracking-wider font-medium ${txt3}`}>
          {label}
        </p>
        <p className={`text-lg font-bold leading-tight ${txt}`}>{value}</p>
        {sub && <p className={`text-[10px] ${txt3}`}>{sub}</p>}
      </div>
    </div>
  );
}

/* ================================================================
   EXTRACTED FIELDS MINI CHART
   ================================================================ */

function FieldsBarChart({
  summary,
  isDark,
  txt,
  txt3,
}: {
  summary: Record<FieldType, number>;
  isDark: boolean;
  txt: string;
  txt3: string;
}) {
  const items = [
    { label: "CPF", value: summary.cpf, color: "#3b82f6", icon: "🪪" },
    { label: "CNPJ", value: summary.cnpj, color: "#a855f7", icon: "🏢" },
    { label: "E-mail", value: summary.email, color: "#10b981", icon: "📧" },
    { label: "Telefone", value: summary.telefone, color: "#f59e0b", icon: "📞" },
    { label: "Data", value: summary.data, color: "#06b6d4", icon: "📅" },
    { label: "Valor", value: summary.valor_monetario, color: "#22c55e", icon: "💰" },
    { label: "URL", value: summary.url, color: "#6366f1", icon: "🔗" },
  ].filter((item) => item.value > 0);

  if (items.length === 0) {
    return (
      <div className={`text-center py-6 ${txt3}`}>
        <Hash className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Nenhum campo estruturado detectado</p>
      </div>
    );
  }

  const maxVal = Math.max(...items.map((i) => i.value));

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={item.label} className="animate-fade-in-up" style={{ animationDelay: `${idx * 80}ms` }}>
          <div className="flex items-center gap-2.5">
            <span className="text-base w-6 text-center">{item.icon}</span>
            <span className={`text-xs font-medium w-16 ${txt}`}>{item.label}</span>
            <div className={`flex-1 h-5 rounded-full overflow-hidden ${isDark ? "bg-white/[0.06]" : "bg-gray-100"}`}>
              <div
                className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-1000 ease-out"
                style={{
                  width: `${Math.max((item.value / maxVal) * 100, 8)}%`,
                  background: `linear-gradient(90deg, ${item.color}90, ${item.color})`,
                }}
              >
                <span className="text-[10px] font-bold text-white drop-shadow-sm">
                  {item.value}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================================================================
   CONTENT DISTRIBUTION BAR (Stacked horizontal bar)
   ================================================================ */

function ContentDistributionBar({
  textPages,
  imagePages,
  mixedPages,
  emptyPages,
  total,
  isDark,
  txt3,
}: {
  textPages: number;
  imagePages: number;
  mixedPages: number;
  emptyPages: number;
  total: number;
  isDark: boolean;
  txt3: string;
  txt?: string;
}) {
  if (total === 0) return null;

  const segments = [
    { label: "Texto", value: textPages, color: "#10b981" },
    { label: "Misto", value: mixedPages, color: "#f59e0b" },
    { label: "Imagem", value: imagePages, color: "#ef4444" },
    { label: "Vazio", value: emptyPages, color: isDark ? "#374151" : "#d1d5db" },
  ].filter((s) => s.value > 0);

  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${txt3}`}>
        Distribuição de Conteúdo por Página
      </p>

      {/* Stacked bar */}
      <div className={`h-8 rounded-full overflow-hidden flex ${isDark ? "bg-white/[0.04]" : "bg-gray-100"}`}>
        {segments.map((seg, i) => (
          <div
            key={i}
            className="h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-1000 ease-out relative group"
            style={{
              width: `${(seg.value / total) * 100}%`,
              backgroundColor: seg.color,
              minWidth: seg.value > 0 ? "24px" : "0",
            }}
          >
            {(seg.value / total) * 100 > 10 && <span>{seg.value}</span>}

            {/* Tooltip */}
            <div
              className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap z-50
                opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150
                ${isDark ? "bg-gray-800 text-white shadow-xl border border-white/10" : "bg-white text-gray-900 shadow-xl border border-gray-200"}`}
            >
              {seg.label}: {seg.value} página{seg.value !== 1 ? "s" : ""} ({Math.round((seg.value / total) * 100)}%)
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: seg.color }}
            />
            <span className={`text-[11px] ${txt3}`}>
              {seg.label} ({seg.value})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   TOP 5 PAGES RANKING
   ================================================================ */

function TopPagesRanking({
  pages,
  metric,
  isDark,
  txt,
  txt3,
}: {
  pages: PageInfo[];
  metric: "words" | "characters";
  isDark: boolean;
  txt: string;
  txt3: string;
}) {
  const sorted = [...pages]
    .sort((a, b) =>
      metric === "words"
        ? b.wordCount - a.wordCount
        : b.characterCount - a.characterCount
    )
    .slice(0, 5);

  const maxVal =
    sorted.length > 0
      ? metric === "words"
        ? sorted[0].wordCount
        : sorted[0].characterCount
      : 1;

  const metricLabel = metric === "words" ? "palavras" : "caracteres";
  const medals = ["🥇", "🥈", "🥉", "4°", "5°"];

  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${txt3}`}>
        Top 5 Páginas — Mais {metricLabel}
      </p>
      <div className="space-y-2">
        {sorted.map((page, i) => {
          const val =
            metric === "words" ? page.wordCount : page.characterCount;
          const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;

          return (
            <div key={page.pageNumber} className="flex items-center gap-2.5">
              <span className="text-sm w-6 text-center flex-shrink-0">
                {medals[i]}
              </span>
              <span
                className={`text-xs font-semibold w-14 flex-shrink-0 ${txt}`}
              >
                Pág. {page.pageNumber}
              </span>
              <div
                className={`flex-1 h-5 rounded-full overflow-hidden ${isDark ? "bg-white/[0.06]" : "bg-gray-100"}`}
              >
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${Math.max(pct, 3)}%`,
                    background:
                      i === 0
                        ? "linear-gradient(90deg, #f59e0b, #f97316)"
                        : i === 1
                          ? "linear-gradient(90deg, #9ca3af, #6b7280)"
                          : i === 2
                            ? "linear-gradient(90deg, #b45309, #92400e)"
                            : isDark
                              ? "rgba(99,102,241,0.4)"
                              : "rgba(99,102,241,0.3)",
                  }}
                />
              </div>
              <span
                className={`text-xs font-bold tabular-nums w-16 text-right ${txt}`}
              >
                {formatNumber(val)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================
   WORD DENSITY CHART (Words per page line-like visualization)
   ================================================================ */

function WordDensityChart({
  pages,
  isDark,
  txt3,
}: {
  pages: PageInfo[];
  isDark: boolean;
  txt?: string;
  txt3: string;
}) {
  const maxWords = Math.max(...pages.map((p) => p.wordCount), 1);
  const avgWords =
    pages.length > 0
      ? Math.round(
        pages.reduce((s, p) => s + p.wordCount, 0) / pages.length
      )
      : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className={`text-xs font-semibold uppercase tracking-wider ${txt3}`}>
          Densidade de Palavras por Página
        </p>
        <div className="flex items-center gap-1.5">
          <div
            className="w-6 h-0.5 rounded"
            style={{
              background: isDark
                ? "rgba(245,158,11,0.6)"
                : "rgba(245,158,11,0.8)",
            }}
          />
          <span className={`text-[10px] ${txt3}`}>
            Média: {formatNumber(avgWords)}
          </span>
        </div>
      </div>

      <div className="relative">
        {/* Chart area */}
        <div
          className={`flex items-end gap-[2px] h-32 p-2 rounded-xl ${isDark ? "bg-white/[0.02]" : "bg-gray-50"}`}
        >
          {pages.map((page) => {
            const heightPct = maxWords > 0 ? (page.wordCount / maxWords) * 100 : 0;
            return (
              <div
                key={page.pageNumber}
                className="flex-1 flex flex-col items-center justify-end h-full group relative"
              >
                <div
                  className="w-full rounded-t-sm transition-all duration-700 ease-out min-h-[2px] hover:opacity-80"
                  style={{
                    height: `${Math.max(heightPct, 1.5)}%`,
                    background: page.hasText
                      ? page.hasImages
                        ? "linear-gradient(180deg, #f59e0b, #d97706)"
                        : "linear-gradient(180deg, #6366f1, #4f46e5)"
                      : page.hasImages
                        ? "linear-gradient(180deg, #ef4444, #dc2626)"
                        : isDark
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(0,0,0,0.08)",
                  }}
                />

                {/* Tooltip */}
                <div
                  className={`absolute bottom-full mb-1 px-2 py-1 rounded-md text-[9px] font-medium whitespace-nowrap z-50
                    opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150
                    ${isDark ? "bg-gray-800 text-white border border-white/10" : "bg-white text-gray-900 border border-gray-200"} shadow-lg`}
                >
                  P.{page.pageNumber}: {formatNumber(page.wordCount)} palavras
                </div>
              </div>
            );
          })}
        </div>

        {/* Average line */}
        {avgWords > 0 && (
          <div
            className="absolute left-2 right-2 border-t border-dashed pointer-events-none"
            style={{
              bottom: `${(avgWords / maxWords) * 128 + 8}px`,
              borderColor: isDark
                ? "rgba(245,158,11,0.4)"
                : "rgba(245,158,11,0.6)",
            }}
          />
        )}
      </div>

      {/* X-axis labels (show some page numbers) */}
      {pages.length > 1 && (
        <div className="flex justify-between px-2 mt-1">
          <span className={`text-[9px] ${txt3}`}>1</span>
          {pages.length > 2 && (
            <span className={`text-[9px] ${txt3}`}>
              {Math.ceil(pages.length / 2)}
            </span>
          )}
          <span className={`text-[9px] ${txt3}`}>{pages.length}</span>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
          <span className={`text-[10px] ${txt3}`}>Texto</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
          <span className={`text-[10px] ${txt3}`}>Misto</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-red-500" />
          <span className={`text-[10px] ${txt3}`}>Imagem</span>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   MAIN STATS DASHBOARD COMPONENT
   ================================================================ */

export function StatsDashboard({
  pages,
  totalCharacters,
  totalWords,
  fileSize,
  pageCount,
  pdfType,
  extractionSummary,
  isDark,
  glassCard,
  txt,
  txt3,
}: StatsDashboardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [heatmapMetric, setHeatmapMetric] = useState<
    "words" | "characters" | "images"
  >("words");
  const [rankMetric, setRankMetric] = useState<"words" | "characters">("words");

  /* ---- Computed stats ---- */

  const stats = useMemo(() => {
    const textPages = pages.filter((p) => p.hasText && !p.hasImages).length;
    const imageOnlyPages = pages.filter(
      (p) => !p.hasText && p.hasImages
    ).length;
    const mixedPages = pages.filter((p) => p.hasText && p.hasImages).length;
    const emptyPages = pages.filter(
      (p) => !p.hasText && !p.hasImages
    ).length;

    const avgWordsPerPage =
      pageCount > 0 ? Math.round(totalWords / pageCount) : 0;
    const avgCharsPerPage =
      pageCount > 0 ? Math.round(totalCharacters / pageCount) : 0;

    const totalImages = pages.reduce((s, p) => s + p.imageCount, 0);

    const maxWordsPage = pages.reduce(
      (max, p) => (p.wordCount > max.wordCount ? p : max),
      pages[0]
    );
    const minWordsPage = pages.reduce(
      (min, p) => (p.wordCount < min.wordCount ? p : min),
      pages[0]
    );

    const textDensity =
      pageCount > 0
        ? Math.round((pages.filter((p) => p.hasText).length / pageCount) * 100)
        : 0;

    // Estimated reading time (200 words per minute)
    const readingTimeMin = Math.max(1, Math.round(totalWords / 200));

    // Average page size
    const avgWidth = pages.length > 0
      ? Math.round(pages.reduce((s, p) => s + p.width, 0) / pages.length)
      : 0;
    const avgHeight = pages.length > 0
      ? Math.round(pages.reduce((s, p) => s + p.height, 0) / pages.length)
      : 0;

    // File efficiency (bytes per word)
    const bytesPerWord = totalWords > 0 ? Math.round(fileSize / totalWords) : 0;

    return {
      textPages,
      imageOnlyPages,
      mixedPages,
      emptyPages,
      avgWordsPerPage,
      avgCharsPerPage,
      totalImages,
      maxWordsPage,
      minWordsPage,
      textDensity,
      readingTimeMin,
      avgWidth,
      avgHeight,
      bytesPerWord,
    };
  }, [pages, totalWords, totalCharacters, pageCount, fileSize]);

  /* ---- Page type donut data ---- */

  const pageTypeSegments = [
    { label: "Texto", value: stats.textPages, color: "#10b981" },
    { label: "Misto", value: stats.mixedPages, color: "#f59e0b" },
    { label: "Imagem", value: stats.imageOnlyPages, color: "#ef4444" },
    { label: "Vazio", value: stats.emptyPages, color: isDark ? "#4b5563" : "#9ca3af" },
  ].filter((s) => s.value > 0);

  /* ---- Content composition donut ---- */

  const contentSegments = [
    { label: "Palavras", value: totalWords, color: "#6366f1" },
    { label: "Imagens", value: stats.totalImages, color: "#f59e0b" },
  ].filter((s) => s.value > 0);

  return (
    <div
      className={`${glassCard} rounded-2xl overflow-hidden animate-fade-in-up animation-delay-400`}
    >
      {/* Header - always visible */}
      <div
        className="flex items-center justify-between p-6 cursor-pointer select-none"
        onClick={() => setIsExpanded((e) => !e)}
      >
        <h3
          className={`text-base font-bold flex items-center gap-2.5 ${txt}`}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          Dashboard de Estatísticas
          <span
            className={`text-xs font-normal px-2.5 py-1 rounded-full
              ${isDark ? "bg-cyan-500/15 text-cyan-400" : "bg-cyan-100 text-cyan-700"}`}
          >
            {pageCount} página{pageCount !== 1 ? "s" : ""} analisada{pageCount !== 1 ? "s" : ""}
          </span>
        </h3>

        <div
          className={`p-2 rounded-lg transition-all
            ${isDark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500"}`}
        >
          {isExpanded ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-6 pb-6 space-y-6 animate-fade-in-up" style={{ animationDuration: "0.3s" }}>
          {/* ---- Row 1: Mini stat cards ---- */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MiniStat
              icon={Type}
              label="Total Palavras"
              value={formatNumber(totalWords)}
              sub={`~${stats.avgWordsPerPage}/pág`}
              color="#6366f1"
              isDark={isDark}
              txt={txt}
              txt3={txt3}
            />
            <MiniStat
              icon={Hash}
              label="Caracteres"
              value={formatNumber(totalCharacters)}
              sub={`~${formatNumber(stats.avgCharsPerPage)}/pág`}
              color="#8b5cf6"
              isDark={isDark}
              txt={txt}
              txt3={txt3}
            />
            <MiniStat
              icon={Image}
              label="Imagens"
              value={formatNumber(stats.totalImages)}
              sub={`em ${pages.filter((p) => p.hasImages).length} pág.`}
              color="#f59e0b"
              isDark={isDark}
              txt={txt}
              txt3={txt3}
            />
            <MiniStat
              icon={Activity}
              label="Densidade Texto"
              value={`${stats.textDensity}%`}
              sub={`${pages.filter((p) => p.hasText).length} de ${pageCount} pág.`}
              color="#10b981"
              isDark={isDark}
              txt={txt}
              txt3={txt3}
            />
            <MiniStat
              icon={AlignLeft}
              label="Tempo Leitura"
              value={stats.readingTimeMin < 60 ? `${stats.readingTimeMin} min` : `${Math.round(stats.readingTimeMin / 60)}h ${stats.readingTimeMin % 60}min`}
              sub="~200 palavras/min"
              color="#06b6d4"
              isDark={isDark}
              txt={txt}
              txt3={txt3}
            />
            <MiniStat
              icon={Maximize2}
              label="Formato Médio"
              value={`${stats.avgWidth}×${stats.avgHeight}`}
              sub="milímetros"
              color="#ec4899"
              isDark={isDark}
              txt={txt}
              txt3={txt3}
            />
          </div>

          {/* ---- Row 2: Donut Charts + Content Distribution ---- */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Page Type Donut */}
            <div
              className={`p-5 rounded-xl ${isDark ? "bg-white/[0.02]" : "bg-gray-50/60"}`}
            >
              <div className="flex items-center gap-2 mb-4">
                <PieChart
                  className={`w-4 h-4 ${isDark ? "text-cyan-400" : "text-cyan-600"}`}
                />
                <p
                  className={`text-xs font-semibold uppercase tracking-wider ${txt3}`}
                >
                  Tipo de Página
                </p>
              </div>
              <DonutChart
                segments={pageTypeSegments}
                centerLabel="Páginas"
                centerValue={pageCount.toString()}
                isDark={isDark}
                txt={txt}
                txt3={txt3}
                size={150}
              />
            </div>

            {/* Content Composition Donut */}
            <div
              className={`p-5 rounded-xl ${isDark ? "bg-white/[0.02]" : "bg-gray-50/60"}`}
            >
              <div className="flex items-center gap-2 mb-4">
                <PieChart
                  className={`w-4 h-4 ${isDark ? "text-indigo-400" : "text-indigo-600"}`}
                />
                <p
                  className={`text-xs font-semibold uppercase tracking-wider ${txt3}`}
                >
                  Composição do Conteúdo
                </p>
              </div>
              <DonutChart
                segments={contentSegments}
                centerLabel="Elementos"
                centerValue={formatNumber(totalWords + stats.totalImages)}
                isDark={isDark}
                txt={txt}
                txt3={txt3}
                size={150}
              />
            </div>

            {/* Content Distribution Stacked Bar */}
            <div
              className={`p-5 rounded-xl ${isDark ? "bg-white/[0.02]" : "bg-gray-50/60"}`}
            >
              <ContentDistributionBar
                textPages={stats.textPages}
                imagePages={stats.imageOnlyPages}
                mixedPages={stats.mixedPages}
                emptyPages={stats.emptyPages}
                total={pageCount}
                isDark={isDark}
                txt3={txt3}
              />

              {/* Extra stats below */}
              <div className={`mt-5 pt-4 border-t ${isDark ? "border-white/5" : "border-gray-200/60"}`}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className={`text-[10px] uppercase tracking-wider ${txt3}`}>
                      Página + densa
                    </p>
                    {stats.maxWordsPage && (
                      <p className={`text-sm font-bold ${txt}`}>
                        Pág. {stats.maxWordsPage.pageNumber}
                        <span className={`text-[10px] font-normal ml-1 ${txt3}`}>
                          ({formatNumber(stats.maxWordsPage.wordCount)} pal.)
                        </span>
                      </p>
                    )}
                  </div>
                  <div>
                    <p className={`text-[10px] uppercase tracking-wider ${txt3}`}>
                      Página - densa
                    </p>
                    {stats.minWordsPage && (
                      <p className={`text-sm font-bold ${txt}`}>
                        Pág. {stats.minWordsPage.pageNumber}
                        <span className={`text-[10px] font-normal ml-1 ${txt3}`}>
                          ({formatNumber(stats.minWordsPage.wordCount)} pal.)
                        </span>
                      </p>
                    )}
                  </div>
                  <div>
                    <p className={`text-[10px] uppercase tracking-wider ${txt3}`}>
                      Tipo de PDF
                    </p>
                    <p className={`text-sm font-bold ${txt}`}>
                      {pdfType === "native-text"
                        ? "Texto Nativo"
                        : pdfType === "scanned-image"
                          ? "Digitalizado"
                          : pdfType === "mixed"
                            ? "Misto"
                            : "Vazio"}
                    </p>
                  </div>
                  <div>
                    <p className={`text-[10px] uppercase tracking-wider ${txt3}`}>
                      Eficiência
                    </p>
                    <p className={`text-sm font-bold ${txt}`}>
                      {stats.bytesPerWord > 0
                        ? `${formatNumber(stats.bytesPerWord)} B/palavra`
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ---- Row 3: Word Density Chart ---- */}
          {pages.length > 1 && (
            <div
              className={`p-5 rounded-xl ${isDark ? "bg-white/[0.02]" : "bg-gray-50/60"}`}
            >
              <WordDensityChart
                pages={pages}
                isDark={isDark}
                txt={txt}
                txt3={txt3}
              />
            </div>
          )}

          {/* ---- Row 4: Heatmap + Top Pages + Fields Chart ---- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Heatmap */}
            <div
              className={`p-5 rounded-xl ${isDark ? "bg-white/[0.02]" : "bg-gray-50/60"}`}
            >
              {/* Metric selector */}
              <div className="flex items-center gap-2 mb-4">
                {(
                  [
                    { key: "words", label: "Palavras", icon: Type },
                    { key: "characters", label: "Caracteres", icon: Hash },
                    { key: "images", label: "Imagens", icon: Image },
                  ] as const
                ).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setHeatmapMetric(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer
                      ${heatmapMetric === key
                        ? isDark
                          ? "bg-indigo-500/20 text-indigo-400"
                          : "bg-indigo-100 text-indigo-700"
                        : isDark
                          ? "bg-white/5 text-gray-500 hover:text-gray-300"
                          : "bg-gray-100 text-gray-400 hover:text-gray-600"
                      }`}
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </button>
                ))}
              </div>

              <PageHeatmap
                pages={pages}
                metric={heatmapMetric}
                isDark={isDark}
                txt={txt}
                txt3={txt3}
              />
            </div>

            {/* Right Column: Top Pages or Fields Chart */}
            <div className="space-y-5">
              {/* Top Pages */}
              {pages.length > 1 && (
                <div
                  className={`p-5 rounded-xl ${isDark ? "bg-white/[0.02]" : "bg-gray-50/60"}`}
                >
                  {/* Metric selector */}
                  <div className="flex items-center gap-2 mb-1">
                    {(
                      [
                        { key: "words", label: "Palavras" },
                        { key: "characters", label: "Caracteres" },
                      ] as const
                    ).map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setRankMetric(key)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer
                          ${rankMetric === key
                            ? isDark
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-amber-100 text-amber-700"
                            : isDark
                              ? "text-gray-500 hover:text-gray-300"
                              : "text-gray-400 hover:text-gray-600"
                          }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <TopPagesRanking
                    pages={pages}
                    metric={rankMetric}
                    isDark={isDark}
                    txt={txt}
                    txt3={txt3}
                  />
                </div>
              )}

              {/* Extracted Fields Chart */}
              {extractionSummary && (
                <div
                  className={`p-5 rounded-xl ${isDark ? "bg-white/[0.02]" : "bg-gray-50/60"}`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp
                      className={`w-4 h-4 ${isDark ? "text-emerald-400" : "text-emerald-600"}`}
                    />
                    <p
                      className={`text-xs font-semibold uppercase tracking-wider ${txt3}`}
                    >
                      Campos Extraídos
                    </p>
                  </div>
                  <FieldsBarChart
                    summary={extractionSummary}
                    isDark={isDark}
                    txt={txt}
                    txt3={txt3}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ---- Row 5: Per-page word count bars ---- */}
          {pages.length > 1 && pages.length <= 50 && (
            <div
              className={`p-5 rounded-xl ${isDark ? "bg-white/[0.02]" : "bg-gray-50/60"}`}
            >
              <p
                className={`text-xs font-semibold uppercase tracking-wider mb-4 ${txt3}`}
              >
                Palavras por Página (Detalhado)
              </p>
              <div className="space-y-2.5">
                {pages.map((page, idx) => (
                  <AnimatedBar
                    key={page.pageNumber}
                    value={page.wordCount}
                    maxValue={
                      stats.maxWordsPage ? stats.maxWordsPage.wordCount : 1
                    }
                    label={`Página ${page.pageNumber}`}
                    sublabel={
                      page.hasImages
                        ? `📷 ${page.imageCount}`
                        : undefined
                    }
                    color={
                      page.hasText
                        ? page.hasImages
                          ? "linear-gradient(90deg, #f59e0b, #d97706)"
                          : "linear-gradient(90deg, #6366f1, #4f46e5)"
                        : "linear-gradient(90deg, #ef4444, #dc2626)"
                    }
                    isDark={isDark}
                    txt={txt}
                    txt3={txt3}
                    index={idx}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
