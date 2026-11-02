import React, { useState, useCallback } from 'react';
import { LazyAnimatePresence, LazyMotionDiv } from '@/utils/lazyMotion';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import {
  Grid3X3,
  List,
  Eye,
  Download,
  Share2,
  Star,
  Search,
  X,
  Play,
  Pause
} from 'lucide-react';
import { Input } from '@/shared/ui/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
// 3D viewers are loaded lazily in the full-screen dialog to prevent WebGL context issues
// import { LazyOptimizedGLBViewer } from './LazyGLBViewer';
// import { EnhancedGLBViewer } from './EnhancedGLBViewer';
// import { UnifiedARManager } from './UnifiedARManager';
// import { SwiftXRManager } from './SwiftXRManager';
import { useToast } from '@/hooks/useToast';
import './SwiftXR.css';

interface Model3D {
  id: string;
  name: string;
  description: string;
  modelPath: string;
  thumbnail: string;
  category: string;
  tags: string[];
  featured?: boolean;
  dimensions?: { length: string; width: string; height: string };
  fileSize?: string;
  lastUpdated?: string;
}

interface Model3DGalleryProps {
  models: Model3D[];
  onModelSelect?: (model: Model3D) => void;
  onModelDownload?: (model: Model3D) => void;
  onModelShare?: (model: Model3D) => void;
  showFilters?: boolean;
  showSearch?: boolean;
  defaultView?: 'grid' | 'list';
}

export function Model3DGallery({
  models,
  onModelSelect,
  onModelDownload,
  onModelShare,
  showFilters = true,
  showSearch = true,
  defaultView = 'grid'
}: Model3DGalleryProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(defaultView);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedModel, setSelectedModel] = useState<Model3D | null>(null);
  const [autoPlay, setAutoPlay] = useState(false); // Disabled by default to prevent WebGL context issues with multiple canvases
  const [_isMuted, _setIsMuted] = useState(false);
  const [failedModels, _setFailedModels] = useState<Set<string>>(new Set());
  const [_loadedModels, _setLoadedModels] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(models.map(model => model.category)))];

  // Filter models based on search and category
  const filteredModels = models.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         model.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         model.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || model.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleModelClick = useCallback((model: Model3D) => {
    setSelectedModel(model);
    onModelSelect?.(model);
  }, [onModelSelect]);

  const handleDownload = useCallback((model: Model3D, e: React.MouseEvent) => {
    e.stopPropagation();
    onModelDownload?.(model);
    toast({
      title: "Download Started",
      description: `Downloading ${model.name}...`,
    });
  }, [onModelDownload, toast]);

  const handleShare = useCallback((model: Model3D, e: React.MouseEvent) => {
    e.stopPropagation();
    onModelShare?.(model);
    toast({
      title: "Link Copied",
      description: `Share link for ${model.name} copied to clipboard`,
    });
  }, [onModelShare, toast]);

  const handleClosePreview = useCallback(() => {
    setSelectedModel(null);
  }, []);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4
      }
    }
  };

  const previewVariants = {
    initial: { opacity: 0, scale: 0.9, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.9, y: 20 }
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="typography-h2 text-white">3D Model Gallery</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {filteredModels.length} of {models.length} models
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-card rounded-lg p-1">
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              onClick={() => setViewMode('grid')}
              className="text-white"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              onClick={() => setViewMode('list')}
              className="text-white"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {/* Auto Play Toggle */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAutoPlay(!autoPlay)}
            className="border-border text-foreground hover:bg-card hover:text-white"
          >
            {autoPlay ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {autoPlay ? 'Stop' : 'Auto'} Play
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      {(showFilters || showSearch) && (
        <div className="flex flex-col sm:flex-row gap-4">
          {showSearch && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search models..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-card border-border text-white placeholder-muted-foreground"
              />
            </div>
          )}

          {showFilters && (
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48 bg-card border-border text-white">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {categories.map(category => (
                  <SelectItem 
                    key={category} 
                    value={category}
                    className="text-white hover:bg-muted"
                  >
                    {category === 'all' ? 'All Categories' : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Models Grid/List */}
      <LazyMotionDiv
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            : "space-y-4"
        }
      >
        <LazyAnimatePresence>
          {filteredModels.map((model) => (
            <LazyMotionDiv
              key={model.id}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
            >
              {viewMode === 'grid' ? (
                <Card 
                  className="group cursor-pointer bg-gradient-to-br from-background to-black border-border hover:border-amber-400/50 transition-all duration-300 overflow-hidden"
                  onClick={() => handleModelClick(model)}
                >
                  <CardHeader className="p-0">
                    <div className="relative aspect-square overflow-hidden">
                      {/* Thumbnail Preview with 3D Overlay */}
                      <div className="w-full h-full relative overflow-hidden">
                        {autoPlay && !failedModels.has(model.id) ? (
                          <div className="w-full h-full bg-card flex items-center justify-center">
                            <div className="text-center text-muted-foreground">
                              <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p className="text-xs">3D Preview</p>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={model.thumbnail}
                            alt={model.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                        )}
                      </div>

                      {/* Hover Overlay with View Button */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <Button
                          size="sm"
                          className="btn-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleModelClick(model);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View 3D Model
                        </Button>
                      </div>

                      {/* Badges */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {model.featured && (
                          <Badge className="bg-gradient-to-r from-amber-500 to-red-500 text-white border-0 text-xs">
                            <Star className="w-3 h-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                        <Badge variant="secondary" className="bg-card text-foreground text-xs">
                          {model.category}
                        </Badge>
                      </div>

                      {/* Actions */}
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-black/50 backdrop-blur-sm text-white border-border opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleDownload(model, e)}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-black/50 backdrop-blur-sm text-white border-border opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleShare(model, e)}
                        >
                          <Share2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4">
                    <CardTitle className="text-white text-lg mb-2 line-clamp-2">
                      {model.name}
                    </CardTitle>
                    <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                      {model.description}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {model.tags.slice(0, 3).map((tag, index) => (
                        <Badge 
                          key={index} 
                          variant="outline" 
                          className="text-xs text-muted-foreground border-border"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Metadata */}
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      {model.fileSize && <span>{model.fileSize}</span>}
                      {model.lastUpdated && <span>{model.lastUpdated}</span>}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card 
                  className="group cursor-pointer bg-gradient-to-br from-background to-black border-border hover:border-amber-400/50 transition-all duration-300"
                  onClick={() => handleModelClick(model)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Thumbnail */}
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-card flex-shrink-0 relative">
                        {autoPlay && !failedModels.has(model.id) ? (
                          <div className="w-full h-full bg-card flex items-center justify-center">
                            <div className="text-center text-muted-foreground">
                              <Eye className="w-6 h-6 mx-auto mb-1 opacity-50" />
                              <p className="text-xs">3D</p>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={model.thumbnail}
                            alt={model.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex items-center justify-center">
                          <Eye className="w-4 h-4 text-white opacity-80" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <CardTitle className="text-white text-lg line-clamp-1">
                            {model.name}
                          </CardTitle>
                          <div className="flex gap-1 ml-2">
                            {model.featured && (
                              <Badge className="bg-gradient-to-r from-amber-500 to-red-500 text-white border-0 text-xs">
                                <Star className="w-3 h-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-muted-foreground text-sm line-clamp-2 mb-2">
                          {model.description}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            <Badge variant="secondary" className="bg-card text-foreground text-xs">
                              {model.category}
                            </Badge>
                            {model.dimensions && (
                              <span className="text-xs text-muted-foreground">
                                {model.dimensions.length} × {model.dimensions.width} × {model.dimensions.height}
                              </span>
                            )}
                          </div>

                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => handleDownload(model, e)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => handleShare(model, e)}
                            >
                              <Share2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </LazyMotionDiv>
          ))}
        </LazyAnimatePresence>
      </LazyMotionDiv>

      {/* Empty State */}
      {filteredModels.length === 0 && (
        <LazyMotionDiv 
          className="text-center py-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="typography-h3 text-lg text-white mb-2">No models found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search terms or filters
          </p>
        </LazyMotionDiv>
      )}

      {/* Model Preview Modal */}
      <LazyAnimatePresence>
        {selectedModel && (
          <LazyMotionDiv
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClosePreview}
          >
            <LazyMotionDiv
              className="bg-gradient-to-br from-background to-black rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-amber-500/20"
              variants={previewVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="typography-h2 text-white">{selectedModel.name}</h2>
                  <Button
                    variant="ghost"
                    onClick={handleClosePreview}
                    className="text-muted-foreground hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="bg-card rounded-xl aspect-square relative overflow-hidden group">
                      {/* Show thumbnail image with 3D indicator */}
                      <img
                        src={selectedModel.thumbnail}
                        alt={selectedModel.name}
                        className="w-full h-full object-cover"
                      />
                      {/* 3D indicator overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col items-center justify-center">
                        <div className="btn-primary">
                          <Eye className="w-10 h-10 text-amber-500" />
                        </div>
                        <p className="text-white font-medium text-lg">3D Model Ready</p>
                        <p className="text-muted-foreground text-sm mt-1">Click "View Full Model" to interact</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="typography-h3 text-lg text-white mb-3">Description</h3>
                      <p className="text-foreground leading-relaxed">{selectedModel.description}</p>
                    </div>

                    {selectedModel.dimensions && (
                      <div className="bg-card p-4 rounded-lg">
                        <div className="text-sm text-muted-foreground mb-2">Dimensions</div>
                        <div className="text-white font-semibold">
                          {selectedModel.dimensions.length} × {selectedModel.dimensions.width} × {selectedModel.dimensions.height}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        className="btn-primary"
                        onClick={() => handleModelClick(selectedModel)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Full Model
                      </Button>
                      <Button
                        variant="outline"
                        className="border-border text-foreground hover:bg-card hover:text-white"
                        onClick={(e) => handleDownload(selectedModel, e)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </LazyMotionDiv>
          </LazyMotionDiv>
        )}
      </LazyAnimatePresence>
    </div>
  );
}

export default Model3DGallery;
