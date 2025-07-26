import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

const EmergencyResponse = () => (
  <div className="bg-red-900/20 p-4 rounded-lg border border-red-500/50">
    <h3 className="flex items-center gap-2 font-bold">
      <AlertTriangle className="h-5 w-5" />
      Emergency Support
    </h3>
    <p className="mt-2">24/7 Cairo response team: +20 100 000 0000</p>
    <div className="mt-2 grid grid-cols-2 gap-2">
      <Button variant="destructive">Request Onsite</Button>
      <Button variant="outline">Video Call Technician</Button>
    </div>
  </div>
);

const EgyptianTechnicalSupport = () => {
  const governorates = [
    "القاهرة", "الجيزة", "الإسكندرية", 
    "بورسعيد", "السويس", "المنصورة"
  ];
  
  const supportContacts = [
    { name: "الدعم الفني الرئيسي", phone: "+20100000000", hours: "24/7" },
    { name: "قطع الغيار", phone: "+20100000001", hours: "8ص-5م" },
    { name: "الصيانة الطارئة", phone: "+20100000002", hours: "24/7" }
  ];
  
  return (
    <div className="bg-almona-darker/50 p-6 rounded-lg space-y-6">
      <EmergencyResponse />
      <h2 className="text-2xl font-bold mb-6">الدعم الفني المحلي</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold mb-4">فريق الدعم المحلي</h3>
          <div className="space-y-4">
            {supportContacts.map((contact, index) => (
              <div key={index} className="border border-almona-light/20 p-4 rounded-lg">
                <div className="font-medium">{contact.name}</div>
                <div className="flex justify-between items-center mt-2">
                  <a href={`tel:${contact.phone}`} className="text-orange-500 hover:underline">
                    {contact.phone}
                  </a>
                  <span className="text-sm text-gray-400">{contact.hours}</span>
                </div>
              </div>
            ))}
          </div>
          
          <Button className="mt-6 w-full bg-egyptian-blue">
            طلب اتصال فني
          </Button>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-4">التغطية بالمحافظات</h3>
          <div className="flex flex-wrap gap-2">
            {governorates.map(gov => (
              <Button key={gov} variant="outline" className="border-egyptian-blue text-egyptian-blue">
                {gov}
              </Button>
            ))}
          </div>
          
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">مراكز الصيانة</h3>
            <ul className="space-y-2">
              <li className="flex justify-between">
                <span>مدينة 6 أكتوبر</span>
                <span>8ص-10م</span>
              </li>
              <li className="flex justify-between">
                <span>العاشر من رمضان</span>
                <span>8ص-10م</span>
              </li>
              <li className="flex justify-between">
                <span>برج العرب</span>
                <span>8ص-6م</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EgyptianTechnicalSupport;
