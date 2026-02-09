import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getFullHistory, type ServiceRecord } from '@/lib/api';
import {
    BarChart3,
    TrendingUp,
    Package,
    Wrench,
    Calendar,
    DollarSign,
    PieChart,
    ArrowUpRight,
    ArrowDownRight,
    Brain,
    Ticket
} from 'lucide-react';

export default function Metrics() {
    const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
    const [dateStart, setDateStart] = useState<string>(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]); // Jan 1st
    const [dateEnd, setDateEnd] = useState<string>(new Date().toISOString().split('T')[0]); // Today

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const data = await getFullHistory();
        setAllServices(data);
    };

    // --- FILTER & ANALYTICS ENGINE ---
    const stats = useMemo(() => {
        const start = new Date(dateStart).getTime();
        const end = new Date(dateEnd).getTime() + (24 * 60 * 60 * 1000); // End of day

        const filtered = allServices.filter(s => {
            const date = new Date(s.date_out || s.date_in || 0).getTime();
            return date >= start && date <= end;
        });

        // 1. Financial KPIs
        let totalRevenue = 0;
        let totalLabor = 0;
        let totalPartsRevenue = 0;
        let totalPartsCount = 0;
        const uniqueBikes = new Set();

        // 2. Stock Analysis (Micro)
        const productCounts: Record<string, number> = {};

        // 3. Workshop Trends (Macro)
        const trendCategories: Record<string, number> = {
            'Cadenas': 0,
            'Frenos': 0, // Pastillas, Discos, Cables
            'Ruedas': 0, // Cubiertas, Cámaras, Liquido
            'Transmisión': 0, // Piñon, Cassette, Plato, Pata
            'Servicios': 0, // General items logic if needed
            'Otros': 0
        };

        // 4. Service Distribution (Types)
        const serviceTypeCounts: Record<string, number> = {};

        filtered.forEach(s => {
            // Financials
            totalRevenue += s.totalPrice || 0;
            uniqueBikes.add(s.bike_id);

            // Analyze Service Types
            const rawType = (s.service_type || 'General').trim();
            // Normalize: "Sport" -> "Sport", "SPORT" -> "Sport"
            // Capitalize first letter, rest lowercase
            const normalizedType = rawType.length > 1
                ? rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase()
                : rawType.toUpperCase();

            serviceTypeCounts[normalizedType] = (serviceTypeCounts[normalizedType] || 0) + 1;

            // Analyze Items
            const items = s.extraItems || [];

            // Base Service Price is Labor
            totalLabor += s.basePrice || 0;

            items.forEach(item => {
                if (item.category === 'part') {
                    totalPartsRevenue += item.price;
                    totalPartsCount++;

                    // Micro Analysis: Exact Match
                    const name = item.description.trim();
                    if (name) {
                        productCounts[name] = (productCounts[name] || 0) + 1;
                    }

                    // Macro Analysis: Categorization
                    const lower = item.description.toLowerCase();
                    if (lower.includes('cadena')) trendCategories['Cadenas']++;
                    else if (lower.includes('pastilla') || lower.includes('freno') || lower.includes('disco') || lower.includes('cable') || lower.includes('ducto')) trendCategories['Frenos']++;
                    else if (lower.includes('cubierta') || lower.includes('tubeless') || lower.includes('camara') || lower.includes('cámara') || lower.includes('parche')) trendCategories['Ruedas']++;
                    else if (lower.includes('piñon') || lower.includes('piñón') || lower.includes('cassette') || lower.includes('plato') || lower.includes('cambio') || lower.includes('shifter')) trendCategories['Transmisión']++;
                    else trendCategories['Otros']++;

                } else {
                    // Labor item
                    totalLabor += item.price;
                }
            });
        });

        // Process Top 5 Products
        const sortedProducts = Object.entries(productCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        // Process Trends
        const totalTrendCount = Object.values(trendCategories).reduce((a, b) => a + b, 0);
        const trendData = Object.entries(trendCategories)
            .filter(([, count]) => count > 0)
            .map(([category, count]) => ({
                category,
                count,
                percentage: totalTrendCount > 0 ? Math.round((count / totalTrendCount) * 100) : 0
            }))
            .sort((a, b) => b.count - a.count);

        // Process Service Distribution
        const totalServices = filtered.length;
        const serviceDistData = Object.entries(serviceTypeCounts)
            .map(([type, count]) => ({
                type,
                count,
                percentage: totalServices > 0 ? Math.round((count / totalServices) * 100) : 0
            }))
            .sort((a, b) => b.count - a.count);

        // Mix & Ticket
        const avgTicket = totalServices > 0 ? Math.round(totalRevenue / totalServices) : 0;
        const laborPerc = totalRevenue > 0 ? Math.round((totalLabor / totalRevenue) * 100) : 0;
        const partsPerc = totalRevenue > 0 ? Math.round((totalPartsRevenue / totalRevenue) * 100) : 0; // Remainder just to be safe or calc explicitly

        return {
            count: filtered.length,
            revenue: totalRevenue,
            labor: totalLabor,
            parts: totalPartsRevenue,
            partsCount: totalPartsCount,
            bikesCount: uniqueBikes.size,
            topProducts: sortedProducts,
            trends: trendData,
            serviceDist: serviceDistData,
            avgTicket,
            laborPerc,
            partsPerc
        };

    }, [allServices, dateStart, dateEnd]);

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* HEADER & CONTROLS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <BarChart3 className="h-8 w-8 text-sky-500" />
                        Métricas y Estadísticas
                    </h1>
                    <p className="text-muted-foreground">Análisis financiero y operativo del taller.</p>
                </div>

                <Card className="p-1 px-4 flex items-center gap-4 bg-muted/50 border-none">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-semibold text-muted-foreground">Período:</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input
                            type="date"
                            value={dateStart}
                            onChange={(e) => setDateStart(e.target.value)}
                            className="bg-white h-8 w-fit text-xs"
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                            type="date"
                            value={dateEnd}
                            onChange={(e) => setDateEnd(e.target.value)}
                            className="bg-white h-8 w-fit text-xs"
                        />
                    </div>
                </Card>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <KPICard
                    title="Facturación Total"
                    value={`$ ${stats.revenue.toLocaleString('es-AR')}`}
                    icon={<DollarSign className="w-5 h-5 text-green-600" />}
                    trend="+12%"
                    trendUp={true}
                    className="bg-green-50 border-green-100"
                />
                <KPICard
                    title="Mano de Obra"
                    value={`$ ${stats.labor.toLocaleString('es-AR')}`}
                    icon={<Wrench className="w-5 h-5 text-blue-600" />}
                    sublabel={`${stats.count} Servicios realizados`}
                />
                <KPICard
                    title="Venta Repuestos"
                    value={`$ ${stats.parts.toLocaleString('es-AR')}`}
                    icon={<Package className="w-5 h-5 text-orange-600" />}
                    sublabel={`${stats.partsCount} Productos vendidos`}
                />
                <KPICard
                    title="Ticket Promedio"
                    value={`$ ${stats.avgTicket.toLocaleString('es-AR')}`}
                    icon={<Ticket className="w-5 h-5 text-blue-500" />}
                    sublabel="Por visita de cliente"
                />

                <KPICard
                    title="Bicis Atendidas"
                    value={stats.bikesCount.toString()}
                    icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
                    sublabel="En el período seleccionado"
                />

                {/* MIX DE FACTURACIÓN CARD */}
                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                                <PieChart className="w-5 h-5 text-indigo-600" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-muted-foreground">Mix Facturación</h3>

                            {/* Visual Bar */}
                            <div className="pt-1">
                                <div className="flex justify-between text-xs font-bold mb-1">
                                    <span className="text-blue-600">{stats.laborPerc}% MO</span>
                                    <span className="text-orange-600">{stats.partsPerc}% REP</span>
                                </div>
                                <div className="h-3 w-full bg-orange-100 rounded-full overflow-hidden flex">
                                    <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${stats.laborPerc}%` }} />
                                    <div className="bg-orange-500 h-full transition-all duration-1000" style={{ width: `${stats.partsPerc}%` }} />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* MAIN ANALYSIS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* 1. STOCK RANKING (MICRO) */}
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-primary" />
                            Ranking de Stock
                            <span className="ml-auto text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full">Top 5 Vendidos</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats.topProducts.length === 0 ? (
                            <div className="h-40 flex items-center justify-center text-muted-foreground italic">
                                No hay datos de ventas en este período.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {stats.topProducts.map((prod, idx) => (
                                    <div key={idx} className="flex items-center gap-4 group">
                                        <div className="flex-none font-bold text-2xl text-slate-200 w-8 text-center group-hover:text-primary transition-colors">
                                            #{idx + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-slate-800">{prod.name}</div>
                                            <div className="text-xs text-muted-foreground">Repuesto específico</div>
                                        </div>
                                        <div className="flex-none bg-primary/10 text-primary font-bold px-3 py-1 rounded-lg">
                                            {prod.count} u.
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 2. REPAIR TRENDS (MACRO) */}
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChart className="w-5 h-5 text-primary" />
                            Tendencias de Taller
                            <span className="ml-auto text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full">Categorías Más Frecuentes</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats.trends.length === 0 ? (
                            <div className="h-40 flex items-center justify-center text-muted-foreground italic">
                                No hay datos de servicios en este período.
                            </div>
                        ) : (
                            <div className="space-y-6 pt-2">
                                {stats.trends.map((cat, idx) => (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex justify-between text-sm font-medium">
                                            <span className="flex items-center gap-2">
                                                {getCategoryIcon(cat.category)}
                                                {cat.category}
                                            </span>
                                            <span className="text-slate-600">{cat.percentage}% <span className="text-xs text-muted-foreground">({cat.count})</span></span>
                                        </div>
                                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${getCategoryColor(cat.category)}`}
                                                style={{ width: `${cat.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="mt-6 pt-4 border-t text-xs text-muted-foreground text-center">
                            * Agrupación automática basada en descripción de items.
                        </div>
                    </CardContent>
                </Card>

                {/* 3. SERVICE DISTRIBUTION (NEW) */}
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Brain className="w-5 h-5 text-primary" />
                            Distribución de Services
                            <span className="ml-auto text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full">Tipos Realizados</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats.serviceDist.length === 0 ? (
                            <div className="h-40 flex items-center justify-center text-muted-foreground italic">
                                No hay datos de servicios en este período.
                            </div>
                        ) : (
                            <div className="space-y-6 pt-2">
                                {stats.serviceDist.map((item, idx) => (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex justify-between text-sm font-medium">
                                            <span className="flex items-center gap-2">
                                                {/* Simple Icon based on Type */}
                                                {item.type === 'Sport' ? '🚴' : item.type === 'Expert' ? '🚵' : '🔧'}
                                                {item.type}
                                            </span>
                                            <span className="text-slate-600 font-bold">{item.percentage}% <span className="text-xs text-muted-foreground font-normal">({item.count})</span></span>
                                        </div>
                                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${item.type === 'Sport' ? 'bg-emerald-500' :
                                                    item.type === 'Expert' ? 'bg-indigo-500' : 'bg-slate-400'
                                                    }`}
                                                style={{ width: `${item.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// --- HELPER COMPONENTS ---

function KPICard({ title, value, icon, sublabel, trend, trendUp, className }: any) {
    return (
        <Card className={`${className} hover:shadow-md transition-shadow`}>
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                        {icon}
                    </div>
                    {trend && (
                        <div className={`flex items-center text-xs font-bold ${trendUp ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'} px-2 py-1 rounded-full`}>
                            {trendUp ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                            {trend}
                        </div>
                    )}
                </div>
                <div className="space-y-1">
                    <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
                    <div className="text-2xl font-bold text-slate-900">{value}</div>
                    {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
                </div>
            </CardContent>
        </Card>
    )
}

function getCategoryColor(cat: string) {
    switch (cat) {
        case 'Cadenas': return 'bg-orange-500';
        case 'Frenos': return 'bg-red-500';
        case 'Ruedas': return 'bg-blue-500';
        case 'Transmisión': return 'bg-purple-500';
        default: return 'bg-slate-400';
    }
}

function getCategoryIcon(cat: string) {
    // Just simple emojis or could use Lucide icons map
    switch (cat) {
        case 'Cadenas': return '⛓️';
        case 'Frenos': return '🛑';
        case 'Ruedas': return '🔘';
        case 'Transmisión': return '⚙️';
        default: return '📦';
    }
}
