import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient, UsageTier, type Client } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Plus } from "lucide-react";

interface AddClientDialogProps {
    onClientCreated: (client: Client) => void;
    variant?: "default" | "outline" | "secondary";
    trigger?: React.ReactNode;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    isRapidIntake?: boolean;
}

export function AddClientDialog({ onClientCreated, variant = "default", trigger, isOpen, onOpenChange, isRapidIntake = false }: AddClientDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = isOpen !== undefined;
    const open = isControlled ? isOpen : internalOpen;
    const setOpen = isControlled ? (onOpenChange || (() => { })) : setInternalOpen;
    const [formData, setFormData] = useState<{
        name: string;
        dni: string;
        phone: string;
        usage_tier: UsageTier;
    }>({
        name: "",
        dni: "",
        phone: "",
        usage_tier: UsageTier.CASUAL
    });

    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: createClient,
        onSuccess: (data) => {
            setOpen(false);
            setFormData({ name: "", dni: "", phone: "", usage_tier: UsageTier.CASUAL });
            onClientCreated(data);

            // Invalidate queries to ensure fresh data
            queryClient.invalidateQueries({ queryKey: ["fleet"] });
            queryClient.invalidateQueries({ queryKey: ["clients"] });

            // Rapid Intake: Skip redirect, parent handles next step
            if (!isRapidIntake) {
                navigate(`/clients/${data.id}`);
            }
        },
        onError: () => alert("Error Create Client")
    });

    const handleSubmit = () => {
        if (!formData.name || !formData.phone) return alert("Name and Phone required");
        mutation.mutate(formData);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button variant={variant} size={variant === 'default' ? "default" : "default"} className={variant === 'default' ? "h-12 w-12 p-0 rounded-full" : "w-full"}>
                        {variant === 'default' ? <UserPlus className="h-6 w-6" /> : <><Plus className="mr-2 h-4 w-4" /> Crear Nuevo Cliente</>}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nuevo Cliente</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Nombre Completo</Label>
                        <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Juan Perez" />
                    </div>
                    <div className="space-y-2">
                        <Label>DNI / Documento</Label>
                        <Input value={formData.dni} onChange={e => setFormData({ ...formData, dni: e.target.value })} placeholder="Ej: 12345678" />
                    </div>
                    <div className="space-y-2">
                        <Label>Teléfono / WhatsApp</Label>
                        <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="Ej: 11 1234 5678" />
                    </div>
                    <div className="space-y-2">
                        <Label>Tipo de Ciclista (Tier)</Label>
                        <Select onValueChange={(v) => setFormData({ ...formData, usage_tier: v as UsageTier })} defaultValue={UsageTier.CASUAL as string}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={UsageTier.CASUAL}>Casual (Uso Urbano/Paseo)</SelectItem>
                                <SelectItem value={UsageTier.SPORT}>Sport (Entrenamiento/Ruta)</SelectItem>
                                <SelectItem value={UsageTier.PRO_HEAVY}>PRO / Heavy (Competencia)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit} disabled={mutation.isPending}>
                        {mutation.isPending ? "Guardando..." : "Guardar Cliente"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
