import React from 'react';
import { Shield, Globe, Users, TrendingUp, FileCheck, Server, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const NationalServicePledge = () => {
  const pillars = [
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Economic Burden",
      desc: "Reducing material imports by 20% to protect foreign currency reserves.",
      color: "from-amber-500 to-amber-500"
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Social Empowerment",
      desc: "Training 10,000 'Digital Fabricators' to close the skills gap.",
      color: "from-amber-500 to-yellow-500"
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Environmental Stewardship",
      desc: "Maximizing circular economy participation to reduce industrial waste.",
      color: "from-emerald-500 to-teal-500"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Public Safety",
      desc: "Enforcing Egyptian Building Codes (HBRC) in every design.",
      color: "from-amber-400 to-amber-600"
    },
    {
      icon: <FileCheck className="h-6 w-6" />,
      title: "Formalization",
      desc: "Bridging the informal economy with simplified, tax-compliant tools.",
      color: "from-amber-400 to-amber-500"
    },
    {
      icon: <Server className="h-6 w-6" />,
      title: "Data Sovereignty",
      desc: "Ensuring all industrial intelligence remains sovereign on Egyptian soil.",
      color: "from-slate-400 to-slate-600"
    }
  ];

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800 shadow-2xl overflow-hidden">
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-amber-500 via-amber-500 to-amber-500" />
      
      <CardHeader className="text-center border-b border-slate-800 bg-slate-900/50 pb-8 pt-10">
        <div className="flex justify-center mb-6 gap-4">
          {/* Egypt Vision 2030 Badge */}
          <div className="h-16 w-16 bg-gradient-to-br from-amber-500/20 to-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center">
            <Target className="h-8 w-8 text-amber-400" />
          </div>
          {/* Digital Egypt Badge */}
          <div className="h-16 w-16 bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center">
            <Globe className="h-8 w-8 text-amber-400" />
          </div>
        </div>
        <CardTitle className="text-3xl font-bold text-white mb-3">
          Our Pledge of{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-500">
            National Service
          </span>
        </CardTitle>
        <p className="text-slate-400 italic text-lg max-w-2xl mx-auto">
          "Almona Portfolio Forge serves as the execution engine for Egypt's industrial transformation."
        </p>
      </CardHeader>
      
      <CardContent className="pt-10 pb-8 px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pillars.map((pillar, index) => (
            <div 
              key={index} 
              className="flex flex-col items-center text-center p-6 rounded-2xl border border-slate-700/50 hover:border-amber- 500/30 transition-all duration-300 group card-premium"
            >
              <div className={`mb-4 p-4 bg-gradient-to-br ${pillar.color} rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <div className="text-white">{pillar.icon}</div>
              </div>
              <h3 className="typography-h3 text-white text-lg mb-2 group-hover:text-amber-400 transition-colors">
                {pillar.title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">{pillar.desc}</p>
            </div>
          ))}
        </div>
        
        {/* Bottom statement */}
        <div className="mt-10 pt-8 border-t border-slate-800 text-center">
          <p className="text-slate-500 text-sm">
            Aligned with{' '}
            <span className="text-amber-400 font-semibold">Egypt Vision 2030</span>
            {' '}and{' '}
            <span className="text-amber-400 font-semibold">Digital Egypt Strategy</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
