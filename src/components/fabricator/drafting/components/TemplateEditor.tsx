/**
 * Template Editor - Gold Tier Accuracy
 * 
 * Visual editor for creating and editing templates from ALMONA designs.
 * Reverse engineers existing designs to extract reusable patterns.
 * 
 * @since Template Editor - Gold Tier Implementation
 * Enhanced with dark theme, performance optimizations, and error handling
 */

import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { useJobsStore } from '@/store/jobsStore';
import type { WindowUnit } from '@/types/fabricator';
import {
    AlertCircle,
    BarChart3,
    Download,
    Filter,
    Grid3x3,
    History,
    Lightbulb,
    Search,
    Sparkles,
    TrendingUp,
    Zap
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { debounce } from '../utils/performanceUtils';
import type { ExtractedTemplate } from '../utils/templateExtractor';
import { extractTemplateFromDesign, extractTemplatesFromHistory } from '../utils/templateExtractor';
import type { TemplateKnowledge } from '../utils/templateKnowledgeExtractor';
import { extractWorkshopKnowledge, getTemplateRecommendations } from '../utils/templateKnowledgeExtractor';

interface TemplateEditorProps {
  /** Current design to extract template from */
  currentDesign?: WindowUnit;
  /** Callback when template is created */
  onTemplateCreated?: (template: ExtractedTemplate) => void;
  /** Callback when template is selected */
  onTemplateSelected?: (template: ExtractedTemplate) => void;
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  currentDesign,
  onTemplateCreated,
  onTemplateSelected
}) => {
  const { jobs, loadJobs } = useJobsStore();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'extract' | 'history' | 'recommendations' | 'knowledge'>('extract');
  const [extractedTemplate, setExtractedTemplate] = useState<ExtractedTemplate | null>(null);
  const [historyTemplates, setHistoryTemplates] = useState<ExtractedTemplate[]>([]);
  const [knowledge, setKnowledge] = useState<TemplateKnowledge | null>(null);
  const [recommendations, setRecommendations] = useState<Array<{
    template: ExtractedTemplate;
    confidence: number;
    reason: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterMaterial, setFilterMaterial] = useState<'all' | 'aluminum' | 'upvc'>('all');
  const [minConfidence, setMinConfidence] = useState(60);
  
  // Get workshop ID from user context (fallback to user ID if no workshop_id)
  const workshopId = useMemo(() => {
    // Use user ID as workshop identifier (user-scoped templates)
    return user?.id || 'anonymous';
  }, [user?.id]);

  // Debounce search input (300ms delay for performance)
  useEffect(() => {
    const debouncedUpdate = debounce((value: string) => {
      setDebouncedSearchQuery(value);
    }, 300);

    debouncedUpdate(searchInput);

    return () => {
      // Cleanup will be handled by debounce function
    };
  }, [searchInput]);

  // Load jobs on mount
  useEffect(() => {
    if (jobs.length === 0) {
      loadJobs();
    }
  }, [jobs.length, loadJobs]);

  // Extract template from current design
  useEffect(() => {
    if (currentDesign && activeTab === 'extract') {
      try {
        setError(null);
        const template = extractTemplateFromDesign(currentDesign);
        setExtractedTemplate(template);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to extract template from design';
        setError(errorMessage);
        console.error('Template extraction error:', err);
      }
    }
  }, [currentDesign, activeTab]);

  // Extract templates from history
  const handleExtractFromHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const templates = await extractTemplatesFromHistory(jobs, {
        minFrequency: 2,
        minConfidence: minConfidence,
        includeMaterialPreferences: true,
        includeSuccessMetrics: true
      });
      setHistoryTemplates(templates);
      setActiveTab('history');
      toast.success(`Extracted ${templates.length} template${templates.length !== 1 ? 's' : ''} from history`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to extract templates from history';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Failed to extract templates from history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [jobs, minConfidence]);

  // Extract knowledge
  const handleExtractKnowledge = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const extractedKnowledge = await extractWorkshopKnowledge(workshopId, jobs);
      setKnowledge(extractedKnowledge);
      setActiveTab('knowledge');
      toast.success('Knowledge extracted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to extract knowledge';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Failed to extract knowledge:', err);
    } finally {
      setIsLoading(false);
    }
  }, [jobs, workshopId]);

  // Get recommendations
  const handleGetRecommendations = useCallback(async () => {
    if (!currentDesign) {
      toast.warning('Please create a design first to get recommendations');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const recs = await getTemplateRecommendations(
        workshopId,
        {
          width: currentDesign.overallWidth,
          height: currentDesign.overallHeight
        },
        {
          material: currentDesign.systemPackId?.includes('aluminium') || currentDesign.systemPackId?.includes('jumbo')
            ? 'aluminum'
            : 'upvc',
          roomType: currentDesign.positionMeta?.roomOrZone
        }
      );
      setRecommendations(recs);
      setActiveTab('recommendations');
      toast.success(`Found ${recs.length} recommendation${recs.length !== 1 ? 's' : ''}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get recommendations';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Failed to get recommendations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentDesign, workshopId]);

  // Filter templates (using debounced search query)
  const filteredTemplates = useMemo(() => {
    let templates = activeTab === 'history' ? historyTemplates : 
                   activeTab === 'recommendations' ? recommendations.map(r => r.template) :
                   extractedTemplate ? [extractedTemplate] : [];

    // Search filter (using debounced query)
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim();
      templates = templates.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.id.toLowerCase().includes(query)
      );
    }

    // Material filter
    if (filterMaterial !== 'all') {
      templates = templates.filter(t => 
        t.materialPreferences.preferred === filterMaterial
      );
    }

    // Confidence filter
    templates = templates.filter(t => t.confidence >= minConfidence);

    return templates;
  }, [activeTab, historyTemplates, recommendations, extractedTemplate, debouncedSearchQuery, filterMaterial, minConfidence]);

  return (
    <div className="h-full w-full flex flex-col bg-slate-900 min-h-0">
      {/* Header */}
      <div className="border-b border-amber-600/20 bg-slate-800/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-100">
              <Sparkles className="w-6 h-6 text-amber-400" />
              Template Editor
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Reverse engineer ALMONA designs to extract reusable templates
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExtractFromHistory}
              disabled={isLoading || jobs.length === 0}
              className="border-amber-600/30 text-slate-300 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-600/50"
            >
              <History className="w-4 h-4 mr-2" />
              Extract from History
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExtractKnowledge}
              disabled={isLoading || jobs.length === 0}
              className="border-amber-600/30 text-slate-300 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-600/50"
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              Extract Knowledge
            </Button>
            {currentDesign && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGetRecommendations}
                disabled={isLoading}
                className="border-amber-600/30 text-slate-300 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-600/50"
              >
                <Zap className="w-4 h-4 mr-2" />
                Get Recommendations
              </Button>
            )}
          </div>
        </div>
        {/* Error Display */}
        {error && (
          <div className="mt-3 p-3 bg-red-900/20 border border-red-600/30 rounded-md flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-4 bg-slate-800/50 border border-amber-600/20">
          <TabsTrigger 
            value="extract"
            className="text-slate-400 data-[state=active]:text-amber-400 data-[state=active]:bg-amber-500/20"
          >
            <Grid3x3 className="w-4 h-4 mr-2" />
            Extract from Design
          </TabsTrigger>
          <TabsTrigger 
            value="history"
            className="text-slate-400 data-[state=active]:text-amber-400 data-[state=active]:bg-amber-500/20"
          >
            <History className="w-4 h-4 mr-2" />
            Workshop History
            {historyTemplates.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-amber-500/20 text-amber-300 border-amber-600/30">
                {historyTemplates.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="recommendations"
            className="text-slate-400 data-[state=active]:text-amber-400 data-[state=active]:bg-amber-500/20"
          >
            <Lightbulb className="w-4 h-4 mr-2" />
            Recommendations
            {recommendations.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-amber-500/20 text-amber-300 border-amber-600/30">
                {recommendations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="knowledge"
            className="text-slate-400 data-[state=active]:text-amber-400 data-[state=active]:bg-amber-500/20"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Knowledge Base
          </TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="mx-4 mt-4 flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search templates..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-700/50 text-slate-200 placeholder:text-slate-500 focus:border-amber-600/50 focus:ring-amber-600/20"
            />
          </div>
          <Select value={filterMaterial} onValueChange={(v) => setFilterMaterial(v as typeof filterMaterial)}>
            <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700/50 text-slate-200 focus:border-amber-600/50">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-amber-600/30">
              <SelectItem value="all" className="text-slate-200 focus:bg-amber-500/20">All Materials</SelectItem>
              <SelectItem value="aluminum" className="text-slate-200 focus:bg-amber-500/20">Aluminum</SelectItem>
              <SelectItem value="upvc" className="text-slate-200 focus:bg-amber-500/20">UPVC</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Min Confidence:</span>
            <Input
              type="number"
              min="0"
              max="100"
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
              className="w-20 bg-slate-800/50 border-slate-700/50 text-slate-200 focus:border-amber-600/50"
            />
            <span className="text-sm text-slate-500">%</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <TabsContent value="extract" className="m-0">
            {extractedTemplate ? (
              <TemplateCard
                template={extractedTemplate}
                onSelect={() => onTemplateSelected?.(extractedTemplate)}
                onSave={() => onTemplateCreated?.(extractedTemplate)}
              />
            ) : (
              <Card className="bg-slate-800/50 border-amber-600/20">
                <CardContent className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">
                    {currentDesign
                      ? 'No template could be extracted from this design. Ensure it has a grid layout.'
                      : 'No design selected. Open a design to extract a template.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="m-0">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto"></div>
                <p className="mt-4 text-slate-400">Analyzing workshop history...</p>
              </div>
            ) : filteredTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onSelect={() => onTemplateSelected?.(template)}
                    onSave={() => onTemplateCreated?.(template)}
                  />
                ))}
              </div>
            ) : (
              <Card className="bg-slate-800/50 border-amber-600/20">
                <CardContent className="p-8 text-center">
                  <History className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">
                    {jobs.length === 0
                      ? 'No workshop history available. Create some projects first.'
                      : 'No templates found matching your filters.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="recommendations" className="m-0">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto"></div>
                <p className="mt-4 text-slate-400">Analyzing recommendations...</p>
              </div>
            ) : recommendations.length > 0 ? (
              <div className="space-y-4">
                {recommendations
                  .filter(r => filteredTemplates.includes(r.template))
                  .map((rec) => (
                    <Card key={rec.template.id} className="bg-slate-800/50 border-amber-600/20">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2 text-slate-200">
                            {rec.template.name}
                            <Badge variant={rec.confidence >= 80 ? 'default' : 'secondary'} className={rec.confidence >= 80 ? 'bg-amber-500/20 text-amber-300 border-amber-600/30' : 'bg-slate-700/50 text-slate-400 border-slate-600/30'}>
                              {rec.confidence}% match
                            </Badge>
                          </CardTitle>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onTemplateSelected?.(rec.template)}
                              className="border-amber-600/30 text-slate-300 hover:bg-amber-500/10 hover:text-amber-400"
                            >
                              Use
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onTemplateCreated?.(rec.template)}
                              className="border-amber-600/30 text-slate-300 hover:bg-amber-500/10 hover:text-amber-400"
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                        <CardDescription className="text-slate-400">{rec.reason}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <TemplateDetails template={rec.template} />
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : (
              <Card className="bg-slate-800/50 border-amber-600/20">
                <CardContent className="p-8 text-center">
                  <Lightbulb className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">
                    {currentDesign
                      ? 'No recommendations available. Try extracting from history first.'
                      : 'Select a design to get recommendations.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="knowledge" className="m-0">
            {knowledge ? (
              <KnowledgeView knowledge={knowledge} />
            ) : (
              <Card className="bg-slate-800/50 border-amber-600/20">
                <CardContent className="p-8 text-center">
                  <BarChart3 className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">
                    Click "Extract Knowledge" to analyze workshop patterns.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

// Template Card Component
interface TemplateCardProps {
  template: ExtractedTemplate;
  onSelect: () => void;
  onSave: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect, onSave }) => {
  return (
    <Card className="hover:shadow-lg hover:shadow-amber-500/10 transition-shadow bg-slate-800/50 border-amber-600/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-slate-200">{template.name}</CardTitle>
          <Badge variant={template.confidence >= 80 ? 'default' : 'secondary'} className={template.confidence >= 80 ? 'bg-amber-500/20 text-amber-300 border-amber-600/30' : 'bg-slate-700/50 text-slate-400 border-slate-600/30'}>
            {template.confidence}%
          </Badge>
        </div>
        <CardDescription className="text-slate-400">
          {template.rows}x{template.cols} Grid • {template.frequency} occurrence{template.frequency !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TemplateDetails template={template} />
        <div className="flex gap-2 mt-4">
          <Button size="sm" className="flex-1 bg-amber-600 hover:bg-amber-500 text-white" onClick={onSelect}>
            Use Template
          </Button>
          <Button size="sm" variant="outline" className="flex-1 border-amber-600/30 text-slate-300 hover:bg-amber-500/10 hover:text-amber-400" onClick={onSave}>
            <Download className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Template Details Component
interface TemplateDetailsProps {
  template: ExtractedTemplate;
}

const TemplateDetails: React.FC<TemplateDetailsProps> = ({ template }) => {
  return (
    <div className="space-y-3">
      {/* Grid Preview */}
      <div className="bg-slate-900/50 p-3 rounded border border-amber-600/10">
        <div className="grid gap-1" style={{
          gridTemplateColumns: `repeat(${template.cols}, 1fr)`,
          gridTemplateRows: `repeat(${template.rows}, 1fr)`
        }}>
          {Array.from({ length: template.rows * template.cols }).map((_, i) => {
            const row = Math.floor(i / template.cols);
            const col = i % template.cols;
            const cellType = template.cellTypes[row]?.[col] || 'empty';
            return (
              <div
                key={i}
                className={`aspect-square rounded text-xs flex items-center justify-center font-medium ${
                  cellType === 'empty' ? 'bg-slate-700/50 text-slate-500' :
                  cellType === 'fixed' ? 'bg-blue-600/30 text-blue-300 border border-blue-600/30' :
                  cellType === 'casement' ? 'bg-green-600/30 text-green-300 border border-green-600/30' :
                  cellType === 'sliding' ? 'bg-amber-600/30 text-amber-300 border border-amber-600/30' :
                  'bg-slate-600/50 text-slate-400'
                }`}
                title={cellType}
              >
                {cellType[0].toUpperCase()}
              </div>
            );
          })}
        </div>
      </div>

      {/* Dimensions */}
      <div className="text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Width Range:</span>
          <span className="font-medium text-amber-300">
            {template.typicalDimensions.widthRange[0]} - {template.typicalDimensions.widthRange[1]} mm
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Height Range:</span>
          <span className="font-medium text-amber-300">
            {template.typicalDimensions.heightRange[0]} - {template.typicalDimensions.heightRange[1]} mm
          </span>
        </div>
      </div>

      {/* Material Preference */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-400">Material:</span>
        <Badge variant="outline" className="border-amber-600/30 text-amber-300 bg-amber-500/10">
          {template.materialPreferences.preferred === 'aluminum' ? 'Aluminum' : 'UPVC'}
        </Badge>
        <span className="text-xs text-slate-500">
          ({template.materialPreferences.aluminum} Al, {template.materialPreferences.upvc} UPVC)
        </span>
      </div>

      {/* Success Metrics */}
      {template.successMetrics && (
        <div className="pt-2 border-t border-amber-600/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-slate-300">Success Metrics</span>
          </div>
          <div className="text-xs space-y-1 text-slate-400">
            <div className="flex justify-between">
              <span>Success Rate:</span>
              <span className="font-medium text-amber-300">{(template.successMetrics.successRate * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Avg Accuracy:</span>
              <span className="font-medium text-amber-300">{(template.successMetrics.averageAccuracy * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Issues:</span>
              <span className="font-medium text-amber-300">{template.successMetrics.issueCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* System Packs */}
      {template.compatibleSystemPacks.length > 0 && (
        <div className="pt-2 border-t border-amber-600/20">
          <div className="text-xs text-slate-400 mb-1">Compatible Systems:</div>
          <div className="flex flex-wrap gap-1">
            {template.compatibleSystemPacks.slice(0, 3).map(pack => (
              <Badge key={pack} variant="outline" className="text-xs border-amber-600/30 text-amber-300 bg-amber-500/10">
                {pack}
              </Badge>
            ))}
            {template.compatibleSystemPacks.length > 3 && (
              <Badge variant="outline" className="text-xs border-amber-600/30 text-amber-300 bg-amber-500/10">
                +{template.compatibleSystemPacks.length - 3}
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Knowledge View Component
interface KnowledgeViewProps {
  knowledge: TemplateKnowledge;
}

const KnowledgeView: React.FC<KnowledgeViewProps> = ({ knowledge }) => {
  return (
    <div className="space-y-6">
      {/* Workshop Insights */}
      <Card className="bg-slate-800/50 border-amber-600/20">
        <CardHeader>
          <CardTitle className="text-slate-200">Workshop Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-amber-300">{knowledge.workshopInsights.totalProjects}</div>
              <div className="text-sm text-slate-400">Total Projects</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-300">{knowledge.commonPatterns.length}</div>
              <div className="text-sm text-slate-400">Common Patterns</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-300">
                {Math.round(knowledge.workshopInsights.averageProjectSize.width)}mm
              </div>
              <div className="text-sm text-slate-400">Avg Width</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-300">
                {Math.round(knowledge.workshopInsights.averageProjectSize.height)}mm
              </div>
              <div className="text-sm text-slate-400">Avg Height</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Most Common Pattern */}
      {knowledge.workshopInsights.mostCommonPattern && (
        <Card className="bg-slate-800/50 border-amber-600/20">
          <CardHeader>
            <CardTitle className="text-slate-200">Most Common Pattern</CardTitle>
          </CardHeader>
          <CardContent>
            <TemplateCard
              template={knowledge.workshopInsights.mostCommonPattern}
              onSelect={() => {}}
              onSave={() => {}}
            />
          </CardContent>
        </Card>
      )}

      {/* Success Patterns */}
      {knowledge.successPatterns.length > 0 && (
        <Card className="bg-slate-800/50 border-amber-600/20">
          <CardHeader>
            <CardTitle className="text-slate-200">High Success Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {knowledge.successPatterns.slice(0, 5).map((pattern, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-slate-900/50 rounded border border-amber-600/10">
                  <div>
                    <div className="font-medium text-slate-200">{pattern.templateId}</div>
                    <div className="text-sm text-slate-400">{pattern.systemPackId}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-green-400">
                      {(pattern.successRate * 100).toFixed(1)}% success
                    </div>
                    <div className="text-xs text-slate-400">
                      {pattern.issueCount} issues
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
