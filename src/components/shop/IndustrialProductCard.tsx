import React from "react";
import { Badge } from "@/shared/ui/ui/badge";
import { Button } from "@/shared/ui/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/shared/ui/ui/card";

const EgyptCertificationBadge = ({ standard }: { standard: string }) => (
  <div className="flex items-center bg-[#ce1126] text-white px-2 py-1 rounded-full text-xs">
    <span className="mr-1">🇪🇬</span>
    <span>{standard}</span>
  </div>
);

interface DurabilityInfo {
  score: number; // e.g., 1-5 or 1-100
  maintenanceInterval: string; // e.g., "Every 6 months", "1000 operating hours"
  keyDurabilityFeatures: string[];
}

interface IndustrialProductCardProps {
  title: string;
  description: string;
  imageUrl: string;
  price: string;
  features: string[];
  badges?: string[];
  egyptCertifications?: string[];
  stock: number;
  actions: {
    label: string;
    action: () => void;
  }[];
  durabilityInfo?: DurabilityInfo;
  onDurabilityClick?: (info: DurabilityInfo) => void;
}

export const IndustrialProductCard = ({
  title,
  description,
  imageUrl,
  price,
  features,
  badges = [],
  egyptCertifications = [],
  stock,
  actions,
  durabilityInfo,
  onDurabilityClick,
}: IndustrialProductCardProps) => {
  return (
    <Card className="bg-almona-darker border-almona-light/20 hover:border-almona-light/40 transition-colors h-full flex flex-col">
      <CardHeader className="p-0 relative">
        <div className="aspect-video relative">
          <img src={imageUrl} alt={title} className="w-full h-48 object-cover" loading="lazy" />
        </div>
        {(badges.length > 0 || egyptCertifications.length > 0 || stock !== undefined) && (
          <div className="absolute top-4 left-4 flex gap-2 flex-wrap max-w-[90%]">
            {badges.map((badge) => (
              <Badge
                key={badge}
                variant="secondary"
                className="bg-orange-600/90 hover:bg-orange-600"
              >
                {badge}
              </Badge>
            ))}
            {egyptCertifications.map((cert, i) => (
              <EgyptCertificationBadge key={i} standard={cert} />
            ))}
            {stock !== undefined && (
              <Badge
                variant="secondary"
                className={
                  stock === 0
                    ? "bg-red-600/90 hover:bg-red-600"
                    : stock <= 5
                    ? "bg-yellow-600/90 hover:bg-yellow-600"
                    : "bg-green-600/90 hover:bg-green-600"
                }
              >
                {stock === 0 ? "Out of Stock" : stock <= 5 ? `Low Stock (${stock})` : "In Stock"}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-6 flex-grow">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-400 mb-4">{description}</p>
        <div className="space-y-2 mb-6">
          {features.map((feature, i) => (
            <div key={i} className="flex items-start">
              <svg
                className="w-4 h-4 mt-1 mr-2 text-orange-500 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-gray-300">{feature}</span>
            </div>
          ))}
        </div>
        {durabilityInfo && (
          <div className="mt-4 pt-4 border-t border-almona-light/20">
            <h4 className="font-semibold text-lg mb-2">Durability Insights</h4>
            <div className="flex items-center mb-2">
              <span className="text-orange-500 font-bold text-xl mr-2">{durabilityInfo.score}/5</span>
              <span className="text-gray-300">Durability Score</span>
            </div>
            <p className="text-sm text-gray-400 mb-2">Recommended Maintenance: {durabilityInfo.maintenanceInterval}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onDurabilityClick && onDurabilityClick(durabilityInfo)}
              className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
            >
              View Maintenance Details
            </Button>
          </div>
        )}
        <div className="text-2xl font-bold text-orange-500">{price}</div>
      </CardContent>
      <CardFooter className="p-6 pt-0">
        <div className="flex flex-col gap-2 w-full">
          {actions.map((action, i) => (
            <Button
              key={i}
              variant={i === 0 ? "default" : "outline"}
              onClick={action.action}
              className={i === 0 ? "bg-orange-600 hover:bg-orange-700" : ""}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </CardFooter>
    </Card>
  );
};
