
import { useState, useCallback, useRef } from "react";
import { ScanSearch, Search, ChevronDown, X } from "lucide-react";
import { ExtractionResult, FieldType, FIELD_TYPE_INFO } from "../../features/field-extraction/utils/fieldExtractor";

interface SmartFieldsSectionProps {
    extraction: ExtractionResult;
    isDark: boolean;
    glassCard: string;
    txt: string;
    txt2: string;
    txt3: string;
    initialExpanded?: boolean;
    embedded?: boolean;
}

export function SmartFieldsSection({
    extraction,
    isDark,
    glassCard,
    txt,
    txt2,
    txt3,
    initialExpanded = false,
    embedded = false,
}: SmartFieldsSectionProps) {
    const [isExpanded, setIsExpanded] = useState(embedded ? true : initialExpanded);
    const [activeFilter, setActiveFilter] = useState<FieldType | "all">("all");
    const [copiedValue, setCopiedValue] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedType, setExpandedType] = useState<FieldType | null>(null);

    const searchInputRef = useRef<HTMLInputElement>(null);

    const handleCopy = useCallback(async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopiedValue(value);
            setTimeout(() => setCopiedValue(null), 2000);
        } catch {
            /* fallback */
            const ta = document.createElement("textarea");
            ta.value = value;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            setCopiedValue(value);
            setTimeout(() => setCopiedValue(null), 2000);
        }
    }, []);

    const filteredFields = extraction.fields.filter((f) => {
        const matchesType = activeFilter === "all" || f.type === activeFilter;
        const matchesSearch =
            !searchTerm ||
            f.value.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesType && matchesSearch;
    });

    const typeOrder: FieldType[] = [
        "cpf",
        "cnpj",
        "email",
        "telefone",
        "data",
        "valor_monetario",
        "url",
    ];

    const activeTypes = typeOrder.filter((t) => extraction.summary[t] > 0);

    const emptyContent = (
        <div
            className={`flex items-center gap-3 p-4 rounded-xl ${isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}
        >
            <Search className={`w-5 h-5 flex-shrink-0 ${txt3}`} />
            <div>
                <p className={`text-sm font-medium ${txt2}`}>
                    Nenhum campo estruturado identificado
                </p>
                <p className={`text-xs mt-0.5 ${txt3}`}>
                    CPFs, CNPJs, e-mails, telefones, datas, valores monetários e URLs
                    não foram encontrados no texto do documento.
                </p>
            </div>
        </div>
    );

    if (extraction.totalFound === 0) {
        if (embedded) {
            return (
                <div className="space-y-6 animate-fade-in-up">
                    {emptyContent}
                </div>
            );
        }
        return (
            <div
                className={`${glassCard} rounded-2xl p-6 animate-fade-in-up animation-delay-400`}
            >
                <div
                    className={`flex items-center justify-between cursor-pointer`}
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <h3
                        className={`text-base font-bold flex items-center gap-2.5 ${txt}`}
                    >
                        <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? "bg-amber-500/10" : "bg-amber-50"}`}
                        >
                            <ScanSearch
                                className={`w-4 h-4 ${isDark ? "text-amber-400" : "text-amber-600"}`}
                            />
                        </div>
                        Extração Inteligente de Campos
                    </h3>
                    <ChevronDown
                        className={`w-5 h-5 transition-transform duration-300 ${txt3} ${isExpanded ? "rotate-180" : ""}`}
                    />
                </div>

                {isExpanded && (
                    <div
                        className={`mt-4 pt-4 border-t ${isDark ? "border-white/5" : "border-gray-200/60"}`}
                    >
                        {emptyContent}
                    </div>
                )}
            </div>
        );
    }



    if (embedded) {
        return (
            <div className={`space-y-6 animate-fade-in-up`}>
                {/* Search Input - Condensed */}
                <div className="relative">
                    <Search
                        className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 ${txt3}`}
                    />
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Filtrar valores extraídos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-11 pr-10 py-3 text-sm rounded-xl border outline-none transition-all duration-200
      ${isDark
                                ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-indigo-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/10"
                                : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                            }`}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => {
                                setSearchTerm("");
                                searchInputRef.current?.focus();
                            }}
                            className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-all duration-200 cursor-pointer
          ${isDark ? "text-gray-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Summary Pills */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setActiveFilter("all")}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer
            ${activeFilter === "all"
                                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25"
                                : isDark
                                    ? "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                                    : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                            }`}
                    >
                        Todos ({extraction.totalFound})
                    </button>
                    {activeTypes.map((type) => {
                        const info = FIELD_TYPE_INFO[type];
                        const count = extraction.summary[type];
                        const isActive = activeFilter === type;
                        return (
                            <button
                                key={type}
                                onClick={() =>
                                    setActiveFilter(isActive ? "all" : type)
                                }
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer
                ${isActive
                                        ? isDark
                                            ? `${info.bgColorDark} ${info.textColorDark} ring-1 ring-current/30`
                                            : `${info.bgColor} ${info.color} ring-1 ring-current/30`
                                        : isDark
                                            ? "bg-white/5 text-gray-400 hover:bg-white/10"
                                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                    }`}
                            >
                                <span>{info.icon}</span>
                                {info.label} ({count})
                            </button>
                        );
                    })}
                </div>

                {/* Results List */}
                <div className="space-y-4">
                    {/* Reuse logic for results display but simplified wrapper */}
                    {activeFilter === "all" ? (
                        <div className="space-y-4">
                            {activeTypes.map((type) => {
                                const info = FIELD_TYPE_INFO[type];
                                const fieldsOfType = filteredFields.filter(
                                    (f) => f.type === type
                                );
                                if (fieldsOfType.length === 0) return null;

                                const isExpandedType = expandedType === type;
                                const displayFields = isExpandedType
                                    ? fieldsOfType
                                    : fieldsOfType.slice(0, 3);

                                return (
                                    <div
                                        key={type}
                                        className={`rounded-xl overflow-hidden transition-all duration-200 ${isDark ? "bg-white/[0.02]" : "bg-gray-50/60"}`}
                                    >
                                        <div
                                            className={`flex items-center justify-between p-3.5 ${isDark ? "border-b border-white/5" : "border-b border-gray-100"}`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div
                                                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${isDark ? info.bgColorDark : info.bgColor}`}
                                                >
                                                    {info.icon}
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-bold ${txt}`}>
                                                        {info.label}
                                                    </p>
                                                    <p className={`text-xs ${txt3}`}>
                                                        {fieldsOfType.length} valores encontrados
                                                    </p>
                                                </div>
                                            </div>
                                            {fieldsOfType.length > 3 && (
                                                <button
                                                    onClick={() =>
                                                        setExpandedType(isExpandedType ? null : type)
                                                    }
                                                    className={`text-xs font-medium px-2 py-1 rounded-lg transition-colors
                            ${isDark ? "text-indigo-400 hover:bg-indigo-500/10" : "text-indigo-600 hover:bg-indigo-50"}`}
                                                >
                                                    {isExpandedType ? "Ver menos" : "Ver todos"}
                                                </button>
                                            )}
                                        </div>

                                        <div className="p-2 space-y-1">
                                            {displayFields.map((field, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`group flex items-center justify-between p-2 rounded-lg transition-all
                            ${isDark ? "hover:bg-white/5" : "hover:bg-white hover:shadow-sm"}`}
                                                >
                                                    <div className="flex-1 min-w-0 mr-3">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className={`text-sm font-mono font-medium truncate ${txt}`}>
                                                                {field.value}
                                                            </span>
                                                            {copiedValue === field.value && (
                                                                <span className="text-[10px] font-bold text-green-500 animate-fade-in">
                                                                    Copiado!
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? "bg-white/10 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                                                                Pág. {field.pages.join(", ")}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleCopy(field.value)}
                                                        className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all
                              ${isDark ? "hover:bg-white/10 text-gray-400 hover:text-white" : "hover:bg-gray-100 text-gray-400 hover:text-gray-700"}`}
                                                        title="Copiar valor"
                                                    >
                                                        <ScanSearch className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredFields.length > 0 ? (
                                filteredFields.map((field, idx) => (
                                    <div
                                        key={idx}
                                        className={`group flex items-center justify-between p-2 rounded-lg transition-all
                        ${isDark ? "hover:bg-white/5" : "hover:bg-white hover:shadow-sm"}`}
                                    >
                                        <div className="flex-1 min-w-0 mr-3">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className={`text-sm font-mono font-medium truncate ${txt}`}>
                                                    {field.value}
                                                </span>
                                                {copiedValue === field.value && (
                                                    <span className="text-[10px] font-bold text-green-500 animate-fade-in">
                                                        Copiado!
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? "bg-white/10 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                                                    Pág. {field.pages.join(", ")}
                                                </span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${isDark ? FIELD_TYPE_INFO[field.type].bgColorDark : FIELD_TYPE_INFO[field.type].bgColor}`}>
                                                    {FIELD_TYPE_INFO[field.type].icon}
                                                    {FIELD_TYPE_INFO[field.type].label}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(field.value)}
                                            className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all
                          ${isDark ? "hover:bg-white/10 text-gray-400 hover:text-white" : "hover:bg-gray-100 text-gray-400 hover:text-gray-700"}`}
                                            title="Copiar valor"
                                        >
                                            <ScanSearch className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className={`text-center py-8 ${txt3}`}>
                                    <p>Nenhum resultado encontrado para "{searchTerm}"</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            className={`${glassCard} rounded-2xl overflow-hidden animate-fade-in-up animation-delay-400`}
        >
            {/* Header */}
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
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
                        <ScanSearch className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div className="text-left">
                        <h3 className={`text-base font-bold ${txt}`}>
                            Extração Inteligente de Campos
                        </h3>
                        <p className={`text-xs ${txt3}`}>
                            {extraction.totalFound} campo{extraction.totalFound !== 1 ? "s" : ""} encontrado{extraction.totalFound !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {!isExpanded && (
                        <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isDark ? "bg-indigo-500/15 text-indigo-400" : "bg-indigo-100 text-indigo-700"}`}
                        >
                            {extraction.totalFound} encontrado{extraction.totalFound !== 1 ? "s" : ""}
                        </span>
                    )}
                    <ChevronDown
                        className={`w-5 h-5 transition-transform duration-300 ${txt3} ${isExpanded ? "rotate-180" : ""}`}
                    />
                </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div
                    className={`border-t px-6 pb-6 ${isDark ? "border-white/5" : "border-gray-200/60"}`}
                >
                    {/* Search Input */}
                    <div className="pt-5 pb-4">
                        <div className="relative">
                            <Search
                                className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 ${txt3}`}
                            />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Filtrar valores..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full pl-11 pr-10 py-3 text-sm rounded-xl border outline-none transition-all duration-200
                  ${isDark
                                        ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-indigo-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/10"
                                        : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                    }`}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => {
                                        setSearchTerm("");
                                        searchInputRef.current?.focus();
                                    }}
                                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-all duration-200 cursor-pointer
                      ${isDark ? "text-gray-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Summary Pills */}
                    <div className="flex flex-wrap gap-2 mb-5">
                        <button
                            onClick={() => setActiveFilter("all")}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer
                ${activeFilter === "all"
                                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25"
                                    : isDark
                                        ? "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                                        : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                                }`}
                        >
                            Todos ({extraction.totalFound})
                        </button>
                        {activeTypes.map((type) => {
                            const info = FIELD_TYPE_INFO[type];
                            const count = extraction.summary[type];
                            const isActive = activeFilter === type;
                            return (
                                <button
                                    key={type}
                                    onClick={() =>
                                        setActiveFilter(isActive ? "all" : type)
                                    }
                                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer
                    ${isActive
                                            ? isDark
                                                ? `${info.bgColorDark} ${info.textColorDark} ring-1 ring-current/30`
                                                : `${info.bgColor} ${info.color} ring-1 ring-current/30`
                                            : isDark
                                                ? "bg-white/5 text-gray-400 hover:bg-white/10"
                                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                        }`}
                                >
                                    <span>{info.icon}</span>
                                    {info.label} ({count})
                                </button>
                            );
                        })}
                    </div>

                    {/* Grouped Fields Display */}
                    {activeFilter === "all" ? (
                        <div className="space-y-4">
                            {activeTypes.map((type) => {
                                const info = FIELD_TYPE_INFO[type];
                                const fieldsOfType = filteredFields.filter(
                                    (f) => f.type === type
                                );
                                if (fieldsOfType.length === 0) return null;

                                const isExpandedType = expandedType === type;
                                const displayFields = isExpandedType
                                    ? fieldsOfType
                                    : fieldsOfType.slice(0, 3);

                                return (
                                    <div
                                        key={type}
                                        className={`rounded-xl overflow-hidden transition-all duration-200 ${isDark ? "bg-white/[0.02]" : "bg-gray-50/60"}`}
                                    >
                                        {/* Type Header */}
                                        <div
                                            className={`flex items-center justify-between p-3.5 ${isDark ? "border-b border-white/5" : "border-b border-gray-100"}`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div
                                                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${isDark ? info.bgColorDark : info.bgColor}`}
                                                >
                                                    {info.icon}
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-bold ${txt}`}>
                                                        {info.label}
                                                    </p>
                                                    <p className={`text-xs ${txt3}`}>
                                                        {fieldsOfType.length} valores encontrados
                                                    </p>
                                                </div>
                                            </div>
                                            {fieldsOfType.length > 3 && (
                                                <button
                                                    onClick={() =>
                                                        setExpandedType(isExpandedType ? null : type)
                                                    }
                                                    className={`text-xs font-medium px-2 py-1 rounded-lg transition-colors
                            ${isDark ? "text-indigo-400 hover:bg-indigo-500/10" : "text-indigo-600 hover:bg-indigo-50"}`}
                                                >
                                                    {isExpandedType ? "Ver menos" : "Ver todos"}
                                                </button>
                                            )}
                                        </div>

                                        {/* Fields List */}
                                        <div className="p-2 space-y-1">
                                            {displayFields.map((field, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`group flex items-center justify-between p-2 rounded-lg transition-all
                            ${isDark ? "hover:bg-white/5" : "hover:bg-white hover:shadow-sm"}`}
                                                >
                                                    <div className="flex-1 min-w-0 mr-3">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className={`text-sm font-mono font-medium truncate ${txt}`}>
                                                                {field.value}
                                                            </span>
                                                            {copiedValue === field.value && (
                                                                <span className="text-[10px] font-bold text-green-500 animate-fade-in">
                                                                    Copiado!
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? "bg-white/10 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                                                                Pág. {field.pages.join(", ")}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleCopy(field.value)}
                                                        className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all
                              ${isDark ? "hover:bg-white/10 text-gray-400 hover:text-white" : "hover:bg-gray-100 text-gray-400 hover:text-gray-700"}`}
                                                        title="Copiar valor"
                                                    >
                                                        <ScanSearch className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* Filtered View */
                        <div className="space-y-1">
                            {filteredFields.length > 0 ? (
                                filteredFields.map((field, idx) => (
                                    <div
                                        key={idx}
                                        className={`group flex items-center justify-between p-2 rounded-lg transition-all
                        ${isDark ? "hover:bg-white/5" : "hover:bg-white hover:shadow-sm"}`}
                                    >
                                        <div className="flex-1 min-w-0 mr-3">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className={`text-sm font-mono font-medium truncate ${txt}`}>
                                                    {field.value}
                                                </span>
                                                {copiedValue === field.value && (
                                                    <span className="text-[10px] font-bold text-green-500 animate-fade-in">
                                                        Copiado!
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? "bg-white/10 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                                                    Pág. {field.pages.join(", ")}
                                                </span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${isDark ? FIELD_TYPE_INFO[field.type].bgColorDark : FIELD_TYPE_INFO[field.type].bgColor}`}>
                                                    {FIELD_TYPE_INFO[field.type].icon}
                                                    {FIELD_TYPE_INFO[field.type].label}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(field.value)}
                                            className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all
                          ${isDark ? "hover:bg-white/10 text-gray-400 hover:text-white" : "hover:bg-gray-100 text-gray-400 hover:text-gray-700"}`}
                                            title="Copiar valor"
                                        >
                                            <ScanSearch className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className={`text-center py-8 ${txt3}`}>
                                    <p>Nenhum resultado encontrado para "{searchTerm}"</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
