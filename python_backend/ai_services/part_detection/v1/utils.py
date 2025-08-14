"""Utility functions for Part Detection Model v1."""

import cv2
import numpy as np
from typing import Dict, List, Tuple

def preprocess_image(image: np.ndarray) -> np.ndarray:
    """Preprocess image for model input."""
    return cv2.resize(image, (224, 224)) / 255.0

def postprocess_results(results: Dict[str, float]) -> Dict[str, float]:
    """Postprocess model results."""
    return results
