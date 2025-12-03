import sys
import os
import time
import numpy as np
import cv2
from pathlib import Path
# Check if pynvml is available
try:
    import pynvml
    HAS_GPU = True
except ImportError:
    HAS_GPU = False

# Add parent directory to path to import modules
sys.path.append(str(Path(__file__).parent.parent))
from ai_services.model_manager import LocalModelManager

def run_benchmark(model_name, model_version, image_path, num_iterations=100):
    """
    Benchmarks a model from the Local Model Manager.
    """
    # Initialize NVML for GPU monitoring if available
    if HAS_GPU:
        try:
            pynvml.nvmlInit()
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)
        except Exception:
            print("GPU not available or initialization failed.")
            HAS_GPU = False

    # Load the model from Local Manager
    manager = LocalModelManager()
    try:
        # In local manager, we load by filename, here we simulate usage
        # Assuming model_name maps to a file in models directory
        model_filename = f"{model_name}.pt" if not model_name.endswith('.pt') else model_name
        model = manager.load_model(model_filename)
    except Exception as e:
        print(f"Failed to load model {model_name}. Error: {e}")
        return None

    # Load and preprocess the image
    image = cv2.imread(str(image_path))
    if image is None:
        print(f"Failed to load image from {image_path}")
        return None

    # Warm-up run
    # Ultralytics model call
    model(image, verbose=False)

    # Run the benchmark
    start_time = time.time()
    for _ in range(num_iterations):
        model(image, verbose=False)
    end_time = time.time()

    # Get GPU stats
    gpu_memory_used = 0
    gpu_util = 0
    if HAS_GPU:
        try:
            mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
            gpu_util = pynvml.nvmlDeviceGetUtilizationRates(handle).gpu
            gpu_memory_used = mem_info.used / (1024**2)
            pynvml.nvmlShutdown()
        except Exception:
            pass

    # Calculate metrics
    total_time = end_time - start_time
    avg_inference_time = (total_time / num_iterations) * 1000  # in ms
    throughput = num_iterations / total_time  # images per second

    return {
        "model_name": model_name,
        "model_version": model_version,
        "avg_inference_time_ms": avg_inference_time,
        "throughput_fps": throughput,
        "gpu_memory_used_mb": gpu_memory_used,
        "gpu_utilization_percent": gpu_util,
    }

if __name__ == "__main__":
    # --- Configuration ---
    # Using absolute path relative to this file
    BASE_DIR = Path(__file__).parent.parent
    IMAGE_PATH = BASE_DIR / "../public/images/machines/cutting-machine.jpg" 
    
    # Ensure image exists or use a placeholder if needed for test
    if not IMAGE_PATH.exists():
        print(f"Warning: Test image not found at {IMAGE_PATH}")
    
    MODELS_TO_BENCHMARK = [
        {"name": "yolov8n.pt", "version": "1"},
        # Add other models to benchmark here
    ]
    # --- End Configuration ---

    print("# Benchmarking Report")
    print("---")

    for model_info in MODELS_TO_BENCHMARK:
        result = run_benchmark(
            model_name=model_info["name"],
            model_version=model_info["version"],
            image_path=IMAGE_PATH,
        )

        if result:
            print(f"## Model: {result['model_name']} (v{result['model_version']})")
            print(f"- **Average Inference Time:** {result['avg_inference_time_ms']:.2f} ms")
            print(f"- **Throughput:** {result['throughput_fps']:.2f} FPS")
            if HAS_GPU:
                print(f"- **GPU Memory Used:** {result['gpu_memory_used_mb']:.2f} MB")
                print(f"- **GPU Utilization:** {result['gpu_utilization_percent']}%")
            print("\n")
