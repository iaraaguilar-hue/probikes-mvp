import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";

export default function Reminders() {
    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4">
                <div className="bg-primary/20 p-3 rounded-full">
                    <Bell className="h-8 w-8 text-primary" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">Motor de Retención</h2>
                    <p className="text-muted-foreground">Sistema de recordatorios automáticos (En Construcción)</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Próximos Vencimientos</CardTitle>
                </CardHeader>
                <CardContent className="h-64 flex items-center justify-center border-dashed border-2 rounded-lg m-4">
                    <p className="text-muted-foreground">El panel de alertas aparecerá aquí pronto.</p>
                </CardContent>
            </Card>
        </div>
    );
}
