#!/usr/bin/env python3
"""
CLI test script for quick API testing
"""

import requests
import argparse
import os
import sys
from PIL import Image

def test_health(base_url):
    """Test health endpoint"""
    print("Testing health endpoint...")
    try:
        response = requests.get(f"{base_url}/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_identify_part(base_url, image_path):
    """Test identify part endpoint"""
    print(f"Testing identify-part with {image_path}...")
    
    if not os.path.exists(image_path):
        print(f"Image file not found: {image_path}")
        return False
    
    try:
        with open(image_path, 'rb') as f:
            files = {'image': (os.path.basename(image_path), f, 'image/jpeg')}
            data = {'confidence_threshold': '0.7'}
            response = requests.post(
                f"{base_url}/api/v1/identify-part",
                files=files,
                data=data
            )
        
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print("✅ Part identified successfully!")
            print(f"Response: {result}")
        else:
            print(f"❌ Error: {response.text}")
        
        return response.status_code == 200
    
    except Exception as e:
        print(f"Error: {e}")
        return False

def create_test_image():
    """Create a test image"""
    img = Image.new('RGB', (640, 480), color='red')
    temp_file = os.path.join(os.path.dirname(__file__), 'test_data', 'test_cli.jpg')
    os.makedirs(os.path.dirname(temp_file), exist_ok=True)
    img.save(temp_file, 'JPEG', quality=85)
    return temp_file

def main():
    parser = argparse.ArgumentParser(description='Almona API CLI Test')
    parser.add_argument('--base-url', default='http://localhost:8000', help='Base URL for API')
    parser.add_argument('--image', help='Path to test image')
    parser.add_argument('--test', choices=['health', 'identify', 'all'], default='all', help='Test to run')
    
    args = parser.parse_args()
    
    print("Almona API CLI Test")
    print("=" * 50)
    
    success = True
    
    if args.test in ['health', 'all']:
        success &= test_health(args.base_url)
    
    if args.test in ['identify', 'all']:
        image_path = args.image or create_test_image()
        success &= test_identify_part(args.base_url, image_path)
    
    print("\n" + "=" * 50)
    if success:
        print("✅ All tests passed!")
        return 0
    else:
        print("❌ Some tests failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())
