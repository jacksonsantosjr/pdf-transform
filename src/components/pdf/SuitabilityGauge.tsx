
interface SuitabilityGaugeProps {
    score: number;
    level: string;
    isDark: boolean;
}

export function SuitabilityGauge({
    score,
    level,
    isDark,
}: SuitabilityGaugeProps) {
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
