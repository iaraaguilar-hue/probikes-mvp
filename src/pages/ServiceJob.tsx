import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle, FileText, CheckSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { printServiceReport } from '@/lib/printServiceBtn';

// URL DEL WEBHOOK (Verificada)
const MAKE_WEBHOOK_URL = "https://hook.us2.make.com/bvpeibjono39q80kiarwcswn7cwwoa6c";

export default function ServiceJob() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [job, setJob] = useState<any>(null);
    const [clientData, setClientData] = useState<any>(null);
    const [bikeModel, setBikeModel] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (!id) return;
        try {
            const stored = localStorage.getItem('clients');
            if (stored) {
                const clients = JSON.parse(stored);
                for (const c of clients) {
                    const j = c.jobs?.find((x: any) => x.id === id);
                    if (j) {
                        setJob(j);
                        setClientData(c);
                        setNotes(j.notes || '');
                        const b = c.bikes?.find((bk: any) => bk.id === j.bikeId);
                        setBikeModel(b ? b.model : 'Bicicleta');
                        break;
                    }
                }
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [id]);

    const saveChanges = (updatedJob: any) => {
        try {
            const stored = localStorage.getItem('clients');
            if (stored && clientData) {
                const clients = JSON.parse(stored);
                const updatedClients = clients.map((c: any) => {
                    if (c.id === clientData.id) {
                        const newJobs = c.jobs.map((j: any) => j.id === updatedJob.id ? updatedJob : j);
                        return { ...c, jobs: newJobs };
                    }
                    return c;
                });
                localStorage.setItem('clients', JSON.stringify(updatedClients));
                setJob(updatedJob);
                return true;
            }
            return false;
        } catch (e) { return false; }
    };

    const handleSaveNotes = () => {
        if (!job) return;
        saveChanges({ ...job, notes });
        alert("Notas guardadas.");
    };

    // --- FUNCIÓN DE DIAGNÓSTICO PROFESIONAL ---
    const triggerMakeWebhook = async (soldItems: any[]) => {
        // 1. Verificar si hay items para vender
        if (!soldItems || soldItems.length === 0) {
            alert("DIAGNÓSTICO: No se envió webhook porque no hay productos (categoría 'part') en este service.");
            return;
        }

        // 2. Construcción del Payload (Datos)
        const productosListos = soldItems.map((i: any) => ({
            descripcion: i.description,
            precio: Number(i.price) || 0
        }));

        const totalCalculado = Number(job.totalPrice) || 0;

        const payload = {
            dni_cliente: clientData?.dni || "Sin DNI",
            nombre_cliente: clientData?.name || "Cliente Sin Nombre",
            fecha_finalizacion: new Date().toISOString(),
            nombre_producto: productosListos.map(p => p.descripcion).join(", "),
            productos: productosListos,
            total_service: totalCalculado
        };

        // 3. LA PRUEBA DE LA VERDAD (Mostrar datos antes de enviar)
        const jsonString = JSON.stringify(payload, null, 2);
        const confirmacion = window.confirm(
            `CONFIRMA LOS DATOS A ENVIAR:\n\n${jsonString}\n\n¿Enviar esto al Webhook?`
        );

        if (!confirmacion) {
            console.log("Envío cancelado por el usuario.");
            return;
        }

        try {
            // 4. Envío Limpio (Sin modos raros, estándar HTTP POST)
            const response = await fetch(MAKE_WEBHOOK_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json' 
                    // Quitamos 'mode: cors' y 'keepalive' temporalmente para probar la respuesta directa del servidor
                },
                body: JSON.stringify(payload)
            });

            const responseText = await response.text();
            
            if (response.ok) {
                alert(`✅ ¡ÉXITO! El servidor respondió: ${responseText}`);
            } else {
                alert(`❌ ERROR DEL SERVIDOR: Código ${response.status}\nRespuesta: ${responseText}`);
            }

        } catch (error: any) {
            alert(`❌ ERROR DE RED: ${error.message}`);
            console.error(error);
        }
    };

    const handleFinishJob = async () => {
        if (!job) return;
        
        // Desactivamos temporalmente el guardado local para centrarnos SOLO en el webhook
        // (En producción descomentamos esto)
        const soldProducts = job.extraItems?.filter((i: any) => i.category === 'part') || [];
        
        await triggerMakeWebhook(soldProducts);
        
        // COMENTADO INTENCIONALMENTE PARA QUE NO CIERRE LA PÁGINA
        // navigate('/history'); 
    };

    const handleDownloadPDF = () => {
        if (!job || !clientData) return alert("Faltan datos.");
        printServiceReport(job, clientData.name, bikeModel, clientData.dni, clientData.phone);
    };

    if (loading) return <div>Cargando...</div>;
    if (!job) return <div>No encontrado</div>;
    const isFinished = job.status === 'FINISHED' || job.status === 'Finalizado';

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-5xl mx-auto flex items-center justify-between mb-6">
                <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2"><ArrowLeft className="w-4 h-4" /> Volver</Button>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleDownloadPDF} className="gap-2 bg-white text-orange-700 border-orange-200"><FileText className="w-4 h-4" /> PDF</Button>
                    <Button variant="outline" onClick={handleSaveNotes} className="gap-2 bg-white text-blue-700 border-blue-200"><Save className="w-4 h-4" /> Guardar Notas</Button>
                    
                    {/* Botón de PRUEBA DE WEBHOOK (Separado del finalizar real) */}
                    <Button onClick={handleFinishJob} disabled={isSending} className="gap-2 bg-purple-600 hover:bg-purple-700 text-white">
                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
                        PROBAR WEBHOOK (DEBUG)
                    </Button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader className="pb-4 border-b">
                            <CardTitle className="flex justify-between">
                                <div>{clientData?.name}<div className="text-sm text-gray-500 font-normal">{bikeModel}</div></div>
                                <Badge>{job.serviceType}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div>
                                <h3 className="font-semibold mb-2">Detalle de Costos</h3>
                                <div className="border rounded-lg divide-y">
                                    <div className="flex justify-between p-3 bg-gray-50 font-medium"><span>Service Base</span><span>$ {(job.basePrice || 0).toLocaleString('es-AR')}</span></div>
                                    {job.extraItems?.map((i: any, x: number) => (
                                        <div key={x} className="flex justify-between p-3 text-sm">
                                            <span className="flex items-center gap-2">
                                                {i.description}
                                                {i.category === 'part' && <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-[10px]">Producto</Badge>}
                                            </span>
                                            <span>$ {Number(i.price).toLocaleString('es-AR')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}