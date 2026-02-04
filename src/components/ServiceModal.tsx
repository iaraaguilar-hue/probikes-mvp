import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { searchClients, getClientBikes, createService, updateService, getService, ServiceType, type Client, type Bike } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Search, User, Bike as BikeIcon, Plus, CheckCircle, Wrench, Pencil, Trash2 } from "lucide-react";
import { AddClientDialog } from "@/components/AddClientDialog";
import { AddBikeDialog } from "@/components/AddBikeDialog";
import { EditBikeDialog } from "@/components/EditBikeDialog";

interface ServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    preSelectedClientId?: number; // API uses number usually, but let's check. IntakeWizard used Client object. Let's support ID lookups or Objects. Best to stick to Objects if available, or fetch if ID. Detailed request said "preSelectedClientId: string". I'll convert if needed.
    preSelectedBikeId?: number;
    initialClientData?: Client | null; // For direct passing if we have it
    initialBikeData?: Bike | null;
    preSelectedServiceId?: number;
    onSuccess?: () => void;
}

export function ServiceModal({
    isOpen,
    onClose,
    preSelectedClientId,
    preSelectedBikeId,
    initialClientData,
    initialBikeData,
    preSelectedServiceId,
    onSuccess
}: ServiceModalProps) {

    // Internal State
    const [step, setStep] = useState<"SEARCH_CLIENT" | "SELECT_BIKE" | "DEFINE_SERVICE">("SEARCH_CLIENT");
    const [selectedClient, setSelectedClient] = useState<Client | null>(initialClientData || null);
    const [selectedBike, setSelectedBike] = useState<Bike | null>(initialBikeData || null);

    // Initial Setup Effect
    // Initial Setup Effect
    useEffect(() => {
        if (isOpen) {
            // Case 1: Edit Mode (Service ID)
            if (preSelectedServiceId) {
                setStep("DEFINE_SERVICE");
            }
            // Case 2: New Service with Pre-selected Data (IDs or Objects)
            else if ((preSelectedClientId && preSelectedBikeId) || (initialClientData && initialBikeData)) {
                // Determine Client
                if (initialClientData) setSelectedClient(initialClientData);
                // Note: If we only have ID, we rely on the component (ServiceDefinitionStep) to just use the ID or name if passed?
                // Actually ServiceDefinitionStep needs `clientName`.
                // If we don't have object, we can't get name easily without fetch.
                // But BikeDetail passes BOTH object and ID now.

                // Determine Bike
                if (initialBikeData) setSelectedBike(initialBikeData);

                setStep("DEFINE_SERVICE");
            }
            // Case 3: Only Client Pre-selected
            else if (preSelectedClientId || initialClientData) {
                if (initialClientData) setSelectedClient(initialClientData);
                setStep("SELECT_BIKE");
            }
            // Case 4: Default (Fresh Open)
            else {
                setStep("SEARCH_CLIENT");
                setSelectedClient(null);
                setSelectedBike(null);
            }
        }
    }, [isOpen, initialClientData, initialBikeData, preSelectedClientId, preSelectedBikeId, preSelectedServiceId]);

    const handleClose = (open: boolean) => {
        if (!open) {
            onClose();
            // Reset after transition usually, but simplest to reset on re-open or just leave it. 
            // We rely on the useEffect above to reset/set state on Open.
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            {step === "DEFINE_SERVICE" && (selectedBike || preSelectedServiceId) ? (
                <ServiceDefinitionStep
                    bike={selectedBike || null}
                    serviceId={preSelectedServiceId}
                    clientName={selectedClient?.name || initialClientData?.name || ""}
                    onSuccess={() => {
                        if (onSuccess) onSuccess();
                        onClose();
                    }}
                    onBack={() => setStep("SELECT_BIKE")}
                />
            ) : (
                <DialogContent className="max-w-3xl min-h-[500px] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            {step === "SEARCH_CLIENT" && <><User /> Identificar Cliente</>}
                            {step === "SELECT_BIKE" && <><BikeIcon /> Seleccionar Bicicleta</>}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 py-4">
                        {step === "SEARCH_CLIENT" && (
                            <ClientSearchStep
                                onClientSelect={(client) => {
                                    setSelectedClient(client);
                                    setStep("SELECT_BIKE");
                                }}
                            />
                        )}

                        {step === "SELECT_BIKE" && selectedClient && (
                            <BikeSelectionStep
                                client={selectedClient}
                                onBikeSelect={(bike) => {
                                    setSelectedBike(bike);
                                    setStep("DEFINE_SERVICE");
                                }}
                                onBack={() => setStep("SEARCH_CLIENT")}
                            />
                        )}
                    </div>
                </DialogContent>
            )}
        </Dialog>
    )
}

// --- SUB COMPONENTS (Copied from IntakeWizard and adapted) ---

function ClientSearchStep({ onClientSelect }: { onClientSelect: (c: Client) => void }) {
    const [query, setQuery] = useState("");
    const { data: clients, isLoading } = useQuery({
        queryKey: ["clients", query],
        queryFn: () => searchClients(query),
        enabled: query.length > 0
    });

    return (
        <div className="space-y-6">
            <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="Buscar por Nombre o Teléfono..."
                    className="pl-10 text-lg h-12"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    autoFocus
                />
            </div>

            <div className="space-y-2">
                {isLoading && <p className="text-muted-foreground">Buscando...</p>}
                {clients?.map((client, index) => (
                    <Card key={client.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => onClientSelect(client)}>
                        <CardContent className="p-4 flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-lg">
                                    <span className="text-primary mr-1">#{typeof index !== 'undefined' ? index + 1 : (client.displayId || 'ID')}</span>
                                    {client.name}
                                </h4>
                                <p className="text-muted-foreground">{client.phone}</p>
                            </div>
                            <Badge>{client.usage_tier}</Badge>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="pt-4 border-t mt-4">
                <AddClientDialog
                    onClientCreated={(client) => {
                        // Feature: Auto-select created client
                        onClientSelect(client);
                    }}
                    variant="outline"
                />
            </div>
        </div>
    )
}

function BikeSelectionStep({ client, onBikeSelect, onBack }: { client: Client, onBikeSelect: (b: Bike) => void, onBack: () => void }) {
    const queryClient = useQueryClient();
    const { data: bikes, isLoading } = useQuery({
        queryKey: ["bikes", client.id],
        queryFn: () => getClientBikes(client.id!)
    });
    const [showAddBike, setShowAddBike] = useState(false);
    const [editingBike, setEditingBike] = useState<Bike | null>(null);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-accent/20 p-3 rounded-lg border border-primary/20">
                <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-bold text-lg">{client.name}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={onBack}>Cambiar</Button>
            </div>

            <h3 className="text-lg font-semibold">Garage del Cliente</h3>

            <div className="min-h-[200px]">
                {isLoading && <p>Cargando garage...</p>}

                <div className="grid gap-3">
                    {bikes?.map(bike => (
                        <Card key={bike.id} className="cursor-pointer hover:border-primary group transition-all relative">
                            <CardContent className="p-4 flex items-center gap-4" onClick={() => onBikeSelect(bike)}>
                                <div className="h-10 w-10 bg-secondary/20 rounded-full flex items-center justify-center text-secondary-foreground">
                                    <BikeIcon size={20} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold">{bike.brand} {bike.model}</h4>
                                    <p className="text-sm text-muted-foreground">{bike.transmission}</p>
                                </div>
                                <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100">Seleccionar</Button>
                            </CardContent>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground z-10"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingBike(bike);
                                }}
                            >
                                <Pencil size={14} />
                            </Button>
                        </Card>
                    ))}
                </div>

                <div className="mt-4 pt-4 border-t">
                    <Button variant="outline" className="w-full" onClick={() => setShowAddBike(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Agregar Nueva Bicicleta al Garage
                    </Button>
                </div>
            </div>

            <AddBikeDialog
                clientId={client.id!}
                clientName={client.name}
                isOpen={showAddBike}
                onClose={() => setShowAddBike(false)}
                onBikeCreated={(bike) => {
                    setShowAddBike(false);
                    onBikeSelect(bike); // Auto-select new bike
                }}
            />

            {editingBike && (
                <EditBikeDialog
                    bike={editingBike}
                    isOpen={true}
                    onClose={() => setEditingBike(null)}
                    onBikeUpdated={() => {
                        setEditingBike(null);
                        queryClient.invalidateQueries({ queryKey: ["bikes", client.id] });
                    }}
                />
            )}
        </div>
    )
}

function ServiceDefinitionStep({ bike, serviceId, clientName, onSuccess, onBack }: { bike: Bike | null, serviceId?: number, clientName: string, onSuccess: () => void, onBack: () => void }) {
    const [serviceType, setServiceType] = useState<ServiceType>(ServiceType.SPORT);
    const [notes, setNotes] = useState("");

    // Financial State
    const [basePrice, setBasePrice] = useState(40000);
    const [extraItems, setExtraItems] = useState<{ id: string, description: string, price: number, category?: 'part' | 'labor' }[]>([]);

    const queryClient = useQueryClient();
    // const navigate = useNavigate(); // Unused

    // Load Existing data if Edit Mode
    useQuery({
        queryKey: ["service_detail", serviceId],
        queryFn: async () => {
            if (!serviceId) return null;
            const s = await getService(serviceId); // Need to import getService or assume available
            // Note: ServiceDefinitionStep needs getService imported.
            // But getService is in api.ts.
            // I should ensure imports.

            // Populate State
            setServiceType(s.service_type as ServiceType);
            setNotes(s.mechanic_notes || "");
            setBasePrice(s.basePrice || (s.service_type === "Sport" ? 40000 : s.service_type === "Expert" ? 70000 : 0));
            setExtraItems(s.extraItems || []);
            // Also need bike/client info if `bike` prop is null?
            // The modal logic assumes `bike` is set for creation. For editing, we might need to fetch it to show info?
            // User requirement was just "Edit Mode... current data loaded".
            return s;
        },
        enabled: !!serviceId
    });

    const totalPrice = basePrice + extraItems.reduce((acc, item) => acc + item.price, 0);

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            if (serviceId) {
                // UPDATE
                return await updateService(serviceId, data); // Need explicit updateService import
            } else {
                // CREATE
                return await createService(data);
            }
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["dashboard_jobs"] });
            if (bike) queryClient.invalidateQueries({ queryKey: ["bike_services", bike?.id] });

            alert(`Service #${data.id} ${serviceId ? "Actualizado" : "Creado"}!`);
            onSuccess();
        },
        onError: () => alert("Error al guardar servicio")
    });


    const handleTypeChange = (type: ServiceType) => {
        setServiceType(type);
        // Auto-Price Logic
        if (type === ServiceType.SPORT) setBasePrice(40000);
        else if (type === ServiceType.EXPERT) setBasePrice(70000);
        else setBasePrice(0);
    }

    const addItem = () => {
        setExtraItems([...extraItems, { id: Date.now().toString(), description: "", price: 0, category: 'part' }]);
    }

    const updateItem = (id: string, field: "description" | "price", value: any) => {
        setExtraItems(items => items.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    }

    const deleteItem = (id: string) => {
        setExtraItems(items => items.filter(i => i.id !== id));
    }

    const handleSubmit = () => {
        const payload = {
            bike_id: bike?.id || 0, // Should exist, or from loaded service
            service_type: serviceType,
            status: "Pending", // Or keep existing? If editing, we shouldn't reset status usually. 
            // Ideally backend handles "partial" update or we merge.
            // updateService takes Partial. createService takes full.
            mechanic_notes: notes,
            basePrice: basePrice || 0,
            extraItems: extraItems || [],
            totalPrice: totalPrice || 0
        };

        // If editing, we don't want to reset status to Pending likely.
        // `updateService` merge Partial.
        // `createService` uses status.
        // So for `mutation`, if serviceId exists, we should probably NOT send status unless intended.
        // I will let `updateService` merge it. But explicit "Pending" overwrite might be bad.
        // Let's refine payload.
        if (serviceId) {
            delete (payload as any).status;
            delete (payload as any).bike_id; // Don't change bike
        }

        mutation.mutate(payload);
    }

    return (
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
            {/* 1. Header (Fixed) */}
            <div className="p-6 border-b z-10 bg-background">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <Wrench className="w-6 h-6 text-primary" />
                        Detalles del Service
                    </DialogTitle>
                </DialogHeader>
                <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-100 flex justify-between items-center text-orange-900">
                    <div>
                        <p className="text-sm font-semibold">{clientName}</p>
                        <p className="font-bold">{bike?.brand} {bike?.model}</p>
                    </div>
                    {!serviceId && <Button variant="ghost" size="sm" onClick={onBack} className="hover:bg-orange-100 text-orange-700">Cambiar Bici</Button>}
                </div>
            </div>

            {/* 2. Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* Section A: Service Type Cards */}
                <div>
                    <Label className="text-lg font-semibold mb-3 block">Tipo de Service</Label>
                    <div className="grid grid-cols-3 gap-4">
                        <ServiceOption
                            selected={serviceType === ServiceType.SPORT}
                            onClick={() => handleTypeChange(ServiceType.SPORT)}
                            title="SPORT"
                            desc="$ 40.000"
                        />
                        <ServiceOption
                            selected={serviceType === ServiceType.EXPERT}
                            onClick={() => handleTypeChange(ServiceType.EXPERT)}
                            title="EXPERT"
                            desc="$ 70.000"
                        />
                        <ServiceOption
                            selected={serviceType === ServiceType.OTHER}
                            onClick={() => handleTypeChange(ServiceType.OTHER)}
                            title="OTRO"
                            desc="A Medida"
                        />
                    </div>
                </div>

                {/* Section B: Pricing & Items */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg">
                        <Label>Precio Base ($)</Label>
                        <Input
                            type="text"
                            placeholder="0"
                            value={basePrice === 0 ? '' : basePrice.toLocaleString('es-AR')}
                            onChange={(e) => {
                                const rawValue = e.target.value.replace(/\./g, '');
                                if (!/^\d*$/.test(rawValue)) return;
                                setBasePrice(Number(rawValue));
                            }}
                            className="w-32 text-right font-bold text-lg font-mono"
                        />
                    </div>

                    {/* Dynamic List */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <Label>Items Adicionales / Repuestos</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addItem}>+ Agregar</Button>
                        </div>

                        {extraItems.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic text-center py-2">Sin items extra</p>
                        ) : (
                            <div className="space-y-2">
                                {extraItems.map((item) => (
                                    <div key={item.id} className="flex gap-2 items-center">
                                        <div className="flex bg-muted rounded-md p-1 gap-1">
                                            <Button
                                                type="button"
                                                variant={item.category === 'part' ? 'default' : 'ghost'}
                                                size="icon"
                                                className={`h-8 w-8 ${item.category === 'part' ? 'bg-blue-600 hover:bg-blue-700' : 'text-muted-foreground'}`}
                                                onClick={() => updateItem(item.id, 'category' as any, 'part')}
                                                title="Repuesto"
                                            >
                                                <div className="scale-75">📦</div>
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={item.category === 'labor' ? 'default' : 'ghost'}
                                                size="icon"
                                                className={`h-8 w-8 ${item.category === 'labor' ? 'bg-amber-600 hover:bg-amber-700' : 'text-muted-foreground'}`}
                                                onClick={() => updateItem(item.id, 'category' as any, 'labor')}
                                                title="Mano de Obra"
                                            >
                                                <div className="scale-75">🛠️</div>
                                            </Button>
                                        </div>
                                        <Input
                                            placeholder="Descripción"
                                            value={item.description}
                                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                        />
                                        <Input
                                            type="text"
                                            placeholder="$ 0"
                                            value={item.price === 0 ? '' : item.price.toLocaleString('es-AR')}
                                            onChange={(e) => {
                                                const rawValue = e.target.value.replace(/\./g, '');
                                                if (!/^\d*$/.test(rawValue)) return;
                                                updateItem(item.id, 'price', Number(rawValue));
                                            }}
                                            className="w-24 text-right font-mono pl-6"
                                        />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => deleteItem(item.id)}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Section C: Total & Notes */}
                <div className="flex justify-between items-center pt-4 border-t border-dashed">
                    <span className="text-xl font-bold">Total Estimado</span>
                    <span className="text-3xl font-black text-primary">$ {totalPrice.toLocaleString("es-AR")}</span>
                </div>

                <div className="space-y-2">
                    <Label>Observaciones / Detalle del Trabajo</Label>
                    <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder={serviceType === ServiceType.OTHER ? "Describir reparación puntual..." : "Notas de ingreso..."}
                        className="text-lg"
                    />
                </div>
            </div>

            {/* 3. Footer (Fixed) */}
            <div className="p-6 border-t bg-muted/10 z-10">
                <Button size="lg" className="w-full text-lg h-12" onClick={handleSubmit} disabled={mutation.isPending}>
                    {mutation.isPending ? "PROCESANDO..." : (serviceId ? "GUARDAR CAMBIOS" : "CONFIRMAR INGRESO")}
                </Button>
            </div>
        </DialogContent>
    )
}

function ServiceOption({ selected, onClick, title, desc }: { selected: boolean, onClick: () => void, title: string, desc: string }) {
    return (
        <div
            onClick={onClick}
            className={`cursor-pointer border-2 rounded-xl p-4 text-center transition-all ${selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
        >
            <div className={`font-black text-xl mb-1 ${selected ? "text-primary" : "text-foreground"}`}>{title}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">{desc}</div>
            {selected && <div className="mt-2 flex justify-center text-primary"><CheckCircle size={16} fill="currentColor" className="text-white" /></div>}
        </div>
    )
}
