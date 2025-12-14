/**
 * The Digital Silk Road - Supply Chain Tracker
 * 
 * Transforms the "Status" column into a Visual Journey.
 * 
 * Nodes: Istanbul (Factory) -> Sea (Transit) -> Alexandria (Customs) -> Warehouse -> Workshop
 * 
 * Logic: Calculate ETA based on "Customs Delay" variable (Real Egyptian Reality)
 */

import { Alert } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Progress } from '@/shared/ui/ui/progress';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Factory,
  Ship,
  Warehouse,
  Wrench
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

/**
 * Supply chain node types
 */
type SupplyNodeType = 'factory' | 'transit' | 'customs' | 'warehouse' | 'workshop';

/**
 * Supply chain node
 */
interface SupplyNode {
  id: string;
  type: SupplyNodeType;
  name: string;
  nameArabic?: string;
  location: string;
  status: 'pending' | 'in_transit' | 'delayed' | 'completed';
  estimatedArrival?: Date;
  actualArrival?: Date;
  delayReason?: string;
  customsDelay?: number; // Days delayed at customs (Egyptian reality)
}

/**
 * Supply chain journey
 */
interface SupplyJourney {
  orderId: string;
  nodes: SupplyNode[];
  currentStage: number; // Index of current node
  estimatedTotalDays: number;
  actualDays?: number;
  isDelayed: boolean;
  delayDays: number;
}

interface SilkRoadTrackerProps {
  orderId: string;
  origin: 'istanbul' | 'cairo' | 'alexandria' | 'local';
  destination: string;
  orderDate: Date;
  customsDelayDays?: number; // Real Egyptian reality variable
}

export const SilkRoadTracker: React.FC<SilkRoadTrackerProps> = ({
  orderId,
  origin,
  destination,
  orderDate,
  customsDelayDays = 7 // Default 7 days, but can be 7-14 days (Egyptian reality)
}) => {
  const [journey, setJourney] = useState<SupplyJourney | null>(null);

  useEffect(() => {
    // Initialize journey based on origin
    const nodes: SupplyNode[] = [];

    if (origin === 'istanbul') {
      // Turkish import journey
      nodes.push(
        {
          id: 'factory',
          type: 'factory',
          name: 'Factory',
          nameArabic: 'المصنع',
          location: 'Istanbul, Turkey',
          status: 'completed',
          actualArrival: new Date(orderDate)
        },
        {
          id: 'transit',
          type: 'transit',
          name: 'Sea Transit',
          nameArabic: 'عبور البحر',
          location: 'Mediterranean Sea',
          status: 'completed',
          estimatedArrival: new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days
          actualArrival: new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'customs',
          type: 'customs',
          name: 'Alexandria Customs',
          nameArabic: 'جمارك الإسكندرية',
          location: 'Alexandria Port',
          status: 'delayed',
          estimatedArrival: new Date(orderDate.getTime() + 6 * 24 * 60 * 60 * 1000), // 6 days
          customsDelay: customsDelayDays,
          delayReason: `Turkish profiles stuck in Alexandria port ${customsDelayDays} days (Egyptian reality)`
        },
        {
          id: 'warehouse',
          type: 'warehouse',
          name: 'Warehouse',
          nameArabic: 'المستودع',
          location: 'Cairo',
          status: 'pending',
          estimatedArrival: new Date(orderDate.getTime() + (6 + customsDelayDays + 1) * 24 * 60 * 60 * 1000)
        },
        {
          id: 'workshop',
          type: 'workshop',
          name: 'Workshop',
          nameArabic: 'الورشة',
          location: destination,
          status: 'pending',
          estimatedArrival: new Date(orderDate.getTime() + (6 + customsDelayDays + 3) * 24 * 60 * 60 * 1000)
        }
      );
    } else if (origin === 'cairo' || origin === 'alexandria') {
      // Local/Egyptian journey (faster)
      nodes.push(
        {
          id: 'factory',
          type: 'factory',
          name: 'Factory',
          nameArabic: 'المصنع',
          location: origin === 'cairo' ? 'Cairo' : 'Alexandria',
          status: 'completed',
          actualArrival: new Date(orderDate)
        },
        {
          id: 'warehouse',
          type: 'warehouse',
          name: 'Warehouse',
          nameArabic: 'المستودع',
          location: 'Cairo',
          status: 'in_transit',
          estimatedArrival: new Date(orderDate.getTime() + 2 * 24 * 60 * 60 * 1000) // 2 days
        },
        {
          id: 'workshop',
          type: 'workshop',
          name: 'Workshop',
          nameArabic: 'الورشة',
          location: destination,
          status: 'pending',
          estimatedArrival: new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 days
        }
      );
    } else {
      // Local workshop
      nodes.push(
        {
          id: 'workshop',
          type: 'workshop',
          name: 'Workshop',
          nameArabic: 'الورشة',
          location: destination,
          status: 'completed',
          actualArrival: new Date(orderDate)
        }
      );
    }

    const currentStage = nodes.findIndex(n => n.status === 'pending' || n.status === 'in_transit' || n.status === 'delayed');
    const estimatedTotalDays = origin === 'istanbul' 
      ? 6 + customsDelayDays + 3 
      : origin === 'cairo' || origin === 'alexandria'
      ? 3
      : 0;
    
    const isDelayed = nodes.some(n => n.status === 'delayed');
    const delayDays = isDelayed ? customsDelayDays : 0;

    setJourney({
      orderId,
      nodes,
      currentStage: currentStage >= 0 ? currentStage : nodes.length - 1,
      estimatedTotalDays,
      isDelayed,
      delayDays
    });
  }, [orderId, origin, destination, orderDate, customsDelayDays]);

  if (!journey) return null;

  const getNodeIcon = (type: SupplyNodeType) => {
    switch (type) {
      case 'factory':
        return <Factory className="h-5 w-5" />;
      case 'transit':
        return <Ship className="h-5 w-5" />;
      case 'customs':
        return <Building2 className="h-5 w-5" />;
      case 'warehouse':
        return <Warehouse className="h-5 w-5" />;
      case 'workshop':
        return <Wrench className="h-5 w-5" />;
    }
  };

  const getNodeColor = (status: SupplyNode['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_transit':
        return 'bg-blue-500';
      case 'delayed':
        return 'bg-red-500';
      case 'pending':
        return 'bg-gray-300';
    }
  };

  const progress = ((journey.currentStage + 1) / journey.nodes.length) * 100;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="font-cairo">The Digital Silk Road</span>
          <Badge variant={journey.isDelayed ? 'destructive' : 'default'}>
            {journey.isDelayed ? `Delayed ${journey.delayDays} days` : 'On Track'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Journey Progress</span>
            <span className="font-mono">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Connection Line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-6 relative">
            <AnimatePresence>
              {journey.nodes.map((node, index) => {
                const isActive = index <= journey.currentStage;
                const isCurrent = index === journey.currentStage;

                return (
                  <motion.div
                    key={node.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-4 relative"
                  >
                    {/* Node Icon */}
                    <div className={`
                      relative z-10 flex items-center justify-center w-12 h-12 rounded-full
                      ${isActive ? getNodeColor(node.status) : 'bg-gray-200'}
                      ${isActive ? 'text-white' : 'text-gray-400'}
                      ${isCurrent ? 'ring-4 ring-primary/20' : ''}
                    `}>
                      {getNodeIcon(node.type)}
                    </div>

                    {/* Node Info */}
                    <div className="flex-1 pt-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold font-cairo">{node.name}</h3>
                          {node.nameArabic && (
                            <p className="text-sm text-muted-foreground">{node.nameArabic}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">{node.location}</p>
                        </div>
                        <div className="text-right">
                          {node.status === 'completed' && node.actualArrival && (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-xs">
                                {node.actualArrival.toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {node.status === 'delayed' && (
                            <div className="flex items-center gap-1 text-red-600">
                              <AlertCircle className="h-4 w-4" />
                              <span className="text-xs">Delayed</span>
                            </div>
                          )}
                          {node.status === 'in_transit' && node.estimatedArrival && (
                            <div className="flex items-center gap-1 text-blue-600">
                              <Clock className="h-4 w-4" />
                              <span className="text-xs">
                                ETA: {node.estimatedArrival.toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {node.delayReason && (
                        <Alert className="mt-2 bg-red-50 border-red-200">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <p className="text-xs text-red-800">{node.delayReason}</p>
                        </Alert>
                      )}

                      {node.customsDelay && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Customs delay: {node.customsDelay} days (Egyptian reality)
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Summary */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Estimated Total Days:</span>
            <span className="font-mono font-semibold">{journey.estimatedTotalDays} days</span>
          </div>
          {journey.isDelayed && (
            <div className="flex justify-between text-sm text-red-600">
              <span>Delay:</span>
              <span className="font-mono font-semibold">+{journey.delayDays} days</span>
            </div>
          )}
          {journey.nodes[journey.nodes.length - 1].estimatedArrival && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Expected Delivery:</span>
              <span className="font-mono font-semibold">
                {journey.nodes[journey.nodes.length - 1].estimatedArrival.toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

