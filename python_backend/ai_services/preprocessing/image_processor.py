import cv2
import numpy as np
from typing import Dict, Tuple, Optional
import logging
from PIL import Image, ImageEnhance, ImageFilter

logger = logging.getLogger(__name__)

class ImageProcessor:
    """Image preprocessing service for AI model optimization"""
    
    def __init__(self):
        self.supported_operations = [
            "enhance",
            "normalize",
            "resize",
            "denoise",
            "sharpen",
            "grayscale"
        ]
    
    def enhance_image(self, image: np.ndarray) -> np.ndarray:
        """Enhance image quality for better detection"""
        try:
            # Convert to PIL Image
            pil_image = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
            
            # Enhance brightness and contrast
            enhancer = ImageEnhance.Brightness(pil_image)
            enhanced = enhancer.enhance(1.2)
            
            enhancer = ImageEnhance.Contrast(enhanced)
            enhanced = enhancer.enhance(1.1)
            
            # Convert back to OpenCV format
            return cv2.cvtColor(np.array(enhanced), cv2.COLOR_RGB2BGR)
            
        except Exception as e:
            logger.error(f"Error enhancing image: {str(e)}")
            return image
    
    def normalize_image(self, image: np.ndarray) -> np.ndarray:
        """Normalize image pixel values"""
        try:
            # Normalize to 0-1 range
            normalized = image.astype(np.float32) / 255.0
            
            # Scale back to 0-255
            return (normalized * 255).astype(np.uint8)
            
        except Exception as e:
            logger.error(f"Error normalizing image: {str(e)}")
            return image
    
    def resize_image(self, image: np.ndarray, target_size: Tuple[int, int] = (640, 640)) -> np.ndarray:
        """Resize image to target dimensions"""
        try:
            return cv2.resize(image, target_size, interpolation=cv2.INTER_AREA)
        except Exception as e:
            logger.error(f"Error resizing image: {str(e)}")
            return image
    
    def denoise_image(self, image: np.ndarray) -> np.ndarray:
        """Apply denoising filter"""
        try:
            return cv2.fastNlMeansDenoisingColored(image, None, 10, 10, 7, 21)
        except Exception as e:
            logger.error(f"Error denoising image: {str(e)}")
            return image
    
    def sharpen_image(self, image: np.ndarray) -> np.ndarray:
        """Apply sharpening filter"""
        try:
            kernel = np.array([[-1,-1,-1],
                              [-1, 9,-1],
                              [-1,-1,-1]])
            return cv2.filter2D(image, -1, kernel)
        except Exception as e:
            logger.error(f"Error sharpening image: {str(e)}")
            return image
    
    def convert_to_grayscale(self, image: np.ndarray) -> np.ndarray:
        """Convert image to grayscale"""
        try:
            return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        except Exception as e:
            logger.error(f"Error converting to grayscale: {str(e)}")
            return image
    
    def preprocess(self, image_file, operation: str = "enhance", **kwargs) -> Dict:
        """
        Preprocess image based on specified operation
        
        Args:
            image_file: File-like object containing the image
            operation: Preprocessing operation to perform
            **kwargs: Additional parameters for specific operations
        
        Returns:
            Dictionary with preprocessing results
        """
        try:
            # Read image
            image_data = image_file.read()
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                raise ValueError("Could not decode image")
            
            # Apply preprocessing based on operation
            processed_image = image
            
            if operation == "enhance":
                processed_image = self.enhance_image(image)
            elif operation == "normalize":
                processed_image = self.normalize_image(image)
            elif operation == "resize":
                target_size = kwargs.get("target_size", (640, 640))
                processed_image = self.resize_image(image, target_size)
            elif operation == "denoise":
                processed_image = self.denoise_image(image)
            elif operation == "sharpen":
                processed_image = self.sharpen_image(image)
            elif operation == "grayscale":
                processed_image = self.convert_to_grayscale(image)
            else:
                logger.warning(f"Unknown operation: {operation}, returning original")
            
            # Get image info
            height, width = processed_image.shape[:2]
            
            return {
                "processed": True,
                "operation": operation,
                "original_dimensions": (image.shape[1], image.shape[0]),
                "processed_dimensions": (width, height),
                "channels": processed_image.shape[2] if len(processed_image.shape) > 2 else 1
            }
            
        except Exception as e:
            logger.error(f"Error preprocessing image: {str(e)}")
            raise
    
    def get_supported_operations(self) -> List[str]:
        """Get list of supported preprocessing operations"""
        return self.supported_operations
