import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export const EgyptVision2030Section = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-slate-950 to-slate-900 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-0 w-72 h-72 bg-orange-500/5 rounded-full blur-3xl transform -translate-y-1/2" />
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-orange-500/20 to-amber-500/10 border border-orange-500/30 text-orange-400 text-sm font-semibold rounded-full mb-6">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              Aligned with Egypt Vision 2030
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Building a Competitive, Balanced, and{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
                Diversified Economy
              </span>
            </h2>
            <p className="text-lg text-slate-400 mb-8 leading-relaxed">
              We are committed to the national strategy for sustainable development. Our platform empowers local manufacturers, reduces import dependency, and fosters a knowledge-based economy.
            </p>
            <div className="space-y-5 mb-10">
              <div className="flex items-start gap-4 group">
                <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-white group-hover:text-orange-400 transition-colors">
                    Integrated & Sustainable
                  </h4>
                  <p className="text-slate-500">Supporting the transition to a circular green economy.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 group">
                <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-white group-hover:text-orange-400 transition-colors">
                    Knowledge & Innovation
                  </h4>
                  <p className="text-slate-500">Investing in human capital and digital transformation.</p>
                </div>
              </div>
            </div>
            <Button 
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold px-6 py-3 h-auto shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300 group"
            >
              Read Our National Pledge
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
          <div className="lg:w-1/2 relative">
            {/* Egypt Vision 2030 Visual */}
            <div className="aspect-video bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl shadow-2xl flex items-center justify-center border border-slate-700/50 backdrop-blur-sm relative overflow-hidden group">
              {/* Animated background rings */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border border-orange-500/20 rounded-full animate-pulse" />
                <div className="absolute w-64 h-64 border border-orange-500/10 rounded-full animate-pulse delay-300" />
                <div className="absolute w-80 h-80 border border-orange-500/5 rounded-full animate-pulse delay-500" />
              </div>
              
              <div className="text-center relative z-10">
                <div className="text-7xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                  EG
                </div>
                <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
                  Egypt Vision 2030
                </div>
                <div className="text-sm text-slate-500 mt-2">Sustainable Development Strategy</div>
              </div>
              
              {/* Corner accents */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-orange-500/30 rounded-tl-lg" />
              <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-orange-500/30 rounded-tr-lg" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-orange-500/30 rounded-bl-lg" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-orange-500/30 rounded-br-lg" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
