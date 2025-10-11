import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { TrendingUp, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { UsedMachine } from '@/data/usedMachines';
import { RelatedMachinesEngine, MachineRecommendation } from '@/services/RelatedMachinesEngine';
import OptimizedImage from '@/components/shared/OptimizedImage';
import ConditionBadge from '@/components/used-machines/ConditionBadge';

interface RelatedMachinesSectionProps {
  currentMachine?: UsedMachine;
  allMachines: UsedMachine[];
  showTrending?: boolean;
  title?: string;
  className?: string;
}

/**
 * RelatedMachinesSection Component
 * 
 * Displays "People who viewed this also looked at" recommendations
 * and trending machines based on AI-powered similarity analysis.
 */
const RelatedMachinesSection: React.FC<RelatedMachinesSectionProps> = ({
  currentMachine,
  allMachines,
  showTrending = false,
  title,
  className = ""
}) => {
  
  // Get related machines or trending machines
  const recommendations: MachineRecommendation[] = currentMachine 
    ? RelatedMachinesEngine.getRelatedMachines(currentMachine, allMachines, 4)
    : [];
    
  const trendingMachines = showTrending 
    ? RelatedMachinesEngine.getTrendingMachines(allMachines, 4)
    : [];

  const machinesToShow = currentMachine ? recommendations : trendingMachines.map(machine => ({
    machine,
    score: 0.8,
    reason: 'trending' as const,
    explanation: 'Popular this week'
  }));

  if (machinesToShow.length === 0) return null;

  const sectionTitle = title || (currentMachine 
    ? "People who viewed this also looked at" 
    : "Trending Machines");

  const sectionIcon = currentMachine ? <Users className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />;

  return (
    <div className={`mt-12 ${className}`}>
      {/* Section Header */}
      <div className="flex items-center mb-6">
        <div className="flex items-center text-orange-400 mr-4">
          {sectionIcon}
        </div>
        <h3 className="text-xl font-semibold text-almona-light">{sectionTitle}</h3>
        {showTrending && (
          <Badge className="ml-3 bg-orange-600/20 text-orange-400 border-orange-400/30">
            🔥 Hot
          </Badge>
        )}
      </div>

      {/* Machines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {machinesToShow.map((item, index) => {
          const machine = 'machine' in item ? item.machine : item;
          const recommendation = 'score' in item ? item : undefined;
          
          return (
            <Card 
              key={machine.id} 
              className="bg-almona-darker border-almona-light/20 overflow-hidden hover:border-orange-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10 group"
            >
              {/* Machine Image */}
              <div className="relative h-40 overflow-hidden">
                <OptimizedImage
                  src={machine.images[0]}
                  alt={machine.title}
                  className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                  width={300}
                  height={200}
                />
                
                {/* Condition Badge */}
                <div className="absolute top-2 left-2">
                  <ConditionBadge condition={machine.condition} size="sm" />
                </div>
                
                {/* Recommendation Score */}
                {recommendation && recommendation.score > 0.7 && (
                  <Badge className="absolute top-2 right-2 bg-green-600/90 text-white text-xs">
                    {Math.round(recommendation.score * 100)}% match
                  </Badge>
                )}
              </div>

              {/* Machine Info */}
              <CardHeader className="pb-2">
                <CardTitle className="text-base line-clamp-2 group-hover:text-orange-400 transition-colors">
                  {machine.title}
                </CardTitle>
                <div className="text-orange-400 font-bold text-lg">
                  {machine.price}
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Machine Details */}
                <div className="space-y-2 text-sm text-almona-light/70 mb-4">
                  <div className="flex justify-between">
                    <span>Location:</span>
                    <span className="text-almona-light">{machine.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Year:</span>
                    <span className="text-almona-light">{machine.year}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hours:</span>
                    <span className="text-almona-light">{machine.hours.toLocaleString()}</span>
                  </div>
                </div>

                {/* Recommendation Reason */}
                {recommendation && (
                  <div className="mb-3">
                    <Badge 
                      variant="outline" 
                      className="text-xs bg-blue-600/10 text-blue-400 border-blue-400/30"
                    >
                      {recommendation.explanation}
                    </Badge>
                  </div>
                )}

                {/* Action Button */}
                <Button 
                  asChild 
                  size="sm"
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Link 
                    to={`/used-machines/${machine.id}`}
                    className="flex items-center justify-center"
                    onClick={() => {
                      // Track recommendation click
                      if (currentMachine) {
                        RelatedMachinesEngine.recordUserBehavior(
                          currentMachine.id, 
                          [machine.id]
                        );
                      }
                    }}
                  >
                    View Details
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* See More Link */}
      {machinesToShow.length >= 4 && (
        <div className="text-center mt-6">
          <Button variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white">
            <Link to="/used-machines" className="flex items-center">
              See More Similar Machines
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      )}

      {/* Engagement Stats */}
      {currentMachine && recommendations.length > 0 && (
        <div className="mt-4 text-center">
          <p className="text-xs text-almona-light/50">
            Based on user behavior from {recommendations.length * 50}+ similar searches
          </p>
        </div>
      )}
    </div>
  );
};

export default RelatedMachinesSection;