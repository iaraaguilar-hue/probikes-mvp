import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getFleetStatus, deleteClient } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, AlertTriangle, CheckCircle, Clock, Bike, PlusCircle, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function Home() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");

    // Real Data Fetching
    const { data: fleet, isLoading, refetch } = useQuery({
        queryKey: ["fleet"],
        queryFn: getFleetStatus,
    });



    const filteredFleet = fleet?.filter(item =>
        item.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.bike_model.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <img src="/img/logo_full.png" alt="ProBikes" className="h-28 w-auto" />
                    <p className="text-muted-foreground mt-1">Base de Datos de Flota y Clientes</p>
                </div>
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por cliente o modelo..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {/* 
                <Button variant="outline" size="sm" onClick={() => seedMutation.mutate()}>
                    ⚡ Cargar Datos de Prueba
                </Button>
                */}
            </div>

            {/* Grid Content */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i} className="h-40">
                            <CardContent className="p-6">
                                <Skeleton className="h-6 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-1/2 mb-4" />
                                <Skeleton className="h-8 w-24" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : fleet?.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-slate-50 text-center animate-in zoom-in-50 duration-300">
                    <Bike className="h-16 w-16 text-primary/50 mb-4" />
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Base de datos vacía</h3>
                    <p className="text-muted-foreground mb-8 text-lg">
                        No hay clientes ni bicicletas registradas aún.
                    </p>
                    <Link to="/reception">
                        <Button size="lg" className="text-lg h-12 px-8 shadow-lg hover:shadow-primary/20 transition-all">
                            <PlusCircle className="mr-2 h-5 w-5" />
                            + Agregar Primer Cliente
                        </Button>
                    </Link>
                </div>
            ) : filteredFleet?.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No se encontraron resultados para "{searchTerm}"</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredFleet?.map((bike, index) => (
                        <Card
                            key={bike.bike_id}
                            className="hover:border-primary hover:shadow-md transition-all cursor-pointer group"
                            onClick={() => {
                                if (bike.bike_id === 0) {
                                    navigate(`/clients/${bike.client_id}`);
                                } else {
                                    navigate(`/bikes/${bike.bike_id}`);
                                }
                            }}
                        >
                            <CardContent className="p-6 flex flex-col h-full justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors">
                                            {bike.client_name}
                                        </h3>
                                        <div className="flex items-center gap-1">
                                            <Badge variant="secondary" className="font-mono text-xs">
                                                #{index !== undefined ? index + 1 : (bike.bike_id || "-")}
                                            </Badge>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-red-400 hover:text-red-700 hover:bg-red-50"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm(`¿Estás seguro de eliminar el cliente ${bike.client_name} y todos sus datos?`)) {
                                                        deleteClient(bike.client_id!).then(() => refetch());
                                                    }
                                                }}
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="font-medium text-slate-600 mb-1">{bike.bike_model}</p>
                                    <p className="text-sm text-muted-foreground mb-4">{bike.bike_type}</p>
                                </div>

                                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                    {bike.next_due_date ? (
                                        <ReminderBadge
                                            date={bike.next_due_date}
                                            component={bike.next_due_component!}
                                        />
                                    ) : (
                                        <Badge variant="outline" className="text-slate-500 bg-slate-50 border-slate-200 font-normal">
                                            <CheckCircle className="mr-1 h-3 w-3" /> Sin alertas
                                        </Badge>
                                    )}
                                    <span className="text-xs font-medium text-muted-foreground bg-slate-100 px-2 py-1 rounded-full">
                                        {bike.service_count} Serv.
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

function ReminderBadge({ date, component }: { date: string, component: string }) {
    const dueDate = new Date(date);
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let colorClass = "bg-green-100 text-green-700 border-green-200";
    let icon = <Clock className="mr-1 h-3 w-3" />;
    let text = new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

    if (diffDays < 0) {
        colorClass = "bg-red-100 text-red-700 border-red-200 animate-pulse";
        icon = <AlertTriangle className="mr-1 h-3 w-3" />;
        text = "Vencido";
    } else if (diffDays < 30) {
        colorClass = "bg-orange-100 text-orange-800 border-orange-200";
        text = `${diffDays} días`;
    }

    return (
        <Badge className={`font-medium border ${colorClass} shadow-none flex items-center`}>
            {icon}
            <span className="truncate max-w-[100px] mr-1">{component}:</span> {text}
        </Badge>
    );
}
