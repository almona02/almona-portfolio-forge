"""
NumPy-only Sauvola/Niblack binarization to avoid scipy dependency.
"""
import numpy as np
import cv2


def sauvola_numpy(image: np.ndarray, window_size: int = 25, k: float = 0.2) -> np.ndarray:
    """
    NumPy-only Sauvola binarization (optimized for speed).
    """
    if window_size % 2 == 0:
        window_size += 1

    h, w = image.shape
    pad = window_size // 2

    padded = np.pad(image.astype(np.float32), pad, mode="reflect")
    kernel = np.ones(window_size) / window_size

    local_mean = cv2.sepFilter2D(padded, -1, kernel, kernel)
    local_mean = local_mean[pad : h + pad, pad : w + pad]

    padded_sq = padded**2
    local_mean_sq = cv2.sepFilter2D(padded_sq, -1, kernel, kernel)
    local_mean_sq = local_mean_sq[pad : h + pad, pad : w + pad]

    local_variance = np.maximum(local_mean_sq - (local_mean**2), 0)
    local_std = np.sqrt(local_variance)

    threshold = local_mean * (1 + k * ((local_std / 128) - 1))

    binary = np.zeros_like(image, dtype=np.uint8)
    binary[image > threshold] = 255

    return binary


def niblack_numpy(image: np.ndarray, window_size: int = 25, k: float = -0.2) -> np.ndarray:
    """
    NumPy-only Niblack binarization.
    """
    return sauvola_numpy(image, window_size, k)

