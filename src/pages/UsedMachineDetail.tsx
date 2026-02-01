import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UsedMachineDetails from '../components/used-machines/UsedMachineDetails';
import MachineSEO from '../components/used-machines/MachineSEO';
import { usedMachines, UsedMachine } from '../data/usedMachines';

const UsedMachineDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const machine: UsedMachine | undefined = usedMachines.find(m => m.id === id);

  if (!machine) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white bg-almona-dark p-4">
        <h2 className="typography-h2 mb-4">لم يتم العثور على الماكينة المطلوبة</h2>
        <button
          className="btn-primary"
          onClick={() => navigate('/used-machines')}
        >
          العودة إلى قائمة الماكينات
        </button>
      </div>
    );
  }

  return (
    <>
      {/* SEO Component for individual machine */}
      <MachineSEO machine={machine} />
      
      <div className="min-h-screen bg-almona-dark pt-24 pb-8">
        <UsedMachineDetails
          machine={machine}
          onBack={() => navigate('/used-machines')}
        />
      </div>
    </>
  );
};

export default UsedMachineDetailPage;
