import os
import uuid
from typing import Dict, Any, List
from celery import current_task
import cv2
import numpy as np
from PIL import Image
import torch
from pathlib import Path

from core.celery_app import celery_app
from ai_services.part_detection.inference import PartDetector
from ai_services.preprocessing.image_processor import ImageProcessor

@celery_app.task(bind=True, name="detect_parts")
def detect_parts(self, image_path: str) -> Dict[str, Any]:
    """
    Detect parts in an image using YOLOv8
    
    Args:
        image_path: Path to the image file
        
    Returns:
        Dictionary containing detection results
    """
    try:
        # Update task state
        current_task.update_state(state='PROCESSING', meta={'status': 'Loading model...'})
        
        # Initialize detector
        model_path = Path("ai_services/part_detection/models/model.pt")
        if not model_path.exists():
            raise FileNotFoundError(f"Model file not found: {model_path}")
            
        detector = PartDetector()
        
        # Preprocess image
        current_task.update_state(state='PROCESSING', meta={'status': 'Preprocessing image...'})
        processor = ImageProcessor()
        
        # Load and preprocess image
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Could not load image: {image_path}")
            
        processed_image = processor.preprocess(image)
        
        # Run inference
        current_task.update_state(state='PROCESSING', meta={'status': 'Running inference...'})
        
        # Since PartDetector uses async methods, we need to handle this differently
        # For now, we'll use the synchronous approach
        import asyncio
        
        async def run_detection():
            # Create a mock file-like object for the detector
            class MockFile:
                def __init__(self, image_data):
                    self.image_data = image_data
                def read(self):
                    return cv2.imencode('.jpg', self.image_data)[1].tobytes()
            
            mock_file = MockFile(processed_image)
            results = await detector.detect_parts(mock_file, confidence_threshold=0.7)
            return results
        
        # Run async function in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            results = loop.run_until_complete(run_detection())
        finally:
            loop.close()
        
        # Post-process results
        current_task.update_state(state='PROCESSING', meta={'status': 'Processing results...'})
        
        # Format results for frontend
        formatted_results = {
            'task_id': self.request.id,
            'status': 'completed',
            'detections': [],
            'image_info': {
                'width': image.shape[1],
                'height': image.shape[0],
                'channels': image.shape[2]
            }
        }
        
        for detection in results['detections']:
            formatted_results['detections'].append({
                'class': detection['class_name'],
                'confidence': float(detection['confidence']),
                'bbox': {
                    'x': int(detection['bbox'][0]),
                    'y': int(detection['bbox'][1]),
                    'width': int(detection['bbox'][2] - detection['bbox'][0]),
                    'height': int(detection['bbox'][3] - detection['bbox'][1])
                }
            })
        
        return formatted_results
        
    except Exception as exc:
        current_task.update_state(
            state='FAILURE',
            meta={
                'status': 'failed',
                'error': str(exc),
                'error_type': type(exc).__name__
            }
        )
        raise exc

@celery_app.task(name="health_check")
def health_check() -> Dict[str, str]:
    """Health check endpoint for the AI service"""
    return {
        "status": "healthy",
        "service": "part_detection",
        "model_loaded": "true"
    }
