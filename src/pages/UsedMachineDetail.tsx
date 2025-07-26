import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UsedMachineDetails from '../components/used-machines/UsedMachineDetails';
import { usedMachines, UsedMachine } from '../data/usedMachines';

const UsedMachineDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const machine: UsedMachine | undefined = usedMachines.find(m => m.id === id);

  if (!machine) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white bg-almona-dark p-4">
        <h2 className="text-2xl mb-4">لم يتم العثور على الماكينة المطلوبة</h2>
        <button
          className="bg-orange-700 hover:bg-orange-600 text-white px-4 py-2 rounded"
          onClick={() => navigate('/used-machines')}
        >
          العودة إلى قائمة الماكينات
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-almona-dark pt-24 pb-8">
      <UsedMachineDetails
        machine={machine}
        onBack={() => navigate('/used-machines')}
      />
    </div>
  );
};

export default UsedMachineDetailPage;
