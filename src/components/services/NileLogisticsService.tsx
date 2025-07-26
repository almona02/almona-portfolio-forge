import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NileLogisticsService = () => {
  const ports = [
    "Alexandria", "Port Said", "Suez", "Damietta", 
    "10th of Ramadan City", "6th October City"
  ];
  
  return (
    <div className="bg-almona-darker/50 p-6 rounded-lg">
      <h2 className="text-2xl font-bold mb-6">نقل معدات صناعية عبر نهر النيل</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <h3 className="text-lg font-semibold mb-3">حاسبة تكاليف الشحن</h3>
          <div className="space-y-4">
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="ميناء الشحن" />
              </SelectTrigger>
              <SelectContent>
                {ports.map(port => (
                  <SelectItem key={port} value={port}>{port}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="الوجهة" />
              </SelectTrigger>
              <SelectContent>
                {ports.map(port => (
                  <SelectItem key={port} value={port}>{port}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input placeholder="الوزن (طن)" type="number" />
            
            <Button className="w-full bg-egyptian-blue">احسب التكلفة</Button>
          </div>
        </div>
        
        <div className="bg-almona-dark p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">مميزات الخدمة</h3>
          <ul className="space-y-2">
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">✓</span>
              <span>شحن معدات ثقيلة حتى 100 طن</span>
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">✓</span>
              <span>تخليص جمركي متكامل</span>
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">✓</span>
              <span>تغطية جميع المناطق الصناعية</span>
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">✓</span>
              <span>تتبع حي عبر الأقمار الصناعية</span>
            </li>
          </ul>
        </div>
      </div>
      
      <div className="border-t border-almona-light/20 pt-6">
        <h3 className="text-lg font-semibold mb-3">الموانئ المتاحة</h3>
        <div className="flex flex-wrap gap-2">
          {ports.map(port => (
            <span key={port} className="px-3 py-1 rounded-full border border-egyptian-blue text-egyptian-blue text-sm">
              {port}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NileLogisticsService;