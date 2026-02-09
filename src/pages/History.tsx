import { useEffect, useState, useRef, Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Eye, Download, Upload, ChevronUp, Pencil, Trash2, ClipboardList } from 'lucide-react';
import { printServiceReport } from '@/lib/printServiceBtn';
import { deleteService } from '@/lib/api';
import { ServiceModal } from '@/components/ServiceModal';

// Interface definitions...
interface Client { id: number; name: string; dni?: string; phone: string; }
interface Bike { id: number; client_id: number; brand: string; model: string; }
interface Service {
    id: number;
    bike_id: number;
    status: string;
    created_at?: string;
    date_in?: string;
    service_type: string;
    [key: string]: any;
}

export default function History() {
    const [allJobs, setAllJobs] = useState<any[]>([]);
    const [debugStats, setDebugStats] = useState("");
    const [expandedIds, setExpandedIds] = useState<number[]>([]);
    const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    const toggleExpand = (id: number) => {
        setExpandedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };


    const handleDelete = async (id: number) => {
        if (confirm("¿Estás seguro de eliminar este servicio? Esta acción no se puede deshacer.")) {
            try {
                await deleteService(id);
                loadData(); // Refresh list
            } catch (e) {
                alert("Error al eliminar servicio");
            }
        }
    };

    const loadData = () => {
        try {
            const rawDB = localStorage.getItem('mechanicPro_db');
            if (rawDB) {
                const db = JSON.parse(rawDB);
                const services: Service[] = Array.isArray(db.services) ? db.services : [];
                const bikes: Bike[] = Array.isArray(db.bikes) ? db.bikes : [];
                const clients: Client[] = Array.isArray(db.clients) ? db.clients : [];

                const joinedJobs = services.map(service => {
                    const bike = bikes.find(b => b.id === service.bike_id);
                    const client = clients.find(c => c.id === bike?.client_id);
                    const rawDate = service.date_in || service.created_at || "2024-01-01T00:00:00";
                    let displayDate = "Sin fecha";
                    try {
                        displayDate = new Date(rawDate).toLocaleDateString('es-AR', {
                            day: '2-digit', month: '2-digit', year: '2-digit'
                        });
                        if (displayDate === "Invalid Date") displayDate = String(rawDate);
                    } catch { displayDate = String(rawDate); }

                    return {
                        uniqueId: service.id,
                        id: service.id,
                        status: service.status || "Unknown",
                        displayDate: displayDate,
                        rawDate: rawDate,
                        clientName: client?.name || "Cliente Desconocido",
                        clientDni: client?.dni || "",
                        clientPhone: client?.phone || "",
                        bikeModel: bike ? `${bike.brand} ${bike.model}` : "Bicicleta Desconocida",
                        serviceType: service.service_type || "General",
                        rawJob: service
                    };
                });

                joinedJobs.sort((a, b) => new Date(a.rawDate || 0).getTime() - new Date(b.rawDate || 0).getTime()).reverse();

                setAllJobs(joinedJobs);
                setDebugStats(`DB Activa (mechanicPro_db): ${clients.length} Clientes, ${services.length} Servicios.`);
            } else {
                setDebugStats("No se encontró 'mechanicPro_db'. Base de datos vacía.");
            }
        } catch (e) {
            console.error("Load Error", e);
            setDebugStats(`Error cargando DB: ${e}`);
        }
    };

    // ... (Export/Import functions remain identical) ...
    const exportBackup = () => {
        const data = localStorage.getItem('mechanicPro_db');
        if (!data) return alert("No hay datos para exportar.");
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mechanic_pro_db_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    const triggerImport = () => {
        if (confirm("⚠️ ¿RESTAURAR BASE DE DATOS?\nSe reemplazarán todos los datos actuales.")) {
            fileInputRef.current?.click();
        }
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = event.target?.result as string;
                const parsed = JSON.parse(json);
                if (parsed.clients && Array.isArray(parsed.clients) && parsed.services) {
                    localStorage.setItem('mechanicPro_db', json);
                    alert("✅ Base de datos restaurada. Recargando...");
                    window.location.reload();
                } else {
                    alert("❌ Archivo inválido. No tiene el formato 'mechanicPro_db'.");
                }
            } catch (err) { alert("Error leyendo archivo."); }
        };
        reader.readAsText(file);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <ClipboardList className="h-8 w-8 text-sky-500" />
                        Historial de Trabajos
                    </h1>
                    <p className="text-xs text-muted-foreground font-mono mt-1">{debugStats}</p>
                </div>
                <div className="flex gap-2">
                    <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />
                    <Button variant="outline" size="sm" onClick={triggerImport}>
                        <Upload className="w-4 h-4 mr-2" /> Importar
                    </Button>
                    <Button onClick={exportBackup} variant="outline" size="sm" className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100">
                        <Download className="w-4 h-4 mr-2" /> Exportar Backup
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader><CardTitle>Todos los Servicios ({allJobs.length})</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Estado</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Bicicleta</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allJobs.map((job) => {
                                const isExpanded = expandedIds.includes(job.id);
                                return (
                                    <Fragment key={job.uniqueId}>
                                        <TableRow className={isExpanded ? "bg-muted/50 border-b-0" : ""}>
                                            <TableCell>
                                                <Badge className={(job.status || '').toUpperCase().includes('COMPLET') || (job.status || '').toUpperCase().includes('FINISH') || (job.status || '').toUpperCase().includes('ENTREGADO') ? 'bg-green-600' : 'bg-orange-500'}>
                                                    {job.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-bold">{job.displayDate}</div>
                                                <div className="text-xs text-gray-400">#{job.id}</div>
                                            </TableCell>
                                            <TableCell>{job.clientName}</TableCell>
                                            <TableCell>{job.bikeModel}</TableCell>
                                            <TableCell><Badge variant="outline">{job.serviceType}</Badge></TableCell>
                                            <TableCell className="text-right flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" title="Imprimir" onClick={() => printServiceReport(job.rawJob, job.clientName, job.bikeModel, job.clientDni, job.clientPhone)}>
                                                    <FileText className="w-4 h-4 text-orange-600" />
                                                </Button>
                                                {/* Toggle Expand Button */}
                                                <Button variant="ghost" size="icon" title="Ver Detalles" onClick={() => toggleExpand(job.id)}>
                                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
                                                </Button>
                                                <Button variant="ghost" size="icon" title="Editar" onClick={() => setEditingServiceId(job.id)}>
                                                    <Pencil className="w-4 h-4 text-blue-600" />
                                                </Button>
                                                <Button variant="ghost" size="icon" title="Eliminar" onClick={() => handleDelete(job.id)}>
                                                    <Trash2 className="w-4 h-4 text-red-600" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>

                                        {/* EXPANDABLE DETAIL ROW */}
                                        {isExpanded && (
                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                <TableCell colSpan={6} className="p-4">
                                                    <ExpandedServiceDetail job={job} />
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </Fragment>
                                );
                            })}

                            {allJobs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-gray-400">
                                        No se encontraron servicios registrados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>


            {
                editingServiceId && (
                    <ServiceModal
                        isOpen={!!editingServiceId}
                        onClose={() => setEditingServiceId(null)}
                        preSelectedServiceId={editingServiceId}
                        onSuccess={() => {
                            setEditingServiceId(null);
                            loadData();
                        }}
                    />
                )
            }
        </div>
    );
}

// Sub-component for the expanded view (Copied logic from BikeDetail)
function ExpandedServiceDetail({ job }: { job: any }) {
    const service = job.rawJob;
    const partItems = service.extraItems?.filter((i: any) => i.category === 'part') || [];
    const laborItems = service.extraItems?.filter((i: any) => i.category === 'labor' || !i.category) || [];
    const totalParts = partItems.reduce((acc: number, i: any) => acc + i.price, 0);
    const totalLabor = (service.basePrice || 0) + laborItems.reduce((acc: number, i: any) => acc + i.price, 0);

    return (
        <div className="bg-white border rounded-lg p-6 shadow-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4 pb-4 border-b">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        {service.service_type} <span className="text-sm font-normal text-muted-foreground">| {job.displayDate}</span>
                    </h3>
                    <p className="text-sm text-slate-500">Service realizado a <strong>{job.bikeModel}</strong></p>
                </div>

            </div>

            <div className="space-y-4">
                {/* Costs and Details taking full width */}
                <div className="space-y-4">
                    <div>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Detalle de Costos</h4>
                        <div className="bg-slate-50 rounded-lg border p-4 text-sm space-y-3">

                            {/* Parts */}
                            {partItems.length > 0 ? (
                                <div className="border-b border-slate-200 pb-2 mb-2">
                                    <div className="font-semibold text-slate-700 mb-2 flex items-center gap-1"><span className="text-xs">📦</span> REPUESTOS</div>
                                    {partItems.map((item: any) => (
                                        <div key={item.id} className="flex justify-between items-center text-slate-600 pl-2 mb-1">
                                            <span>{item.description}</span>
                                            <span className="font-mono">$ {item.price?.toLocaleString("es-AR") || 0}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-end mt-1">
                                        <span className="text-xs font-bold text-slate-500">Subtotal: $ {totalParts.toLocaleString("es-AR")}</span>
                                    </div>
                                </div>
                            ) : null}

                            {/* Labor */}
                            <div>
                                <div className="font-semibold text-slate-700 mb-2 flex items-center gap-1"><span className="text-xs">🛠️</span> MANO DE OBRA</div>
                                <div className="flex justify-between items-center text-slate-600 pl-2 mb-1">
                                    <span>Service Base ({service.service_type})</span>
                                    <span className="font-mono">$ {service.basePrice?.toLocaleString("es-AR") || 0}</span>
                                </div>
                                {laborItems.map((item: any) => (
                                    <div key={item.id} className="flex justify-between items-center text-slate-600 pl-2 mb-1">
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
                            <div className="bg-blue-50/50 -mx-4 -mb-4 p-4 mt-3 border-t border-blue-100 flex justify-between items-center rounded-b-lg">
                                <span className="font-bold text-slate-900">TOTAL FINAL</span>
                                <span className="text-xl font-black text-blue-600">$ {service.totalPrice?.toLocaleString("es-AR") || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-6 pt-4 border-t">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Notas del Mecánico</h4>
                <p className="text-sm text-slate-700 italic bg-gray-50 p-3 rounded border">
                    "{service.mechanic_notes || "Sin observaciones."}"
                </p>
            </div>
        </div>
    );
}
