import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/shared/ui/ui/separator";
import { Icons } from "@/components/ui/icons";
import { WorkflowDiagram } from "@/components/about/WorkflowDiagram";
import { LocalStandardsTable } from "@/components/comparison/LocalStandardsTable";
import { EfficiencyCalculator } from "@/components/comparison/EfficiencyCalculator";
import { ArrowLeft } from 'lucide-react';

const FabricationWorkflowDetail = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("upvc");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedStep, setExpandedStep] = useState<number | null>(0);

  const workflowData = {
    upvc: {
      title: "UPVC Fabrication Workflow (سير العمل)",
      description: "Optimized for Egypt's climate and market demands (متوافق مع مناخ مصر)",
      steps: [
        {
          title: "Material Inspection (فحص الخامات)",
          description: "Checking for thermal stability and UV resistance (التحقق من مقاومة الحرارة والأشعة فوق البنفسجية)",
          tips: ["Look for SGS certification", "Test sample for color fastness", "Verify lead content <0.1%"],
          egyptTip: "Verify humidity resistance ≥85% RH - critical for coastal areas like Alexandria (هام للمناطق الساحلية كالإسكندرية)",
          commonIssues: [
            "Substandard recycled materials in local market",
            "Inconsistent UV stabilizer levels"
          ],
          solutions: [
            "Source from trusted suppliers like Misr El Kheir or Egyptian German",
            "Use portable UV tester on delivery"
          ]
        },
        {
          title: "Precision Cutting (القطع الدقيق)",
          description: "Angular cutting for Egyptian window designs (القطع الزاوي لتصاميم النوافذ المصرية)",
          tips: ["Maintain 0.1mm tolerance", "Use diamond-tipped blades", "Clean blades after every 50 cuts"],
          egyptTip: "Add 0.5mm extra for thermal expansion during summer (up to 45°C) (أضف 0.5 مم للتوسع الحراري في الصيف حتى 45 درجة مئوية)",
          commonIssues: [
            "Dust accumulation affecting precision",
            "Power fluctuations damaging motors"
          ],
          solutions: [
            "Install industrial air filters",
            "Use voltage stabilizers (common in Egyptian factories)"
          ]
        },
        {
          title: "Notching & Routing (الشق والتوجيه)",
          description: "Preparing for hardware installation (التحضير لتركيب الأجهزة)",
          tips: ["Clean routing bits every 50 cuts", "Check depth settings", "Use vacuum for chip removal"],
          egyptTip: "Adjust for common Egyptian hardware sizes (e.g., Maco, Giesse) (تعديل لأحجام الأجهزة الشائعة في مصر مثل ماكو وجيسي)",
          commonIssues: [
            "Hardware compatibility issues with European profiles",
            "Vibration affecting precision in older buildings"
          ],
          solutions: [
            "Keep Egyptian-specific routing templates",
            "Install vibration dampeners on machines"
          ]
        },
        {
          title: "Welding & Assembly (اللحام والتجميع)",
          description: "Joining profiles with heat welding (ربط الملفات باللحام الحراري)",
          tips: ["Maintain 240-260°C temperature", "Check pressure consistency", "Allow 15 min cooling time"],
          egyptTip: "Increase cooling time by 20% during summer months (زيادة وقت التبريد بنسبة 20٪ خلال أشهر الصيف)",
          commonIssues: [
            "Inconsistent power affecting weld quality",
            "High ambient temperature affecting cooling"
          ],
          solutions: [
            "Install temperature-controlled welding stations",
            "Use industrial fans for accelerated cooling"
          ]
        },
        {
          title: "Hardware Installation (تركيب الأجهزة)",
          description: "Fitting locks, handles, and hinges (تركيب الأقفال والمقابض والمفصلات)",
          tips: ["Use torque-controlled screwdrivers", "Apply silicone lubricant", "Check alignment with laser level"],
          egyptTip: "Use stainless steel hardware to combat high humidity in Delta region (استخدم أجهزة من الفولاذ المقاوم للصدأ لمقاومة الرطوبة العالية في دلتا النيل)",
          commonIssues: [
            "Screw stripping in dense UPVC",
            "Misalignment causing operational issues"
          ],
          solutions: [
            "Use self-tapping screws designed for Egyptian UPVC",
            "Implement jig systems for precise positioning"
          ]
        }
      ],
      standards: [
        { name: "ES 1789:2020", description: "UPVC profile durability requirements" },
        { name: "ES 2105:2018", description: "Thermal performance standards" },
        { name: "ES 3120:2021", description: "Recycled material content regulations" }
      ],
      challenges: [
        "High temperatures causing material expansion",
        "Desert dust affecting machinery precision",
        "Humidity corrosion in coastal areas"
      ]
    },
    aluminum: {
      title: "Aluminum Fabrication Workflow",
      description: "Specialized for Egyptian architectural needs",
      steps: [
        {
          title: "Alloy Verification",
          description: "Ensuring corrosion resistance",
          tips: ["Test for 6063-T5 alloy", "Check mill certificates", "Verify tensile strength"],
          egyptTip: "Require salt spray test ≥2000 hours for coastal projects",
          commonIssues: [
            "Substandard alloys in local market",
            "Inconsistent tempering quality"
          ],
          solutions: [
            "Source from certified suppliers like Egyptian Aluminum",
            "Implement on-site hardness testing"
          ]
        },
        {
          title: "Precision Cutting",
          description: "Cutting to exact dimensions",
          tips: ["Use carbide-tipped blades", "Maintain 0.2mm tolerance", "Deburr edges immediately"],
          egyptTip: "Add 0.3mm clearance for thermal expansion in Upper Egypt projects",
          commonIssues: [
            "Power fluctuations affecting cut quality",
            "Dust contamination in cutting area"
          ],
          solutions: [
            "Install voltage regulators on cutting machines",
            "Implement wet cutting systems"
          ]
        },
        {
          title: "Thermal Break Installation",
          description: "For energy efficient windows",
          tips: ["Check polyamide integrity", "Verify break continuity", "Measure insulation values"],
          egyptTip: "Use wider 34mm breaks instead of standard 24mm for Egyptian heat",
          commonIssues: [
            "Thermal bridging in high-temperature zones",
            "Moisture absorption in humid areas"
          ],
          solutions: [
            "Use Egyptian-certified thermal breaks",
            "Apply hydrophobic coatings"
          ]
        },
        {
          title: "Hardware Integration",
          description: "Installing locking systems and operators",
          tips: ["Use stainless steel components", "Apply anti-seize lubricant", "Test operation 50+ times"],
          egyptTip: "Specify sand-resistant tracks for desert regions",
          commonIssues: [
            "Corrosion in high-humidity areas",
            "Grit accumulation affecting operation"
          ],
          solutions: [
            "Install brush seals on sliding systems",
            "Specify marine-grade stainless hardware"
          ]
        },
        {
          title: "Glazing & Sealing (التزجيج والختم)",
          description: "Installing glass with proper sealing (تركيب الزجاج مع الختم المناسب)",
          tips: ["Use butyl tape for primary seal", "Apply structural silicone", "Check for uniform compression"],
          egyptTip: "Use solar-control glass with low-E coatings for Egyptian sun exposure",
          commonIssues: [
            "Sealant failure in high temperatures",
            "Glass thermal stress cracking"
          ],
          solutions: [
            "Use Egyptian-certified high-temperature silicones",
            "Install thermal stress relief joints"
          ]
        }
      ],
      standards: [
        { name: "ES 2450:2019", description: "Structural aluminum standards" },
        { name: "ES 3102:2020", description: "Thermal break requirements" },
        { name: "ES 4150:2021", description: "Coastal corrosion protection" }
      ],
      challenges: [
        "High thermal expansion causing joint failure",
        "Sand abrasion on moving parts",
        "Salt spray corrosion in coastal cities"
      ]
    },
    glass: {
      title: "Glass Processing Workflow",
      description: "Optimized for Egyptian climate conditions",
      steps: [
        {
          title: "Glass Selection",
          description: "Choosing appropriate glass types",
          tips: ["Consider thermal requirements", "Check optical quality", "Verify thickness"],
          egyptTip: "Prioritize solar control glass (SCG) for Egyptian buildings",
          commonIssues: [
            "Insufficient solar protection",
            "Thermal stress cracking"
          ],
          solutions: [
            "Use low-E coatings from Egyptian suppliers",
            "Incorporate thermal stress analysis"
          ]
        },
        {
          title: "Cutting & Shaping",
          description: "Precision cutting to required dimensions",
          tips: ["Maintain clean cutting wheels", "Use proper scoring pressure", "Handle with suction cups"],
          egyptTip: "Add 0.5mm tolerance for thermal expansion in summer",
          commonIssues: [
            "Chipping during cutting",
            "Inaccurate cuts due to temperature"
          ],
          solutions: [
            "Use diamond-coated cutting wheels",
            "Maintain workshop temperature at 22±2°C"
          ]
        }
      ],
      standards: [
        { name: "ES 5200:2020", description: "Safety glass requirements" },
        { name: "ES 5300:2021", description: "Solar control performance" }
      ],
      challenges: [
        "High solar gain causing interior heat",
        "Thermal stress from temperature differentials",
        "Sand abrasion on exterior surfaces"
      ]
    },
    hardware: {
      title: "Hardware Installation Workflow",
      description: "Specialized for Egyptian window systems",
      steps: [
        {
          title: "Component Selection",
          description: "Choosing appropriate hardware",
          tips: ["Match hardware to profile type", "Consider security requirements", "Check corrosion resistance"],
          egyptTip: "Specify sand-resistant tracks for desert regions",
          commonIssues: [
            "Corrosion in high-humidity areas",
            "Grit accumulation affecting operation"
          ],
          solutions: [
            "Use marine-grade stainless steel",
            "Install brush seals on sliding systems"
          ]
        },
        {
          title: "Precision Installation",
          description: "Mounting hardware with exact alignment",
          tips: ["Use laser alignment tools", "Follow torque specifications", "Apply thread locking compound"],
          egyptTip: "Increase fastener size for high-wind areas (Alexandria, North Coast)",
          commonIssues: [
            "Misalignment causing operational issues",
            "Vibration loosening fasteners"
          ],
          solutions: [
            "Implement jig systems for positioning",
            "Use vibration-resistant fasteners"
          ]
        }
      ],
      standards: [
        { name: "ES 6100:2019", description: "Window hardware durability" },
        { name: "ES 6150:2020", description: "Security requirements" }
      ],
      challenges: [
        "Sand ingress in desert regions",
        "Salt corrosion in coastal areas",
        "High temperatures affecting lubrication"
      ]
    }
  };

  const filteredSteps = workflowData[activeTab].steps.filter(step =>
    step.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    step.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleStep = (index: number) => {
    setExpandedStep(expandedStep === index ? null : index);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 }
    }
  };

  return (
    <div className="bg-almona-dark text-white min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-almona-light/10 hover:bg-almona-light/20 text-almona-light rounded-full mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </motion.div>

        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Badge variant="secondary" className="mb-4 text-lg py-2 px-4 bg-almona-orange/10 text-almona-orange border-almona-orange/30">
            مصر - Egypt
          </Badge>
          <h1 className="text-5xl font-bold text-gradient-orange mb-4">Egyptian Fabrication Workflows</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Specialized processes developed for Egypt's unique climate and market needs
          </p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-almona-dark/80 rounded-lg p-1">
            <TabsTrigger value="upvc" className="py-3 data-[state=active]:bg-almona-orange data-[state=active]:text-white rounded-md">UPVC Systems</TabsTrigger>
            <TabsTrigger value="aluminum" className="py-3 data-[state=active]:bg-almona-orange data-[state=active]:text-white rounded-md">Aluminum</TabsTrigger>
            <TabsTrigger value="glass" className="py-3 data-[state=active]:bg-almona-orange data-[state=active]:text-white rounded-md">Glass Processing</TabsTrigger>
            <TabsTrigger value="hardware" className="py-3 data-[state=active]:bg-almona-orange data-[state=active]:text-white rounded-md">Hardware</TabsTrigger>
          </TabsList>
        </Tabs>

        <motion.div 
          className="flex flex-col lg:flex-row gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="lg:w-2/3">
            <motion.div 
              className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6 p-4 bg-almona-dark/60 backdrop-blur-sm rounded-xl border border-almona-light/10"
              variants={itemVariants}
            >
              <div>
                <h2 className="text-2xl font-bold text-white">{workflowData[activeTab].title}</h2>
                <p className="text-gray-400">{workflowData[activeTab].description}</p>
              </div>
              <div className="w-full md:w-64">
                <Input
                  placeholder="Search steps..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-almona-dark/80 border-almona-light/30 focus:ring-2 focus:ring-almona-light focus:border-almona-light"
                />
              </div>
            </motion.div>

            <motion.div className="space-y-4" variants={itemVariants}>
              {filteredSteps.map((step, index) => (
                <Card 
                  key={index} 
                  className="bg-almona-dark/60 backdrop-blur-sm border border-almona-light/10 rounded-xl overflow-hidden"
                >
                  <CardHeader 
                    className="p-6 cursor-pointer flex items-center justify-between hover:bg-almona-light/5 transition-colors"
                    onClick={() => toggleStep(index)}
                  >
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="h-10 w-10 flex items-center justify-center text-lg border-almona-orange text-almona-orange">
                        {index + 1}
                      </Badge>
                      <div>
                        <h3 className="text-lg font-medium text-white">{step.title}</h3>
                        <p className="text-gray-400">{step.description}</p>
                      </div>
                    </div>
                    <motion.div animate={{ rotate: expandedStep === index ? 180 : 0 }}>
                      <Icons.chevronDown className="h-5 w-5" />
                    </motion.div>
                  </CardHeader>
                  <AnimatePresence>
                    {expandedStep === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <CardContent className="p-6 pt-0">
                          <div className="mt-4 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-almona-light/5 p-4 rounded-lg border border-almona-light/10">
                                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 text-almona-light">
                                  <Icons.tip className="h-4 w-4" />
                                  Professional Tips
                                </h4>
                                <ul className="space-y-2 text-sm text-gray-300">
                                  {step.tips.map((tip, i) => (
                                    <li key={i} className="flex items-start"><span className="mr-2 text-almona-orange">•</span>{tip}</li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div className="bg-almona-orange/10 p-4 rounded-lg border border-almona-orange/30">
                                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 text-almona-orange">
                                  <Icons.egypt className="h-4 w-4" />
                                  Egypt-Specific Advice
                                </h4>
                                <p className="text-sm text-gray-200">{step.egyptTip}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/30">
                                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 text-red-400">
                                  <Icons.warning className="h-4 w-4" />
                                  Common Challenges
                                </h4>
                                <ul className="space-y-2 text-sm text-gray-300">
                                  {step.commonIssues.map((issue, i) => (
                                    <li key={i} className="flex items-start"><span className="mr-2 text-red-500">•</span>{issue}</li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/30">
                                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 text-green-400">
                                  <Icons.solution className="h-4 w-4" />
                                  Recommended Solutions
                                </h4>
                                <ul className="space-y-2 text-sm text-gray-300">
                                  {step.solutions.map((solution, i) => (
                                    <li key={i} className="flex items-start"><span className="mr-2 text-green-500">•</span>{solution}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              ))}
            </motion.div>

            <motion.div variants={itemVariants} className="mt-8">
              <WorkflowDiagram workflowType={activeTab} />
            </motion.div>
          </div>

          <div className="lg:w-1/3 space-y-6">
            <motion.div variants={itemVariants}>
              <Card className="bg-almona-dark/60 backdrop-blur-sm border border-almona-light/10 rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl text-white">
                    <Icons.standard className="h-5 w-5 text-almona-orange" />
                    Egyptian Standards
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <LocalStandardsTable standards={workflowData[activeTab].standards} region="Egypt" />
                  <p className="mt-4 text-sm text-gray-400 flex items-start">
                    <Icons.info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-almona-light" />
                    Available at Egyptian Organization for Standardization (EOS) offices
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <EfficiencyCalculator materialType={activeTab} />
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="bg-almona-dark/60 backdrop-blur-sm border border-almona-light/10 rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl text-white">
                    <Icons.support className="h-5 w-5 text-almona-orange" />
                    Egyptian Support Network
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-almona-light/5 rounded-lg border border-almona-light/10">
                    <h3 className="font-medium mb-1 flex items-center gap-2 text-almona-light"><Icons.phone className="h-4 w-4" />Technical Hotline</h3>
                    <p className="text-sm text-gray-400">Arabic-speaking support: <span className="font-mono text-white">0122 345 6789</span></p>
                    <p className="text-sm text-gray-400 mt-1">Hours: Sat-Thu 8AM-5PM (GMT+2)</p>
                  </div>
                  
                  <div className="p-4 bg-almona-light/5 rounded-lg border border-almona-light/10">
                    <h3 className="font-medium mb-1 flex items-center gap-2 text-almona-light"><Icons.training className="h-4 w-4" />Training Centers</h3>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li className="flex items-start"><span className="mr-2 text-almona-orange">•</span><strong>Cairo:</strong> 10th of Ramadan City, Thursdays</li>
                      <li className="flex items-start"><span className="mr-2 text-almona-orange">•</span><strong>Alexandria:</strong> Borg El Arab, Tuesdays</li>
                      <li className="flex items-start"><span className="mr-2 text-almona-orange">•</span><strong>Upper Egypt:</strong> Assiut, Monthly workshops</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-almona-light/5 rounded-lg border border-almona-light/10">
                    <h3 className="font-medium mb-1 flex items-center gap-2 text-almona-light"><Icons.certificate className="h-4 w-4" />Egyptian Fabricator Certification</h3>
                    <p className="text-sm text-gray-400">Ministry of Trade & Industry recognized program</p>
                    <Button variant="link" className="text-almona-orange p-0 h-auto mt-2 hover:underline">View Certification Requirements</Button>
                  </div>
                  
                  <Button className="w-full bg-almona-orange hover:bg-almona-orange/90 text-white flex items-center justify-center">
                    <Icons.calendar className="mr-2 h-4 w-4" />
                    Schedule On-Site Consultation
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="bg-almona-dark/60 backdrop-blur-sm border border-almona-light/10 rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl text-white">
                    <Icons.challenge className="h-5 w-5 text-almona-orange" />
                    Egypt-Specific Challenges
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-gray-300">
                    {workflowData[activeTab].challenges.map((challenge, i) => (
                      <li key={i} className="flex items-start">
                        <Icons.warning className="h-5 w-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span>{challenge}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-sm text-gray-400 flex items-start">
                    <Icons.info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-almona-light" />
                    Solutions for these challenges are in each workflow step.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>

        <motion.div 
          className="mt-12 bg-gradient-to-r from-almona-orange/10 to-almona-light/10 p-8 rounded-2xl border border-almona-orange/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4 bg-almona-orange/20 text-almona-orange border-almona-orange/50">
              Egyptian Fabricators Program
            </Badge>
            <h2 className="text-3xl font-bold text-white mb-4">Need a Custom Workflow Solution?</h2>
            <p className="text-gray-300 mb-6">
              Our Egyptian engineering team will visit your facility to develop a fabrication 
              process tailored to your specific:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-almona-dark/50 p-6 rounded-lg"><Icons.factory className="h-10 w-10 mx-auto mb-3 text-almona-orange" /><p>Factory Conditions</p></div>
              <div className="bg-almona-dark/50 p-6 rounded-lg"><Icons.climate className="h-10 w-10 mx-auto mb-3 text-almona-orange" /><p>Regional Climate</p></div>
              <div className="bg-almona-dark/50 p-6 rounded-lg"><Icons.product className="h-10 w-10 mx-auto mb-3 text-almona-orange" /><p>Product Mix</p></div>
            </div>
            <Button size="lg" className="bg-gradient-orange hover:bg-almona-orange-dark text-white font-bold py-3 px-8">
              Request Free Workflow Audit
            </Button>
            <p className="text-sm text-gray-400 mt-4">
              Available for factories in Cairo, Alexandria, 10th of Ramadan, and 6th of October cities
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default FabricationWorkflowDetail;
