import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Users, Building2, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

export const NationalImpactSection = () => {
  const { t } = useTranslation('home');
  
  const stats = [
    {
      label: t('national_impact.stats.import_substitution.label'),
      value: t('national_impact.stats.import_substitution.value'),
      icon: <TrendingUp className="h-8 w-8 text-amber-400" />,
      desc: t('national_impact.stats.import_substitution.description'),
      gradient: "from-amber-500/30 via-amber-500/20 to-amber-600/15",
      iconBg: "from-amber-500/25 to-amber-600/15"
    },
    {
      label: t('national_impact.stats.digital_fabricators.label'),
      value: t('national_impact.stats.digital_fabricators.value'),
      icon: <Users className="h-8 w-8 text-amber-400" />,
      desc: t('national_impact.stats.digital_fabricators.description'),
      gradient: "from-amber-400/30 via-amber-500/20 to-amber-600/15",
      iconBg: "from-amber-400/25 to-amber-500/15"
    },
    {
      label: t('national_impact.stats.sme_workshops.label'),
      value: t('national_impact.stats.sme_workshops.value'),
      icon: <Building2 className="h-8 w-8 text-amber-400" />,
      desc: t('national_impact.stats.sme_workshops.description'),
      gradient: "from-amber-500/30 via-amber-500/20 to-amber-600/15",
      iconBg: "from-amber-500/25 to-amber-600/15"
    },
    {
      label: t('national_impact.stats.carbon_reduction.label'),
      value: t('national_impact.stats.carbon_reduction.value'),
      icon: <Globe className="h-8 w-8 text-emerald-400" />,
      desc: t('national_impact.stats.carbon_reduction.description'),
      gradient: "from-emerald-500/30 via-emerald-500/20 to-teal-600/15",
      iconBg: "from-emerald-500/25 to-teal-600/15"
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Background decorative gold elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/3 rounded-full blur-3xl" />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 mb-4 text-sm font-semibold tracking-wider uppercase text-amber-400 bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-amber-500/10 border border-amber-500/30 rounded-full backdrop-blur-sm">
            {t('national_impact.badge')}
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 mb-4 tracking-tight">
            {t('national_impact.title')}
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {t('national_impact.subtitle')}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((stat, index) => (
            <Card 
              key={index} 
              className="group relative border border-slate-700/50 bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 backdrop-blur-sm hover:border-amber-500/40 hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-500 overflow-hidden"
            >
              {/* Gold accent line on hover */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500/0 to-transparent group-hover:via-amber-400 group-hover:to-amber-500 transition-all duration-500" />
              
              {/* Subtle gold glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-amber-500/0 to-amber-500/0 group-hover:from-amber-500/5 group-hover:via-amber-500/3 group-hover:to-amber-500/5 transition-all duration-500 pointer-events-none" />
              
              <CardContent className="pt-8 pb-6 px-6 flex flex-col items-center text-center relative z-10">
                <div className={`mb-6 p-5 bg-gradient-to-br ${stat.iconBg} rounded-2xl border border-amber-500/20 group-hover:border-amber-400/40 group-hover:shadow-lg group-hover:shadow-amber-500/20 transition-all duration-500 group-hover:scale-110`}>
                  {stat.icon}
                </div>
                <div className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 mb-3 group-hover:from-amber-300 group-hover:via-amber-200 group-hover:to-amber-300 transition-all duration-500">
                  {stat.value}
                </div>
                <div className="font-semibold text-slate-200 mb-2 text-base group-hover:text-amber-100 transition-colors duration-300">
                  {stat.label}
                </div>
                <div className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
                  {stat.desc}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
