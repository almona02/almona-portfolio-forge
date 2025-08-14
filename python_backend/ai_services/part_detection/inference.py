import cv2
import numpy as np
from typing import Dict, List, Tuple, Optional
import logging
from pathlib import Path
import asyncio
from concurrent.futures import ThreadPoolExecutor
import mlflow

from ultralytics import YOLO
from core.config import settings

logger = logging.getLogger(__name__)

class PartDetector:
    """YOLOv8-based spare parts detection service"""
    
    def __init__(self, version: Optional[str] = "1"):
        self.model = None
        self.executor = ThreadPoolExecutor(max_workers=4)
        self.version = version
        self._load_model()
    
    def _load_model(self):
        """Load the YOLOv8 model from MLflow Model Registry"""
        try:
            mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
            model_name = "part_detector"
            model_uri = f"models:/{model_name}/{self.version}"
            
            logger.info(f"Loading model '{model_name}' version '{self.version}' from MLflow Model Registry...")
            self.model = mlflow.pyfunc.load_model(model_uri)
            logger.info("YOLOv8 model loaded successfully from MLflow Model Registry")
        except Exception as e:
            logger.error(f"Failed to load model from MLflow Model Registry: {str(e)}")
            logger.warning("Falling back to loading model from local path.")
            # Fallback to the old method if MLflow fails
            try:
                model_path_str = settings.MODEL_PATH
                if self.version and self.version in settings.MODEL_VERSIONS:
                    model_path_str = settings.MODEL_VERSIONS[self.version]
                
                model_path = Path(model_path_str)
                if not model_path.exists():
                    logger.warning(f"Model not found at {model_path}, using default YOLOv8n")
                    self.model = YOLO('yolov8n.pt')
                else:
                    self.model = YOLO(str(model_path))
                logger.info("YOLOv8 model loaded successfully from local path")
            except Exception as fallback_e:
                logger.error(f"Failed to load model from local path: {fallback_e}")
                raise fallback_e

    async def detect_parts(self, image_file, confidence_threshold: float = 0.7) -> Dict:
        """
        Detect spare parts in the provided image
        
        Args:
            image_file: File-like object containing the image
            confidence_threshold: Minimum confidence threshold for detections
            
        Returns:
            Dictionary with detection results
        """
        try:
            # Read image
            image_data = image_file.read()
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                raise ValueError("Could not decode image")
            
            # Run inference in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(
                self.executor,
                self._run_inference,
                image,
                confidence_threshold
            )
            
            return results
            
        except Exception as e:
            logger.error(f"Error in detect_parts: {str(e)}")
            raise
    
    def _run_inference(self, image: np.ndarray, confidence_threshold: float) -> Dict:
        """Run YOLOv8 inference on the image"""
        try:
            # Run prediction
            results = self.model.predict(image, conf=confidence_threshold)
            
            # Process results
            detections = []
            for r in results:
                boxes = r.boxes
                if boxes is not None:
                    for box in boxes:
                        # Get box coordinates
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        confidence = box.conf[0].item()
                        class_id = int(box.cls[0].item())
                        
                        # Get class name (if available)
                        class_name = self.model.model.names[class_id] if hasattr(self.model, 'model') and hasattr(self.model.model, 'names') else f"class_{class_id}"
                        
                        detections.append({
                            "bbox": [x1, y1, x2, y2],
                            "confidence": confidence,
                            "class_id": class_id,
                            "class_name": class_name,
                            "center": [(x1 + x2) / 2, (y1 + y2) / 2]
                        })
            
            # Calculate image dimensions
            height, width = image.shape[:2]
            
            return {
                "detections": detections,
                "image_info": {
                    "width": width,
                    "height": height,
                    "channels": image.shape[2] if len(image.shape) > 2 else 1
                },
                "model_info": {
                    "framework": "YOLOv8",
                    "confidence_threshold": confidence_threshold,
                    "model_version": self.version or "default"
                }
            }
            
        except Exception as e:
            logger.error(f"Error in _run_inference: {str(e)}")
            raise
    
    async def batch_detect(self, image_files: List, confidence_threshold: float = 0.7) -> List[Dict]:
        """Process multiple images in batch"""
        tasks = [
            self.detect_parts(image_file, confidence_threshold)
            for image_file in image_files
        ]
        return await asyncio.gather(*tasks)
    
    def get_model_info(self) -> Dict:
        """Get information about the loaded model"""
        return {
            "model_type": "YOLOv8",
            "classes": list(self.model.model.names.values()) if hasattr(self.model, 'model') and hasattr(self.model.model, 'names') else [],
            "input_size": getattr(self.model, 'imgsz', 640),
            "framework": "Ultralytics",
            "version": self.version or "default"
        }
