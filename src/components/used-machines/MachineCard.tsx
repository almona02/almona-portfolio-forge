import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { ChevronRight, MapPin, Calendar, Gauge, MessageCircle, Phone } from 'lucide-react';
import { UsedMachine } from '@/data/usedMachines';
import ConditionBadge from '@/components/used-machines/ConditionBadge';
import { UsedMachineService } from '@/lib/usedMachines/UsedMachineService';
import { usePublicCopy } from '@/hooks/usePublicCopy';

interface MachineCardProps {
  machine: UsedMachine;
  isCompact?: boolean;
  onClick?: () => void;
}

/**
 * MachineCard — public listing card with direct contact (WhatsApp + phone).
 */
const MachineCard: React.FC<MachineCardProps> = ({ machine, isCompact = false, onClick }) => {
  const copy = usePublicCopy();
  const cardHeight = isCompact ? 'h-80' : 'h-auto';
  const imageHeight = isCompact ? 'h-32' : 'h-48';
  const phone = machine.contactWhatsapp || machine.contactPhone;
  const waLink = UsedMachineService.whatsappLink(phone);
  const daysAgo = Math.floor((Date.now() - new Date(machine.createdAt).getTime()) / 86400000);
  const relativeDate = daysAgo < 1
    ? copy('Today')
    : daysAgo === 1
      ? copy('Yesterday')
      : daysAgo < 7
        ? `${daysAgo} ${copy('days ago')}`
        : daysAgo < 30
          ? `${Math.floor(daysAgo / 7)} ${copy('weeks ago')}`
          : daysAgo < 365
            ? `${Math.floor(daysAgo / 30)} ${copy('months ago')}`
            : new Date(machine.createdAt).toLocaleDateString();

  return (
    <Card className={`bg-almona-darker border-almona-light overflow-hidden hover:border-amber-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/20 group flex flex-col ${cardHeight}`}>
      <div className="relative">
        <div className={`${imageHeight} overflow-hidden bg-almona-dark`}>
          {machine.images[0] ? (
            <img src={machine.images[0]} alt={machine.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600">{copy('No photo')}</div>
          )}
        </div>
        <div className="absolute top-2 left-2">
          <ConditionBadge condition={machine.condition} size="sm" />
        </div>
        {machine.images.length > 1 && (
          <Badge className="absolute bottom-2 right-2 bg-black/70 text-white">📷 {machine.images.length}</Badge>
        )}
      </div>

      <CardHeader className="pb-2">
        <CardTitle className={`${isCompact ? 'text-lg' : 'text-xl'} line-clamp-2 group-hover:text-amber-400 transition-colors`}>
          {machine.title}
        </CardTitle>
        <div className="text-amber-400 font-bold text-xl">{machine.price}</div>
        <div className="text-xs text-gray-500">{copy('Posted')} {relativeDate}</div>
      </CardHeader>

      <CardContent className={isCompact ? 'py-2' : 'py-4'}>
        <p className="text-gray-400 mb-4 line-clamp-2">{machine.description}</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-2 text-amber-500 flex-shrink-0" />
            <span className="truncate">{copy(machine.location)}</span>
          </div>
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-2 text-amber-500 flex-shrink-0" />
            <span>{copy('Year:')} {machine.year ?? '—'}</span>
          </div>
          <div className="flex items-center">
            <Gauge className="w-4 h-4 mr-2 text-amber-500 flex-shrink-0" />
            <span>{copy('Hours:')} {machine.hours != null ? machine.hours.toLocaleString() : '—'}</span>
          </div>
          <div className="flex items-center">
            <Phone className="w-4 h-4 mr-2 text-amber-500 flex-shrink-0" />
            <span className="truncate">{machine.contactName}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 mt-auto">
        <Button asChild size={isCompact ? 'sm' : 'default'} className="bg-green-600 hover:bg-green-700 text-white flex-1">
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1">
            <MessageCircle className="w-4 h-4" /> {copy('WhatsApp')}
          </a>
        </Button>
        <Button asChild variant="outline" size={isCompact ? 'sm' : 'default'} className="flex-1">
          <Link to={`/used-machines/${machine.id}`} className="flex items-center justify-center" onClick={onClick}>
            {copy('Details')} <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MachineCard;
