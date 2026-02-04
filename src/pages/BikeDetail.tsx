import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBike, getBikeServices, getBikeReminders, getClient, updateClient, updateBike, getClientBikes } from "@/lib/api";
import { printServiceReport } from "@/lib/printServiceBtn";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Wrench, AlertTriangle, CheckCircle, Clock, Pencil, Save, FileDown, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { AddBikeDialog } from "@/components/AddBikeDialog";
import { ServiceModal } from "@/components/ServiceModal";

export default function BikeDetail() {
    const { id, clientId } = useParams<{ id: string, clientId: string }>();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const location = useLocation();

    // Determine ID context
    let initialBikeId = parseInt(id || "0");
    const paramClientId = parseInt(clientId || "0");

    // Logic: 
    // Case A: /bikes/:id -> We have bikeId. We fetch bike -> client.
    // Case B: /clients/:clientId -> We have clientId. We fetch client -> we look for bikes.
    //   -> If bikes exist, we switch to first bike view (setBikeId).
    //   -> If NO bikes, we stay in "Client Mode" and prompt add bike.

    const { data: bike, isLoading: loadingBike } = useQuery({
        queryKey: ["bike", initialBikeId],
        queryFn: () => getBike(initialBikeId),
        enabled: initialBikeId > 0,
    });

    // If we have a bike, we know the client.
    // If not, we rely on paramClientId.
    const activeClientId = bike?.client_id || paramClientId;

    const { data: client } = useQuery({
        queryKey: ["client", activeClientId],
        queryFn: () => getClient(activeClientId),
        enabled: activeClientId > 0,
    });

    const { data: clientBikes } = useQuery({
        queryKey: ["bikes", activeClientId],
        queryFn: () => getClientBikes(activeClientId),
        enabled: activeClientId > 0,
    });

    // --- LOGIC: Auto-Trigger after creation ---
    useEffect(() => {
        // If coming from "Add Bike" redirect
        if (location.state?.autoStartService && bike) {
            setIsServiceDialogOpen(true);
            // Clear state to avoid reopening on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state, bike]);

    // Handle "Client Mode" -> Auto-select bike or Prompt
    useEffect(() => {
        // Logic 1: If we are at root /clients/:clientId but haven't selected a bike, and bikes exist, redirect to the first one.
        if (!initialBikeId && clientBikes && clientBikes.length > 0) {
            navigate(`/bikes/${clientBikes[0].id}`, { replace: true });
            return;
        } else if (!initialBikeId && clientBikes && clientBikes.length === 0) {
            // Logic 2: If we are at root /clients/:clientId and NO bikes exist, open the "Add Bike" dialog.
            // Only trigger this once to avoid loops
            const key = `prompted_${activeClientId}`;
            const hasPrompted = sessionStorage.getItem(key);
            if (!hasPrompted) {
                setIsAddBikeOpen(true);
                sessionStorage.setItem(key, 'true');
            }
        }
    }, [clientBikes, initialBikeId, navigate, activeClientId]);


    // UI State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isAddBikeOpen, setIsAddBikeOpen] = useState(false);

    // Service Dialog State
    const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);

    // Client State
    const [editName, setEditName] = useState("");
    const [editPhone, setEditPhone] = useState("");
    const [editEmail, setEditEmail] = useState("");

    // Bike State
    const [editBrand, setEditBrand] = useState("");
    const [editModel, setEditModel] = useState("");
    const [editTransmission, setEditTransmission] = useState("");

    const updateClientMutation = useMutation({
        mutationFn: async () => {
            // 1. Update Client
            if (activeClientId) {
                await updateClient(activeClientId, {
                    name: editName,
                    phone: editPhone,
                    // @ts-ignore
                    email: editEmail
                });
            }
            // 2. Update Bike (Only if we have one acting as context)
            if (bike) {
                await updateBike(bike.id ?? 0, {
                    brand: editBrand,
                    model: editModel,
                    transmission: editTransmission
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["client", activeClientId] });
            if (bike) queryClient.invalidateQueries({ queryKey: ["bike", bike.id] });
            setIsEditOpen(false);
        }
    });

    const handleEditClick = () => {
        if (client) {
            setEditName(client.name);
            setEditPhone(client.phone);
            // setEditEmail(client.email || ""); 

            if (bike) {
                setEditBrand(bike.brand);
                setEditModel(bike.model);
                setEditTransmission(bike.transmission);
            } else {
                // Clear bike fields if editing client only (though UI bundles them currently)
                setEditBrand("");
                setEditModel("");
                setEditTransmission("");
            }
            setIsEditOpen(true);
        }
    }

    const { data: services, isLoading: loadingServices } = useQuery({
        queryKey: ["bike_services", initialBikeId],
        queryFn: () => getBikeServices(initialBikeId),
        enabled: initialBikeId > 0
    });

    const { data: reminders, isLoading: loadingReminders } = useQuery({
        queryKey: ["bike_reminders", initialBikeId],
        queryFn: () => getBikeReminders(initialBikeId),
        enabled: initialBikeId > 0
    });

    // Loading State
    if (initialBikeId > 0 && loadingBike) return <div className="p-8"><Skeleton className="h-10 w-1/3 mb-4" /><Skeleton className="h-64 w-full" /></div>;

    // "No Bike" State (Client Mode)
    const isClientMode = !initialBikeId && activeClientId > 0;

    // Safety check
    if (!client && !loadingBike) return <div className="p-8">Cliente no encontrado.</div>;

    const totalServices = services?.filter(s => s.status === "Completed").length || 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
            {/* 1. Header & Breadcrumb */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Link to="/" className="hover:text-primary flex items-center gap-1">
                        <ArrowLeft className="h-4 w-4" /> Volver al Inicio
                    </Link>
                    <span>/</span>
                    <span className="font-semibold text-foreground">
                        {bike ? `${bike.brand} ${bike.model}` : client?.name}
                    </span>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-xl border shadow-sm">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                            {bike ? (
                                <>
                                    {bike.brand} <span className="text-primary">{bike.model}</span>
                                </>
                            ) : (
                                <span className="text-primary">Perfil del Cliente</span>
                            )}
                        </h1>
                        <p className="text-lg text-muted-foreground flex items-center gap-2 mt-1">
                            <span className="font-semibold flex items-center gap-2">
                                {client?.name}
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleEditClick}>
                                    <Pencil className="h-3 w-3" />
                                </Button>
                            </span>
                            {bike && (
                                <>• <span className="text-sm bg-slate-100 px-2 py-0.5 rounded-full">{bike.transmission}</span></>
                            )}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Start Service Button (Only when bike active) */}
                        {bike && (
                            <Button size="lg" className="shadow-md bg-blue-600 hover:bg-blue-700" onClick={() => setIsServiceDialogOpen(true)}>
                                <Wrench className="mr-2 h-5 w-5" /> Iniciar Service
                            </Button>
                        )}

                        {/* Switcher / Add Bike Button */}
                        {isClientMode && (
                            <Button onClick={() => setIsAddBikeOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" /> Agregar Bicicleta
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* If Client Mode (No Bike Selected), show something else or just hide standard sections */}
            {isClientMode ? (
                <div className="py-12 text-center border-2 border-dashed rounded-lg bg-slate-50">
                    <h3 className="text-xl font-bold text-slate-800">Este cliente no tiene bicicletas seleccionadas</h3>
                    <p className="text-muted-foreground mb-4">Agrega una bicicleta para ver su historial y mantenimiento.</p>
                    <Button onClick={() => setIsAddBikeOpen(true)} size="lg">
                        <Plus className="mr-2 h-4 w-4" /> Agregar Primera Bicicleta
                    </Button>
                </div>
            ) : (
                <>
                    {/* 2. Top Section: Bike Health (Critical Info) */}
                    <section className="space-y-4">
                        <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                            <Clock className="h-5 w-5 text-primary" /> Estado de Salud & Mantenimiento
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {loadingReminders ? (
                                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)
                            ) : reminders?.length === 0 ? (
                                <Card className="col-span-full border-dashed bg-muted/20">
                                    <CardContent className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                                        <CheckCircle className="h-8 w-8 mb-2 opacity-50" />
                                        <p>No hay alertas de mantenimiento activas.</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                reminders?.map((reminder) => {
                                    const now = new Date();
                                    const dueDate = new Date(reminder.due_date);

                                    // ---- Dynamic Health Logic ----
                                    let calculatedHealth: number;

                                    // 1. If we have assigned_date (New Logic)
                                    if (reminder.assigned_date) {
                                        const assignedDate = new Date(reminder.assigned_date);
                                        const totalDurationValues = dueDate.getTime() - assignedDate.getTime();
                                        const elapsed = now.getTime() - assignedDate.getTime();

                                        // Edge Case: If assigned today (or future somehow), 100%
                                        if (elapsed <= 0) {
                                            calculatedHealth = 100;
                                        } else if (now > dueDate) {
                                            calculatedHealth = 0;
                                        } else {
                                            // Standard Decay
                                            const percentConsumed = (elapsed / totalDurationValues) * 100;
                                            calculatedHealth = Math.max(0, 100 - percentConsumed);
                                        }
                                    }
                                    // 2. Fallback (Retroactive / Safety)
                                    else {
                                        // Prefer existing static health if available
                                        if (reminder.current_health !== undefined) {
                                            calculatedHealth = reminder.current_health;
                                        } else {
                                            // Absolute fallback: Assume 90 day standard duration ending on due date
                                            const assumedDuration = 90 * 24 * 60 * 60 * 1000; // 90 days in ms
                                            const timeLeft = dueDate.getTime() - now.getTime();

                                            if (timeLeft <= 0) calculatedHealth = 0;
                                            else {
                                                calculatedHealth = Math.min(100, (timeLeft / assumedDuration) * 100);
                                            }
                                        }
                                    }

                                    // Visualize integer percent
                                    const healthPercent = Math.round(calculatedHealth);

                                    const diffTime = dueDate.getTime() - now.getTime();
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    const isUrgent = diffDays < 10 && diffDays >= 0;
                                    const isOverdue = diffDays < 0;

                                    return (
                                        <Card key={reminder.id} className={cn(
                                            "border-l-4 transition-all hover:shadow-md",
                                            isOverdue ? "border-l-red-500 bg-red-50/10" : isUrgent ? "border-l-orange-500 bg-orange-50/10" : "border-l-green-500 bg-green-50/10"
                                        )}>
                                            <CardContent className="p-5 flex flex-col h-full justify-between gap-4">
                                                <div>
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="font-semibold text-lg">{reminder.component}</span>
                                                        <Badge variant="secondary" className={cn(
                                                            "text-xs font-mono",
                                                            healthPercent < 30 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                                                        )}>
                                                            {healthPercent}%
                                                        </Badge>
                                                    </div>
                                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                                                        <div
                                                            className={cn("h-full transition-all duration-500",
                                                                isOverdue ? "bg-red-500" : isUrgent ? "bg-orange-500" : "bg-green-500"
                                                            )}
                                                            style={{ width: `${healthPercent}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between mt-auto">
                                                    <div className="text-sm">
                                                        {isOverdue ? (
                                                            <span className="text-red-600 font-bold flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Vencido hace {Math.abs(diffDays)} días</span>
                                                        ) : (
                                                            <span className={cn("font-medium", isUrgent ? "text-orange-600" : "text-green-600")}>
                                                                Quedan {diffDays} días
                                                            </span>
                                                        )}
                                                    </div>

                                                    {(isUrgent || isOverdue) && (
                                                        <Button size="sm" variant="destructive" className="h-7 text-xs">
                                                            Agendar
                                                        </Button>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })
                            )}
                        </div>
                    </section>

                    {/* 3. Bottom Section: Service History (Vertical Timeline) */}
                    <section className="space-y-4 pt-4 border-t">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                                <Wrench className="h-5 w-5 text-primary" /> Historial de Servicios
                            </h3>
                            <Badge variant="outline" className="text-base py-1 px-3 bg-white">
                                Total Realizados: <span className="font-bold ml-1">{totalServices}</span>
                            </Badge>
                        </div>

                        <Card className="border-0 shadow-none bg-transparent">
                            <CardContent className="p-0">
                                {loadingServices ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-12 w-full" />
                                        <Skeleton className="h-12 w-full" />
                                    </div>
                                ) : services?.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                        No hay historial de servicios previos.
                                    </div>
                                ) : (
                                    <Accordion type="single" collapsible className="w-full space-y-2">
                                        {services?.map((service) => {
                                            // Categorization Logic
                                            const partItems = service.extraItems?.filter((i: any) => i.category === 'part') || [];
                                            const laborItems = service.extraItems?.filter((i: any) => i.category === 'labor' || !i.category) || [];
                                            const totalParts = partItems.reduce((acc: number, i: any) => acc + i.price, 0);
                                            const totalLabor = (service.basePrice || 0) + laborItems.reduce((acc: number, i: any) => acc + i.price, 0);

                                            return (
                                                <AccordionItem key={service.id} value={`item-${service.id}`} className="border rounded-lg bg-card px-4">
                                                    <AccordionTrigger className="hover:no-underline py-3">
                                                        <div className="flex items-center gap-4 w-full text-left">
                                                            <Badge variant={service.service_type === "Expert" ? "default" : "secondary"} className="w-20 justify-center">
                                                                {service.service_type}
                                                            </Badge>
                                                            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 flex-1">
                                                                <span className="font-semibold text-slate-800">
                                                                    {new Date(service.date_in || "").toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                                </span>
                                                                {service.status !== "Completed" && (
                                                                    <Badge variant="outline" className="w-fit text-xs text-blue-600 border-blue-200 bg-blue-50">
                                                                        {service.status}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="pt-2 pb-4 border-t mt-2">
                                                        <div className="grid md:grid-cols-2 gap-4">
                                                            <div>
                                                                <h4 className="text-sm font-semibold mb-2 text-muted-foreground uppercase text-xs tracking-wider">Tareas Realizadas</h4>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {service.checklist_data && Object.keys(service.checklist_data).length > 0 ? (
                                                                        Object.keys(service.checklist_data).map(task => (
                                                                            <Badge key={task} variant="secondary" className="font-normal text-slate-600 bg-slate-100 border-slate-200">
                                                                                <CheckCircle className="h-3 w-3 mr-1 text-green-500" /> {task}
                                                                            </Badge>
                                                                        ))
                                                                    ) : (
                                                                        <span className="text-sm text-muted-foreground italic">N/A</span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="space-y-3">

                                                                <div>
                                                                    <h4 className="text-sm font-semibold mb-2 text-muted-foreground uppercase text-xs tracking-wider">Detalle de Costos</h4>
                                                                    <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-2 border">

                                                                        {/* Section A: Parts */}
                                                                        {partItems.length > 0 ? (
                                                                            <div className="mb-3 border-b border-slate-200 pb-2">
                                                                                <div className="font-semibold text-slate-700 mb-1 flex items-center gap-1"><span className="text-xs">📦</span> REPUESTOS</div>
                                                                                {partItems.map((item: any) => (
                                                                                    <div key={item.id} className="flex justify-between items-center text-slate-600 pl-2">
                                                                                        <span>{item.description}</span>
                                                                                        <span className="font-mono">$ {item.price?.toLocaleString("es-AR") || 0}</span>
                                                                                    </div>
                                                                                ))}
                                                                                <div className="flex justify-end mt-1">
                                                                                    <span className="text-xs font-bold text-slate-500">Subtotal: $ {totalParts.toLocaleString("es-AR")}</span>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="mb-2 italic text-slate-400 text-xs text-center">- Sin Repuestos -</div>
                                                                        )}

                                                                        {/* Section B: Labor */}
                                                                        <div>
                                                                            <div className="font-semibold text-slate-700 mb-1 flex items-center gap-1"><span className="text-xs">🛠️</span> MANO DE OBRA</div>

                                                                            <div className="flex justify-between items-center text-slate-600 pl-2">
                                                                                <span>Service Base ({service.service_type})</span>
                                                                                <span className="font-mono">$ {service.basePrice?.toLocaleString("es-AR") || 0}</span>
                                                                            </div>

                                                                            {laborItems.map((item: any) => (
                                                                                <div key={item.id} className="flex justify-between items-center text-slate-600 pl-2">
                                                                                    <span>{item.description}</span>
                                                                                    <span className="font-mono">$ {item.price?.toLocaleString("es-AR") || 0}</span>
                                                                                </div>
                                                                            ))}

                                                                            <div className="flex justify-end mt-1 border-t border-slate-200 pt-1">
                                                                                <span className="text-xs font-bold text-slate-600 uppercase mr-2">Total Mano de Obra:</span>
                                                                                <span className="font-mono font-bold text-slate-700">$ {totalLabor.toLocaleString("es-AR")}</span>
                                                                            </div>
                                                                        </div>

                                                                        {/* Grand Total */}
                                                                        <div className="bg-slate-100 -mx-3 -mb-3 p-3 mt-2 border-t border-slate-200 flex justify-between items-center rounded-b-lg">
                                                                            <span className="font-bold text-slate-900">TOTAL FINAL</span>
                                                                            <span className="text-lg font-black text-blue-600">$ {service.totalPrice?.toLocaleString("es-AR") || 0}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    <h4 className="text-sm font-semibold mb-1 text-muted-foreground uppercase text-xs tracking-wider">Notas del Mecánico</h4>
                                                                    <p className="text-sm text-slate-700 italic">
                                                                        "{service.mechanic_notes || "N/A"}"
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="mt-4 pt-2 border-t flex justify-end">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (bike && client) {
                                                                        printServiceReport(service, client.name, bike.model, client.dni || '', client.phone || '');
                                                                    }
                                                                }}
                                                            >
                                                                <FileDown className="h-4 w-4" /> Descargar Comprobante
                                                            </Button>
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            );
                                        })}
                                    </Accordion>
                                )}
                            </CardContent>
                        </Card>
                    </section>

                </>
            )}

            {/* Add Bike Dialog (Auto-Prompt) */}
            {client && (
                <AddBikeDialog
                    clientId={client.id!}
                    clientName={client.name}
                    isOpen={isAddBikeOpen}
                    onClose={() => setIsAddBikeOpen(false)}
                    onBikeCreated={(newBike) => {
                        setIsAddBikeOpen(false);
                        // Auto-Navigate to the new bike's page
                        navigate(`/bikes/${newBike.id}`, { state: { autoStartService: true } });
                    }}
                />
            )}

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Editar Perfil</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[80vh] overflow-y-auto pr-2">
                        {/* Section: Client */}
                        <div className="rounded-md bg-muted/30 p-3 border">
                            <h4 className="text-sm font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2">
                                <span className="w-1 h-4 bg-primary rounded-full"></span> Datos del Cliente
                            </h4>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label htmlFor="name">Nombre Completo</Label>
                                    <Input id="name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="phone">Teléfono</Label>
                                    <Input id="phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="cliente@email.com" />
                                </div>
                            </div>
                        </div>

                        {/* Section: Bike (Only if bike exists) */}
                        {bike && (
                            <div className="rounded-md bg-muted/30 p-3 border">
                                <h4 className="text-sm font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2">
                                    <span className="w-1 h-4 bg-blue-500 rounded-full"></span> Datos de la Bicicleta
                                </h4>
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="brand">Marca</Label>
                                        <Input id="brand" value={editBrand} onChange={(e) => setEditBrand(e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="model">Modelo</Label>
                                        <Input id="model" value={editModel} onChange={(e) => setEditModel(e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="transmission">Transmisión (Grupos)</Label>
                                        <Input id="transmission" value={editTransmission} onChange={(e) => setEditTransmission(e.target.value)} placeholder="Ej: Shimano 105" />
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
                        <Button onClick={() => updateClientMutation.mutate()} disabled={updateClientMutation.isPending}>
                            <Save className="mr-2 h-4 w-4" /> Guardar Todo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Start Service Dialog (Refactored to Shared Modal) */}
            <ServiceModal
                isOpen={isServiceDialogOpen}
                onClose={() => setIsServiceDialogOpen(false)}
                initialClientData={client ? client : null}
                initialBikeData={bike ? bike : null}
                preSelectedClientId={client?.id}
                preSelectedBikeId={bike?.id}
            />

        </div >
    );
}
