import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/ui/card";
import { Badge } from "@/shared/ui/ui/badge";

interface FabricationStageCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  duration: string;
  keyPoints: string[];
}

export const FabricationStageCard = ({ 
  title, 
  description, 
  icon,
  duration,
  keyPoints
}: FabricationStageCardProps) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-almona-darker/70 border border-almona-light/20 rounded-lg overflow-hidden"
  >
    <CardHeader className="pb-2">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
          {icon}
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </div>
      <Badge variant="outline" className="mt-2 w-fit">
        {duration}
      </Badge>
    </CardHeader>
    <CardContent>
      <p className="text-gray-400 text-sm mb-3">{description}</p>
      <ul className="space-y-2">
        {keyPoints.map((point, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="text-orange-500">▹</span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </CardContent>
  </motion.div>
);