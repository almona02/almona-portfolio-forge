import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UsedMachineDetails from '../components/used-machines/UsedMachineDetails';
import MachineSEO from '../components/used-machines/MachineSEO';
import { UsedMachine, mapListingToMachine } from '../data/usedMachines';
import { UsedMachineService } from '../lib/usedMachines/UsedMachineService';

const UsedMachineDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [machine, setMachine] = useState<UsedMachine | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    UsedMachineService.getListing(id)
      .then((row) => setMachine(row ? mapListingToMachine(row) : null))
      .catch(() => setMachine(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white bg-almona-dark">Loadingâ€¦</div>;
  }

  if (!machine) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white bg-almona-dark p-4">
        <h2 className="typography-h2 mb-4">Machine not found</h2>
        <button className="btn-primary" onClick={() => void navigate('/used-machines')}>Back to listings</button>
      </div>
    );
  }

  return (
    <>
      <MachineSEO machine={machine} />
      <div className="min-h-screen bg-almona-dark pt-16 pb-8">
        <UsedMachineDetails machine={() => void machine()} onBack={() => navigate('/used-machines')} />
      </div>
    </>
  );
};

export default UsedMachineDetailPage;
