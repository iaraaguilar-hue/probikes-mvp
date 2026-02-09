import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Settings } from "lucide-react";

interface RetentionItem {
    wear_id: number;
    component: string;
    estimated_end_life: string;
    bike_model: string;
    client_name: string;
    client_phone: string;
}

export default function Admin() {
    const { data: items, isLoading } = useQuery({
        queryKey: ["retention_due"],
        queryFn: async () => (await api.get<RetentionItem[]>("/retention/due")).data
    });

    const copyMessage = (item: RetentionItem) => {
        const msg = `Hola ${item.client_name.split(" ")[0]}! Te escribimos de MechanicPro. Notamos que tu ${item.bike_model} podría necesitar revisión de ${item.component} pronto. ¿Querés agendar un service?`;
        navigator.clipboard.writeText(msg);
        alert("Mensaje copiado: " + msg);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Settings className="h-8 w-8 text-sky-500" />
                Configuración
            </h1>
            <p className="text-muted-foreground">Clientes con componentes vencidos o próximos a vencer (Hoy).</p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {isLoading && <p>Cargando...</p>}
                {items?.map((item) => (
                    <Card key={item.wear_id} className="border-l-4 border-l-yellow-500">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">{item.client_name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{item.bike_model}</p>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4">
                                <p className="font-semibold text-red-400">Vence: {item.component}</p>
                                <p className="text-xs text-muted-foreground">Fecha Est.: {new Date(item.estimated_end_life).toLocaleDateString("es-AR")}</p>
                            </div>
                            <Button className="w-full" size="sm" onClick={() => copyMessage(item)}>
                                <MessageSquare className="mr-2 h-4 w-4" /> Copiar Mensaje
                            </Button>
                        </CardContent>
                    </Card>
                ))}
                {items?.length === 0 && <p className="text-muted-foreground">No hay clientes para contactar hoy.</p>}
            </div>
        </div>
    )
}
