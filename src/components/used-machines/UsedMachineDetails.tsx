import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import ConditionBadge from './ConditionBadge';
import { MapPin, Calendar, Gauge, Phone, MessageCircle, Flag, ChevronLeft } from 'lucide-react';
import { UsedMachine } from '@/data/usedMachines';
import { UsedMachineService } from '@/lib/usedMachines/UsedMachineService';
import { usePublicCopy } from '@/hooks/usePublicCopy';
import { toast } from 'sonner';

interface UsedMachineDetailsProps {
  machine: UsedMachine;
  onBack: () => void;
}

const UsedMachineDetails: React.FC<UsedMachineDetailsProps> = ({ machine, onBack }) => {
  const copy = usePublicCopy();
  const phone = machine.contactWhatsapp || machine.contactPhone;

  useEffect(() => {
    void UsedMachineService.incrementViews(machine.id);
  }, [machine.id]);

  const handleReport = async () => {
    try {
      await UsedMachineService.reportListing(machine.id);
      toast.success(copy('Listing reported. Thank you.'));
    } catch {
      toast.error(copy('Could not report listing.'));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 text-white">
      <Button variant="outline" onClick={onBack} className="mb-4 flex items-center">
        <ChevronLeft className="mr-2 h-4 w-4" /> {copy('Back to listings')}
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Images */}
        <div className="space-y-3">
          {(machine.images.length ? machine.images : ['']).map((img, idx) => (
            img ? (
              <img key={idx} src={img} alt={`${machine.title} ${idx + 1}`} className="w-full object-cover rounded-lg border border-almona-light/30 max-h-96" />
            ) : (
              <div key={idx} className="w-full h-64 flex items-center justify-center bg-almona-darker rounded-lg text-gray-600">{copy('No photo')}</div>
            )
          ))}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold">{machine.title}</h1>
            <div className="text-amber-400 font-bold text-2xl mt-1">{machine.price}</div>
          </div>

          <p className="text-gray-300">{machine.description}</p>

          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-amber-500" /> {copy(machine.location)}
            </li>
            <li className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500" /> {copy('Year')}: {machine.year ?? 'â€”'}
            </li>
            <li className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-amber-500" /> {copy('Hours')}: {machine.hours != null ? machine.hours.toLocaleString() : 'â€”'}
            </li>
            <li className="flex items-center gap-2">
              <ConditionBadge condition={machine.condition} />
              <span className="text-gray-500 text-xs">{machine.views} {copy('views')}</span>
            </li>
          </ul>

          {/* Seller contact */}
          <div className="bg-almona-darker border border-almona-light/30 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">{copy('Seller')}</div>
            <div className="font-medium mb-3">{machine.contactName}</div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button asChild className="bg-green-600 hover:bg-green-700 text-white flex-1">
                <a href={UsedMachineService.whatsappLink(phone)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                  <MessageCircle className="w-4 h-4" /> {copy('WhatsApp')}
                </a>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <a href={`tel:${UsedMachineService.sanitizePhone(machine.contactPhone)}`} className="flex items-center justify-center gap-2">
                  <Phone className="w-4 h-4" /> {copy('Call')}
                </a>
              </Button>
            </div>
          </div>

          <button onClick={() => void handleReport()} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400">
            <Flag className="w-3 h-3" /> {copy('Report this listing')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UsedMachineDetails;
