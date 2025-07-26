import { useState, useEffect } from 'react';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Badge } from '@/shared/ui/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/shared/ui/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/shared/ui/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/ui/avatar';
import { Search, MessageSquare, FileText, Video, User, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { AuthForm } from '@/components/contact/AuthForm';
import { Ticket, Machine } from '@/types';
import { MyMachines } from './MyMachines';

// NOTE: Retaining these interfaces for parts of the component that are not yet refactored.
interface KnowledgeItem {
  id: string;
  title: string;
  type: 'article' | 'video' | 'guide';
  category: string;
  lastUpdated: string;
}

interface FabricationRecord {
  id: string;
  date: string;
  materialEfficiency: number;
  cutQuality: number;
  maintenanceImpact: string;
}

const FabricationHistory = ({ machineId }: { machineId: string }) => {
  const [history, setHistory] = useState<FabricationRecord[]>([
    { id: '1', date: '2023-11-01', materialEfficiency: 85, cutQuality: 90, maintenanceImpact: 'Low downtime, no issues' },
    { id: '2', date: '2023-11-10', materialEfficiency: 80, cutQuality: 88, maintenanceImpact: 'Minor blade wear detected' },
    { id: '3', date: '2023-11-15', materialEfficiency: 82, cutQuality: 85, maintenanceImpact: 'Scheduled maintenance performed' },
  ]);

  return (
    <Card>
      <CardHeader><CardTitle>Fabrication Performance</CardTitle></CardHeader>
      <CardContent>
        <Tabs defaultValue="efficiency">
          <TabsList>
            <TabsTrigger value="efficiency">Material Efficiency</TabsTrigger>
            <TabsTrigger value="quality">Cut Quality</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance Impact</TabsTrigger>
          </TabsList>
          <TabsContent value="efficiency"><ul>{history.map(r => <li key={r.id}>{r.date}: {r.materialEfficiency}%</li>)}</ul></TabsContent>
          <TabsContent value="quality"><ul>{history.map(r => <li key={r.id}>{r.date}: {r.cutQuality}%</li>)}</ul></TabsContent>
          <TabsContent value="maintenance"><ul>{history.map(r => <li key={r.id}>{r.date}: {r.maintenanceImpact}</li>)}</ul></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export const CustomerPortal = () => {
  const { user, login, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('tickets');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);

  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeItem[]>([
    { id: '1', title: 'Hydraulic System Maintenance Guide', type: 'guide', category: 'Maintenance', lastUpdated: '2023-10-15' },
    { id: '2', title: 'Troubleshooting Electrical Issues', type: 'article', category: 'Troubleshooting', lastUpdated: '2023-09-28' },
  ]);

  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'medium' as Ticket['priority'],
    machineId: '',
    attachments: [] as File[],
  });

  useEffect(() => {
    if (user) {
      const mockMachines: Machine[] = [
        { id: 'machine-001', name: 'Yilmaz DC 421 PBS', description: 'Cutting machine', imageUrl: '', category: 'cutting-machines', releaseDate: '2022-01-01', type: 'Semi-Automatic', powerSpec: { voltage: '400V', frequency: '50Hz', phase: '3', consumption: '2.2 kW' }, dimensions: { length: '1200mm', width: '800mm', height: '1500mm' }, specifications: [] },
        { id: 'machine-002', name: 'Yilmaz FR 221 S', description: 'Copy router', imageUrl: '', category: 'processing-centers', releaseDate: '2021-06-15', type: 'Manual', powerSpec: { voltage: '230V', frequency: '50Hz', phase: '1', consumption: '1.1 kW' }, dimensions: { length: '700mm', width: '600mm', height: '1300mm' }, specifications: [] },
      ];
      setMachines(mockMachines);

      const mockTickets: Ticket[] = [
        { id: '1', title: 'Hydraulic system leak', description: 'Small leak observed near the main pump.', status: 'in-progress', priority: 'high', userId: user.id, machineId: 'machine-001', createdAt: '2023-11-10', updatedAt: '2023-11-12' },
        { id: '2', title: 'Software update request', description: 'Requesting version 2.1.', status: 'open', priority: 'medium', userId: user.id, machineId: 'machine-002', createdAt: '2023-11-15', updatedAt: '2023-11-15' },
      ];
      setTickets(mockTickets);
    }
  }, [user]);

  const createTicket = () => {
    if (!user) return;
    const ticket: Ticket = {
      id: (tickets.length + 1).toString(),
      title: newTicket.title,
      description: newTicket.description,
      status: 'open',
      priority: newTicket.priority,
      userId: user.id,
      machineId: newTicket.machineId,
      attachments: newTicket.attachments.map(f => f.name),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTickets([...tickets, ticket]);
    setNewTicket({ title: '', description: '', priority: 'medium', machineId: '', attachments: [] });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-blue-500/10 text-blue-500';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500';
      case 'high': return 'bg-orange-500/10 text-orange-500';
      case 'critical': return 'bg-red-500/10 text-red-500';
      default: return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-gray-500/10 text-gray-500';
      case 'in-progress': return 'bg-blue-500/10 text-blue-500';
      case 'resolved': return 'bg-green-500/10 text-green-500';
      case 'closed': return 'bg-purple-500/10 text-purple-500';
      default: return '';
    }
  };

  const getTypeIcon = (type: string) => {
    if (type === 'article' || type === 'guide') return <FileText className="h-4 w-4" />;
    if (type === 'video') return <Video className="h-4 w-4" />;
    return null;
  };

  if (!user) {
    return <AuthForm onLogin={login} />;
  }

  return (
    <div className="flex h-full bg-almona-dark text-white">
      <div className="w-64 bg-almona-darker/50 border-r border-almona-light/20 p-4 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <Avatar><AvatarImage src="" /><AvatarFallback>{user.name.charAt(0)}</AvatarFallback></Avatar>
          <div><p className="font-medium">{user.name}</p><p className="text-sm text-gray-400 capitalize">{user.role}</p></div>
        </div>
        <nav className="flex-1 space-y-1">
          <Button variant="ghost" className="w-full justify-start" onClick={() => setActiveTab('tickets')}><MessageSquare className="h-4 w-4 mr-2" />Service Tickets</Button>
          <Button variant="ghost" className="w-full justify-start" onClick={() => setActiveTab('knowledge')}><FileText className="h-4 w-4 mr-2" />Knowledge Base</Button>
          <Button variant="ghost" className="w-full justify-start" onClick={() => setActiveTab('my-machines')}><User className="h-4 w-4 mr-2" />My Machines</Button>
          {user.role === 'admin' && (<Button variant="ghost" className="w-full justify-start" onClick={() => setActiveTab('analytics')}><Settings className="h-4 w-4 mr-2" />Analytics</Button>)}
        </nav>
        <Button variant="ghost" className="w-full justify-start mt-auto" onClick={logout}><LogOut className="h-4 w-4 mr-2" />Sign Out</Button>
      </div>

      <div className="flex-1 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="tickets">Service Tickets</TabsTrigger>
            <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="fabrication">Fabrication</TabsTrigger>
            <TabsTrigger value="my-machines">My Machines</TabsTrigger>
          </TabsList>

          <TabsContent value="tickets">
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Create New Service Ticket</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div><Label htmlFor="title">Title</Label><Input id="title" value={newTicket.title} onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })} /></div>
                    <div><Label htmlFor="description">Description</Label><Input id="description" value={newTicket.description} onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })} /></div>
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={newTicket.priority} onValueChange={(v) => setNewTicket({ ...newTicket, priority: v as Ticket['priority'] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select>
                    </div>
                    <div>
                      <Label htmlFor="machine">Machine</Label>
                      <Select value={newTicket.machineId} onValueChange={(v) => setNewTicket({ ...newTicket, machineId: v })}><SelectTrigger><SelectValue placeholder="Select machine" /></SelectTrigger><SelectContent>{machines.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div>
                      <Label htmlFor="attachments">Attachments</Label>
                      <Input id="attachments-input" type="file" multiple className="hidden" onChange={(e) => setNewTicket({ ...newTicket, attachments: Array.from(e.target.files || []) })} />
                      <Button variant="outline" onClick={() => document.getElementById('attachments-input')?.click()}>Upload Files</Button>
                      {newTicket.attachments.length > 0 && <div className="mt-2 text-sm text-gray-400">{newTicket.attachments.map(f => f.name).join(', ')}</div>}
                    </div>
                  </div>
                </CardContent>
                <CardFooter><Button className="w-full" onClick={createTicket}>Submit Ticket</Button></CardFooter>
              </Card>
              <Card>
                <CardHeader><CardTitle>My Service Tickets</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Title</TableHead><TableHead>Status</TableHead><TableHead>Priority</TableHead><TableHead>Machine</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
                    <TableBody>{tickets.map((ticket) => (<TableRow key={ticket.id}><TableCell>#{ticket.id}</TableCell><TableCell>{ticket.title}</TableCell><TableCell><Badge className={getStatusColor(ticket.status)}>{ticket.status}</Badge></TableCell><TableCell><Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge></TableCell><TableCell>{machines.find(m => m.id === ticket.machineId)?.name || 'N/A'}</TableCell><TableCell>{new Date(ticket.updatedAt).toLocaleDateString()}</TableCell></TableRow>))}</TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="knowledge"><Card><CardHeader><CardTitle>Knowledge Base</CardTitle></CardHeader><CardContent>...</CardContent></Card></TabsContent>
          <TabsContent value="analytics"><Card><CardHeader><CardTitle>Analytics</CardTitle></CardHeader><CardContent>...</CardContent></Card></TabsContent>
          <TabsContent value="fabrication"><FabricationHistory machineId="machine-123" /></TabsContent>
          <TabsContent value="my-machines"><MyMachines machines={machines} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
