import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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

const FabricationWorkflowDetail = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("upvc");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <Button
          onClick={() => navigate("/")}
          className="flex items-center bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Icons.chevronLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </div>

      <div className="text-center mb-10">
        <Badge variant="secondary" className="mb-4 text-lg py-1 px-3">
          مصر - مصر - مصر
        </Badge>
        <h1 className="text-4xl font-bold mb-4">Egyptian Fabrication Workflows</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Specialized processes developed for Egypt's climate and market needs
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid w-full grid-cols-4 bg-muted/50">
          <TabsTrigger value="upvc" className="py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
            UPVC Systems
          </TabsTrigger>
          <TabsTrigger value="aluminum" className="py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
            Aluminum
          </TabsTrigger>
          <TabsTrigger value="glass" className="py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
            Glass Processing
          </TabsTrigger>
          <TabsTrigger value="hardware" className="py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
            Hardware
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-2/3">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
            <div>
              <h2 className="text-2xl font-bold">{workflowData[activeTab].title}</h2>
              <p className="text-muted-foreground">{workflowData[activeTab].description}</p>
            </div>
            <div className="w-full md:w-64">
              <Input
                placeholder="Search workflow steps..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white dark:bg-gray-800"
              />
            </div>
          </div>

          <Card className="mb-6">
            <CardHeader className="bg-muted/50">
              <CardTitle className="flex items-center gap-2">
                <Icons.workflow className="h-5 w-5 text-primary" />
                <span className="text-xl">Process Steps</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredSteps.map((step, index) => (
                  <div 
                    key={index} 
                    className="p-6 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => toggleStep(index)}
                  >
                    <div className="flex items-start gap-4">
                      <Badge variant="outline" className="mt-1 h-8 w-8 flex items-center justify-center text-lg">
                        {index + 1}
                      </Badge>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-medium">{step.title}</h3>
                            <p className="text-muted-foreground">{step.description}</p>
                          </div>
                          <Button
                            size="icon"
                            className="bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            {expandedStep === index ? 
                              <Icons.chevronUp className="h-5 w-5" /> : 
                              <Icons.chevronDown className="h-5 w-5" />
                            }
                          </Button>
                        </div>

                        {expandedStep === index && (
                          <div className="mt-4 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                                  <Icons.tip className="h-4 w-4 text-blue-500" />
                                  Professional Tips
                                </h4>
                                <ul className="space-y-2 text-sm">
                                  {step.tips.map((tip, i) => (
                                    <li key={i} className="flex items-start">
                                      <span className="mr-2">•</span>
                                      {tip}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                                  <Icons.egypt className="h-4 w-4 text-amber-500" />
                                  Egypt-Specific Advice
                                </h4>
                                <p className="text-sm">{step.egyptTip}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800">
                                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                                  <Icons.warning className="h-4 w-4 text-red-500" />
                                  Common Challenges in Egypt
                                </h4>
                                <ul className="space-y-2 text-sm">
                                  {step.commonIssues.map((issue, i) => (
                                    <li key={i} className="flex items-start">
                                      <span className="mr-2">•</span>
                                      {issue}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg border border-green-200 dark:border-green-800">
                                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                                  <Icons.solution className="h-4 w-4 text-green-500" />
                                  Recommended Solutions
                                </h4>
                                <ul className="space-y-2 text-sm">
                                  {step.solutions.map((solution, i) => (
                                    <li key={i} className="flex items-start">
                                      <span className="mr-2">•</span>
                                      {solution}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <WorkflowDiagram workflowType={activeTab} />
        </div>

        <div className="lg:w-1/3 space-y-6">
          <Card>
            <CardHeader className="bg-muted/50">
              <CardTitle className="flex items-center gap-2">
                <Icons.standard className="h-5 w-5 text-primary" />
                <span className="text-xl">Egyptian Standards</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LocalStandardsTable
                standards={workflowData[activeTab].standards}
                region="Egypt"
              />
              <div className="mt-4 text-sm text-muted-foreground">
                <p className="flex items-start">
                  <Icons.info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  Available at Egyptian Organization for Standardization (EOS) offices
                </p>
              </div>
            </CardContent>
          </Card>

          <EfficiencyCalculator materialType={activeTab} />

          <Card>
            <CardHeader className="bg-muted/50">
              <CardTitle className="flex items-center gap-2">
                <Icons.support className="h-5 w-5 text-primary" />
                <span className="text-xl">Egyptian Support Network</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h3 className="font-medium mb-1 flex items-center gap-2">
                    <Icons.phone className="h-4 w-4" />
                    Technical Hotline
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Arabic-speaking support: <span className="font-mono">0122 345 6789</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Hours: Sat-Thu 8AM-5PM (GMT+2)
                  </p>
                </div>
                
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h3 className="font-medium mb-1 flex items-center gap-2">
                    <Icons.training className="h-4 w-4" />
                    Training Centers
                  </h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>
                        <strong>Cairo:</strong> 10th of Ramadan City, Thursdays
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>
                        <strong>Alexandria:</strong> Borg El Arab, Tuesdays
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>
                        <strong>Upper Egypt:</strong> Assiut, Monthly workshops
                      </span>
                    </li>
                  </ul>
                </div>
                
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <h3 className="font-medium mb-1 flex items-center gap-2">
                    <Icons.certificate className="h-4 w-4" />
                    Egyptian Fabricator Certification
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Hours: Sat-Thu 8AM-5PM (GMT+2) (السبت-الخميس ٨ص-٥م)
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Ministry of Trade & Industry recognized program
                  </p>
                  <Button className="text-primary pl-0 mt-2 underline underline-offset-2 hover:text-primary/80">
                    View Certification Requirements
                  </Button>
                </div>
                
                <Button className="w-full mt-2 border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center">
                  <Icons.calendar className="mr-2 h-4 w-4" />
                  Schedule On-Site Consultation
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-muted/50">
              <CardTitle className="flex items-center gap-2">
                <Icons.challenge className="h-5 w-5 text-primary" />
                <span className="text-xl">Egypt-Specific Challenges</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {workflowData[activeTab].challenges.map((challenge, i) => (
                  <li key={i} className="flex items-start">
                    <Icons.warning className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>{challenge}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 text-sm text-muted-foreground">
                <p className="flex items-start">
                  <Icons.info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  Solutions tailored for these challenges are included in each workflow step
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-12 bg-gradient-to-r from-amber-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 p-8 rounded-lg border border-amber-200 dark:border-amber-800">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4">
            Egyptian Fabricators Program
          </Badge>
          <h2 className="text-2xl font-bold mb-4">Need a Custom Workflow Solution?</h2>
          <p className="text-muted-foreground mb-6">
            Our Egyptian engineering team will visit your facility to develop a fabrication 
            process tailored to your specific:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
              <Icons.factory className="h-8 w-8 mx-auto mb-2" />
              <p>Factory Conditions</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
              <Icons.climate className="h-8 w-8 mx-auto mb-2" />
              <p>Regional Climate</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
              <Icons.product className="h-8 w-8 mx-auto mb-2" />
              <p>Product Mix</p>
            </div>
          </div>
          <Button className="bg-primary hover:bg-primary/90">
            Request Free Workflow Audit
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Available for factories in Cairo, Alexandria, 10th of Ramadan, and 6th of October cities
          </p>
        </div>
      </div>
    </div>
  );
};

export default FabricationWorkflowDetail;
