import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { getUserTickets, getTicketStats } from '@/lib/ticketApi'
import { TicketFilters, TicketStatus, TicketType, TicketPriority } from '@/types/tickets'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Filter, Ticket, Clock, CheckCircle, XCircle } from 'lucide-react'
import { CreateTicketDialog } from '@/components/support/CreateTicketDialog'
import { TicketDetailView } from '@/components/support/TicketDetailView'
import { TicketStatusBadge } from '@/components/support/TicketStatusBadge'
import { TicketSourceAnalytics } from '@/components/support/TicketSourceAnalytics'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/ui/table'
// Removed dropdown selects in favor of pill selectors for better visibility

const CustomerSupport: React.FC = () => {
  const { user } = useAuth()
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [filters, setFilters] = useState<TicketFilters>({})
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch user tickets
  const { data: tickets, isLoading: isLoadingTickets, refetch: refetchTickets } = useQuery({
    queryKey: ['tickets', user?.id, filters, searchTerm],
    queryFn: () => user ? getUserTickets(user.id, { ...filters, search: searchTerm }) : Promise.resolve([]),
    enabled: !!user,
  })

  // Fetch ticket statistics
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['ticket-stats', user?.id],
    queryFn: () => user ? getTicketStats(user.id) : Promise.resolve(null),
    enabled: !!user,
  })

  const handleCreateTicket = () => {
    setIsCreateDialogOpen(true)
  }

  const handleTicketCreated = () => {
    setIsCreateDialogOpen(false)
    refetchTickets()
  }

  const handleViewTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId)
  }

  const handleBackToList = () => {
    setSelectedTicketId(null)
    refetchTickets()
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
  }

  const toggleFilterValue = (key: keyof TicketFilters, value: string) => {
    setFilters(prev => {
      const current = (prev[key] as string[] | undefined) || []
      const exists = current.includes(value)
      const next = exists ? current.filter(v => v !== value) : [...current, value]
      return { ...prev, [key]: (next as string[]).length ? (next as string[]) : undefined }
    })
  }

  const setSingleFilter = (key: keyof TicketFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value === 'all' ? undefined : [value] }))
  }

  const clearFilters = () => {
    setFilters({})
    setSearchTerm('')
  }

  const statusOptions = ['open','assigned','in_progress','resolved','closed'] as const
  const typeOptions = ['general','technical','installation','maintenance','spare_parts','warranty'] as const
  const priorityOptions = ['low','medium','high','urgent','critical'] as const

  interface PillProps { active: boolean; onClick: () => void; children: React.ReactNode; tone?: string }
  const Pill = ({ active, onClick, children, tone }: PillProps) => {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-almona-orange/60 focus:ring-offset-almona-dark capitalize ${active ? 'bg-almona-orange text-white border-almona-orange shadow-md' : 'bg-almona-dark/40 border-almona-light/20 text-gray-300 hover:border-almona-light/40'} ${tone || ''}`}
      >
        {children}
      </button>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Please log in to access customer support.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show ticket detail view if a ticket is selected
  if (selectedTicketId) {
    return (
      <TicketDetailView 
        ticketId={selectedTicketId} 
        onBack={handleBackToList}
      />
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customer Support</h1>
          <p className="text-muted-foreground">
            Manage your support tickets and get help with your equipment
          </p>
        </div>
        <Button onClick={handleCreateTicket} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Ticket
        </Button>
      </div>

      {/* Statistics & Analytics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.open}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgResolutionTime}h</div>
            </CardContent>
          </Card>
          <TicketSourceAnalytics />
        </div>
      )}

      {/* Filters and Search (Enhanced) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Tickets</CardTitle>
          <CardDescription>Click pills to toggle filters. Multiple selections per group allowed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-2"><Filter className="h-3 w-3" /> Status</div>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map(s => (
                  <Pill key={s} active={!!filters.status?.includes(s)} onClick={() => toggleFilterValue('status', s)}>{s.replace('_',' ')}</Pill>
                ))}
                <Pill active={!filters.status} onClick={() => setSingleFilter('status','all')}>All</Pill>
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Type</div>
              <div className="flex flex-wrap gap-2">
                {typeOptions.map(t => (
                  <Pill key={t} active={!!filters.type?.includes(t)} onClick={() => toggleFilterValue('type', t)}>{t.replace('_',' ')}</Pill>
                ))}
                <Pill active={!filters.type} onClick={() => setSingleFilter('type','all')}>All</Pill>
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Priority</div>
              <div className="flex flex-wrap gap-2">
                {priorityOptions.map(p => (
                  <Pill key={p} active={!!filters.priority?.includes(p)} onClick={() => toggleFilterValue('priority', p)}>{p}</Pill>
                ))}
                <Pill active={!filters.priority} onClick={() => setSingleFilter('priority','all')}>All</Pill>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={clearFilters}>Reset</Button>
            <Button size="sm" onClick={handleCreateTicket} className="bg-almona-orange hover:bg-almona-orange-dark">Quick Create Ticket</Button>
            <Button size="sm" variant="secondary" onClick={() => window.location.assign('/support/tickets/new')}>Advanced Create</Button>
          </div>
          {/* Active filter badges */}
          {(filters.status || filters.type || filters.priority || searchTerm) && (
            <div className="flex flex-wrap gap-2 pt-2">
              {filters.status?.map(s => (
                <Badge key={s} variant="outline" className="cursor-pointer" onClick={() => toggleFilterValue('status', s)}>{s} ✕</Badge>
              ))}
              {filters.type?.map(t => (
                <Badge key={t} variant="outline" className="cursor-pointer" onClick={() => toggleFilterValue('type', t)}>{t.replace('_',' ')} ✕</Badge>
              ))}
              {filters.priority?.map(p => (
                <Badge key={p} variant="outline" className="cursor-pointer" onClick={() => toggleFilterValue('priority', p)}>{p} ✕</Badge>
              ))}
              {searchTerm && (
                <Badge variant="outline" className="cursor-pointer" onClick={() => setSearchTerm('')}>Search: {searchTerm} ✕</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Support Tickets</CardTitle>
          <CardDescription>
            Click on any ticket to view details and add messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTickets ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : tickets && tickets.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket #</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Maint.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Messages</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow 
                      key={ticket.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewTicket(ticket.id)}
                    >
                      <TableCell className="font-medium">
                        {ticket.ticket_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{ticket.title}</div>
                          {ticket.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {ticket.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {ticket.type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            ticket.priority === 'critical' || ticket.priority === 'urgent' 
                              ? 'default' 
                              : ticket.priority === 'high' 
                              ? 'default' 
                              : 'secondary'
                          }
                          className={
                            ticket.priority === 'critical' || ticket.priority === 'urgent'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                              : ticket.priority === 'high'
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
                              : ''
                          }
                        >
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {ticket.source && (
                          <Badge variant="outline" className="capitalize">
                            {ticket.source.replace('_',' ')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {ticket.maintenance_type && (
                          <Badge variant="secondary" className="capitalize">
                            {ticket.maintenance_type}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <TicketStatusBadge status={ticket.status} />
                      </TableCell>
                      <TableCell>
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {ticket.message_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewTicket(ticket.id)
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Ticket className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No tickets found</h3>
              <p className="text-muted-foreground mb-4">
                You haven't created any support tickets yet.
              </p>
              <Button onClick={handleCreateTicket}>
                Create Your First Ticket
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Ticket Dialog */}
      <CreateTicketDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onTicketCreated={handleTicketCreated}
      />
    </div>
  )
}

export default CustomerSupport