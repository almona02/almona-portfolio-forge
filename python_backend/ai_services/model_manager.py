"""
Local model manager to replace MLflow functionality
"""

import os
from pathlib import Path
from typing import Dict, Any, Optional
import json
from datetime import datetime
from ultralytics import YOLO
import logging

logger = logging.getLogger(__name__)

class LocalModelManager:
    """Manages local model versions without MLflow"""
    
    def __init__(self, model_dir: str = "models"):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(exist_ok=True)
        self.metadata_file = self.model_dir / "model_metadata.json"
        self._load_metadata()
    
    def _load_metadata(self):
        """Load model metadata from JSON"""
        if self.metadata_file.exists():
            with open(self.metadata_file, 'r') as f:
                self.metadata = json.load(f)
        else:
            self.metadata = {"models": {}, "experiments": {}}
    
    def _save_metadata(self):
        """Save metadata to JSON"""
        with open(self.metadata_file, 'w') as f:
            json.dump(self.metadata, f, indent=2)
    
    def load_model(self, model_name: str = "yolov8n.pt") -> YOLO:
        """
        Load a YOLO model from local storage
        
        Args:
            model_name: Name of the model file
            
        Returns:
            YOLO model instance
        """
        model_path = self.model_dir / model_name
        
        if not model_path.exists():
            logger.warning(f"Model {model_name} not found locally, downloading...")
            try:
                model = YOLO(model_name)
                model.save(str(model_path))
                logger.info(f"Model {model_name} downloaded and saved to {model_path}")
            except Exception as e:
                logger.error(f"Failed to download model {model_name}: {e}")
                # If we can't save it locally (e.g. permissions), return the memory instance
                # but ideally we should raise or handle better. For now, just return loaded model
                if 'model' in locals():
                    return model
                raise
        else:
            model = YOLO(str(model_path))
        
        # Track model usage
        if model_name not in self.metadata["models"]:
            self.metadata["models"][model_name] = {
                "first_loaded": datetime.utcnow().isoformat(),
                "load_count": 0
            }
        
        self.metadata["models"][model_name]["last_loaded"] = datetime.utcnow().isoformat()
        self.metadata["models"][model_name]["load_count"] += 1
        self._save_metadata()
        
        return model
    
    def log_experiment(self, 
                      experiment_name: str,
                      params: Dict[str, Any],
                      metrics: Dict[str, Any],
                      tags: Optional[Dict[str, str]] = None):
        """
        Log experiment data locally (replaces MLflow tracking)
        
        Args:
            experiment_name: Name of the experiment
            params: Hyperparameters used
            metrics: Performance metrics
            tags: Optional tags for categorization
        """
        experiment_id = f"exp_{len(self.metadata['experiments']) + 1:04d}"
        
        self.metadata["experiments"][experiment_id] = {
            "name": experiment_name,
            "timestamp": datetime.utcnow().isoformat(),
            "parameters": params,
            "metrics": metrics,
            "tags": tags or {}
        }
        
        self._save_metadata()
        logger.info(f"Logged experiment {experiment_id}: {experiment_name}")
        
        return experiment_id

