"""Enhanced utility functions for Part Detection Model v2."""

import cv2
import numpy as np
from typing import Dict, List, Tuple
import albumentations as A

def preprocess_image_v2(image: np.ndarray, target_size: Tuple[int, int] = (256, 256)) -> np.ndarray:
    """Enhanced preprocessing with augmentation support."""
    # Resize image
    image = cv2.resize(image, target_size)
    
    # Normalize using ImageNet statistics
    image = image.astype(np.float32) / 255.0
    
    return image

def postprocess_results_v2(results: Dict[str, float], top_k: int = 3) -> Dict[str, any]:
    """Enhanced postprocessing with top-k predictions."""
    sorted_predictions = sorted(results.items(), key=lambda x: x[1], reverse=True)
    top_k_predictions = sorted_predictions[:top_k]
    
    return {
        "top_k_predictions": top_k_predictions,
        "confidence_scores": {k: v for k, v in top_k_predictions},
        "total_classes": len(results),
        "max_confidence": max(results.values()) if results else 0
    }

def create_augmentation_pipeline() -> A.Compose:
    """Create augmentation pipeline for training."""
    return A.Compose([
        A.HorizontalFlip(p=0.5),
        A.RandomRotate90(p=0.5),
        A.RandomBrightnessContrast(p=0.2),
        A.RandomGamma(p=0.2),
        A.GaussNoise(p=0.2),
        A.Blur(blur_limit=3, p=0.1),
    ])

def extract_features_for_mlflow(image: np.ndarray) -> Dict[str, float]:
    """Extract features for MLflow tracking."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    return {
        "mean_intensity": float(np.mean(gray)),
        "std_intensity": float(np.std(gray)),
        "image_height": image.shape[0],
        "image_width": image.shape[1],
        "aspect_ratio": image.shape[1] / image.shape[0]
    }
