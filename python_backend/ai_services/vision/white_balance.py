"""
white_balance.py - Critical lighting fix for material detection.
"""
import cv2
import numpy as np


def apply_gray_world_white_balance(image: np.ndarray) -> np.ndarray:
    """
    Apply gray-world white balance. Call this before material detection.
    """
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB).astype(np.float32)

    avg_a = np.mean(lab[:, :, 1])
    avg_b = np.mean(lab[:, :, 2])
    luminance = lab[:, :, 0] / 255.0

    lab[:, :, 1] -= (avg_a - 128) * luminance * 1.1
    lab[:, :, 2] -= (avg_b - 128) * luminance * 1.1

    lab = np.clip(lab, 0, 255).astype(np.uint8)
    return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

