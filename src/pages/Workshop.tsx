import { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDashboardJobs, updateServiceStatus, updateService, getService, getBike, getClient, createReminders, type DashboardJob, type ServiceRecord, type Reminder } from "@/lib/api";
import { printServiceReport } from "@/lib/printServiceBtn";
import { ServiceModal } from "@/components/ServiceModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wrench, CheckCircle, Save, FileDown, Pencil } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { HealthCheckWidget, type HealthCheckData } from "@/components/HealthCheckWidget";


import { RefreshCcw } from "lucide-react";

export default function Workshop() {
    const { data: jobs, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ["dashboard_jobs"],
        queryFn: getDashboardJobs,
    });
    const [editingJob, setEditingJob] = useState<DashboardJob | null>(null);
    const [finalizingJob, setFinalizingJob] = useState<DashboardJob | null>(null);

    if (isLoading) return <div className="p-8 text-center text-muted-foreground">Cargando taller...</div>;

    return (
        <div className="space-y-6">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Wrench className="h-8 w-8 text-sky-500" />
                        Taller Activo
                    </h1>
                    <p className="text-muted-foreground mt-1">Gestión de trabajos en curso.</p>
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => refetch()}
                    title="Recargar datos"
                    className="shrink-0"
                >
                    <RefreshCcw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
                </Button>
            </div>

            <div className="w-full">
                <Card className="bg-[#00adf7] border-none shadow-md text-white w-full">
                    <CardContent className="p-6 flex flex-col gap-1">
                        <p className="text-xs font-bold text-white/90 uppercase tracking-widest">En Proceso</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-4xl font-black">{jobs?.length || 0}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>


            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="w-[100px]">Estado</TableHead>
                            <TableHead>Ingreso</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Bicicleta</TableHead>
                            <TableHead>Service</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {jobs?.map((job) => (
                            <JobRow
                                key={job.service_id}
                                job={job}
                                onClick={() => {
                                    // Clicking row opens edit? Or just edit button?
                                    // Prompt says "Action: Add an Edit (Pencil) button... Clicking it opens the ServiceModal"
                                    // Row click usually might go to details? Or do nothing?
                                    // Current code: `onClick={() => setEditingJob(job)}` (Line 81)
                                    // I'll keep it consistent.
                                    setEditingJob(job)
                                }}
                                onFinalize={() => setFinalizingJob(job)}
                            />
                        ))}
                        {jobs?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                    No hay bicicletas en el taller.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {
                editingJob && (
                    <ServiceModal
                        isOpen={!!editingJob}
                        onClose={() => setEditingJob(null)}
                        preSelectedServiceId={editingJob.service_id}
                        onSuccess={() => { }}
                    />
                )
            }

            {
                finalizingJob && (
                    <FinalizeJobDialog
                        job={finalizingJob}
                        isOpen={!!finalizingJob}
                        onClose={() => setFinalizingJob(null)}
                    />
                )
            }
        </div >
    );
}

function JobRow({ job, onClick, onFinalize }: { job: DashboardJob, onClick: () => void, onFinalize: () => void }) {

    const handleFinish = (e: React.MouseEvent) => {
        e.stopPropagation();
        onFinalize();
    }

    // Status Badge Logic
    let statusBadge;
    if (job.status === "Intake" || job.status === "In Progress") {
        statusBadge = <Badge className="bg-[#00adf7] hover:bg-[#0099da] text-white border-none">EN CURSO</Badge>;
    } else if (job.status === "Completed") {
        statusBadge = <Badge className="bg-green-600 text-white border-none">LISTO</Badge>;
    } else {
        statusBadge = <Badge variant="outline">{job.status}</Badge>;
    }

    // Service Type Badge Logic
    let serviceBadge;
    switch (job.service_type) {
        case "Sport":
            serviceBadge = <Badge className="bg-[#00adf7] hover:bg-[#0099da] text-white border-none">SPORT</Badge>;
            break;
        case "Expert":
            serviceBadge = <Badge className="bg-[#f25a30] hover:bg-[#d94e28] text-white border-none">EXPERT</Badge>;
            break;
        default:
            serviceBadge = <Badge variant="secondary" className="text-muted-foreground">OTRO</Badge>;
    }

    return (
        <TableRow
            className="hover:bg-muted/30 transition-colors cursor-pointer"
            onClick={onClick}
        >
            <TableCell>{statusBadge}</TableCell>
            <TableCell className="font-medium text-muted-foreground">
                <div className="flex flex-col">
                    <span>{new Date(job.date_in).toLocaleDateString("es-AR", { day: '2-digit', month: '2-digit' })}</span>
                    <span className="text-xs text-primary font-bold">#{job.service_id}</span>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex flex-col">
                    <span className="font-bold text-base">{job.client_name}</span>
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                        Total: <span className="text-green-600 font-bold ml-1">$ {(job.total_price || 0).toLocaleString("es-AR")}</span>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex flex-col">
                    <span className="font-semibold">{job.bike_model}</span>
                    <span className="text-xs text-muted-foreground">{job.bike_brand}</span>
                </div>
            </TableCell>
            <TableCell>{serviceBadge}</TableCell>
            <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" className="h-9" onClick={(e) => { e.stopPropagation(); onClick(); }}>
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                    </Button>
                    <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white h-9 w-9 p-0"
                        onClick={handleFinish}
                        title="Finalizar Trabajo"
                    >
                        <CheckCircle className="h-5 w-5" />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    )
}

// ... EditServiceDialog (kept as is, removed from diff for brevity if not changing, but I need to include it to not delete it if I replacing the file end)
// Wait, I am replacing from line 90.






function FinalizeJobDialog({ job, isOpen, onClose }: { job: DashboardJob, isOpen: boolean, onClose: () => void }) {
    const [service, setService] = useState<ServiceRecord | null>(null);
    const [notes, setNotes] = useState("");
    const [healthCheckData, setHealthCheckData] = useState<HealthCheckData[]>([]);

    const queryClient = useQueryClient();

    // Fetch full service details on open
    useQuery({
        queryKey: ["service", job.service_id],
        queryFn: async () => {
            const data = await getService(job.service_id);
            setService(data);
            setNotes(data.mechanic_notes || "");
            return data;
        },
        enabled: isOpen
    });

    const mutation = useMutation({
        mutationFn: async () => {
            if (!service) return;

            // 1. Capture State
            const currentNotes = notes;

            // 2. Update Details (Clear checklist_data)
            await updateService(job.service_id, {
                checklist_data: {},
                mechanic_notes: currentNotes,
                // Don't overwrite parts_used, let it persist from Edit Mode or stay null.
            });

            // 3. Create Reminders (Only if data exists)
            if (healthCheckData.length > 0) {
                // We need client_id. Fetch bike to get it.
                const bike = await getBike(service.bike_id);

                const reminders: Reminder[] = healthCheckData.map((item) => ({
                    client_id: bike.client_id,
                    bike_id: service.bike_id,
                    component: item.component,
                    due_date: item.dueDate,
                    assigned_date: new Date().toISOString(),
                    current_health: item.health,
                    status: "Pending"
                }));

                try {
                    await createReminders(reminders);
                } catch (e) {
                    console.error("Reminder creation failed", e);
                }
            }

            // --- LOGICA WEBHOOK ---
            const soldProducts = service.extraItems?.filter((i: any) => i.category === 'part') || [];

            if (soldProducts.length > 0) {
                try {
                    const bikeForWebhook = await getBike(service.bike_id);
                    const clientForWebhook = await getClient(bikeForWebhook.client_id);

                    const payload = {
                        dni_cliente: clientForWebhook.dni || "Sin DNI",
                        nombre_cliente: clientForWebhook.name || "Cliente",
                        fecha_finalizacion: new Date().toISOString(),
                        nombre_producto: soldProducts.map((p: any) => p.description).join(", "),
                        productos: soldProducts.map((p: any) => ({ descripcion: p.description, precio: Number(p.price) || 0 })),
                        total_service: Number(service.totalPrice) || 0
                    };

                    // Fetch con KEEPALIVE
                    fetch("https://hook.us2.make.com/bvpeibjono39q80kiarwcswn7cwwoa6c", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                        keepalive: true
                    }).catch(e => console.error("Webhook Error:", e));
                } catch (err) {
                    console.error("Error en Webhook:", err);
                }
            }
            // ---------------------

            // 4. Complete ONLY if not already completed
            const currentStatus = service.status.toLowerCase();
            if (currentStatus !== "completed" && currentStatus !== "delivered") {
                await updateServiceStatus(job.service_id, "Completed");
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["dashboard_jobs"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard_history"] });
            onClose();
        }
    });

    const handleDownloadPDF = async () => {
        if (!service) return;
        try {
            const bike = await getBike(service.bike_id);
            const client = await getClient(bike.client_id);
            printServiceReport(
                service,
                client.name,
                bike.model,
                client.dni || '',
                client.phone || ''
            );
        } catch (e) {
            console.error(e);
            alert("Error al generar reporte");
        }
    };

    if (!service) return null;

    const currentStatus = service.status.toLowerCase();
    const isCompleted = currentStatus === "completed" || currentStatus === "delivered";

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl text-primary">Finalizar Service: {job.client_name}</DialogTitle>
                    <p className="text-muted-foreground">{job.bike_brand} {job.bike_model} - {job.service_type}</p>
                </DialogHeader>

                <div className="grid gap-6 py-4">


                    {/* Inputs */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Detalle de Costos (Resumen)</Label>
                            <div className="bg-slate-50 rounded-lg p-4 border flex flex-col gap-2 h-32 overflow-y-auto">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600">Service Base ({service.service_type})</span>
                                    <span className="font-mono font-bold">$ {service.basePrice?.toLocaleString("es-AR") || 0}</span>
                                </div>
                                {service.extraItems && service.extraItems.map((item: any) => (
                                    <div key={item.id} className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600 truncate max-w-[180px]">{item.description}</span>
                                        <span className="font-mono">$ {item.price?.toLocaleString("es-AR") || 0}</span>
                                    </div>
                                ))}
                                <div className="border-t border-slate-200 mt-auto pt-2 flex justify-between items-center">
                                    <span className="font-bold text-slate-800">TOTAL A COBRAR</span>
                                    <span className="text-xl font-black text-primary">$ {service.totalPrice?.toLocaleString("es-AR") || 0}</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">Observaciones Finales</Label>
                            <Textarea
                                id="notes"
                                className="h-32"
                                placeholder="Notas para el cliente..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Retention Widget (Only if not completed) */}
                    {!isCompleted && (
                        <div className="pt-2">
                            <HealthCheckWidget onChange={setHealthCheckData} />
                        </div>
                    )}

                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>

                    {isCompleted ? (
                        <>
                            <Button variant="secondary" onClick={handleDownloadPDF}>
                                <FileDown className="mr-2 h-4 w-4" /> PDF
                            </Button>
                            <Button
                                onClick={() => mutation.mutate()}
                                disabled={mutation.isPending}
                                className="bg-orange-500 hover:bg-orange-600 text-white"
                            >
                                <Save className="mr-2 h-4 w-4" />
                                Guardar Cambios
                            </Button>
                        </>
                    ) : (
                        <Button
                            onClick={() => mutation.mutate()}
                            disabled={mutation.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Finalizar Service (Confirmar)
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
