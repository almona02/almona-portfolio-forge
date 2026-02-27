/**
 * Production Workflow Panel
 *
 * RA Workshop Parity Phase 1: Production workflow UI with grouping and DB persistence
 * Creates and manages production projects with color/type/profile grouping.
 */

import { productionService, type ProductionProject, type ProductionProjectItem } from '@/services/productionService';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { WindowUnit } from '@/types/fabricator';
import {
    AlertCircle,
    Factory,
    FileText,
    FolderPlus,
    Loader2,
    Package,
    Plus,
    Settings,
    Wrench
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useDraftingContext } from '../DraftingContext';
import type { ProductionBOM } from '../utils/bomBuilder';
import { ProductionReportType, productionReportsGenerator } from '../utils/productionReports';
import { ExecutionTrackingPanel } from './ExecutionTrackingPanel';

interface ProductionWorkflowPanelProps {
  className?: string;
}

export const ProductionWorkflowPanel: React.FC<ProductionWorkflowPanelProps> = ({ className }) => {
  useDraftingContext();
  const [projects, setProjects] = useState<ProductionProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProductionProject | null>(null);
  const [projectItems, setProjectItems] = useState<ProductionProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // New project form state
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectGrouping, setNewProjectGrouping] = useState<'color' | 'type' | 'profile' | 'none'>('none');

  // Current drafting state
  const currentWindowUnit = useMemo<WindowUnit | null>(() => {
    // TODO: Connect to drafting state once window units are exposed
    return null;
  }, []);

  // Load production projects
  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await productionService.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load production projects:', error);
      toast.error('Failed to load production projects');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load project items when project is selected
  const loadProjectItems = useCallback(async (projectId: string) => {
    try {
      const data = await productionService.getProjectItems(projectId);
      setProjectItems(data);
    } catch (error) {
      console.error('Failed to load project items:', error);
      toast.error('Failed to load project items');
    }
  }, []);

  // Create new production project
  const createProject = useCallback(async () => {
    if (!newProjectName.trim()) {
      toast.error('Project name is required');
      return;
    }

    setIsCreatingProject(true);
    try {
      const data = await productionService.createProject(
        newProjectName.trim(),
        newProjectGrouping
      );

      setProjects(prev => [data, ...prev]);
      setNewProjectName('');
      setNewProjectGrouping('none');
      toast.success('Production project created');
    } catch (error) {
      console.error('Failed to create production project:', error);
      toast.error('Failed to create production project');
    } finally {
      setIsCreatingProject(false);
    }
  }, [newProjectName, newProjectGrouping]);

  // Add window unit to project
  const addWindowToProject = useCallback(async (windowUnit: WindowUnit, projectId: string) => {
    if (!windowUnit) {
      toast.error('No window unit selected');
      return;
    }

    try {
      // Generate group key based on project grouping mode
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      let groupKey = '';
      switch (project.grouping_mode) {
        case 'color':
          groupKey = windowUnit.color || 'default';
          break;
        case 'type':
          groupKey = windowUnit.type || 'standard';
          break;
        case 'profile':
          // This would need system pack info
          groupKey = 'standard';
          break;
        default:
          groupKey = 'all';
      }

      await productionService.addWindowToProject(projectId, windowUnit, groupKey);

      // Reload project items
      await loadProjectItems(projectId);
      toast.success('Window added to production project');
    } catch (error) {
      console.error('Failed to add window to project:', error);
      toast.error('Failed to add window to project');
    }
  }, [projects, loadProjectItems]);

  // Generate production report
  const generateReport = useCallback(async (projectId: string, reportType: ProductionReportType) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      // Get window units for the project
      const windowUnits: WindowUnit[] = [];

      if (windowUnits.length === 0) {
        toast.error('No window units found in project');
        return;
      }

      // Generate BOMs for all window units
      // Note: In a real implementation, we'd need template and system pack data
      // For now, we'll create basic BOMs and focus on the reporting structure
      const boms: ProductionBOM[] = windowUnits.map((unit) => ({
        windowUnitId: unit.id,
        templateId: 'default-template',
        systemPackId: 'default-pack',
        items: [], // Would be populated by actual BOM generation
        totalCost: 0,
        generatedAt: new Date().toISOString(),
        accuracy: 0.99
      }));

      // Generate specific report based on type
      let reportData;
      switch (reportType) {
        case 'execution_plan':
          reportData = await productionReportsGenerator.generateExecutionPlan(
            projectId,
            windowUnits,
            boms
          );
          break;
        case 'cutting_list':
          reportData = await productionReportsGenerator.generateCuttingList(
            projectId,
            boms
          );
          break;
        case 'purchase_order':
          reportData = await productionReportsGenerator.generatePurchaseOrder(
            projectId,
            boms
          );
          break;
        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }

      // Save report to database
      await productionReportsGenerator.saveReport(
        projectId,
        project.name,
        reportType,
        reportData
      );

      toast.success(`${reportType.replace('_', ' ')} report generated`);
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast.error('Failed to generate report');
    }
  }, [projects]);

  // Load projects on mount
  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  // Load project items when project is selected
  useEffect(() => {
    if (selectedProject) {
      void loadProjectItems(selectedProject.id);
    } else {
      setProjectItems([]);
    }
  }, [selectedProject, loadProjectItems]);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-100">
          <Factory className="h-5 w-5 text-amber-400" />
          Production Workflow
        </h3>
        <Badge variant="outline" className="text-xs">
          RA Workshop Parity
        </Badge>
      </div>

      <Tabs defaultValue="projects" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border border-slate-700/50">
          <TabsTrigger value="projects" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">Projects</TabsTrigger>
          <TabsTrigger value="execution" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">Execution</TabsTrigger>
          <TabsTrigger value="current" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">Design</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4">
          {/* Create New Project */}
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader className="pb-3 border-b border-slate-700/50">
              <CardTitle className="text-sm flex items-center gap-2 text-slate-200">
                <FolderPlus className="h-4 w-4 text-amber-400" />
                Create Production Project
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="project-name" className="text-xs text-slate-300">Project Name</Label>
                  <Input
                    id="project-name"
                    placeholder="e.g., Villa Project - Phase 1"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="h-8 bg-slate-800/50 border-slate-700/50 text-slate-200 placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <Label htmlFor="grouping-mode" className="text-xs text-slate-300">Grouping Mode</Label>
                  <Select value={newProjectGrouping} onValueChange={(value) => setNewProjectGrouping(value as 'type' | 'color' | 'none' | 'profile')}>
                    <SelectTrigger className="h-8 bg-slate-800/50 border-slate-700/50 text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="none">No Grouping</SelectItem>
                      <SelectItem value="color">By Color</SelectItem>
                      <SelectItem value="type">By Window Type</SelectItem>
                      <SelectItem value="profile">By Profile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={() => void createProject()}
                disabled={!newProjectName.trim() || isCreatingProject}
                className="w-full h-8"
              >
                {isCreatingProject ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Project
              </Button>
            </CardContent>
          </Card>

          {/* Existing Projects */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Production Projects</h4>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : projects.length === 0 ? (
              <Card className="bg-slate-900/40 border-slate-800 border-dashed">
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-sm text-slate-400">No production projects yet</p>
                  <p className="text-xs text-slate-500 mt-1">Create your first project to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {projects.map((project) => (
                  <Card
                    key={project.id}
                    className={`cursor-pointer transition-colors border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/50 ${
                      selectedProject?.id === project.id ? 'ring-1 ring-amber-500/50 border-amber-500/50 bg-amber-500/5' : ''
                    }`}
                    onClick={() => setSelectedProject(project)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-sm text-slate-200">{project.name}</h5>
                          <p className="text-xs text-slate-400">
                            {project.window_count} windows • {project.grouping_mode} grouping
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            project.status === 'completed' ? 'default' :
                            project.status === 'in_progress' ? 'secondary' : 'outline'
                          } className="bg-slate-700 text-slate-300 border-slate-600">
                            {project.status}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              void generateReport(project.id, 'execution_plan');
                            }}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Selected Project Details */}
          {selectedProject && (
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader className="pb-3 border-b border-slate-700/50">
                <CardTitle className="text-sm flex items-center justify-between text-slate-200">
                  <span>{selectedProject.name}</span>
                  <Badge variant="outline" className="text-slate-300 border-slate-600">{selectedProject.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Windows:</span>
                    <span className="font-medium ml-2 text-slate-200">{selectedProject.window_count}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Grouping:</span>
                    <span className="font-medium ml-2 capitalize text-slate-200">{selectedProject.grouping_mode}</span>
                  </div>
                </div>

                {projectItems.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-slate-300">Project Items</h5>
                    <div className="space-y-1">
                          {projectItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-slate-800/50 border border-slate-700/30 rounded text-xs text-slate-300">
                          <span>Window {item.window_order + 1}</span>
                          <Badge variant="outline" className="border-slate-600 text-slate-400">{item.group_key}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void generateReport(selectedProject.id, 'cutting_list')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Cutting List
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void generateReport(selectedProject.id, 'purchase_order')}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Purchase Order
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="execution" className="space-y-4">
          {selectedProject ? (
            <ExecutionTrackingPanel projectId={selectedProject.id} />
          ) : (
            <Card className="bg-slate-900/40 border-slate-800 border-dashed">
              <CardContent className="p-8 text-center">
                <Wrench className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-sm text-slate-400">Select a production project to track execution</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="current" className="space-y-4">
          {currentWindowUnit ? (
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader className="pb-3 border-b border-slate-700/50">
                <CardTitle className="text-sm text-slate-200">Current Window Design</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">ID:</span>
                    <span className="font-medium ml-2 text-slate-200">{currentWindowUnit.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Type:</span>
                    <span className="font-medium ml-2 text-slate-200">{currentWindowUnit.type}</span>
                  </div>
                </div>

                {selectedProject && (
                  <Button
                    onClick={() => void addWindowToProject(currentWindowUnit, selectedProject.id)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add to {selectedProject.name}
                  </Button>
                )}

                {!selectedProject && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="text-sm">No Project Selected</AlertTitle>
                    <AlertDescription className="text-xs">
                      Select or create a production project to add this window.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-900/40 border-slate-800 border-dashed">
              <CardContent className="p-8 text-center">
                <Settings className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-sm text-slate-400">No window design available</p>
                <p className="text-xs text-slate-500 mt-1">Complete your design in the drafting area</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};