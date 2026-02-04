import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createBike, type Bike } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AddBikeDialogProps {
    clientId: number;
    clientName: string;
    isOpen: boolean;
    onClose: () => void;
    onBikeCreated: (bike: Bike) => void;
}

export function AddBikeDialog({ clientId, clientName, isOpen, onClose, onBikeCreated }: AddBikeDialogProps) {
    const [formData, setFormData] = useState({
        brand: "",
        model: "",
        transmission: "",
        notes: ""
    });

    const mutation = useMutation({
        mutationFn: createBike,
        onSuccess: (data) => {
            setFormData({ brand: "", model: "", transmission: "", notes: "" });
            onBikeCreated(data);
        },
        onError: () => alert("Error creando bicicleta")
    });

    const handleSubmit = () => {
        if (!formData.brand || !formData.model) return alert("Marca y Modelo son obligatorios");
        mutation.mutate({
            ...formData,
            client_id: clientId
        });
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nueva Bici para {clientName}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Marca</Label>
                        <Input value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} placeholder="Ej: Specialized" />
                    </div>
                    <div className="space-y-2">
                        <Label>Modelo</Label>
                        <Input value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} placeholder="Ej: Tarmac SL7" />
                    </div>
                    <div className="space-y-2">
                        <Label>Transmisión</Label>
                        <Input value={formData.transmission} onChange={e => setFormData({ ...formData, transmission: e.target.value })} placeholder="Ej: Shimano Ultegra 12s" />
                    </div>
                    <div className="space-y-2">
                        <Label>Notas Generales</Label>
                        <Textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Detalles extra..." />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit} disabled={mutation.isPending}>
                        {mutation.isPending ? "Guardando..." : "Guardar Bici y Seguir"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
