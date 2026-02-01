import { ServiceTimeline, TimelineEvent } from '@/components/services/ServiceTimeline';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { MaintenanceRulesEngine } from '@/lib/intelligence/MaintenanceRulesEngine';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertCircle, ArrowLeft, Cpu, FileText, MoreVertical, RefreshCw, ShieldAlert, ShieldCheck, Zap } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Types (to be moved to shared types later)
interface AssetDetails {
    id: string;
    serial_number: string;
    name: string;
    model: string;
    brand: string;
    status: 'online' | 'offline' | 'maintenance' | 'error';
    is_active: boolean;
    specifications: Record<string, any>;
    installation_date?: string;
    warranty_expiry?: string;
    warranty_valid: boolean;
    image_url?: string;
}

// Mock Timeline Data (Placeholder until real API connection)
const MOCK_EVENTS: TimelineEvent[] = [
    { id: '1', date: '2025-10-15', title: 'Firmware Update v2.1', type: 'maintenance', status: 'completed', description: 'Over-the-air update for motion controller optimization.' },
    { id: '2', date: '2025-06-01', title: 'Quarterly Audit', type: 'audit', status: 'completed', technician: 'Ahmed Hassan' },
    { id: '3', date: '2025-01-20', title: 'Installation & Commissioning', type: 'installation', status: 'completed', description: 'Machine installed at Cairo Workshop #4.' },
];

export const DigitalTwinDashboard = () => {
    const { machineId } = useParams<{ machineId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Real Query would go here. For now, we mock success or fetch from legacy if needed.
    // Using a mock fetch function for the prototype phase as 'assets' API isn't fully exposed yet.
    const { data: asset, isLoading, error } = useQuery({
        queryKey: ['asset-twin', machineId],
        queryFn: async () => {
            // In a real implementation: return api.fetchAssetById(machineId);
            // Fallback to legacy fetch and adapt
            if (!user) return null;
            const machines = await api.fetchUserMachines(user.id);
            const found = machines.find(m => m.id === machineId);
            if (!found) throw new Error('Machine not found');

            return {
                ...found,
                brand: 'Yilmaz', // default
                status: 'online', // mock
                specifications: {
                    power: '3.5kW',
                    voltage: '380V',
                    axis_count: 3,
                    controller: 'Fanuc'
                }
            } as unknown as AssetDetails;
        },
        enabled: !!machineId && !!user
    });

    // Calculate Asset Health (Real-time intelligence)
    const healthValues = React.useMemo(() => {
        if (!asset) return null;
        // Mock runtime hours for now (randomize slightly for demo effect or usage based)
        // In real app, this comes from 'iot_metadata' or 'service_history'
        const mockRuntime = 480; // Example: approaching maintenance
        return MaintenanceRulesEngine.calculateHealth({
            runtimeHours: mockRuntime,
            totalCycles: 1500,
            lastServiceDate: asset.installation_date ? new Date(asset.installation_date) : undefined,
            sensorwarnings: 0
        });
    }, [asset]);

    const healthColor = !healthValues ? 'bg-gray-500' :
        healthValues.status === 'optimal' ? 'bg-green-500' :
            healthValues.status === 'good' ? 'bg-blue-500' :
                healthValues.status === 'warning' ? 'bg-amber-500' : 'bg-red-500';

    if (isLoading) {
        return <div className="p-8 space-y-4"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-64 w-full" /></div>
    }

    if (error || !asset) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-xl font-bold">Asset Not Found</h2>
                <p className="text-gray-400 mb-4">We couldn't locate the digital twin data for this ID.</p>
                <Button onClick={() => navigate('/portal')}>Return to Portal</Button>
            </div>
        );
    }

    // Check if warranty is active (simple check based on expiry date)
    // Logic: if warranty_valid is true and expiry is in future
    const isWarrantyActive = asset.warranty_valid && (!asset.warranty_expiry || new Date(asset.warranty_expiry) > new Date());

    return (
        <div className="min-h-screen bg-almona-dark pb-12">
            {/* Header */}
            <header className="bg-almona-darker border-b border-almona-light/10 sticky top-0 z-10 backdrop-blur-md bg-opacity-80">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                {asset.name}
                                <Badge variant="outline" className={asset.status === 'online' ? 'text-green-400 border-green-500/30' : 'text-gray-400'}>
                                    {asset.status === 'online' ? <Activity className="w-3 h-3 mr-1" /> : <Zap className="w-3 h-3 mr-1" />}
                                    {asset.status}
                                </Badge>
                                {isWarrantyActive ? (
                                    <Badge variant="outline" className="text-blue-400 border-blue-500/30 flex items-center gap-1">
                                        <ShieldCheck className="w-3 h-3" /> Warranty Active
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-amber-400 border-amber-500/30 flex items-center gap-1">
                                        <ShieldAlert className="w-3 h-3" /> Warranty Expired
                                    </Badge>
                                )}
                            </h1>
                            <p className="text-sm text-gray-400 font-mono">SN: {asset.serial_number}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={() => navigate(`/support/tickets/new?machine=${asset.id}`)}>
                            Request Service
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreVertical className="w-5 h-5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem>View Contract</DropdownMenuItem>
                                <DropdownMenuItem>Download Manual</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-400">Decommission</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Visuals & Specs */}
                <div className="lg:col-span-1 space-y-6">

                    {/* 3D Visualizer / Image placeholder */}
                    <Card className="bg-gradient-to-br from-gray-900 to-black border-almona-light/20 overflow-hidden relative group">
                        <div className="aspect-square flex items-center justify-center bg-grid-pattern relative">
                            {/* Placeholder for real 3D model */}
                            {asset.image_url ? (
                                <img src={asset.image_url} alt={asset.name} className="w-3/4 object-contain drop-shadow-2xl" />
                            ) : (
                                <Cpu className="w-32 h-32 text-almona-light/20 group-hover:text-almona-orange/50 transition-colors duration-500" />
                            )}
                            <div className="absolute bottom-4 right-4 animate-pulse">
                                <div className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_#22c55e]"></div>
                            </div>
                        </div>
                        <CardContent className="p-4 bg-almona-darker border-t border-almona-light/10">
                            <p className="text-sm text-gray-400 text-center">Real-time Digital Twin Connection Active</p>
                        </CardContent>
                    </Card>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <Card className="bg-almona-darker border-almona-light/10">
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <Zap className="w-6 h-6 text-yellow-400 mb-2" />
                                <span className="text-2xl font-bold">98%</span>
                                <span className="text-xs text-gray-500">Efficiency</span>
                            </CardContent>
                        </Card>
                        <Card className="bg-almona-darker border-almona-light/10">
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <RefreshCw className="w-6 h-6 text-blue-400 mb-2" />
                                <span className="text-2xl font-bold">450h</span>
                                <span className="text-xs text-gray-500">Uptime</span>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Specifications */}
                    <Card className="bg-almona-dark/60 border-almona-light/10">
                        <CardHeader>
                            <CardTitle className="text-lg">Specifications</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {Object.entries(asset.specifications || {}).map(([key, value]) => (
                                <div key={key} className="flex justify-between text-sm py-1 border-b border-gray-800 last:border-0">
                                    <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
                                    <span className="font-mono text-almona-light">{String(value)}</span>
                                </div>
                            ))}
                            {!asset.specifications && <p className="text-gray-500 italic">No detailed specs available.</p>}
                        </CardContent>
                    </Card>

                    {/* QR Code Identity */}
                    <Card className="bg-white text-black">
                        <CardContent className="p-6 flex flex-col items-center gap-4">
                            <QRCodeSVG value={`https://almona.io/asset/${asset.serial_number}`} size={120} />
                            <div className="text-center">
                                <p className="font-bold text-lg">Asset Tag</p>
                                <p className="text-xs text-gray-500 max-w-[200px]">Scan to access service history and manuals instantly.</p>
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* Right Column: Timeline & Tabs */}
                <div className="lg:col-span-2 space-y-6">
                    <Tabs defaultValue="timeline" className="w-full">
                        <TabsList className="bg-almona-darker p-1 w-full justify-start rounded-lg border border-almona-light/10">
                            <TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger>
                            <TabsTrigger value="health" className="flex-1">Health & IoT</TabsTrigger>
                            <TabsTrigger value="docs" className="flex-1">Documents</TabsTrigger>
                        </TabsList>

                        <TabsContent value="timeline" className="mt-6">
                            <ServiceTimeline events={MOCK_EVENTS} />
                        </TabsContent>

                        <TabsContent value="health" className="mt-6 space-y-6">
                            {/* Health Score Card */}
                            <Card className="bg-almona-darker border-almona-light/10">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2">
                                            <Activity className="w-5 h-5 text-almona-orange" />
                                            Asset Health Intelligence
                                        </CardTitle>
                                        {healthValues && (
                                            <Badge variant="outline" className={cn("uppercase",
                                                healthValues.status === 'optimal' ? "text-green-400 border-green-500/30" :
                                                    healthValues.status === 'warning' ? "text-amber-400 border-amber-500/30" : "text-red-400 border-red-500/30"
                                            )}>
                                                {healthValues.status} Status
                                            </Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {healthValues ? (
                                        <>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-400">Overall Health Score</span>
                                                    <span className="font-mono font-bold text-white">{healthValues.score}%</span>
                                                </div>
                                                <Progress value={healthValues.score} className="h-2" indicatorClassName={healthColor} />
                                            </div>

                                            {/* Predictive Alerts */}
                                            <div className="space-y-3">
                                                <h4 className="text-sm font-semibold text-gray-300">Predictive Insights</h4>
                                                {healthValues.actions.length === 0 ? (
                                                    <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                                                        <ShieldCheck className="w-5 h-5 text-green-400" />
                                                        <p className="text-sm text-green-300">System running optimally. No predicted failures.</p>
                                                    </div>
                                                ) : (
                                                    healthValues.actions.map(action => (
                                                        <Alert key={action.id} className={cn("border-l-4",
                                                            action.priority === 'critical' ? "border-l-red-500 bg-red-500/10 border-t-red-500/20 border-r-red-500/20 border-b-red-500/20" :
                                                                "border-l-amber-500 bg-amber-500/10 border-t-amber-500/20 border-r-amber-500/20 border-b-amber-500/20"
                                                        )}>
                                                            <div className="flex items-start gap-3">
                                                                {action.priority === 'critical' ? <AlertCircle className="w-5 h-5 text-red-400" /> : <Zap className="w-5 h-5 text-amber-400" />}
                                                                <div className="flex-1">
                                                                    <AlertTitle className={cn("mb-1", action.priority === 'critical' ? "text-red-400" : "text-amber-400")}>
                                                                        {action.title}
                                                                    </AlertTitle>
                                                                    <AlertDescription className="text-gray-400 text-xs">
                                                                        {action.description}
                                                                        {action.dueInHours !== undefined && (
                                                                            <div className="mt-2 font-mono text-almona-light">
                                                                                Due in: {action.dueInHours} hours
                                                                            </div>
                                                                        )}
                                                                    </AlertDescription>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="mt-3 h-7 text-xs border-almona-light/20 hover:bg-almona-light/10"
                                                                        onClick={() => navigate(`/support/tickets/new?machine=${asset.id}&issue=${encodeURIComponent(action.title)}&priority=${action.priority}`)}
                                                                    >
                                                                        Schedule Service
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </Alert>
                                                    ))
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-gray-500">Loading intelligence data...</p>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="docs" className="mt-6">
                            <Card className="bg-almona-darker border-almona-light/10">
                                <CardHeader><CardTitle>Asset Documentation</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    {[1, 2].map(i => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-almona-dark rounded-lg border border-almona-light/5 hover:border-almona-orange/30 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <FileText className="w-8 h-8 text-blue-400/80" />
                                                <div>
                                                    <p className="font-medium">User Manual v{i}.0.pdf</p>
                                                    <p className="text-xs text-gray-500">2.4 MB • Uploaded Jan 2025</p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm">Download</Button>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </main>
        </div>
    );
};

export default DigitalTwinDashboard;
