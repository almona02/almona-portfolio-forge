// Removed unused React import - using new JSX transform
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export const EgyptVision2030Section = () => {
  const { t } = useTranslation('home');
  return (
    <section className="py-20 bg-gradient-to-b from-slate-950 to-slate-900 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="btn-primary" />
        <div className="btn-primary" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-amber-500/20 to-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-semibold rounded-full mb-6">
              <span className="btn-primary" />
              {t('egypt_vision_2030.badge')}
            </div>
            <h2 className="typography-h2 text-4xl md:text-5xl text-white mb-6 leading-tight">
              {t('egypt_vision_2030.title_prefix')}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-500">
                {t('egypt_vision_2030.title_highlight')}
              </span>
            </h2>
            <p className="text-lg text-slate-400 mb-8 leading-relaxed">
              {t('egypt_vision_2030.description')}
            </p>
            <div className="space-y-5 mb-10">
              <div className="flex items-start gap-4 group">
                <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h4 className="typography-h4 text-white group-hover:text-amber-400 transition-colors">
                    {t('egypt_vision_2030.features.integrated_sustainable.title')}
                  </h4>
                  <p className="text-slate-500">{t('egypt_vision_2030.features.integrated_sustainable.description')}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 group">
                <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h4 className="typography-h4 text-white group-hover:text-amber-400 transition-colors">
                    {t('egypt_vision_2030.features.knowledge_innovation.title')}
                  </h4>
                  <p className="text-slate-500">{t('egypt_vision_2030.features.knowledge_innovation.description')}</p>
                </div>
              </div>
            </div>
            <Button 
              className="btn-primary-gradient"
            >
              {t('egypt_vision_2030.cta')}
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
          <div className="lg:w-1/2 relative">
            <div className="w-full max-w-3xl mx-auto">
              {/* Egypt Vision 2030 Visual */}
              <div className="aspect-[4/3] md:aspect-video bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl shadow-2xl flex items-center justify-center border border-slate-700/60 ring-1 ring-amber-500/10 backdrop-blur-sm relative overflow-hidden group p-6 sm:p-8">
                {/* Animated background rings */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 border border-amber-500/20 rounded-full animate-pulse" />
                  <div className="absolute w-64 h-64 border border-amber-500/10 rounded-full animate-pulse delay-300" />
                  <div className="absolute w-80 h-80 border border-amber-500/5 rounded-full animate-pulse delay-500" />
                </div>
                
                <div className="text-center relative z-10">
                  <div className="text-5xl sm:text-6xl lg:text-7xl mb-3 sm:mb-4 transform group-hover:scale-110 transition-transform duration-300">
                    EG
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-500">
                    {t('egypt_vision_2030.visual.title')}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-400 mt-2 sm:mt-3">{t('egypt_vision_2030.visual.subtitle')}</div>
                </div>
                
                {/* Corner accents */}
                <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-amber-500/30 rounded-tl-lg" />
                <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-amber-500/30 rounded-tr-lg" />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-amber-500/30 rounded-bl-lg" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-amber-500/30 rounded-br-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
