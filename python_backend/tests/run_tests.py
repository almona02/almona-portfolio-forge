#!/usr/bin/env python3
"""
Test runner for the API endpoints
"""

import os
import sys
import subprocess
import tempfile
from PIL import Image

def setup_test_environment():
    """Set up test environment"""
    print("Setting up test environment...")
    
    # Create test data directory
    test_data_dir = os.path.join(os.path.dirname(__file__), "test_data")
    os.makedirs(test_data_dir, exist_ok=True)
    
    # Create sample test images
    create_test_images(test_data_dir)
    
    return test_data_dir

def create_test_images(test_data_dir):
    """Create sample test images"""
    # Create small test image
    small_img = Image.new('RGB', (640, 480), color='red')
    small_img.save(os.path.join(test_data_dir, "test_small.jpg"), 'JPEG', quality=85)
    
    # Create medium test image
    medium_img = Image.new('RGB', (1920, 1080), color='blue')
    medium_img.save(os.path.join(test_data_dir, "test_medium.jpg"), 'JPEG', quality=85)
    
    # Create large test image (simulating 15MB+)
    large_img = Image.new('RGB', (4000, 4000), color='green')
    large_img.save(os.path.join(test_data_dir, "test_large.jpg"), 'JPEG', quality=95)
    
    print("Test images created successfully!")

def run_pytest():
    """Run pytest tests"""
    print("\n" + "="*50)
    print("Running API Smoke Tests...")
    print("="*50)
    
    try:
        result = subprocess.run([
            sys.executable, "-m", "pytest", 
            "tests/test_api.py", 
            "-v", 
            "--tb=short"
        ], cwd=os.path.dirname(os.path.dirname(__file__)), capture_output=True, text=True)
        
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        
        return result.returncode == 0
        
    except Exception as e:
        print(f"Error running tests: {e}")
        return False

def main():
    """Main test runner"""
    print("Almona API Testing Suite")
    print("=" * 50)
    
    # Setup test environment
    test_data_dir = setup_test_environment()
    
    # Run tests
    success = run_pytest()
    
    if success:
        print("\n✅ All tests passed!")
    else:
        print("\n❌ Some tests failed!")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
