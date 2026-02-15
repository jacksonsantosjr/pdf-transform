/* ================================================================
   TEXT SEARCH — Busca no Texto do PDF
   Pesquisa termos específicos com contexto, highlight e navegação
   ================================================================ */

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Search,
  X,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Settings2,
  FileText,
  Hash,
  CaseSensitive,
  WholeWord,
  Regex,
  ArrowUpRight,
} from "lucide-react";

/* ---- Types ---- */

import { PageInfo } from "../pdf-analysis/types/pdfAnalysis.types";

interface SearchMatch {
  pageNumber: number;
  startIndex: number;
  endIndex: number;
  matchText: string;
  contextBefore: string;
  contextAfter: string;
  lineNumber: number;
}

interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
}

interface Props {
  pages: PageInfo[];
  isDark: boolean;
  glassCard: string;
  txt: string;
  txt2: string;
  txt3: string;
  initialExpanded?: boolean;
  embedded?: boolean;
}

/* ---- Constants ---- */

const CONTEXT_CHARS = 80;
const RESULTS_PER_PAGE = 20;

/* ---- Helper: get line number from index ---- */

function getLineNumber(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === "\n") line++;
  }
  return line;
}

/* ---- Helper: escape regex special characters ---- */

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ---- Helper: build search regex ---- */

function buildSearchRegex(
  query: string,
  options: SearchOptions
): RegExp | null {
  if (!query.trim()) return null;

  try {
    let pattern: string;

    if (options.useRegex) {
      pattern = query;
    } else {
      pattern = escapeRegExp(query);
    }

    if (options.wholeWord) {
      pattern = `\\b${pattern}\\b`;
    }

    const flags = options.caseSensitive ? "g" : "gi";
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

/* ================================================================
   HIGHLIGHTED TEXT COMPONENT
   ================================================================ */

function HighlightedContext({
  before,
  match,
  after,
  isDark,
}: {
  before: string;
  match: string;
  after: string;
  isDark: boolean;
}) {
  return (
    <span className="text-sm leading-relaxed font-mono break-all">
      <span className={isDark ? "text-gray-400" : "text-gray-500"}>
        {before}
      </span>
      <mark
        className={`px-1 py-0.5 rounded font-semibold ${isDark
          ? "bg-amber-500/25 text-amber-300 ring-1 ring-amber-500/30"
          : "bg-amber-200/80 text-amber-900 ring-1 ring-amber-300/50"
          }`}
      >
        {match}
      </mark>
      <span className={isDark ? "text-gray-400" : "text-gray-500"}>
        {after}
      </span>
    </span>
  );
}

/* ================================================================
   SEARCH RESULT ITEM COMPONENT
   ================================================================ */

function SearchResultItem({
  result,
  index,
  isActive,
  isDark,
  txt3,
  onCopy,
  copiedIdx,
  onClick,
}: {
  result: SearchMatch;
  index: number;
  isActive: boolean;
  isDark: boolean;
  txt3: string;
  onCopy: (text: string, idx: number) => void;
  copiedIdx: number | null;
  onClick: () => void;
}) {
  const isCopied = copiedIdx === index;
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && itemRef.current) {
      itemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [isActive]);

  return (
    <div
      ref={itemRef}
      onClick={onClick}
      className={`group relative flex items-start gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200
        ${isActive
          ? isDark
            ? "bg-amber-500/10 ring-1 ring-amber-500/30"
            : "bg-amber-50 ring-1 ring-amber-300/50"
          : isDark
            ? "hover:bg-white/[0.04]"
            : "hover:bg-gray-50"
        }`}
    >
      {/* Page number badge */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
            ${isDark
              ? "bg-indigo-500/15 text-indigo-400"
              : "bg-indigo-100 text-indigo-700"
            }`}
        >
          {result.pageNumber}
        </div>
        <span className={`text-[9px] ${txt3}`}>L{result.lineNumber}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <HighlightedContext
          before={result.contextBefore}
          match={result.matchText}
          after={result.contextAfter}
          isDark={isDark}
        />
      </div>

      {/* Copy button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCopy(
            `${result.contextBefore}${result.matchText}${result.contextAfter}`,
            index
          );
        }}
        className={`flex-shrink-0 p-1.5 rounded-lg transition-all duration-200 cursor-pointer
          ${isCopied
            ? "bg-emerald-500/15 text-emerald-500"
            : isDark
              ? "text-gray-600 opacity-0 group-hover:opacity-100 hover:bg-white/10 hover:text-gray-300"
              : "text-gray-300 opacity-0 group-hover:opacity-100 hover:bg-gray-200 hover:text-gray-600"
          }`}
        title="Copiar contexto"
      >
        {isCopied ? (
          <Check className="w-3.5 h-3.5" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Active indicator */}
      {isActive && (
        <div
          className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full ${isDark ? "bg-amber-500" : "bg-amber-400"
            }`}
        />
      )}
    </div>
  );
}

/* ================================================================
   PAGE GROUP COMPONENT
   ================================================================ */

function PageGroup({
  pageNumber,
  results,
  startIdx,
  activeResultIndex,
  isDark,
  txt,
  txt3,
  onCopy,
  copiedIdx,
  onClickResult,
  isExpanded,
  onToggle,
}: {
  pageNumber: number;
  results: SearchMatch[];
  startIdx: number;
  activeResultIndex: number;
  isDark: boolean;
  txt: string;
  txt3: string;
  onCopy: (text: string, idx: number) => void;
  copiedIdx: number | null;
  onClickResult: (idx: number) => void;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`rounded-xl overflow-hidden transition-all duration-200 ${isDark ? "bg-white/[0.02]" : "bg-gray-50/50"
        }`}
    >
      {/* Page header */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-4 py-3 cursor-pointer transition-all duration-200
          ${isDark ? "hover:bg-white/[0.03]" : "hover:bg-gray-100/60"}`}
      >
        <div className="flex items-center gap-2.5">
          <FileText
            className={`w-4 h-4 ${isDark ? "text-indigo-400" : "text-indigo-500"}`}
          />
          <span className={`text-sm font-semibold ${txt}`}>
            Página {pageNumber}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDark
              ? "bg-amber-500/15 text-amber-400"
              : "bg-amber-100 text-amber-700"
              }`}
          >
            {results.length} {results.length === 1 ? "resultado" : "resultados"}
          </span>
        </div>
        <ChevronRight
          className={`w-4 h-4 transition-transform duration-200 ${txt3} ${isExpanded ? "rotate-90" : ""
            }`}
        />
      </button>

      {/* Results */}
      {isExpanded && (
        <div
          className={`border-t ${isDark ? "border-white/5" : "border-gray-200/60"}`}
        >
          {results.map((result, i) => (
            <SearchResultItem
              key={`${result.pageNumber}-${result.startIndex}`}
              result={result}
              index={startIdx + i}
              isActive={activeResultIndex === startIdx + i}
              isDark={isDark}
              txt3={txt3}
              onCopy={onCopy}
              copiedIdx={copiedIdx}
              onClick={() => onClickResult(startIdx + i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   MAIN TEXT SEARCH SECTION COMPONENT
   ================================================================ */

export function TextSearchSection({ pages, isDark, glassCard, txt, txt2, txt3, initialExpanded = false, embedded = false }: Props) {
  const [isExpanded, setIsExpanded] = useState(embedded ? true : initialExpanded);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [options, setOptions] = useState<SearchOptions>({
    caseSensitive: false,
    wholeWord: false,
    useRegex: false,
  });
  const [showOptions, setShowOptions] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [expandedPageGroups, setExpandedPageGroups] = useState<Set<number>>(
    new Set()
  );
  const [visibleResults, setVisibleResults] = useState(RESULTS_PER_PAGE);
  const [regexError, setRegexError] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce query
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      setActiveResultIndex(0);
      setVisibleResults(RESULTS_PER_PAGE);
    }, 250);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query]);

  // Search logic
  const searchResults = useMemo((): SearchMatch[] => {
    if (!debouncedQuery.trim()) {
      setRegexError(null);
      return [];
    }

    const regex = buildSearchRegex(debouncedQuery, options);
    if (!regex) {
      if (options.useRegex) {
        setRegexError("Expressão regular inválida");
      }
      return [];
    }

    setRegexError(null);
    const results: SearchMatch[] = [];

    for (const page of pages) {
      if (!page.fullText.trim()) continue;

      const text = page.fullText;
      let match: RegExpExecArray | null;

      // Reset lastIndex for global regex
      regex.lastIndex = 0;

      while ((match = regex.exec(text)) !== null) {
        const startIndex = match.index;
        const endIndex = startIndex + match[0].length;

        // Get context before
        const ctxStart = Math.max(0, startIndex - CONTEXT_CHARS);
        let contextBefore = text.slice(ctxStart, startIndex);
        if (ctxStart > 0) {
          // Trim to nearest word boundary
          const firstSpace = contextBefore.indexOf(" ");
          if (firstSpace > 0 && firstSpace < 15) {
            contextBefore = "…" + contextBefore.slice(firstSpace);
          } else {
            contextBefore = "…" + contextBefore;
          }
        }

        // Get context after
        const ctxEnd = Math.min(text.length, endIndex + CONTEXT_CHARS);
        let contextAfter = text.slice(endIndex, ctxEnd);
        if (ctxEnd < text.length) {
          const lastSpace = contextAfter.lastIndexOf(" ");
          if (lastSpace > contextAfter.length - 15 && lastSpace > 0) {
            contextAfter = contextAfter.slice(0, lastSpace) + "…";
          } else {
            contextAfter = contextAfter + "…";
          }
        }

        const lineNumber = getLineNumber(text, startIndex);

        results.push({
          pageNumber: page.pageNumber,
          startIndex,
          endIndex,
          matchText: match[0],
          contextBefore: contextBefore.replace(/\n/g, " "),
          contextAfter: contextAfter.replace(/\n/g, " "),
          lineNumber,
        });

        // Safety: limit results to 500
        if (results.length >= 500) break;
      }
      if (results.length >= 500) break;
    }

    return results;
  }, [debouncedQuery, options, pages]);

  // Group results by page
  const groupedResults = useMemo(() => {
    const groups: { pageNumber: number; results: SearchMatch[]; startIdx: number }[] = [];
    let currentPage = -1;
    let runningIdx = 0;

    for (const result of searchResults) {
      if (result.pageNumber !== currentPage) {
        currentPage = result.pageNumber;
        groups.push({
          pageNumber: currentPage,
          results: [],
          startIdx: runningIdx,
        });
      }
      groups[groups.length - 1].results.push(result);
      runningIdx++;
    }
    return groups;
  }, [searchResults]);

  // Pages with matches
  const pagesWithMatches = useMemo(() => {
    return new Set(searchResults.map((r) => r.pageNumber));
  }, [searchResults]);

  // Auto-expand page group of active result
  useEffect(() => {
    if (searchResults.length > 0 && activeResultIndex < searchResults.length) {
      const activePage = searchResults[activeResultIndex].pageNumber;
      setExpandedPageGroups((prev) => {
        if (prev.has(activePage)) return prev;
        const next = new Set(prev);
        next.add(activePage);
        return next;
      });
    }
  }, [activeResultIndex, searchResults]);

  // Navigation
  const goToNext = useCallback(() => {
    setActiveResultIndex((prev) =>
      prev < searchResults.length - 1 ? prev + 1 : 0
    );
  }, [searchResults.length]);

  const goToPrev = useCallback(() => {
    setActiveResultIndex((prev) =>
      prev > 0 ? prev - 1 : searchResults.length - 1
    );
  }, [searchResults.length]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isExpanded) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        goToNext();
      } else if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        goToPrev();
      } else if (e.key === "Escape") {
        if (query) {
          setQuery("");
          setDebouncedQuery("");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded, query, goToNext, goToPrev]);

  // Copy handler
  const handleCopy = useCallback(async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text.replace(/…/g, ""));
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text.replace(/…/g, "");
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    }
  }, []);

  // Toggle page group
  const togglePageGroup = useCallback((pageNumber: number) => {
    setExpandedPageGroups((prev) => {
      const next = new Set(prev);
      if (next.has(pageNumber)) next.delete(pageNumber);
      else next.add(pageNumber);
      return next;
    });
  }, []);

  // Toggle option
  const toggleOption = useCallback((key: keyof SearchOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Total text stats
  const totalText = useMemo(() => {
    const total = pages.reduce((acc, p) => acc + p.fullText.length, 0);
    const totalWords = pages.reduce(
      (acc, p) =>
        acc +
        p.fullText
          .split(/\s+/)
          .filter((w) => w.length > 0).length,
      0
    );
    return { chars: total, words: totalWords };
  }, [pages]);

  const hasText = totalText.chars > 0;

  const content = (
    <div
      className={embedded ? "" : `border-t px-6 pb-6 ${isDark ? "border-white/5" : "border-gray-200/60"}`}
    >
      {!hasText ? (
        <div className={`py-8 text-center ${txt3}`}>
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className={`text-sm font-medium ${txt2}`}>
            Nenhum texto disponível
          </p>
          <p className="text-xs mt-1">
            O documento não contém texto extraível para pesquisa.
          </p>
        </div>
      ) : (
        <>
          {/* Search Input */}
          <div className="pt-5 pb-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search
                  className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 ${txt3}`}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Digite para pesquisar no texto do PDF..."
                  className={`w-full pl-11 pr-10 py-3 text-sm rounded-xl border outline-none transition-all duration-200
                        ${isDark
                      ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-amber-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-amber-500/10"
                      : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                    }
                        ${regexError ? (isDark ? "border-red-500/50" : "border-red-300") : ""}`}
                  autoFocus
                />
                {query && (
                  <button
                    onClick={() => {
                      setQuery("");
                      setDebouncedQuery("");
                      searchInputRef.current?.focus();
                    }}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-all duration-200 cursor-pointer
                          ${isDark ? "text-gray-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Options toggle */}
              <button
                onClick={() => setShowOptions(!showOptions)}
                className={`p-3 rounded-xl transition-all duration-200 cursor-pointer
                      ${showOptions
                    ? isDark
                      ? "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30"
                      : "bg-amber-100 text-amber-700 ring-1 ring-amber-200"
                    : isDark
                      ? "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                  }`}
                title="Opções de busca"
              >
                <Settings2 className="w-5 h-5" />
              </button>
            </div>

            {/* Regex error */}
            {regexError && (
              <p className="text-xs text-red-500 mt-2 flex items-center gap-1.5">
                <X className="w-3.5 h-3.5" />
                {regexError}
              </p>
            )}

            {/* Options panel */}
            {showOptions && (
              <div
                className={`flex flex-wrap gap-2 mt-3 p-3 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-gray-50"
                  }`}
              >
                {[
                  {
                    key: "caseSensitive" as keyof SearchOptions,
                    icon: CaseSensitive,
                    label: "Diferenciar maiúsculas",
                    shortLabel: "Aa",
                  },
                  {
                    key: "wholeWord" as keyof SearchOptions,
                    icon: WholeWord,
                    label: "Palavra inteira",
                    shortLabel: "Ab",
                  },
                  {
                    key: "useRegex" as keyof SearchOptions,
                    icon: Regex,
                    label: "Expressão regular",
                    shortLabel: ".*",
                  },
                ].map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => toggleOption(key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer
                          ${options[key]
                        ? isDark
                          ? "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30"
                          : "bg-amber-100 text-amber-700 ring-1 ring-amber-200"
                        : isDark
                          ? "bg-white/5 text-gray-400 hover:bg-white/10"
                          : "bg-white text-gray-500 hover:bg-gray-100"
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}

                <div
                  className={`w-full text-[10px] mt-1 ${txt3} flex items-center gap-1.5`}
                >
                  <Hash className="w-3 h-3" />
                  Enter = próximo · Shift+Enter = anterior · Esc = limpar
                </div>
              </div>
            )}
          </div>

          {/* Results summary bar */}
          {debouncedQuery.trim() && (
            <div
              className={`flex items-center justify-between gap-3 py-3 px-4 mb-4 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-gray-50"
                }`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${txt2}`}>
                  {searchResults.length > 0 ? (
                    <>
                      <span className={`font-bold ${txt}`}>
                        {searchResults.length}
                      </span>{" "}
                      resultado
                      {searchResults.length !== 1 ? "s" : ""} em{" "}
                      <span className={`font-bold ${txt}`}>
                        {pagesWithMatches.size}
                      </span>{" "}
                      página{pagesWithMatches.size !== 1 ? "s" : ""}
                      {searchResults.length >= 500 && (
                        <span className={`text-xs ml-1 ${txt3}`}>
                          (limite de 500)
                        </span>
                      )}
                    </>
                  ) : (
                    <span className={txt3}>
                      Nenhum resultado encontrado para &ldquo;
                      {debouncedQuery}&rdquo;
                    </span>
                  )}
                </span>
              </div>

              {/* Navigation arrows */}
              {searchResults.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-medium mr-2 ${txt3}`}>
                    {activeResultIndex + 1}/{searchResults.length}
                  </span>
                  <button
                    onClick={goToPrev}
                    className={`p-1.5 rounded-lg transition-all
                          ${isDark
                        ? "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                        : "bg-white hover:bg-gray-100 text-gray-500 hover:text-gray-900 border border-gray-200"
                      }`}
                    title="Anterior (Shift+Enter)"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={goToNext}
                    className={`p-1.5 rounded-lg transition-all
                          ${isDark
                        ? "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                        : "bg-white hover:bg-gray-100 text-gray-500 hover:text-gray-900 border border-gray-200"
                      }`}
                    title="Próximo (Enter)"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Results List */}
          <div className="space-y-3">
            {groupedResults.map((group) => (
              <PageGroup
                key={group.pageNumber}
                pageNumber={group.pageNumber}
                results={group.results}
                startIdx={group.startIdx}
                activeResultIndex={activeResultIndex}
                isDark={isDark}
                txt={txt}
                txt3={txt3}
                onCopy={handleCopy}
                copiedIdx={copiedIdx}
                onClickResult={setActiveResultIndex}
                isExpanded={expandedPageGroups.has(group.pageNumber)}
                onToggle={() => togglePageGroup(group.pageNumber)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div
      className={`${glassCard} rounded-2xl overflow-hidden animate-fade-in-up animation-delay-400`}
    >
      {/* Header - always visible */}
      <button
        onClick={() => {
          setIsExpanded(!isExpanded);
          if (!isExpanded) {
            setTimeout(() => searchInputRef.current?.focus(), 200);
          }
        }}
        className={`w-full flex items-center justify-between p-6 cursor-pointer transition-all duration-200
          ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50/50"}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
            <Search className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="text-left">
            <h3 className={`text-base font-bold ${txt}`}>
              Busca no Texto
            </h3>
            <p className={`text-xs ${txt3}`}>
              {hasText
                ? `Pesquise em ${totalText.words.toLocaleString("pt-BR")} palavras · ${pages.length} página${pages.length !== 1 ? "s" : ""}`
                : "Nenhum texto disponível para busca"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {searchResults.length > 0 && !isExpanded && (
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isDark
                ? "bg-amber-500/15 text-amber-400"
                : "bg-amber-100 text-amber-700"
                }`}
            >
              {searchResults.length} resultado{searchResults.length !== 1 ? "s" : ""}
            </span>
          )}
          <ChevronDown
            className={`w-5 h-5 transition-transform duration-300 ${txt3} ${isExpanded ? "rotate-180" : ""
              }`}
          />
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && content}
    </div>
  );
}
