#!/usr/bin/env python3
"""
Test script for Flask API endpoints.
Tests all three main endpoints: text extraction, audio generation, and audiobook combination.
"""

import time
from pathlib import Path

import requests


API_BASE = "http://localhost:5001/api"


def test_health_check():
    """Test the health check endpoint."""
    print("\n=== Testing Health Check ===")
    response = requests.get(f"{API_BASE}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.status_code == 200


def test_configure_models():
    """Test model configuration."""
    print("\n=== Testing Model Configuration ===")

    config = {
        "extractor_model": "hf.co/LiquidAI/LFM2-1.2B-Extract-GGUF:F16",
        "image_model": "hf.co/LiquidAI/LFM2-VL-3B-GGUF:F16",
        "audio_model": str(Path.cwd() / "lfm2-audio-1.5b-f16.gguf"),
        "audio_mmproj": str(Path.cwd() / "mmproj-model-f16.gguf"),
        "audio_decoder": str(Path.cwd() / "audiodecoder-model-f16.gguf"),
        "voice_description": "A clear, neutral narrator voice"
    }

    response = requests.post(f"{API_BASE}/config", json=config)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.status_code == 200


def test_extract_text_directory():
    """Test text extraction from existing directory."""
    print("\n=== Testing Text Extraction (Directory Mode) ===")

    # Use the test directory with Alice pages
    test_dir = Path.cwd() / "invoices" / "alice_test"

    if not test_dir.exists():
        print(f"Warning: Test directory {test_dir} not found. Skipping this test.")
        return True

    payload = {
        "directory": str(test_dir),
        "book_id": "alice-test-api"
    }

    print(f"Processing directory: {test_dir}")
    start_time = time.time()

    response = requests.post(
        f"{API_BASE}/extract-text",
        json=payload
    )

    elapsed = time.time() - start_time

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Processed files: {result.get('processed_files')}")
        print(f"Total pages: {result.get('total_pages')}")
        print(f"CSV path: {result.get('csv_path')}")
        print(f"Time elapsed: {elapsed:.2f}s")
        return True
    else:
        print(f"Error: {response.json()}")
        return False


def test_extract_text_upload():
    """Test text extraction with file upload."""
    print("\n=== Testing Text Extraction (Upload Mode) ===")

    # Find test image files
    test_dir = Path.cwd() / "invoices" / "alice_test"

    if not test_dir.exists():
        print(f"Warning: Test directory {test_dir} not found. Skipping this test.")
        return True

    image_files = list(test_dir.glob("*.jpg")) + list(test_dir.glob("*.png"))

    if not image_files:
        print("Warning: No test images found. Skipping this test.")
        return True

    # Upload first 2 images
    files = []
    for img_path in image_files[:2]:
        files.append(('pages', (img_path.name, open(img_path, 'rb'), 'image/jpeg')))

    data = {'book_id': 'alice-upload-test'}

    print(f"Uploading {len(files)} images...")
    start_time = time.time()

    response = requests.post(
        f"{API_BASE}/extract-text",
        files=files,
        data=data
    )

    elapsed = time.time() - start_time

    # Close file handles
    for _, file_tuple in files:
        file_tuple[1].close()

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Book ID: {result.get('book_id')}")
        print(f"Total pages: {result.get('total_pages')}")
        print(f"CSV path: {result.get('csv_path')}")
        print(f"Results: {result.get('results')}")
        print(f"Time elapsed: {elapsed:.2f}s")
        return True
    else:
        print(f"Error: {response.json()}")
        return False


def test_generate_audiobook():
    """Test complete audiobook generation."""
    print("\n=== Testing Complete Audiobook Generation ===")

    payload = {
        "book_id": "alice-test-api",
        "silence_duration": 1.5
    }

    print("Generating complete audiobook (audio files + combination)...")
    start_time = time.time()

    response = requests.post(
        f"{API_BASE}/generate-audiobook",
        json=payload
    )

    elapsed = time.time() - start_time

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Audio files generated: {result.get('audio_files_generated')}")
        print(f"Audiobook path: {result.get('audiobook_path')}")
        print(f"File size: {result.get('file_size_mb')} MB")
        print(f"Silence duration: {result.get('silence_duration')}s")
        print(f"Time elapsed: {elapsed:.2f}s")
        return True
    else:
        print(f"Error: {response.json()}")
        return False


def test_download_audiobook():
    """Test audiobook download."""
    print("\n=== Testing Audiobook Download ===")

    output_file = Path.cwd() / "test_downloaded_audiobook.wav"

    print(f"Downloading audiobook to: {output_file}")
    response = requests.get(f"{API_BASE}/download/alice-test-api/audiobook")

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        with open(output_file, 'wb') as f:
            f.write(response.content)
        file_size = output_file.stat().st_size
        print(f"Downloaded successfully: {file_size} bytes ({file_size / 1024 / 1024:.2f} MB)")
        return True
    else:
        print(f"Error: {response.json() if response.headers.get('content-type') == 'application/json' else response.text}")
        return False


def main():
    """Run all tests."""
    print("=" * 60)
    print("Flask API Test Suite")
    print("=" * 60)
    print("\nMake sure the Flask server is running:")
    print("  uv run python -m audiobook_generator.api")
    print("\n" + "=" * 60)

    tests = [
        ("Health Check", test_health_check),
        ("Configure Models", test_configure_models),
        ("Extract Text (Directory)", test_extract_text_directory),
        # ("Extract Text (Upload)", test_extract_text_upload),  # Optional, can be slow
        ("Generate Audiobook", test_generate_audiobook),
        ("Download Audiobook", test_download_audiobook),
    ]

    results = {}

    for test_name, test_func in tests:
        try:
            success = test_func()
            results[test_name] = "✓ PASSED" if success else "✗ FAILED"
        except requests.exceptions.ConnectionError:
            print(f"\n✗ ERROR: Cannot connect to API server. Is it running?")
            results[test_name] = "✗ CONNECTION ERROR"
            break
        except Exception as e:
            print(f"\n✗ ERROR: {e}")
            results[test_name] = f"✗ ERROR: {e}"

        # Small delay between tests
        time.sleep(1)

    # Print summary
    print("\n" + "=" * 60)
    print("Test Results Summary")
    print("=" * 60)
    for test_name, result in results.items():
        print(f"{test_name:40} {result}")
    print("=" * 60)


if __name__ == "__main__":
    main()
