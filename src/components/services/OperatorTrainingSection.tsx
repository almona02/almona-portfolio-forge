import { useState } from "react";
import { Button } from "@/shared/ui/ui/button";
import { Badge } from "@/shared/ui/ui/badge";
import { 
  Factory, 
  GraduationCap, 
  Layers, 
  Scissors, 
  Settings, 
  Thermometer,
  Zap,
  ShieldCheck,
  Gauge
} from "lucide-react";
import { FabricationStageCard } from "./FabricationStageCard";
import { TrainingLevelCard } from "../services/TrainingLevelCard";

export const OperatorTrainingSection = () => {
  const [selectedMaterial, setSelectedMaterial] = useState<"aluminium" | "upvc">("aluminium");
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const aluminiumStages = [
    {
      title: "Material Preparation",
      description: "Proper handling and preparation of aluminum profiles",
      icon: <Layers className="h-5 w-5 text-white" />,
      duration: "2-4 hours",
      keyPoints: [
        "Profile storage best practices",
        "Material quality inspection",
        "Optimal cutting techniques",
        "Barcode tracking integration"
      ]
    },
    {
      title: "Precision Cutting",
      description: "Achieving perfect cuts for seamless joins",
      icon: <Scissors className="h-5 w-5 text-white" />,
      duration: "4-6 hours",
      keyPoints: [
        "CNC cutting machine operation",
        "Angle precision calibration",
        "Waste minimization techniques",
        "Dust extraction systems"
      ]
    },
    {
      title: "Thermal Break Installation",
      description: "Ensuring optimal thermal performance",
      icon: <Thermometer className="h-5 w-5 text-white" />,
      duration: "3-5 hours",
      keyPoints: [
        "Polyamide strip installation",
        "Thermal barrier testing",
        "Moisture prevention",
        "Structural integrity checks"
      ]
    },
    {
      title: "Assembly & Glazing",
      description: "Final assembly and glass installation",
      icon: <Settings className="h-5 w-5 text-white" />,
      duration: "5-8 hours",
      keyPoints: [
        "Corner cleaning techniques",
        "Screw pattern optimization",
        "Double glazing installation",
        "Hardware alignment"
      ]
    }
  ];

  const upvcStages = [
    {
      title: "Profile Welding",
      description: "Creating strong, seamless joins in UPVC",
      icon: <Zap className="h-5 w-5 text-white" />,
      duration: "3-5 hours",
      keyPoints: [
        "Welding temperature control",
        "Corner cleaning techniques",
        "Weld seam strength testing",
        "Jig setup and alignment"
      ]
    },
    {
      title: "Hardware Installation",
      description: "Precision fitting of locks and mechanisms",
      icon: <Settings className="h-5 w-5 text-white" />,
      duration: "4-6 hours",
      keyPoints: [
        "Multi-point locking systems",
        "Handle alignment",
        "Weather seal integration",
        "Hardware durability testing"
      ]
    },
    {
      title: "Glazing & Beading",
      description: "Secure glass installation for UPVC frames",
      icon: <ShieldCheck className="h-5 w-5 text-white" />,
      duration: "3-4 hours",
      keyPoints: [
        "Gasket selection",
        "Beading techniques",
        "Pressure equalization",
        "Condensation prevention"
      ]
    },
    {
      title: "Quality Control",
      description: "Final inspection and testing procedures",
      icon: <Gauge className="h-5 w-5 text-white" />,
      duration: "2-3 hours",
      keyPoints: [
        "Air infiltration testing",
        "Water penetration tests",
        "Operational force measurement",
        "Visual inspection standards"
      ]
    }
  ];

  const trainingLevels = [
    {
      level: "basic",
      title: "Operator Certification",
      description: "Fundamental machine operation skills",
      duration: "5 Days",
      price: "8,500",
      features: [
        "Machine safety protocols",
        "Basic operation training",
        "Quality control fundamentals",
        "Certificate of completion"
      ]
    },
    {
      level: "advanced",
      title: "Master Fabricator",
      description: "Advanced fabrication techniques",
      duration: "10 Days",
      price: "15,000",
      features: [
        "Precision measurement techniques",
        "Advanced troubleshooting",
        "Efficiency optimization",
        "Gold certification",
        "Maintenance basics"
      ],
      isPopular: true
    },
    {
      level: "expert",
      title: "Production Specialist",
      description: "Complete production line mastery",
      duration: "15 Days",
      price: "22,000",
      features: [
        "Full process optimization",
        "Team leadership training",
        "Custom fabrication techniques",
        "Platinum certification",
        "Maintenance diagnostics"
      ]
    }
  ];

  return (
    <div className="space-y-12">
      {/* Material Selection */}
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-6">Fabrication Process Training</h2>
        <div className="flex justify-center gap-4 mb-8">
          <Button
            variant={selectedMaterial === "aluminium" ? "default" : "outline"}
            className={`px-8 py-3 text-lg ${selectedMaterial === "aluminium" ? 'bg-gradient-to-r from-orange-500 to-red-500' : ''}`}
            onClick={() => setSelectedMaterial("aluminium")}
          >
            Aluminium Fabrication
          </Button>
          <Button
            variant={selectedMaterial === "upvc" ? "default" : "outline"}
            className={`px-8 py-3 text-lg ${selectedMaterial === "upvc" ? 'bg-gradient-to-br from-blue-500 to-purple-500' : ''}`}
            onClick={() => setSelectedMaterial("upvc")}
          >
            UPVC Fabrication
          </Button>
        </div>
        
        <p className="max-w-3xl mx-auto text-gray-400">
          {selectedMaterial === "aluminium" 
            ? "Master the complete process of aluminium window and door fabrication with our specialized training programs tailored for Egyptian industrial standards."
            : "Learn the intricacies of UPVC window production with techniques optimized for Egypt's climate and market demands."}
        </p>
      </div>
      
      {/* Fabrication Stages */}
      <div>
        <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Factory className="h-6 w-6 text-orange-500" />
          Key Fabrication Stages
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(selectedMaterial === "aluminium" ? aluminiumStages : upvcStages).map((stage, index) => (
            <FabricationStageCard key={index} {...stage} />
          ))}
        </div>
      </div>
      
      {/* Training Levels */}
      <div>
        <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-orange-500" />
          Training Programs
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {trainingLevels.map((level) => (
            <TrainingLevelCard 
              key={level.level}
              {...level}
              onClick={() => setSelectedLevel(level.level)}
            />
          ))}
        </div>
      </div>
      
      {/* Egyptian Market Focus */}
      <div className="bg-gradient-to-r from-almona-darker to-almona-dark/80 p-8 rounded-lg border border-almona-light/20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <Badge className="mb-4 bg-egyptian-blue">Egypt Market Special</Badge>
            <h3 className="text-2xl font-bold mb-4">
              Tailored for Egyptian Fabricators
            </h3>
            <p className="text-gray-400 mb-6">
              Our training programs incorporate specific adaptations for the Egyptian market, including:
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-orange-500">✓</span>
                <span>Dust and sand protection techniques</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500">✓</span>
                <span>High-temperature performance optimization</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500">✓</span>
                <span>Local material sourcing strategies</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500">✓</span>
                <span>Arabic-language training materials</span>
              </li>
            </ul>
          </div>
          <div className="bg-almona-dark rounded-lg p-6 border border-almona-light/20">
            <h4 className="text-xl font-bold mb-4">Egyptian Market Advantages</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-egyptian-blue/20 rounded-lg">
                  <Zap className="h-5 w-5 text-egyptian-blue" />
                </div>
                <div>
                  <h5 className="font-medium">Government Incentives</h5>
                  <p className="text-sm text-gray-400">
                    Special training subsidies available for Egyptian manufacturers
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-egyptian-blue/20 rounded-lg">
                  <ShieldCheck className="h-5 w-5 text-egyptian-blue" />
                </div>
                <div>
                  <h5 className="font-medium">Local Certification</h5>
                  <p className="text-sm text-gray-400">
                    Recognized by Egyptian Industrial Development Authority
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-egyptian-blue/20 rounded-lg">
                  <Factory className="h-5 w-5 text-egyptian-blue" />
                </div>
                <div>
                  <h5 className="font-medium">Market Insights</h5>
                  <p className="text-sm text-gray-400">
                    Includes Egyptian market trends and customer preferences
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};