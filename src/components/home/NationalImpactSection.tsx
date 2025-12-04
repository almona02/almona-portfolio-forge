import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Users, Building2, Globe } from "lucide-react";

export const NationalImpactSection = () => {
  const stats = [
    {
      label: "Import Substitution",
      value: "$12.5M",
      icon: <TrendingUp className="h-8 w-8 text-orange-500" />,
      desc: "Foreign currency saved",
      gradient: "from-orange-500/20 to-amber-500/10"
    },
    {
      label: "Digital Fabricators",
      value: "5,000+",
      icon: <Users className="h-8 w-8 text-orange-400" />,
      desc: "Youth trained & certified",
      gradient: "from-orange-400/20 to-yellow-500/10"
    },
    {
      label: "SME Workshops",
      value: "1,200",
      icon: <Building2 className="h-8 w-8 text-amber-500" />,
      desc: "Modernized & digitized",
      gradient: "from-amber-500/20 to-orange-500/10"
    },
    {
      label: "Carbon Reduction",
      value: "150kT",
      icon: <Globe className="h-8 w-8 text-emerald-500" />,
      desc: "CO2 emissions prevented",
      gradient: "from-emerald-500/20 to-teal-500/10"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm font-semibold rounded-full mb-4">
            🇪🇬 National Service Impact
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            National Industrial Impact
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Almona Portfolio Forge is driving real economic and social change across Egypt's manufacturing sector.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card 
              key={index} 
              className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm hover:bg-slate-800/70 hover:border-orange-500/30 transition-all duration-300 group"
            >
              <CardContent className="pt-8 pb-6 flex flex-col items-center text-center">
                <div className={`mb-5 p-4 bg-gradient-to-br ${stat.gradient} rounded-2xl border border-slate-700/50 group-hover:border-orange-500/30 transition-colors`}>
                  {stat.icon}
                </div>
                <div className="text-4xl font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">
                  {stat.value}
                </div>
                <div className="font-semibold text-slate-300 mb-1">{stat.label}</div>
                <div className="text-sm text-slate-500">{stat.desc}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
