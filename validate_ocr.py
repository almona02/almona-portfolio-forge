import os
import sys

import cv2
import numpy as np

# Ensure backend modules import
sys.path.append(os.getcwd())

from python_backend.ai_services.scanning.scale_detector import ScaleDetectorService


def run_test():
    img_path = (
        r"C:\projects\almona-portfolio-forge\public\PROFILES\JUMBO 100\profile_sample.jpg"
    )

    if not os.path.exists(img_path):
        print(f"File not found: {img_path}")
        return

    print(f"Testing OCR on: {img_path}")
    print("Initializing AI Service...")

    service = ScaleDetectorService(use_gpu=False)

    with open(img_path, "rb") as f:
        image_bytes = f.read()

    result = service.detect_scale(image_bytes)

    print("\n--- Detection Results ---")
    print(result)


if __name__ == "__main__":
    run_test()

