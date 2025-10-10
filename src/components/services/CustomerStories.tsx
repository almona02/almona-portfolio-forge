import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Star, 
  TrendingUp, 
  Clock, 
  Users, 
  Factory, 
  Award, 
  ChevronLeft, 
  ChevronRight,
  Play,
  ExternalLink,
  Quote
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CustomerStory {
  id: string;
  name: string;
  company: string;
  avatar: string;
  role: string;
  location: string;
  industry: string;
  packageUsed: 'basic' | 'professional' | 'enterprise';
  testimonial: string;
  rating: number;
  metrics: {
    before: {
      production: string;
      downtime: string;
      efficiency: string;
    };
    after: {
      production: string;
      downtime: string;
      efficiency: string;
    };
  };
  challenges: string[];
  solutions: string[];
  results: string[];
  videoUrl?: string;
  caseStudyUrl?: string;
  featured: boolean;
}

const customerStories: CustomerStory[] = [
  {
    id: 'hassan-sons',
    name: 'Ahmed Hassan',
    company: 'Hassan & Sons Metalworks',
    avatar: '/images/profiles/ahmed-hassan.jpg',
    role: 'Production Manager',
    location: 'Cairo, Egypt',
    industry: 'Aluminum Fabrication',
    packageUsed: 'professional',
    testimonial: "Almona's Professional Care package transformed our operations. We went from 3 days of downtime per month to just 4 hours. The predictive maintenance caught issues before they became problems.",
    rating: 5,
    metrics: {
      before: {
        production: '85%',
        downtime: '3 days/month',
        efficiency: '72%'
      },
      after: {
        production: '98%',
        downtime: '4 hours/month',
        efficiency: '94%'
      }
    },
    challenges: [
      'Frequent machine breakdowns',
      'High maintenance costs',
      'Production delays',
      'Lack of technical expertise'
    ],
    solutions: [
      'Weekly remote monitoring',
      'Predictive maintenance alerts',
      '24/7 emergency support',
      'Operator training programs'
    ],
    results: [
      '95% reduction in downtime',
      '40% increase in production efficiency',
      '60% reduction in maintenance costs',
      'ROI achieved in 3 months'
    ],
    featured: true
  },
  {
    id: 'al-sayed-upvc',
    name: 'Fatima Al-Sayed',
    company: 'Al-Sayed UPVC Windows',
    avatar: '/images/profiles/fatima-al-sayed.jpg',
    role: 'Operations Director',
    location: 'Alexandria, Egypt',
    industry: 'UPVC Manufacturing',
    packageUsed: 'enterprise',
    testimonial: "The Enterprise Care package gave us the AI-powered insights we needed to scale. We're now producing 300% more with the same equipment and have expanded to 3 new markets.",
    rating: 5,
    metrics: {
      before: {
        production: '70%',
        downtime: '5 days/month',
        efficiency: '65%'
      },
      after: {
        production: '95%',
        downtime: '2 hours/month',
        efficiency: '92%'
      }
    },
    challenges: [
      'Scaling production capacity',
      'Quality control issues',
      'Export compliance requirements',
      'Technology upgrade needs'
    ],
    solutions: [
      'AI predictive maintenance',
      'Dedicated technical team',
      'Custom production reports',
      'Export compliance support'
    ],
    results: [
      '300% increase in production',
      '99.2% quality rate achieved',
      'Successfully exported to 3 countries',
      '50% reduction in energy costs'
    ],
    featured: true
  },
  {
    id: 'mahmoud-aluminum',
    name: 'Mustafa Mahmoud',
    company: 'Mahmoud Aluminum Profiles',
    avatar: '/images/profiles/mustafa-mahmoud.jpg',
    role: 'Factory Owner',
    location: 'Giza, Egypt',
    industry: 'Aluminum Profiles',
    packageUsed: 'basic',
    testimonial: "Starting with Basic Care was perfect for our small workshop. The monthly health checks and training sessions helped us grow from 2 to 8 machines in just 18 months.",
    rating: 5,
    metrics: {
      before: {
        production: '60%',
        downtime: '2 days/month',
        efficiency: '55%'
      },
      after: {
        production: '88%',
        downtime: '8 hours/month',
        efficiency: '82%'
      }
    },
    challenges: [
      'Limited technical knowledge',
      'Small budget for maintenance',
      'Need for operator training',
      'Growing business demands'
    ],
    solutions: [
      'Monthly machine health checks',
      'Basic spare parts discount',
      'Operator training sessions',
      'Digital machine passport'
    ],
    results: [
      '400% business growth',
      '75% reduction in downtime',
      'Trained 12 operators',
      'Expanded to 4x capacity'
    ],
    featured: false
  }
];

interface CustomerStoriesProps {
  className?: string;
  showFeaturedOnly?: boolean;
  maxStories?: number;
}

export const CustomerStories: React.FC<CustomerStoriesProps> = ({
  className = '',
  showFeaturedOnly = false,
  maxStories = 3
}) => {
  const { t } = useTranslation('services');
  const [currentStory, setCurrentStory] = useState(0);
  const [selectedStory, setSelectedStory] = useState<CustomerStory | null>(null);

  const stories = showFeaturedOnly 
    ? customerStories.filter(story => story.featured)
    : customerStories.slice(0, maxStories);

  const nextStory = () => {
    setCurrentStory((prev) => (prev + 1) % stories.length);
  };

  const prevStory = () => {
    setCurrentStory((prev) => (prev - 1 + stories.length) % stories.length);
  };

  const getPackageColor = (packageType: string) => {
    switch (packageType) {
      case 'basic': return 'bg-green-500';
      case 'professional': return 'bg-yellow-500';
      case 'enterprise': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPackageLabel = (packageType: string) => {
    switch (packageType) {
      case 'basic': return 'Basic Care';
      case 'professional': return 'Professional Care';
      case 'enterprise': return 'Enterprise Care';
      default: return 'Service Package';
    }
  };

  return (
    <div className={`space-y-12 ${className}`}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-3 mb-4 px-6 py-3 rounded-full bg-gradient-to-r from-orange-500/10 to-purple-500/10 border border-orange-500/20">
          <Award className="h-6 w-6 text-orange-400" />
          <span className="text-orange-400 font-semibold">Success Stories</span>
        </div>
        <h2 className="text-4xl font-bold text-white mb-4">
          Real Results from <span className="text-orange-400">Real Customers</span>
        </h2>
        <p className="text-xl text-gray-400 max-w-3xl mx-auto">
          See how ALMONA's service packages have transformed businesses across Egypt. 
          From small workshops to large factories, our customers achieve remarkable results.
        </p>
      </motion.div>

      {/* Featured Story Carousel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative"
      >
        <div className="overflow-hidden rounded-2xl">
          <motion.div
            className="flex"
            animate={{ x: -currentStory * 100 + '%' }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            {stories.map((story, index) => (
              <div key={story.id} className="w-full flex-shrink-0">
                <Card className="bg-slate-800/50 backdrop-blur-sm border border-white/10">
                  <CardContent className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Customer Info */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-16 h-16">
                            <AvatarImage src={story.avatar} alt={story.name} />
                            <AvatarFallback className="text-lg">{story.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="text-2xl font-bold text-white">{story.name}</h3>
                            <p className="text-orange-400 font-semibold">{story.company}</p>
                            <p className="text-gray-400">{story.role} • {story.location}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge className={`${getPackageColor(story.packageUsed)} text-white`}>
                            {getPackageLabel(story.packageUsed)}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: story.rating }).map((_, i) => (
                              <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                            ))}
                          </div>
                        </div>

                        <blockquote className="text-lg text-gray-300 italic border-l-4 border-orange-500 pl-4">
                          <Quote className="h-5 w-5 text-orange-400 mb-2" />
                          "{story.testimonial}"
                        </blockquote>

                        <div className="flex gap-3">
                          {story.videoUrl && (
                            <Button variant="outline" size="sm" className="text-orange-400 border-orange-400 hover:bg-orange-400 hover:text-white">
                              <Play className="h-4 w-4 mr-2" />
                              Watch Video
                            </Button>
                          )}
                          {story.caseStudyUrl && (
                            <Button variant="outline" size="sm" className="text-orange-400 border-orange-400 hover:bg-orange-400 hover:text-white">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Full Case Study
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="space-y-6">
                        <h4 className="text-xl font-semibold text-white">Results Achieved</h4>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-green-400 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-white">{story.metrics.after.production}</div>
                            <div className="text-sm text-gray-400">Production</div>
                            <div className="text-xs text-green-400">vs {story.metrics.before.production}</div>
                          </div>
                          <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                            <Clock className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-white">{story.metrics.after.downtime}</div>
                            <div className="text-sm text-gray-400">Downtime</div>
                            <div className="text-xs text-blue-400">vs {story.metrics.before.downtime}</div>
                          </div>
                          <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                            <Factory className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-white">{story.metrics.after.efficiency}</div>
                            <div className="text-sm text-gray-400">Efficiency</div>
                            <div className="text-xs text-purple-400">vs {story.metrics.before.efficiency}</div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h5 className="font-semibold text-white">Key Results:</h5>
                          <ul className="space-y-1">
                            {story.results.slice(0, 3).map((result, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                                <div className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0" />
                                {result}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Navigation */}
        {stories.length > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={prevStory}
              className="text-orange-400 border-orange-400 hover:bg-orange-400 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex gap-2">
              {stories.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStory(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentStory ? 'bg-orange-400' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={nextStory}
              className="text-orange-400 border-orange-400 hover:bg-orange-400 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </motion.div>

      {/* All Stories Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {stories.map((story) => (
          <Card 
            key={story.id} 
            className="bg-slate-800/50 backdrop-blur-sm border border-white/10 hover:border-orange-500/30 transition-all duration-300 cursor-pointer"
            onClick={() => setSelectedStory(story)}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={story.avatar} alt={story.name} />
                  <AvatarFallback>{story.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg text-white">{story.name}</CardTitle>
                  <p className="text-orange-400 text-sm">{story.company}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={`${getPackageColor(story.packageUsed)} text-white text-xs`}>
                    {getPackageLabel(story.packageUsed)}
                  </Badge>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: story.rating }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 text-yellow-400 fill-current" />
                    ))}
                  </div>
                </div>
                
                <p className="text-gray-300 text-sm line-clamp-3">
                  {story.testimonial}
                </p>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{story.location}</span>
                  <span className="text-orange-400 font-semibold">
                    {story.metrics.after.production} Production
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center"
      >
        <div className="bg-gradient-to-r from-orange-500/10 to-purple-500/10 rounded-2xl p-8 border border-white/10">
          <h3 className="text-2xl font-bold text-white mb-4">
            Ready to Write Your Success Story?
          </h3>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Join hundreds of satisfied customers who have transformed their businesses with ALMONA's service packages.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-3">
              Get Your Free Consultation
            </Button>
            <Button variant="outline" className="border-white text-white hover:bg-white hover:text-slate-900 px-8 py-3">
              View All Case Studies
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CustomerStories;
