import { TicketDetailView } from '@/components/services/support/TicketDetailView';
import { useNavigate, useParams } from 'react-router-dom';

// Mock ticket data fetcher (replace with real data hook later)
const useTicket = (id: string) => {
  // Simulating data - normally verify id against DB
  return {
    id,
    type: 'technical',
    subject: 'Machine Vibration Issue',
    description: 'The machine is vibrating excessively during the spin cycle.',
    status: 'open',
    date: '2024-03-15',
    rmaId: 'RMA-2024-001'
  };
};

const TicketDetailPage = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const ticket = useTicket(ticketId || '');

  if (!ticketId) return <div>Ticket ID not found</div>;

  return (
    <div className="container mx-auto py-8">
      <TicketDetailView 
        ticket={ticket} 
        onBack={() => navigate('/services')} 
      />
    </div>
  );
};

export default TicketDetailPage;
