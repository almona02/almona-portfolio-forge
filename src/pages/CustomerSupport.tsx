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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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

  const handleFilterChange = (key: keyof TicketFilters, value: string | string[]) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : Array.isArray(value) ? value : [value]
    }))
  }

  const clearFilters = () => {
    setFilters({})
    setSearchTerm('')
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

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filters.status?.[0] || ''} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filters.type?.[0] || ''} onValueChange={(value) => handleFilterChange('type', value)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="installation">Installation</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="spare_parts">Spare Parts</SelectItem>
                <SelectItem value="warranty">Warranty</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filters.priority?.[0] || ''} onValueChange={(value) => handleFilterChange('priority', value)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
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