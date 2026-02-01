import React from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  Users,
  TrendingUp,
  Award,
  Factory,
  GraduationCap,
  BarChart3,
  Leaf,
  ArrowRight,
  Building2,
  Zap,
} from 'lucide-react';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import SEO from '@/components/SEO';
import { Link } from 'react-router-dom';

const DigitalEgypt = () => {
  const vision2030Pillars = [
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: 'Economic Development',
      description: '15-30% material waste reduction supports import substitution and cost savings for Egyptian SMEs',
    },
    {
      icon: <GraduationCap className="w-6 h-6" />,
      title: 'Knowledge & Innovation',
      description: 'Self-learning ML models create a national knowledge base advancing Egypt\'s Global Innovation Index position',
    },
    {
      icon: <Building2 className="w-6 h-6" />,
      title: 'Efficient Institutions',
      description: 'Digital workflows enable transparent, efficient industrial operations aligned with government modernization',
    },
  ];

  const digitalEgyptPillars = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Digital Transformation',
      description: 'Complete digitization of aluminium/UPVC fabrication from measurement to production',
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Digital Skills & Jobs',
      description: 'CalibrationWizard and training modules develop Egypt\'s next generation of "Digital Fabricators"',
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: 'Digital Innovation',
      description: 'Proprietary algorithms (Remnant-First GA, Glass Nesting CP) represent cutting-edge Egyptian AI research',
    },
  ];

  const pilotKPIs = [
    { metric: '15-30%', label: 'Material Waste Reduction', icon: <Leaf className="w-5 h-5" /> },
    { metric: '20%', label: 'Operator Efficiency Increase', icon: <TrendingUp className="w-5 h-5" /> },
    { metric: '50+', label: 'Certified Digital Fabricators', icon: <GraduationCap className="w-5 h-5" /> },
    { metric: 'National', label: 'Remnant Marketplace', icon: <Factory className="w-5 h-5" /> },
  ];

  const consortiumPartners = [
    {
      role: 'Technology Lead',
      name: 'Almona Industrial Solutions',
      contribution: 'Fabricator Pro platform, technical support, project management',
    },
    {
      role: 'Academic Partner',
      name: 'Engineering Faculty (TBD)',
      contribution: 'Curriculum development, certification program, research & analysis',
    },
    {
      role: 'Industry Anchor',
      name: 'YILMAZ Egypt',
      contribution: 'CNC integration, technical validation, industry credibility',
    },
    {
      role: 'Industry Body',
      name: 'Federation of Egyptian Industries',
      contribution: 'Workshop recruitment, trust-building, industry coordination',
    },
    {
      role: 'Government Sponsors',
      name: 'MCIT/ITIDA, Ministry of Trade & Industry',
      contribution: 'Funding, policy alignment, SME support framework',
    },
  ];

  const pilotPhases = [
    {
      phase: 'Wave 1',
      workshops: '3-5 workshops',
      duration: 'Months 1-3',
      focus: 'Initial deployment, process refinement, baseline data collection',
    },
    {
      phase: 'Wave 2',
      workshops: '+4 workshops',
      duration: 'Months 4-6',
      focus: 'Scale deployment, training program launch, interim analysis',
    },
    {
      phase: 'Wave 3',
      workshops: '+5-8 workshops',
      duration: 'Months 7-12',
      focus: 'Full deployment, certification completion, final reporting',
    },
  ];

  return (
    <>
      <SEO
        title="Fabricator Pro: A Digital Egypt Initiative for Smart Manufacturing"
        description="National smart manufacturing platform aligned with Egypt Vision 2030 and Digital Egypt strategy. AI-powered fabrication optimization delivering 15-30% material waste reduction, operator upskilling, and evidence-based industrial policy insights."
        keywords="Digital Egypt, Egypt Vision 2030, smart manufacturing Egypt, industrial digital transformation Egypt, MCIT, ITIDA, G5 collaborative regulation, sustainable manufacturing, CO2 reduction, SME productivity Egypt, national pilot project, Industry 4.0 Egypt"
        url={`${import.meta.env.VITE_APP_URL || 'https://almona.eg'}/digital-egypt`}
        type="article"
      />

      <main className="pt-24 pb-16 min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white py-20 overflow-hidden">
          <div className="absolute inset-0 z-0 opacity-10">
            <div className="absolute inset-0 bg-[url('/pattern.svg')] bg-repeat" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-5xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Badge className="mb-4 bg-blue-500/20 text-blue-300 border-blue-400/50">
                  National Initiative
                </Badge>
                <h1 className="typography-h1 md:text-6xl mb-6">
                  Fabricator Pro: A Digital Egypt Initiative
                </h1>
                <p className="text-xl text-blue-100 mb-8 leading-relaxed max-w-3xl mx-auto">
                  Transforming Egypt's aluminium/UPVC manufacturing sector through AI-powered optimization,
                  operator upskilling, and evidence-based industrial policy. Aligned with Egypt Vision 2030
                  and the Digital Egypt strategy.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link to="/fabricator-workflow">
                    <Button size="lg" className="btn-primary">
                      Explore Platform <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                  <Link to="/contact">
                    <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                      Contact for Partnership
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* National Problem Statement */}
        <section className="py-16 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="typography-h2 mb-6 text-center">The National Challenge</h2>
                <div className="prose prose-lg dark:prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    Egypt's aluminium and UPVC fabrication sector faces critical productivity challenges:
                    high material waste (often 20-40%), limited digital adoption, and a significant skills gap
                    among operators. These factors constrain SME competitiveness, increase import dependency,
                    and limit Egypt's manufacturing export potential.
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    Fabricator Pro addresses these challenges through a comprehensive, AI-powered platform
                    that delivers measurable productivity gains while building Egypt's digital manufacturing
                    capabilities.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Vision 2030 Alignment */}
        <section className="py-16 bg-gray-50 dark:bg-gray-800/50">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-12"
              >
                <h2 className="typography-h2 mb-4">Alignment with Egypt Vision 2030</h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                  Fabricator Pro directly supports Egypt's national economic transformation goals
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {vision2030Pillars.map((pillar, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                  >
                    <Card className="h-full">
                      <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                            {pillar.icon}
                          </div>
                          <CardTitle className="text-xl">{pillar.title}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 dark:text-gray-400">{pillar.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-12"
              >
                <h3 className="typography-h3 mb-4">Digital Egypt Strategy Alignment</h3>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {digitalEgyptPillars.map((pillar, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                  >
                    <Card className="h-full">
                      <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                            {pillar.icon}
                          </div>
                          <CardTitle className="text-xl">{pillar.title}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 dark:text-gray-400">{pillar.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Proposed Pilot Structure */}
        <section className="py-16 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-12"
              >
                <h2 className="typography-h2 mb-4">Proposed National Pilot Project</h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                  A consortium-led initiative to validate Fabricator Pro's national impact
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {pilotKPIs.map((kpi, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                  >
                    <Card className="text-center h-full">
                      <CardContent className="pt-6">
                        <div className="flex justify-center mb-3 text-amber-500">
                          {kpi.icon}
                        </div>
                        <div className="text-3xl font-bold mb-2 text-blue-600 dark:text-blue-400">
                          {kpi.metric}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{kpi.label}</div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <Card>
                  <CardHeader>
                    <CardTitle>Scope</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-400">
                      10-15 workshops across Cairo, Alexandria, and Delta regions
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Duration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-400">
                      6-12 months with phased deployment (3 waves)
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Funding Model</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-400">
                      Grant-funded collaboration via ITIDA/MCIT or development partners
                    </p>
                  </CardContent>
                </Card>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="mb-8"
              >
                <h3 className="typography-h3 mb-6">Phased Deployment Model</h3>
                <div className="space-y-4">
                  {pilotPhases.map((phase, index) => (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{phase.phase}</CardTitle>
                          <Badge variant="outline">{phase.workshops}</Badge>
                        </div>
                        <CardDescription>{phase.duration}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 dark:text-gray-400">{phase.focus}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Consortium Partners */}
        <section className="py-16 bg-gray-50 dark:bg-gray-800/50">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-12"
              >
                <h2 className="typography-h2 mb-4">Consortium Partners</h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                  A collaborative approach bringing together technology, academia, industry, and government
                </p>
              </motion.div>

              <div className="space-y-4">
                {consortiumPartners.map((partner, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                  >
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div>
                            <Badge className="mb-2">{partner.role}</Badge>
                            <h3 className="typography-h3 mb-2">{partner.name}</h3>
                            <p className="text-gray-600 dark:text-gray-400">{partner.contribution}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Key Deliverables */}
        <section className="py-16 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-12"
              >
                <h2 className="typography-h2 mb-4">Key Deliverables</h2>
              </motion.div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-6 h-6 text-blue-600" />
                      <CardTitle>National Smart Manufacturing Baseline Report</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-400">
                      Evidence-based analysis of current state and pilot outcomes for evidence-based
                      industrial policy development. Includes material utilization trends, operator
                      productivity metrics, and recommendations for national scale-up.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <GraduationCap className="w-6 h-6 text-green-600" />
                      <CardTitle>"Digital Fabricator" Certification Program</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-400">
                      University-accredited training track for operators, creating a pipeline of
                      skilled "Digital Fabricators" to support Egypt's smart manufacturing workforce.
                      Includes curriculum, practical labs, and certification issuance.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Target className="w-6 h-6 text-amber-600" />
                      <CardTitle>Open Data Contribution</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-400">
                      Anonymized aggregate data for national industrial analytics (with workshop consent),
                      supporting evidence-based policy and research. Aligns with Digital Egypt's data
                      governance principles.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-16 bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="typography-h2 md:text-4xl mb-6">
                  Ready to Transform Egypt's Manufacturing Sector?
                </h2>
                <p className="text-xl text-blue-100 mb-8">
                  Join us in building a smarter, more productive, and globally competitive
                  manufacturing ecosystem for Egypt.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link to="/contact">
                    <Button size="lg" className="btn-primary">
                      Contact for Partnership <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                  <Link to="/fabricator-workflow">
                    <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                      Explore Platform
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default DigitalEgypt;

