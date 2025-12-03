"""
Part detection service without MLflow dependency
"""

import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
import asyncio
from concurrent.futures import ThreadPoolExecutor

from ultralytics import YOLO
import cv2
import numpy as np

from core.config import settings
from ..model_manager import LocalModelManager

logger = logging.getLogger(__name__)

class PartDetector:
    """
    Detects industrial parts in images using YOLO models
    """
    
    def __init__(self, model_path: Optional[str] = None, version: Optional[str] = None):
        """
        Initialize the part detector
        
        Args:
            model_path: Path to YOLO model file (.pt format)
            version: Model version (kept for compatibility but not used with MLflow)
        """
        self.model_path = model_path or settings.MODEL_PATH
        self.version = version
        self.model_manager = LocalModelManager()
        self.executor = ThreadPoolExecutor(max_workers=4)
        self.model = self._load_model()
        logger.info(f"PartDetector initialized with model: {self.model_path}")
    
    def _load_model(self) -> YOLO:
        """
        Load YOLO model from local path
        
        Returns:
            YOLO model instance
        """
        try:
            # Determine model name from path or version
            model_name = Path(self.model_path).name
            
            # If version is provided and in settings, use that
            if self.version and self.version in settings.MODEL_VERSIONS:
                model_name = Path(settings.MODEL_VERSIONS[self.version]).name
                
            # Load from local manager
            model = self.model_manager.load_model(model_name)
            logger.info(f"Successfully loaded model {model_name}")
            return model
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            # Fallback to default
            logger.warning("Falling back to default yolov8n.pt")
            return YOLO("yolov8n.pt")
    
    async def detect_parts(self, image_file, confidence_threshold: float = 0.7) -> Dict:
        """
        Detect spare parts in the provided image (Async wrapper for compatibility)
        """
        try:
            # Read image
            image_data = await image_file.read() if hasattr(image_file, 'read') and asyncio.iscoroutinefunction(image_file.read) else image_file.read()
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                raise ValueError("Could not decode image")
                
            # Run inference in thread pool
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(
                self.executor,
                self.detect,
                image,
                confidence_threshold
            )
            
            # Format results to match previous API response structure
            formatted_results = {
                "detections": results,
                "image_info": {
                    "width": image.shape[1],
                    "height": image.shape[0],
                    "channels": image.shape[2] if len(image.shape) > 2 else 1
                },
                "model_info": self.get_model_info()
            }
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Error in detect_parts: {str(e)}")
            raise

    def detect(self, 
               image: np.ndarray,
               confidence: float = 0.5,
               iou: float = 0.5) -> List[Dict[str, Any]]:
        """
        Detect parts in an image
        
        Args:
            image: Input image as numpy array (BGR format)
            confidence: Confidence threshold
            iou: IOU threshold for NMS
            
        Returns:
            List of detections with bounding boxes and confidence
        """
        if image is None or image.size == 0:
            logger.warning("Empty image provided for detection")
            return []
        
        try:
            # Run inference
            results = self.model.predict(
                image,
                conf=confidence,
                iou=iou,
                verbose=False
            )
            
            # Parse results
            detections = []
            for result in results:
                if result.boxes is not None:
                    boxes = result.boxes.xyxy.cpu().numpy()
                    confidences = result.boxes.conf.cpu().numpy()
                    class_ids = result.boxes.cls.cpu().numpy()
                    
                    for box, conf, cls_id in zip(boxes, confidences, class_ids):
                        detection = {
                            "bbox": box.tolist(),  # [x1, y1, x2, y2]
                            "confidence": float(conf),
                            "class_id": int(cls_id),
                            "class_name": result.names[int(cls_id)],
                            "center": [
                                float((box[0] + box[2]) / 2),
                                float((box[1] + box[3]) / 2)
                            ]
                        }
                        detections.append(detection)
            
            # Log detection metrics locally
            if detections and getattr(settings, 'LOG_EXPERIMENTS_LOCALLY', False):
                self.model_manager.log_experiment(
                    experiment_name="part_detection_inference",
                    params={
                        "confidence_threshold": confidence,
                        "iou_threshold": iou,
                        "model": Path(self.model_path).name
                    },
                    metrics={
                        "detection_count": len(detections),
                        "average_confidence": float(np.mean([d["confidence"] for d in detections])) if detections else 0.0,
                        "unique_classes": len(set([d["class_id"] for d in detections]))
                    }
                )
            
            return detections
            
        except Exception as e:
            logger.error(f"Detection failed: {e}")
            return []
    
    async def batch_detect(self, image_files: List, confidence_threshold: float = 0.7) -> List[Dict]:
        """Process multiple images in batch"""
        tasks = [
            self.detect_parts(image_file, confidence_threshold)
            for image_file in image_files
        ]
        return await asyncio.gather(*tasks)
    
    def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about the loaded model
        
        Returns:
            Dictionary with model information
        """
        return {
            "model_path": str(self.model_path),
            "model_type": "YOLO",
            "framework": "Ultralytics",
            "version": self.version or "local",
            "input_size": getattr(self.model, "imgsz", "unknown"),
            "classes": list(self.model.names.values()) if hasattr(self.model, 'names') else []
        }
