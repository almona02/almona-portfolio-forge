import { LazyMotionDiv } from '@/utils/lazyMotion';
import { Button } from "@/shared/ui/ui/button";
import { Badge } from "@/shared/ui/ui/badge";
import { CheckCircle2 } from "lucide-react";

interface TrainingLevelCardProps {
  level: string;
  title: string;
  description: string;
  duration: string;
  price: string;
  features: string[];
  isPopular?: boolean;
  onClick: () => void;
}

export const TrainingLevelCard = ({
  level: _level,
  title,
  description,
  duration,
  price,
  features,
  isPopular,
  onClick
}: TrainingLevelCardProps) => (
  <LazyMotionDiv 
    whileHover={{ scale: 1.02 }}
    className={`relative border rounded-lg p-6 ${isPopular ? 'border-amber-500 bg-almona-darker/50' : 'border-almona-light/20'}`}
  >
    {isPopular && (
      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
        <Badge className="bg-gradient-to-r from-amber-500 to-red-500 px-3 py-1">
          Most Popular
        </Badge>
      </div>
    )}
    <h3 className="typography-h3 mb-2">{title}</h3>
    <p className="text-gray-400 text-sm mb-4">{description}</p>
    
    <div className="flex items-center justify-between mb-6">
      <div>
        <span className="text-2xl font-bold text-amber-500">{price}</span>
        <span className="text-gray-400 text-sm ml-1">EGP</span>
      </div>
      <Badge variant="outline">{duration}</Badge>
    </div>
    
    <ul className="space-y-3 mb-6">
      {features.map((feature, i) => (
        <li key={i} className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4  mt-0.5 status-valid" />
          <span className="text-sm">{feature}</span>
        </li>
      ))}
    </ul>
    
    <Button 
      className={`w-full ${isPopular ? 'bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-600 hover:to-red-600' : 'bg-almona-darker'}`}
      onClick={onClick}
    >
      Enroll Now
    </Button>
  </LazyMotionDiv>
);