
import { ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { ResponsiveImage } from "@/components/ui/ResponsiveImage";

const AboutSection = () => {
  const { t } = useTranslation('home');
  const navigate = useNavigate();

  const handleAboutClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigate("/about");
    // Scroll to top after navigation
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="py-10 sm:py-12 md:py-16 lg:py-20 bg-gradient-to-b from-background via-background/95 to-background dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
      <div className="container mx-auto px-3 sm:px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 md:gap-10 lg:gap-12 items-center">
          <div>
            <h2 className="typography-h2 text-xl sm:text-2xl md:text-3xl lg:text-4xl mb-3 sm:mb-4 md:mb-6 leading-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400">{t('about.title_prefix')}</span> - {t('about.title_suffix')}
            </h2>
            <p className="text-muted-foreground dark:text-gray-300/90 sm:dark:text-gray-300 mb-3 sm:mb-4 md:mb-6 text-xs sm:text-sm md:text-base leading-relaxed">
              {t('about.description_1')}
            </p>
            <p className="text-muted-foreground dark:text-gray-300/90 sm:dark:text-gray-300 mb-3 sm:mb-4 md:mb-6 text-xs sm:text-sm md:text-base leading-relaxed">
              {t('about.description_2')}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
              <div className="bg-gradient-to-br from-card/80 via-card/60 to-card/80 dark:from-slate-900/80 dark:via-slate-800/60 dark:to-slate-900/80 p-2.5 sm:p-3 md:p-4 rounded-lg border border-border/50 dark:border-slate-700/50 backdrop-blur-sm hover:border-amber-500/30 transition-colors">
                <div className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-500 text-lg sm:text-xl md:text-2xl font-bold">30+</div>
                <div className="text-muted-foreground dark:text-gray-400/90 sm:dark:text-gray-400 text-[10px] sm:text-xs md:text-sm">{t('about.stats.years_experience')}</div>
              </div>
              <div className="bg-gradient-to-br from-card/80 via-card/60 to-card/80 dark:from-slate-900/80 dark:via-slate-800/60 dark:to-slate-900/80 p-2.5 sm:p-3 md:p-4 rounded-lg border border-border/50 dark:border-slate-700/50 backdrop-blur-sm hover:border-amber-500/30 transition-colors">
                <div className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-500 text-lg sm:text-xl md:text-2xl font-bold">1000+</div>
                <div className="text-muted-foreground dark:text-gray-400/90 sm:dark:text-gray-400 text-[10px] sm:text-xs md:text-sm">{t('about.stats.projects_completed')}</div>
              </div>
              <div className="bg-gradient-to-br from-card/80 via-card/60 to-card/80 dark:from-slate-900/80 dark:via-slate-800/60 dark:to-slate-900/80 p-2.5 sm:p-3 md:p-4 rounded-lg border border-border/50 dark:border-slate-700/50 backdrop-blur-sm hover:border-amber-500/30 transition-colors">
                <div className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-500 text-lg sm:text-xl md:text-2xl font-bold">500+</div>
                <div className="text-muted-foreground dark:text-gray-400/90 sm:dark:text-gray-400 text-[10px] sm:text-xs md:text-sm">{t('about.stats.satisfied_clients')}</div>
              </div>
              <div className="bg-gradient-to-br from-card/80 via-card/60 to-card/80 dark:from-slate-900/80 dark:via-slate-800/60 dark:to-slate-900/80 p-2.5 sm:p-3 md:p-4 rounded-lg border border-border/50 dark:border-slate-700/50 backdrop-blur-sm hover:border-amber-500/30 transition-colors">
                <div className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-500 text-lg sm:text-xl md:text-2xl font-bold">24/7</div>
                <div className="text-muted-foreground dark:text-gray-400/90 sm:dark:text-gray-400 text-[10px] sm:text-xs md:text-sm">{t('about.stats.customer_support')}</div>
              </div>
            </div>
            <Button asChild className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white dark:text-white text-xs sm:text-sm md:text-base px-4 py-2 sm:px-5 sm:py-2.5 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all duration-300">
              <Link to="/about" onClick={handleAboutClick} className="flex items-center gap-2">
                {t('about.cta')}
                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Link>
            </Button>
          </div>
          
          <div className="relative mt-6 lg:mt-0">
            <div className="absolute -top-4 -left-4 sm:-top-6 sm:-left-6 w-16 h-16 sm:w-20 sm:h-24 bg-amber-500/15 sm:bg-amber-500/20 rounded-full blur-xl sm:blur-2xl"></div>
            <div className="absolute -bottom-6 -right-6 sm:-bottom-10 sm:-right-10 w-20 h-20 sm:w-28 sm:h-32 bg-amber-400/15 sm:bg-amber-400/20 rounded-full blur-2xl sm:blur-3xl"></div>
            <div className="relative z-10 grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
              <div className="space-y-2 sm:space-y-3 md:space-y-4">
                <div className="h-32 sm:h-36 md:h-40 bg-almona-dark-light rounded-lg overflow-hidden opacity-90 sm:opacity-100">
                  <ResponsiveImage 
                    src="/images/hero01 (1).webp" 
                    alt="ALMONA Workshop" 
                    className="w-full h-full object-cover"
                    width={400}
                    height={300}
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
                <div className="h-48 sm:h-56 md:h-64 bg-almona-dark-light rounded-lg overflow-hidden opacity-90 sm:opacity-100">
                  <ResponsiveImage 
                    src="/images/hero01 (2).webp" 
                    alt="ALMONA Team" 
                    className="w-full h-full object-cover"
                    width={400}
                    height={500}
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
              </div>
              <div className="space-y-2 sm:space-y-3 md:space-y-4 mt-4 sm:mt-6 md:mt-8">
                <div className="h-48 sm:h-56 md:h-64 bg-almona-dark-light rounded-lg overflow-hidden opacity-90 sm:opacity-100">
                  <ResponsiveImage 
                    src="/images/hero01 (3).webp" 
                    alt="ALMONA Machines" 
                    className="w-full h-full object-cover"
                    width={400}
                    height={500}
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
                <div className="h-32 sm:h-36 md:h-40 bg-almona-dark-light rounded-lg overflow-hidden opacity-90 sm:opacity-100">
                  <ResponsiveImage 
                    src="/images/hero01 (4).webp" 
                    alt="ALMONA Office" 
                    className="w-full h-full object-cover"
                    width={400}
                    height={300}
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
