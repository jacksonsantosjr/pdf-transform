/* ================================================================
   PAGE PREVIEW — Renderização Visual das Páginas do PDF
   ================================================================ */

import { useState, useRef, useCallback, useEffect, memo } from "react";
import {
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Loader2,
  Grid3X3,
  Layers,
  RotateCw,
} from "lucide-react";

/* ---- Types ---- */

interface PagePreviewSectionProps {
  fileArrayBuffer: ArrayBuffer;
  pageCount: number;
  isDark: boolean;
  glassCard: string;
  txt: string;
  txt2: string;
  txt3: string;
  embedded?: boolean;
}

/* ---- Helper: Render a single PDF page to canvas ---- */

import { pdfjs } from "../../../utils/pdfWorker";

async function renderPageToCanvas(
  pdfData: ArrayBuffer,
  pageNum: number,
  scale: number,
  canvas: HTMLCanvasElement
): Promise<void> {
  if (!pdfjs) throw new Error("PDF.js não disponível");

  const pdf = await pdfjs.getDocument({ data: new Uint8Array(pdfData) }).promise;
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context não disponível");

  await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
}

/* ================================================================
   THUMBNAIL COMPONENT (for grid view)
   ================================================================ */

const PageThumbnail = memo(function PageThumbnail({
  pdfData,
  pageNum,
  isActive,
  isDark,
  onClick,
}: {
  pdfData: ArrayBuffer;
  pageNum: number;
  isActive: boolean;
  isDark: boolean;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    setLoading(true);
    setError(false);

    renderPageToCanvas(pdfData, pageNum, 0.5, canvas)
      .then(() => {
        if (!cancelled) setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
          setError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pdfData, pageNum]);

  return (
    <button
      onClick={onClick}
      className={`relative group rounded-xl overflow-hidden transition-all duration-300 cursor-pointer flex-shrink-0
        ${isActive
          ? "ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/20 scale-[1.02]"
          : isDark
            ? "ring-1 ring-white/10 hover:ring-indigo-400/40 hover:shadow-lg"
            : "ring-1 ring-gray-200 hover:ring-indigo-300 hover:shadow-lg"
        }`}
      title={`Página ${pageNum}`}
    >
      <div className={`relative w-full aspect-[3/4] ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain"
          style={{ display: loading || error ? "none" : "block" }}
        />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2
              className={`w-5 h-5 animate-spin ${isDark ? "text-indigo-400/50" : "text-indigo-300"}`}
            />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>Erro</span>
          </div>
        )}
      </div>

      {/* Page number badge */}
      <div
        className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold
          ${isActive
            ? "bg-indigo-500 text-white"
            : isDark
              ? "bg-black/60 text-white/80"
              : "bg-white/90 text-gray-700 shadow-sm"
          }`}
      >
        {pageNum}
      </div>

      {/* Hover overlay */}
      <div
        className={`absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200
          ${isDark ? "bg-black/30" : "bg-black/10"}`}
      >
        <Eye className="w-5 h-5 text-white drop-shadow-lg" />
      </div>
    </button>
  );
});

/* ================================================================
   FULL PAGE VIEWER COMPONENT
   ================================================================ */

function FullPageViewer({
  pdfData,
  pageNum,
  totalPages,
  isDark,
  scale,
  onPageChange,
  onScaleChange,
  onClose,
}: {
  pdfData: ArrayBuffer;
  pageNum: number;
  totalPages: number;
  isDark: boolean;
  scale: number;
  onPageChange: (page: number) => void;
  onScaleChange: (scale: number) => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    setLoading(true);

    renderPageToCanvas(pdfData, pageNum, scale, canvas)
      .then(() => {
        if (!cancelled) setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pdfData, pageNum, scale]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && pageNum > 1) onPageChange(pageNum - 1);
      if (e.key === "ArrowRight" && pageNum < totalPages) onPageChange(pageNum + 1);
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") onScaleChange(Math.min(scale + 0.25, 4));
      if (e.key === "-") onScaleChange(Math.max(scale - 0.25, 0.5));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [pageNum, totalPages, scale, onPageChange, onScaleChange, onClose]);

  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col animate-fade-in-up" style={{ animationDuration: "0.25s" }}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 ${isDark ? "bg-gray-950/95" : "bg-black/80"} backdrop-blur-sm`}
        onClick={onClose}
      />

      {/* Top Controls */}
      <div className={`relative z-10 flex items-center justify-between px-4 sm:px-6 py-3
        ${isDark ? "bg-gray-900/80 border-b border-white/10" : "bg-white/90 border-b border-gray-200"}
        backdrop-blur-xl`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-all cursor-pointer
              ${isDark ? "hover:bg-white/10 text-gray-400 hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-gray-800"}`}
          >
            <X className="w-5 h-5" />
          </button>
          <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
            Página {pageNum} de {totalPages}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Zoom controls */}
          <button
            onClick={() => onScaleChange(Math.max(scale - 0.25, 0.5))}
            disabled={scale <= 0.5}
            className={`p-2 rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed
              ${isDark ? "hover:bg-white/10 text-gray-400 hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-gray-800"}`}
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className={`text-xs font-mono w-14 text-center ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={() => onScaleChange(Math.min(scale + 0.25, 4))}
            disabled={scale >= 4}
            className={`p-2 rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed
              ${isDark ? "hover:bg-white/10 text-gray-400 hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-gray-800"}`}
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className={`w-px h-5 mx-1 ${isDark ? "bg-white/10" : "bg-gray-200"}`} />

          <button
            onClick={handleRotate}
            className={`p-2 rounded-lg transition-all cursor-pointer
              ${isDark ? "hover:bg-white/10 text-gray-400 hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-gray-800"}`}
            title="Rotacionar"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="relative z-10 flex-1 overflow-auto flex items-center justify-center p-4">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
              <span className="text-sm text-gray-400">Renderizando página...</span>
            </div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="max-w-full shadow-2xl rounded-lg transition-transform duration-300"
          style={{
            opacity: loading ? 0.3 : 1,
            transform: `rotate(${rotation}deg)`,
          }}
        />
      </div>

      {/* Bottom navigation */}
      <div className={`relative z-10 flex items-center justify-center gap-4 px-4 py-3
        ${isDark ? "bg-gray-900/80 border-t border-white/10" : "bg-white/90 border-t border-gray-200"}
        backdrop-blur-xl`}
      >
        <button
          onClick={() => onPageChange(1)}
          disabled={pageNum <= 1}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed
            ${isDark ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
        >
          Primeira
        </button>

        <button
          onClick={() => onPageChange(pageNum - 1)}
          disabled={pageNum <= 1}
          className={`p-2 rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed
            ${isDark ? "hover:bg-white/10 text-gray-400 hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-gray-800"}`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Quick page selector */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let pn: number;
            if (totalPages <= 7) {
              pn = i + 1;
            } else if (pageNum <= 4) {
              pn = i + 1;
            } else if (pageNum >= totalPages - 3) {
              pn = totalPages - 6 + i;
            } else {
              pn = pageNum - 3 + i;
            }
            return (
              <button
                key={pn}
                onClick={() => onPageChange(pn)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer
                  ${pn === pageNum
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                    : isDark
                      ? "hover:bg-white/10 text-gray-400"
                      : "hover:bg-gray-100 text-gray-500"
                  }`}
              >
                {pn}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(pageNum + 1)}
          disabled={pageNum >= totalPages}
          className={`p-2 rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed
            ${isDark ? "hover:bg-white/10 text-gray-400 hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-gray-800"}`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <button
          onClick={() => onPageChange(totalPages)}
          disabled={pageNum >= totalPages}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed
            ${isDark ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
        >
          Última
        </button>
      </div>
    </div>
  );
}

/* ================================================================
   MAIN PAGE PREVIEW SECTION
   ================================================================ */

export function PagePreviewSection({
  fileArrayBuffer,
  pageCount,
  isDark,
  glassCard,
  txt,
  txt2,
  txt3,
  embedded = false,
}: PagePreviewSectionProps) {
  const [isVisible, setIsVisible] = useState(embedded ? true : false);
  const [viewMode, setViewMode] = useState<"grid" | "single">("grid");
  const [activePage, setActivePage] = useState(1);
  const [viewerScale, setViewerScale] = useState(1.5);
  const [showFullViewer, setShowFullViewer] = useState(false);
  const [thumbnailsLoaded, setThumbnailsLoaded] = useState(embedded ? true : false);

  // Limit thumbnails for performance (first load shows 12, then all)
  const MAX_INITIAL_THUMBS = 12;
  const [showAllThumbs, setShowAllThumbs] = useState(false);
  const displayedPages = showAllThumbs
    ? pageCount
    : Math.min(pageCount, MAX_INITIAL_THUMBS);

  const handleThumbnailClick = useCallback((pageNum: number) => {
    setActivePage(pageNum);
    setShowFullViewer(true);
    setViewerScale(1.5);
  }, []);

  const handleToggleVisibility = useCallback(() => {
    setIsVisible((v) => {
      if (!v) setThumbnailsLoaded(true);
      return !v;
    });
  }, []);

  // Content render logic
  const content = (
    <div className={`${embedded ? "" : "px-6 pb-6"} animate-fade-in-up`} style={{ animationDuration: "0.3s" }}>
      {/* ---- GRID VIEW ---- */}
      {viewMode === "grid" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: displayedPages }, (_, i) => (
              <PageThumbnail
                key={i + 1}
                pdfData={fileArrayBuffer}
                pageNum={i + 1}
                isActive={activePage === i + 1}
                isDark={isDark}
                onClick={() => handleThumbnailClick(i + 1)}
              />
            ))}
          </div>

          {/* Show more thumbnails button */}
          {pageCount > MAX_INITIAL_THUMBS && !showAllThumbs && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setShowAllThumbs(true)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer
                  ${isDark
                    ? "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700"
                  }`}
              >
                <Layers className="w-4 h-4" />
                Carregar todas as {pageCount} páginas
              </button>
            </div>
          )}

          <p className={`text-xs text-center mt-4 ${txt3}`}>
            Clique em uma miniatura para visualizar em tamanho completo
          </p>
        </>
      )}

      {/* ---- SINGLE PAGE VIEW ---- */}
      {viewMode === "single" && (
        <SinglePageView
          pdfData={fileArrayBuffer}
          pageNum={activePage}
          totalPages={pageCount}
          isDark={isDark}
          txt={txt}
          txt2={txt2}
          txt3={txt3}
          onPageChange={setActivePage}
          onExpand={() => {
            setShowFullViewer(true);
            setViewerScale(1.5);
          }}
        />
      )}
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-4">
        {/* Controls for Embedded Mode */}
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-sm font-bold ${txt}`}>Visualizar Páginas</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer
                  ${viewMode === "grid"
                  ? isDark
                    ? "bg-indigo-500/20 text-indigo-400"
                    : "bg-indigo-100 text-indigo-600"
                  : isDark
                    ? "text-gray-500 hover:text-gray-300"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              title="Grade de miniaturas"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("single")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer
                  ${viewMode === "single"
                  ? isDark
                    ? "bg-indigo-500/20 text-indigo-400"
                    : "bg-indigo-100 text-indigo-600"
                  : isDark
                    ? "text-gray-500 hover:text-gray-300"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              title="Página única"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {content}
        {/* Full-screen viewer */}
        {showFullViewer && (
          <FullPageViewer
            pdfData={fileArrayBuffer}
            pageNum={activePage}
            totalPages={pageCount}
            isDark={isDark}
            scale={viewerScale}
            onPageChange={setActivePage}
            onScaleChange={setViewerScale}
            onClose={() => setShowFullViewer(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`${glassCard} rounded-2xl overflow-hidden animate-fade-in-up animation-delay-400`}>
      {/* Header - always visible */}
      <div
        className="flex items-center justify-between p-6 cursor-pointer select-none"
        onClick={handleToggleVisibility}
      >
        <h3 className={`text-base font-bold flex items-center gap-2.5 ${txt}`}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-500/20">
            <Eye className="w-4 h-4 text-white" />
          </div>
          Preview Visual das Páginas
          <span
            className={`text-xs font-normal px-2.5 py-1 rounded-full
              ${isDark ? "bg-violet-500/15 text-violet-400" : "bg-violet-100 text-violet-700"}`}
          >
            {pageCount} página{pageCount !== 1 ? "s" : ""}
          </span>
        </h3>


        <div className="flex items-center gap-2">
          {isVisible && (
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode("grid");
                }}
                className={`p-1.5 rounded-lg transition-all cursor-pointer
                  ${viewMode === "grid"
                    ? isDark
                      ? "bg-indigo-500/20 text-indigo-400"
                      : "bg-indigo-100 text-indigo-600"
                    : isDark
                      ? "text-gray-500 hover:text-gray-300"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                title="Grade de miniaturas"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode("single");
                }}
                className={`p-1.5 rounded-lg transition-all cursor-pointer
                  ${viewMode === "single"
                    ? isDark
                      ? "bg-indigo-500/20 text-indigo-400"
                      : "bg-indigo-100 text-indigo-600"
                    : isDark
                      ? "text-gray-500 hover:text-gray-300"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                title="Página única"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          )}

          <div
            className={`p-2 rounded-lg transition-all
              ${isDark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500"}`}
          >
            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Content area */}
      {isVisible && thumbnailsLoaded && content}

      {/* Full-screen viewer */}
      {showFullViewer && (
        <FullPageViewer
          pdfData={fileArrayBuffer}
          pageNum={activePage}
          totalPages={pageCount}
          isDark={isDark}
          scale={viewerScale}
          onPageChange={setActivePage}
          onScaleChange={setViewerScale}
          onClose={() => setShowFullViewer(false)}
        />
      )}
    </div>
  );
}

/* ================================================================
   SINGLE PAGE INLINE VIEW
   ================================================================ */

function SinglePageView({
  pdfData,
  pageNum,
  totalPages,
  isDark,
  txt,
  txt3,
  onPageChange,
  onExpand,
}: {
  pdfData: ArrayBuffer;
  pageNum: number;
  totalPages: number;
  isDark: boolean;
  txt: string;
  txt2: string;
  txt3: string;
  onPageChange: (page: number) => void;
  onExpand: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    setLoading(true);

    renderPageToCanvas(pdfData, pageNum, 1.5, canvas)
      .then(() => {
        if (!cancelled) setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pdfData, pageNum]);

  return (
    <div>
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, pageNum - 1))}
            disabled={pageNum <= 1}
            className={`p-2 rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed
              ${isDark ? "bg-white/5 hover:bg-white/10 text-gray-400" : "bg-gray-100 hover:bg-gray-200 text-gray-500"}`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className={`text-sm font-semibold ${txt}`}>
            Página {pageNum} de {totalPages}
          </span>

          <button
            onClick={() => onPageChange(Math.min(totalPages, pageNum + 1))}
            disabled={pageNum >= totalPages}
            className={`p-2 rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed
              ${isDark ? "bg-white/5 hover:bg-white/10 text-gray-400" : "bg-gray-100 hover:bg-gray-200 text-gray-500"}`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={onExpand}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer
            ${isDark ? "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700"}`}
        >
          <Maximize2 className="w-3.5 h-3.5" />
          Tela cheia
        </button>
      </div>

      {/* Canvas */}
      <div
        className={`relative rounded-xl overflow-hidden flex items-center justify-center
          ${isDark ? "bg-gray-800/50" : "bg-gray-100"}`}
        style={{ minHeight: "300px" }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className={`w-8 h-8 animate-spin ${isDark ? "text-indigo-400/60" : "text-indigo-300"}`} />
              <span className={`text-xs ${txt3}`}>Renderizando...</span>
            </div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="max-w-full h-auto shadow-lg rounded-lg"
          style={{ opacity: loading ? 0.3 : 1, transition: "opacity 0.3s" }}
        />
      </div>

      {/* Quick page selector bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-4 flex-wrap">
          {Array.from({ length: totalPages }, (_, i) => {
            const pn = i + 1;
            // For many pages, show dots
            if (totalPages > 20) {
              if (
                pn !== 1 &&
                pn !== totalPages &&
                pn !== pageNum &&
                pn !== pageNum - 1 &&
                pn !== pageNum + 1 &&
                !(pn <= 3) &&
                !(pn >= totalPages - 2)
              ) {
                // Show ellipsis at specific positions
                if (pn === pageNum - 2 || pn === pageNum + 2) {
                  return (
                    <span key={pn} className={`text-xs px-1 ${txt3}`}>
                      ···
                    </span>
                  );
                }
                return null;
              }
            }

            return (
              <button
                key={pn}
                onClick={() => onPageChange(pn)}
                className={`w-7 h-7 rounded-md text-[11px] font-bold transition-all cursor-pointer
                  ${pn === pageNum
                    ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30"
                    : isDark
                      ? "hover:bg-white/10 text-gray-500 hover:text-gray-300"
                      : "hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                  }`}
              >
                {pn}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
