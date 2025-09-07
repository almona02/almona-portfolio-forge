import mlflow
import time
import numpy as np
import cv2
from pathlib import Path
import pynvml

def run_benchmark(model_name, model_version, image_path, num_iterations=100):
    """
    Benchmarks a model from the MLflow Model Registry.
    """
    # Initialize NVML for GPU monitoring
    pynvml.nvmlInit()
    handle = pynvml.nvmlDeviceGetHandleByIndex(0)

    # Load the model from MLflow
    model_uri = f"models:/{model_name}/{model_version}"
    try:
        model = mlflow.pyfunc.load_model(model_uri)
    except Exception as e:
        print(f"Failed to load model {model_name}:{model_version}. Error: {e}")
        return None

    # Load and preprocess the image
    image = cv2.imread(str(image_path))
    if image is None:
        print(f"Failed to load image from {image_path}")
        return None

    # Warm-up run
    model.predict(image)

    # Run the benchmark
    start_time = time.time()
    for _ in range(num_iterations):
        model.predict(image)
    end_time = time.time()

    # Get GPU stats
    mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
    gpu_util = pynvml.nvmlDeviceGetUtilizationRates(handle).gpu

    # Shutdown NVML
    pynvml.nvmlShutdown()

    # Calculate metrics
    total_time = end_time - start_time
    avg_inference_time = (total_time / num_iterations) * 1000  # in ms
    throughput = num_iterations / total_time  # images per second

    return {
        "model_name": model_name,
        "model_version": model_version,
        "avg_inference_time_ms": avg_inference_time,
        "throughput_fps": throughput,
        "gpu_memory_used_mb": mem_info.used / (1024**2),
        "gpu_utilization_percent": gpu_util,
    }

if __name__ == "__main__":
    # --- Configuration ---
    MLFLOW_TRACKING_URI = "file:../mlruns"  # Relative to the script location
    IMAGE_PATH = Path("../public/images/machines/cutting-machine.jpg") # Relative to the script location
    MODELS_TO_BENCHMARK = [
        {"name": "part_detector", "version": "1"},
        # Add other models to benchmark here
    ]
    # --- End Configuration ---

    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)

    print("# GPU Benchmarking Report")
    print("---")

    for model_info in MODELS_TO_BENCHMARK:
        result = run_benchmark(
            model_name=model_info["name"],
            model_version=model_info["version"],
            image_path=IMAGE_PATH,
        )

        if result:
            print(f"## Model: {result['model_name']}:{result['model_version']}")
            print(f"- **Average Inference Time:** {result['avg_inference_time_ms']:.2f} ms")
            print(f"- **Throughput:** {result['throughput_fps']:.2f} FPS")
            print(f"- **GPU Memory Used:** {result['gpu_memory_used_mb']:.2f} MB")
            print(f"- **GPU Utilization:** {result['gpu_utilization_percent']}%")
            print("\n")