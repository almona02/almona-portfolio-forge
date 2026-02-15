import EnrollmentModal from '@/components/training/EnrollmentModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconName, aluminiumStages, generateUpcomingCohorts, trainingLevels, upvcStages } from '@/data/trainingPrograms';
import { motion } from 'framer-motion';
import { Calendar, Crown, Gauge, GraduationCap, Layers, Scissors, Settings, ShieldCheck, Star, Thermometer, Zap } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

// Lazy icon wrapper (placeholder for potential code-splitting if icons become heavier)
const IconRenderer: React.FC<{ name: IconName }> = ({ name }) => {
  const map: Record<IconName, React.ReactNode> = {
    'layers': <Layers className="h-5 w-5" />,
    'scissors': <Scissors className="h-5 w-5" />,
    'thermometer': <Thermometer className="h-5 w-5" />,
    'settings': <Settings className="h-5 w-5" />,
    'zap': <Zap className="h-5 w-5" />,
    'shield-check': <ShieldCheck className="h-5 w-5" />,
    'gauge': <Gauge className="h-5 w-5" />
  };
  return map[name] ?? null;
};

const TrainingServicesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMaterial = (searchParams.get('material') === 'upvc' ? 'upvc' : 'aluminium') as 'aluminium' | 'upvc';
  const [material, setMaterial] = useState<'aluminium' | 'upvc'>(initialMaterial);
  const cohorts = useMemo(() => generateUpcomingCohorts(), []);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);

  // Sync material selection to URL
  useEffect(() => {
    const current = searchParams.get('material');
    if (current !== material) {
      const next = new URLSearchParams(searchParams);
      next.set('material', material);
      setSearchParams(next, { replace: true });
    }
  }, [material, searchParams, setSearchParams]);

  const handleSelectProgram = (programLevel: string) => {
    setSelectedProgram(programLevel);
    setEnrollOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-almona-dark text-white">
      <main className="flex-grow pt-24 pb-24 container mx-auto px-4">
        {/* Hero */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <GraduationCap className="h-10 w-10 text-amber-400" />
            <h1 className="typography-h1 bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-300">
              Technical Training & Certification
            </h1>
          </div>
          <p className="text-gray-300 max-w-3xl">
            Structured, market-adapted fabrication training programs covering aluminium and UPVC production—aligned with Egyptian industrial requirements and designed for scalable workforce upskilling.
          </p>
        </div>

        {/* Material Toggle */}
        <div className="flex flex-wrap gap-4 mb-10">
          <Button onClick={() => setMaterial('aluminium')} className={`px-6 ${material==='aluminium' ? 'bg-gradient-to-r from-amber-500 to-red-500' : 'bg-almona-dark border border-almona-light/20'}`}>Aluminium Process</Button>
          <Button onClick={() => setMaterial('upvc')} className={`px-6 ${material==='upvc' ? 'bg-gradient-to-br from-blue-500 to-amber-600' : 'bg-almona-dark border border-almona-light/20'}`}>UPVC Process</Button>
        </div>

        {/* Fabrication Stages */}
        <section className="mb-16">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="typography-h2 font-semibold">Key Fabrication Stages</h2>
            <Badge variant="outline" className="border-amber-400/40 text-amber-300">{material.toUpperCase()}</Badge>
          </div>
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {(material==='aluminium'? aluminiumStages : upvcStages).map(stage => (
              <motion.div key={stage.title} initial={{opacity:0,y:15}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:.4}} className="p-5 rounded-lg bg-almona-dark/60 border border-almona-light/15 hover:border-amber-400/50 group">
                <div className="flex items-center gap-3 mb-3 text-amber-300">
      <div className="btn-primary"><IconRenderer name={stage.icon} /></div>
                  <h3 className="typography-h3 font-medium">{stage.title}</h3>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded bg-almona-dark/60 border border-amber-400/30">{stage.duration}</span>
                </div>
                <p className="text-sm text-gray-400 mb-3">{stage.description}</p>
                <ul className="space-y-1 text-xs text-gray-400">
                  {stage.keyPoints.slice(0,4).map(p => <li key={p} className="flex gap-1"><span className="text-amber-400">•</span><span>{p}</span></li>)}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Programs */}
        <section className="mb-20">
          <h2 className="typography-h2 font-semibold mb-6 flex items-center gap-2">Program Tracks <Badge className="btn-primary">Tiered</Badge></h2>
          <div className="grid gap-8 md:grid-cols-3">
            {trainingLevels.map(level => (
              <motion.div key={level.level} initial={{opacity:0,y:15}} whileInView={{opacity:1,y:0}} transition={{duration:.45, delay: level.level==='advanced'? .05: level.level==='expert'? .1:0}} className={`relative p-6 rounded-xl border bg-gradient-to-br from-almona-darker/70 to-almona-dark/60 backdrop-blur-sm ${level.isPopular? 'border-amber-400/60 shadow-[0_0_0_1px_rgba(251,146,60,0.3)]':'border-almona-light/15'}`}>
                {level.isPopular && <div className="btn-primary"><Star className="h-3 w-3" /> Popular</div>}
                <div className="flex items-center gap-2 mb-2">
                  {level.level==='expert' ? <Crown className="h-5 w-5 text-yellow-400" /> : <GraduationCap className="h-5 w-5 text-amber-400" />}
                  <h3 className="typography-h3 text-lg">{level.title}</h3>
                </div>
                <p className="text-sm text-gray-400 mb-4">{level.description}</p>
                <div className="flex items-center gap-4 mb-4 text-sm">
                  <span className="px-2 py-0.5 rounded bg-almona-dark/50 border border-almona-light/20">{level.duration}</span>
                  <span className="btn-primary">EGP {Number(level.price).toLocaleString()}</span>
                </div>
                <ul className="space-y-2 text-sm mb-6">
                  {level.features.map(f => <li key={f} className="flex gap-2 items-start"><span className="text-amber-400 mt-0.5">✓</span><span className="text-gray-300">{f}</span></li>)}
                </ul>
                <Button onClick={() => handleSelectProgram(level.level)} className="btn-primary-gradient">Enroll</Button>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Cohort Timeline */}
        <section className="mb-24">
          <h2 className="typography-h2 font-semibold mb-6 flex items-center gap-2"><Calendar className="h-5 w-5 text-amber-400" /> Upcoming Cohorts</h2>
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-6 min-w-[640px]">
              {cohorts.map(c => (
                <div key={c.id} className="relative p-4 w-52 rounded-lg border border-almona-light/15 bg-almona-dark/60 hover:border-amber-400/50 transition">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold text-amber-400">{c.day}</span>
                    <span className="uppercase tracking-wide text-sm text-gray-400">{c.month}</span>
                  </div>
                  <div className="text-xs text-gray-400 mb-3">Starts {c.start.toLocaleDateString()}</div>
                  <div className="flex flex-wrap gap-1">
                    {trainingLevels.map(l => (
                      <span key={l.level} className="text-[10px] px-1.5 py-0.5 rounded bg-almona-dark/40 border border-almona-light/10 text-gray-300">
                        {l.level}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Market Adaptation */}
        <section className="mb-12 grid gap-10 lg:grid-cols-2 items-start">
          <div className="space-y-6">
            <h2 className="typography-h2 font-semibold mb-4">Egyptian Market Focus</h2>
            <p className="text-gray-300 text-sm max-w-lg">Programs explicitly integrate climatic, material sourcing, and regulatory realities from the Egyptian fabrication ecosystem—ensuring rapid ROI and operator retention.</p>
            <ul className="space-y-3 text-sm">
              {['Dust & sand mitigation procedures','High-temperature process stability','Local supply chain optimization','Arabic localized training assets'].map(item => (
                <li key={item} className="flex gap-2 items-start"><span className="text-amber-400 mt-0.5">✓</span><span className="text-gray-300">{item}</span></li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: 'Subsidy Ready', desc: 'Structured to qualify for industrial training incentives.' },
              { title: 'Certification Path', desc: 'Tiered credentialing for operator career ladders.' },
              { title: 'Performance Metrics', desc: 'Embedded efficiency + quality tracking hooks.' },
              { title: 'Scalable Delivery', desc: 'Hybrid onsite / virtual deployment architecture.' }
            ].map(card => (
              <div key={card.title} className="p-4 rounded-lg border border-almona-light/15 bg-almona-dark/60 hover:border-amber-400/40 transition">
                <h4 className="typography-h4 font-medium mb-1 text-amber-300">{card.title}</h4>
                <p className="text-xs text-gray-400 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="text-center">
          <Button className="px-10 py-6 text-lg font-semibold bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 text-black hover:from-amber-400 hover:via-amber-300 hover:to-yellow-200 shadow-lg">Request Custom Plan</Button>
        </div>
      </main>
      <EnrollmentModal
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        cohorts={cohorts}
        material={material}
        selectedProgram={selectedProgram || null}
      />
    </div>
  );
};

export default TrainingServicesPage;
