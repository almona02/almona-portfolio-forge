from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class BoundingBox(BaseModel):
    bbox: List[float]
    confidence: float
    class_id: int
    class_name: str
    center: List[float]

class ImageInfo(BaseModel):
    width: int
    height: int
    channels: int

class ModelInfo(BaseModel):
    framework: str
    confidence_threshold: float
    model_version: str

class PartDetectionResponseData(BaseModel):
    detections: List[BoundingBox]
    image_info: ImageInfo
    model_info: ModelInfo

class PartDetectionResponse(BaseModel):
    success: bool
    data: PartDetectionResponseData
    timestamp: str
    api_version: str

class BatchPartDetectionResponse(BaseModel):
    success: bool
    data: List[PartDetectionResponseData]
    processed_count: int
    timestamp: str
    api_version: str

class HealthCheckResponse(BaseModel):
    status: str
    version: str
    timestamp: str

class ModelVersionInfo(BaseModel):
    type: str
    framework: str
    input_size: int
    available_versions: Dict[str, str]

class GetModelInfoResponse(BaseModel):
    success: bool
    data: Dict[str, Any]
