
import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    isDark: boolean;
    maxWidth?: string; // Para controlar a largura do modal se necessário
}

export function Modal({ isOpen, onClose, title, children, isDark, maxWidth = "max-w-4xl" }: ModalProps) {
    // Fechar ao pressionar ESC
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const glassCard = isDark ? "glass-card-dark" : "glass-card-light";
    const txt = isDark ? "text-white" : "text-gray-900";
    const txt2 = isDark ? "text-gray-400" : "text-gray-600";
    const btnHover = isDark ? "hover:bg-white/10" : "hover:bg-gray-200/50";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop com Blur intenso */}
            <div
                className={`absolute inset-0 backdrop-blur-md transition-opacity duration-300 ${isDark ? "bg-black/60" : "bg-white/60"}`}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Container do Modal */}
            <div
                className={`relative w-full ${maxWidth} max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-scale-in ${glassCard} border border-opacity-20`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                {/* Header */}
                <div className={`flex items-center justify-between p-5 sm:p-6 border-b ${isDark ? "border-white/5" : "border-gray-200/50"}`}>
                    <h2 id="modal-title" className={`text-xl font-bold ${txt}`}>
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-full transition-colors duration-200 ${txt2} ${btnHover}`}
                        aria-label="Fechar modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content - Scrollável */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
}
