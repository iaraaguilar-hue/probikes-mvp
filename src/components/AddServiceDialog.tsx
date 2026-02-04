import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createService, ServiceType, type Bike, type ServiceRecord } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


interface AddServiceDialogProps {
    bike: Bike;
    isOpen: boolean;
    onClose: () => void;
    onServiceCreated: (service: ServiceRecord) => void;
}

export function AddServiceDialog({ bike, isOpen, onClose, onServiceCreated }: AddServiceDialogProps) {
    const [serviceType, setServiceType] = useState<ServiceType>(ServiceType.SPORT);
    const [notes, setNotes] = useState("");

    const mutation = useMutation({
        mutationFn: createService,
        onSuccess: (data) => {
            setNotes("");
            onServiceCreated(data);
        },
        onError: () => alert("Error creando servicio")
    });

    const handleSubmit = () => {
        if (!bike.id) return;
        mutation.mutate({
            bike_id: bike.id,
            service_type: serviceType,
            status: "Intake",
            mechanic_notes: notes
        });
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Ingresar Servicio: {bike.brand} {bike.model}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Tipo de Servicio</Label>
                        <Select onValueChange={(v) => setServiceType(v as ServiceType)} defaultValue={ServiceType.SPORT}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar Servicio" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ServiceType.SPORT}>Service Sport (Básico)</SelectItem>
                                <SelectItem value={ServiceType.EXPERT}>Service Expert (Completo)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Observaciones de Ingreso</Label>
                        <Textarea
                            placeholder="Ej: Ruidos en caja pedalera..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit} disabled={mutation.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
                        {mutation.isPending ? "Ingresando..." : "Confirmar Ingreso"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
