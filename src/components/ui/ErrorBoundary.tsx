import { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
                        <div className="bg-red-50 p-6 flex items-center justify-center border-b border-red-100">
                            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                                <AlertCircle className="w-8 h-8 text-red-600" />
                            </div>
                        </div>

                        <div className="p-6 text-center">
                            <h2 className="text-xl font-bold text-gray-900 mb-2">
                                Ops! Algo deu errado.
                            </h2>
                            <p className="text-gray-500 mb-6 text-sm">
                                Ocorreu um erro inesperado na aplicação. Nossa equipe foi notificada automaticamente.
                            </p>

                            {this.state.error && (
                                <div className="bg-gray-100 rounded-lg p-3 mb-6 text-left overflow-auto max-h-32">
                                    <code className="text-xs text-red-600 font-mono">
                                        {this.state.error.message}
                                    </code>
                                </div>
                            )}

                            <button
                                onClick={this.handleReload}
                                className="w-full py-2.5 px-4 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Recarregar Aplicação
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
