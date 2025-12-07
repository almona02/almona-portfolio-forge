class EgyptianStandardsMatcher:
    """
    Lightweight matcher for common Egyptian market profile dimensions.
    """

    STANDARD_PROFILES = {
        # UPVC profiles
        "UPVC_50": {"width": 50, "height": 50, "material": "upvc"},
        "UPVC_60": {"width": 60, "height": 60, "material": "upvc"},
        "UPVC_70": {"width": 70, "height": 70, "material": "upvc"},
        "UPVC_80": {"width": 80, "height": 80, "material": "upvc"},
        # Aluminum profiles
        "ALUMINUM_50": {"width": 50, "height": 50, "material": "aluminum"},
        "ALUMINUM_60": {"width": 60, "height": 60, "material": "aluminum"},
        "ALUMINUM_70": {"width": 70, "height": 70, "material": "aluminum"},
        "ALUMINUM_100": {"width": 100, "height": 100, "material": "aluminum"},
        "ALUMINUM_120": {"width": 120, "height": 120, "material": "aluminum"},
        # Jumbo series
        "JUMBO_100": {"width": 100, "height": 100, "material": "aluminum"},
        "JUMBO_120": {"width": 120, "height": 120, "material": "aluminum"},
        "JUMBO_150": {"width": 150, "height": 150, "material": "aluminum"},
    }

    def match_profile(self, width_mm: float, height_mm: float, tolerance: float = 0.1):
        """Match scanned dimensions to Egyptian standard profiles."""
        best_match = None
        best_score = 0.0

        for name, standard in self.STANDARD_PROFILES.items():
            width_diff = abs(width_mm - standard["width"]) / standard["width"]
            height_diff = abs(height_mm - standard["height"]) / standard["height"]
            diff_score = 1.0 - (width_diff + height_diff) / 2.0

            if diff_score > best_score and diff_score > (1 - tolerance):
                best_score = diff_score
                best_match = {
                    "name": name,
                    "standard_width": standard["width"],
                    "standard_height": standard["height"],
                    "material": standard["material"],
                    "match_score": round(best_score, 3),
                    "deviation_mm": {
                        "width": round(width_mm - standard["width"], 2),
                        "height": round(height_mm - standard["height"], 2),
                    },
                }

        return best_match

