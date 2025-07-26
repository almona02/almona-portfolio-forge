import React from 'react';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { MapPin, Factory, Calendar, Gauge, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

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

interface UsedMachineDetailsProps {
  machine: UsedMachine;
  onBack: () => void;
}

const UsedMachineDetails: React.FC<UsedMachineDetailsProps> = ({ machine, onBack }) => {
  return (
    <div className="max-w-4xl mx-auto p-4 text-right text-white">
      <Button variant="outline" onClick={onBack} className="mb-4 flex items-center">
        <ChevronLeft className="mr-2" /> العودة
      </Button>
      <Card className="bg-almona-darker border-almona-light">
        <CardHeader>
          <CardTitle className="text-3xl">{machine.title}</CardTitle>
          <div className="flex justify-between items-center text-orange-400 font-bold text-xl mt-2">
            {machine.price}
            {machine.seller.verified && (
              <Badge variant="secondary" className="bg-blue-600">
                موثقة
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              {machine.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`${machine.title} image ${idx + 1}`}
                  className="mb-4 rounded shadow-md w-full object-cover"
                />
              ))}
            </div>
            <div>
              <p className="mb-4">{machine.description}</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <MapPin className="w-5 h-5 text-orange-500 mr-2" />
                  الموقع: {machine.location}
                </li>
                <li className="flex items-center">
                  <Factory className="w-5 h-5 text-orange-500 mr-2" />
                  البائع: {machine.seller.name}
                </li>
                <li className="flex items-center">
                  <Calendar className="w-5 h-5 text-orange-500 mr-2" />
                  سنة الصنع: {machine.year}
                </li>
                <li className="flex items-center">
                  <Gauge className="w-5 h-5 text-orange-500 mr-2" />
                  ساعات التشغيل: {machine.hours.toLocaleString()}
                </li>
                <li>
                  الحالة: <Badge className="bg-green-600">{machine.condition === 'Excellent' ? 'ممتازة' : 'جيدة'}</Badge>
                </li>
              </ul>
              <div className="mt-6 flex space-x-4 justify-end">
                <Button variant="outline">طلب معاينة</Button>
                <Button asChild>
                  <Link to="/used-machines">عودة إلى القائمة</Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsedMachineDetails;
