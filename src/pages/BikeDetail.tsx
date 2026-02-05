import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBike, getBikeServices, getBikeReminders, getClient, updateClient, updateBike, deleteBike, getClientBikes, getClientServices } from "@/lib/api";
import { printServiceReport } from "@/lib/printServiceBtn";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Wrench, AlertTriangle, CheckCircle, Clock, Pencil, Save, FileDown, Plus, Trash2, User, Bike as BikeIcon } from "lucide-react";

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

    // --- STATE REFACTOR FOR MULTI-BIKE VIEW ---



    // --- STATE REFACTOR FOR MULTI-BIKE VIEW ---
    // Instead of relying purely on URL ID, we track "activeBikeId" locally.
    // If URL has ID, that's the default. If not, we pick first bike.

    // 1. Fetch Client Context First (Always valid if we have clientId or bikeId)
    // We need to know who the client is early.

    // Derived Active Client ID
    const [derivedClientId, setDerivedClientId] = useState<number>(activeClientId);

    // Update derived client if URL params change (refresh context)
    useEffect(() => {
        if (activeClientId > 0) setDerivedClientId(activeClientId);
    }, [activeClientId]);

    const { data: latestClientBikes, isLoading: loadingClientBikes } = useQuery({
        queryKey: ["bikes", derivedClientId],
        queryFn: () => getClientBikes(derivedClientId),
        enabled: derivedClientId > 0,
    });

    const [activeBikeId, setActiveBikeId] = useState<number>(initialBikeId);

    // Auto-Select Logic
    useEffect(() => {
        // If we entered via /bikes/:id, set that as active
        if (initialBikeId > 0) {
            setActiveBikeId(initialBikeId);
        }
        // If we entered via /clients/:clientId, select first bike if available
        else if (initialBikeId === 0 && latestClientBikes && latestClientBikes.length > 0) {
            setActiveBikeId(latestClientBikes[0].id!);
        }
    }, [initialBikeId, latestClientBikes]);

    // --- LOGIC: Auto-Trigger Service Dialog ---
    useEffect(() => {
        // Only trigger if specifically requested via state AND we have an active bike
        if (location.state?.autoStartService && activeBikeId) {
            // Check if we already handled this to prevent re-opening on tab switch
            // We use history replacement to clear the flag immediately
            setIsServiceDialogOpen(true);

            // Clear the state so it doesn't trigger again on refresh or re-render
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, activeBikeId, navigate, location.pathname]);

    // Active Bike Data
    const activeBike = latestClientBikes?.find(b => b.id === activeBikeId);

    // Client Stats (Total Services)
    const { data: allClientServices } = useQuery({
        queryKey: ["client_all_services", derivedClientId],
        queryFn: () => getClientServices(derivedClientId),
        enabled: derivedClientId > 0
    });

    const clientTotalServices = allClientServices?.filter(s => s.status === "Completed").length || 0;



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

    // NEW: Track which bike we are editing in the Garage Tab
    const [editingBikeId, setEditingBikeId] = useState<number | null>(null);

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
            // 2. Update Bike (Only if we have one explicitly editing or context)
            const targetBikeId = editingBikeId || bike?.id;
            if (targetBikeId) {
                await updateBike(targetBikeId, {
                    brand: editBrand,
                    model: editModel,
                    transmission: editTransmission
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["client", activeClientId] });
            if (activeClientId) queryClient.invalidateQueries({ queryKey: ["bikes", activeClientId] });

            // If we were editing a specific bike, go back to list
            if (editingBikeId) {
                setEditingBikeId(null);
            } else {
                setIsEditOpen(false);
            }
        }
    });

    const deleteBikeMutation = useMutation({
        mutationFn: async (idToDelete?: number) => {
            const targetId = idToDelete || editingBikeId || bike?.id;
            if (targetId) {
                await deleteBike(targetId);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["bikes", activeClientId] });
            setEditingBikeId(null); // Go back to list if we were editing
            // If the deleted bike was the active one, reset activeBikeId
            // We rely on the effect to pick a new one, but let's be safe
            // setActiveBikeId(0);
        }
    });

    const handleEditClick = () => {
        if (client) {
            setEditName(client.name);
            setEditPhone(client.phone);
            setEditEmail(client.email || "");

            // Reset Garage Tab Logic
            setEditingBikeId(null);
            // Pre-fill inputs just in case, or clear them
            setEditBrand("");
            setEditModel("");
            setEditTransmission("");

            setIsEditOpen(true);
        }
    };

    const startEditingBike = (b: any) => {
        setEditingBikeId(b.id);
        setEditBrand(b.brand);
        setEditModel(b.model);
        setEditTransmission(b.transmission);
    };

    const { data: services, isLoading: loadingServices } = useQuery({
        queryKey: ["bike_services", activeBikeId],
        queryFn: () => getBikeServices(activeBikeId),
        enabled: activeBikeId > 0
    });

    const { data: reminders, isLoading: loadingReminders } = useQuery({
        queryKey: ["bike_reminders", activeBikeId],
        queryFn: () => getBikeReminders(activeBikeId),
        enabled: activeBikeId > 0
    });

    // Loading State
    if (activeClientId > 0 && loadingBike && loadingClientBikes) return <div className="p-8"><Skeleton className="h-10 w-1/3 mb-4" /><Skeleton className="h-64 w-full" /></div>;

    // "No Bike" State
    const isClientMode = !activeBikeId && latestClientBikes?.length === 0;

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
                        {client?.name}
                    </span>
                </div>

                <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
                    {/* Header Row */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                                {client?.name}
                            </h1>
                            <div className="flex items-center gap-3 mt-1 text-muted-foreground">
                                <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-sm">
                                    <span className="font-bold text-slate-700">#{client?.displayId}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                    Total Services: <span className="font-bold text-slate-900">{clientTotalServices}</span>
                                </span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 ml-2" onClick={handleEditClick}>
                                    <Pencil className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button onClick={() => setIsAddBikeOpen(true)} variant="outline">
                                <Plus className="mr-2 h-4 w-4" /> Nueva Bici
                            </Button>
                        </div>
                    </div>

                    {/* Bike Tabs / Switcher */}
                    {latestClientBikes && latestClientBikes.length > 0 && (
                        <div className="flex overflow-x-auto gap-2 pb-1 border-b">
                            {latestClientBikes.map(b => (
                                <button
                                    key={b.id}
                                    onClick={() => setActiveBikeId(b.id!)}
                                    className={cn(
                                        "flex flex-col items-start px-4 py-2 rounded-t-lg transition-all min-w-[140px] border-b-2",
                                        activeBikeId === b.id
                                            ? "border-orange-500 bg-orange-50/50 text-orange-900"
                                            : "border-transparent hover:bg-slate-50 text-slate-500"
                                    )}
                                >
                                    <span className={cn("font-bold text-sm", activeBikeId === b.id ? "text-orange-700" : "text-slate-700")}>
                                        {b.model}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-wider">{b.brand}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Active Bike Actions Bar */}
                    {activeBike && (
                        <div className="flex justify-between items-center pt-2">
                            <div className="text-sm text-slate-500">
                                Transmisión: <span className="font-medium text-slate-900">{activeBike.transmission || "N/A"}</span>
                            </div>
                            <Button size="default" className="shadow-sm bg-blue-600 hover:bg-blue-700" onClick={() => setIsServiceDialogOpen(true)}>
                                <Wrench className="mr-2 h-4 w-4" /> Iniciar Service
                            </Button>
                        </div>
                    )}
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

            {/* Edit Dialog - Refactored with Tabs */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Editar Perfil</DialogTitle>
                        <DialogDescription>
                            Modifica los datos del cliente o gestiona la bicicleta seleccionada.
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="client" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="client" className="flex items-center gap-2"><User size={14} /> Cliente</TabsTrigger>
                            <TabsTrigger value="garage" className="flex items-center gap-2"><BikeIcon size={14} /> Garage</TabsTrigger>
                        </TabsList>

                        <TabsContent value="client" className="space-y-4 py-4">
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
                        </TabsContent>

                        <TabsContent value="garage" className="space-y-4 py-4">
                            {/* LIST VIEW */}
                            {!editingBikeId && latestClientBikes && (
                                <div className="space-y-3">
                                    {latestClientBikes.length === 0 && <p className="text-center text-muted-foreground p-4">No hay bicicletas.</p>}
                                    {latestClientBikes.map(b => (
                                        <div key={b.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                                                    <BikeIcon size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-slate-900">{b.brand} {b.model}</p>
                                                    <p className="text-xs text-slate-500">{b.transmission}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600" onClick={() => startEditingBike(b)}>
                                                    <Pencil size={14} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-500 hover:text-red-600"
                                                    onClick={() => {
                                                        if (confirm(`¿Eliminar ${b.brand} ${b.model}?`)) {
                                                            deleteBikeMutation.mutate(b.id);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    <Button variant="outline" className="w-full border-dashed" onClick={() => setIsAddBikeOpen(true)}>
                                        <Plus className="mr-2 h-4 w-4" /> Agregar Nueva Bicicleta
                                    </Button>
                                </div>
                            )}

                            {/* EDIT VIEW */}
                            {editingBikeId && (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Button variant="ghost" size="sm" className="-ml-2 h-8 px-2 text-muted-foreground" onClick={() => setEditingBikeId(null)}>
                                            <ArrowLeft size={16} className="mr-1" /> Volver
                                        </Button>
                                        <span className="font-bold text-sm">Editando Bicicleta</span>
                                    </div>

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
                                            <Label htmlFor="transmission">Transmisión</Label>
                                            <Input id="transmission" value={editTransmission} onChange={(e) => setEditTransmission(e.target.value)} placeholder="Ej: Shimano 105" />
                                        </div>

                                        <div className="pt-4 border-t mt-4">
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                className="w-full gap-2"
                                                onClick={() => {
                                                    if (confirm("¿Estás seguro de que quieres eliminar esta bicicleta? Esta acción no se puede deshacer y borrará el historial asociado.")) {
                                                        deleteBikeMutation.mutate(editingBikeId);
                                                    }
                                                }}
                                                disabled={deleteBikeMutation.isPending}
                                            >
                                                <Trash2 className="h-4 w-4" /> Eliminar Bicicleta del Sistema
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>

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
                initialBikeData={activeBike ? activeBike : null}
                preSelectedClientId={client?.id}
                preSelectedBikeId={activeBike?.id}
            />

        </div >
    );
}
