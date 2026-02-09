import { useState } from "react";
import { AddClientDialog } from "./AddClientDialog";
import { AddBikeDialog } from "./AddBikeDialog";
import { ServiceModal } from "./ServiceModal";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { type Client, type Bike } from "@/lib/api";

interface RapidIntakeWizardProps {
    onComplete?: () => void;
    trigger?: React.ReactNode;
}

export function RapidIntakeWizard({ onComplete, trigger }: RapidIntakeWizardProps) {
    const [step, setStep] = useState<"IDLE" | "CLIENT" | "BIKE" | "SERVICE">("IDLE");
    const [newClient, setNewClient] = useState<Client | null>(null);
    const [newBike, setNewBike] = useState<Bike | null>(null);

    // Step 1: Start Flow
    const startFlow = () => {
        setStep("CLIENT");
        setNewClient(null);
        setNewBike(null);
    };

    // Step 2: Client Created
    const handleClientCreated = (client: Client) => {
        setNewClient(client);
        setStep("BIKE");
        // Simple toast/alert could go here
    };

    // Step 3: Bike Created
    const handleBikeCreated = (bike: Bike) => {
        setNewBike(bike);
        setStep("SERVICE");
    };

    // Step 4: Service Created (Flow Complete)
    const handleServiceCreated = () => {
        setStep("IDLE");
        if (onComplete) onComplete();
    };

    const handleClose = () => {
        setStep("IDLE");
    }

    return (
        <>
            {/* Trigger Button */}
            {trigger ? (
                <div onClick={startFlow}>{trigger}</div>
            ) : (
                <Button onClick={startFlow} className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-6">
                    <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Cliente (Rápido)
                </Button>
            )}

            {/* Step 1: Client Dialog */}
            {step === "CLIENT" && (
                <AddClientDialog
                    // Wait, current AddClientDialog has internal state `open`.
                    // I will add `isOpen` and `onOpenChange` props to AddClientDialog in the next step.
                    // So I will write this assuming I will make those changes.
                    isOpen={true}
                    onOpenChange={(open) => !open && handleClose()}
                    onClientCreated={handleClientCreated}
                    isRapidIntake={true}
                />
            )}

            {/* Step 2: Bike Dialog */}
            {step === "BIKE" && newClient && (
                <AddBikeDialog
                    isOpen={true}
                    onClose={handleClose}
                    clientId={newClient.id!}
                    clientName={newClient.name}
                    onBikeCreated={handleBikeCreated}
                    isRapidIntake={true}
                />
            )}

            {/* Step 3: Service Modal */}
            {step === "SERVICE" && newClient && newBike && (
                <ServiceModal
                    isOpen={true}
                    onClose={handleClose}
                    initialClientData={newClient}
                    initialBikeData={newBike}
                    onSuccess={handleServiceCreated}
                />
            )}
        </>
    );
}
