import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

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

    private handleReset = () => {
        if (window.confirm("¿Estás seguro? Esto borrará todos los datos locales para recuperar el sistema.")) {
            localStorage.clear();
            window.location.reload();
        }
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 text-center">
                    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100">
                        <div className="flex justify-center mb-6">
                            <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center">
                                <AlertTriangle className="h-10 w-10 text-red-500" />
                            </div>
                        </div>

                        <h1 className="text-2xl font-bold text-slate-800 mb-2">Algo salió mal</h1>
                        <p className="text-slate-500 mb-6">
                            Ha ocurrido un error inesperado en la aplicación.
                        </p>

                        <div className="bg-slate-100 p-3 rounded-lg text-xs font-mono text-slate-600 mb-8 text-left overflow-auto max-h-32">
                            {this.state.error?.message}
                        </div>

                        <div className="space-y-3">
                            <Button
                                onClick={() => window.location.reload()}
                                className="w-full bg-slate-800 hover:bg-slate-900"
                            >
                                Recargar página
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={this.handleReset}
                                className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                                Restablecer datos de fábrica
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
