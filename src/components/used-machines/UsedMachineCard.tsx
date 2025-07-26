import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../shared/ui/ui/button';
import { Badge } from '../../shared/ui/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../shared/ui/ui/card';
import { ChevronRight, MapPin, Factory, Calendar, Gauge } from 'lucide-react';

interface Seller {
  name: string;
  rating: number;
  verified: boolean;
}

interface UsedMachine {
  id: string;
  title: string;
  price: string;
  location: string;
  condition: string;
  type: string;
  year: number;
  hours: number;
  images: string[];
  description: string;
  seller: Seller;
}

interface UsedMachineCardProps {
  machine: UsedMachine;
}

const UsedMachineCard: React.FC<UsedMachineCardProps> = ({ machine }) => {
  return (
    <Card className="bg-almona-darker border-almona-light overflow-hidden">
      <div className="relative">
        <div className="h-48 overflow-hidden">
          <img 
            src={machine.images[0]} 
            alt={machine.title}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
          />
        </div>
        <Badge className="absolute top-2 left-2 bg-green-600">
          {machine.condition === 'Excellent' ? 'ممتازة' : 'جيدة'}
        </Badge>
      </div>
      <CardHeader>
        <CardTitle className="text-xl">{machine.title}</CardTitle>
        <div className="flex justify-between items-center text-orange-400 font-bold text-lg">
          {machine.price}
          {machine.seller.verified && (
            <Badge variant="secondary" className="bg-blue-600">
              موثقة
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-400 mb-4">{machine.description}</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-2 text-orange-500" />
            <span>{machine.location}</span>
          </div>
          <div className="flex items-center">
            <Factory className="w-4 h-4 mr-2 text-orange-500" />
            <span>{machine.seller.name}</span>
          </div>
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-2 text-orange-500" />
            <span>سنة الصنع: {machine.year}</span>
          </div>
          <div className="flex items-center">
            <Gauge className="w-4 h-4 mr-2 text-orange-500" />
            <span>ساعات التشغيل: {machine.hours.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" className="border-orange-500 text-orange-500">
          طلب معاينة
        </Button>
        <Button asChild>
          <Link to={`/used-machines/${machine.id}`} className="flex items-center">
            التفاصيل <ChevronRight className="w-4 h-4 mr-1" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default UsedMachineCard;
