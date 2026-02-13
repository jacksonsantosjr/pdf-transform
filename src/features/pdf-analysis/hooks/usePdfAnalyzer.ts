import { useState, useCallback } from "react";
import { toast } from "sonner";
import { PDFAnalysis } from "../types/pdfAnalysis.types";
import { analyzePDF } from "../services/pdfAnalysisService";

interface UsePdfAnalyzerReturn {
    analysis: PDFAnalysis | null;
    isAnalyzing: boolean;
    progress: number;
    progressMessage: string;
    error: string | null;
    analyze: (file: File) => Promise<void>;
    reset: () => void;
}

export function usePdfAnalyzer(): UsePdfAnalyzerReturn {
    const [analysis, setAnalysis] = useState<PDFAnalysis | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState("");
    const [error, setError] = useState<string | null>(null);

    const analyze = useCallback(async (file: File) => {
        setIsAnalyzing(true);
        setProgress(0);
        setProgressMessage("Iniciando...");
        setError(null);
        setAnalysis(null);

        try {
            const result = await analyzePDF(file, (p, msg) => {
                setProgress(p);
                setProgressMessage(msg);
            });
            setAnalysis(result);
            toast.success("Análise concluída com sucesso!");
        } catch (err: any) {
            const errorMessage = err.message || "Erro desconhecido ao analisar PDF";
            setError(errorMessage);
            setAnalysis(null);
            toast.error("Falha na análise", {
                description: errorMessage,
            });
        } finally {
            setIsAnalyzing(false);
        }
    }, []);

    const reset = useCallback(() => {
        setAnalysis(null);
        setError(null);
        setProgress(0);
        setProgressMessage("");
    }, []);

    return {
        analysis,
        isAnalyzing,
        progress,
        progressMessage,
        error,
        analyze,
        reset,
    };
}
