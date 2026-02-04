import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { updateBike, type Bike } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface EditBikeDialogProps {
    bike: Bike;
    isOpen: boolean;
    onClose: () => void;
    onBikeUpdated: (bike: Bike) => void;
}

export function EditBikeDialog({ bike, isOpen, onClose, onBikeUpdated }: EditBikeDialogProps) {
    const [formData, setFormData] = useState({
        brand: "",
        model: "",
        transmission: "",
        notes: ""
    });

    useEffect(() => {
        if (bike) {
            setFormData({
                brand: bike.brand,
                model: bike.model,
                transmission: bike.transmission,
                notes: bike.notes || ""
            });
        }
    }, [bike]);

    const mutation = useMutation({
        mutationFn: (data: Bike) => updateBike(bike.id!, data),
        onSuccess: (data) => {
            onBikeUpdated(data);
            onClose();
        },
        onError: () => alert("Error actualizando bicicleta")
    });

    const handleSubmit = () => {
        if (!formData.brand || !formData.model) return alert("Marca y Modelo son obligatorios");
        mutation.mutate({
            ...bike, // keep id and client_id
            ...formData
        });
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Bicicleta</DialogTitle>
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
                        {mutation.isPending ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
