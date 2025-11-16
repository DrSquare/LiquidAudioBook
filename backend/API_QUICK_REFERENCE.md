# Audiobook Generator API - Quick Reference

## Overview

The Flask API provides **2 simple endpoints** to create audiobooks from book page images:

1. **Extract text** from images
2. **Generate complete audiobook** (audio + combination in one step)

## Quick Start

```bash
# Start server
uv run python -m audiobook_generator.api
```

Server runs on `http://localhost:5001`

## API Summary

### 1. Extract Text (Phase 1)

**POST** `/api/extract-text`

Extract text from book page images.

**Request (Directory mode):**
```json
{
  "directory": "/path/to/book/pages",
  "book_id": "my-book"
}
```

**Request (Upload mode):**
```bash
curl -X POST http://localhost:5001/api/extract-text \
  -F "pages=@page1.jpg" \
  -F "pages=@page2.jpg" \
  -F "book_id=my-book"
```

**Response:**
```json
{
  "status": "success",
  "book_id": "my-book",
  "csv_path": "./uploads/my-book/pages.csv",
  "total_pages": 20
}
```

---

### 2. Generate Audiobook (Phase 2)

**POST** `/api/generate-audiobook`

Generate complete audiobook from extracted text. Does both:
- ✓ Generates individual audio files for each page
- ✓ Combines them into a single audiobook file

**Request:**
```json
{
  "book_id": "my-book",
  "silence_duration": 1.5
}
```

**Response:**
```json
{
  "status": "success",
  "audio_files_generated": 20,
  "audiobook_path": "./uploads/my-book/audiobook.wav",
  "file_size_mb": 15.42,
  "silence_duration": 1.5
}
```

---

### 3. Download Audiobook

**GET** `/api/download/<book_id>/audiobook`

Download the completed audiobook file.

```bash
curl http://localhost:5001/api/download/my-book/audiobook --output my-book.wav
```

---

## Complete Example

```bash
# Step 1: Configure models (optional if using env vars)
curl -X POST http://localhost:5001/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "extractor_model": "hf.co/LiquidAI/LFM2-1.2B-Extract-GGUF:F16",
    "image_model": "hf.co/LiquidAI/LFM2-VL-3B-GGUF:F16",
    "audio_model": "./lfm2-audio-1.5b-f16.gguf",
    "audio_mmproj": "./mmproj-model-f16.gguf",
    "audio_decoder": "./audiodecoder-model-f16.gguf"
  }'

# Step 2: Extract text
curl -X POST http://localhost:5001/api/extract-text \
  -H "Content-Type: application/json" \
  -d '{"directory": "/path/to/book/pages", "book_id": "alice"}'

# Step 3: Generate audiobook
curl -X POST http://localhost:5001/api/generate-audiobook \
  -H "Content-Type: application/json" \
  -d '{"book_id": "alice", "silence_duration": 1.5}'

# Step 4: Download
curl http://localhost:5001/api/download/alice/audiobook --output alice.wav
```

---

## Python Client

```python
import requests

API = "http://localhost:5001/api"

# Extract text
requests.post(f"{API}/extract-text", json={
    "directory": "/path/to/pages",
    "book_id": "my-book"
})

# Generate audiobook
requests.post(f"{API}/generate-audiobook", json={
    "book_id": "my-book",
    "silence_duration": 1.5
})

# Download
response = requests.get(f"{API}/download/my-book/audiobook")
with open("audiobook.wav", "wb") as f:
    f.write(response.content)
```

---

## Configuration

### Environment Variables

```bash
export EXTRACTOR_MODEL="hf.co/LiquidAI/LFM2-1.2B-Extract-GGUF:F16"
export IMAGE_MODEL="hf.co/LiquidAI/LFM2-VL-3B-GGUF:F16"
export AUDIO_MODEL="./lfm2-audio-1.5b-f16.gguf"
export AUDIO_MMPROJ="./mmproj-model-f16.gguf"
export AUDIO_DECODER="./audiodecoder-model-f16.gguf"
export PORT=5001  # default: 5001
```

---

## Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/config` | POST | Configure models |
| `/api/extract-text` | POST | Extract text from images |
| `/api/generate-audiobook` | POST | Generate complete audiobook |
| `/api/download/<book_id>/audiobook` | GET | Download audiobook file |

---

## Key Features

✓ **Simplified workflow** - Only 2 main endpoints instead of 3
✓ **Automatic combination** - Audio files are automatically combined
✓ **Flexible input** - Upload files or process existing directories
✓ **Book tracking** - Use `book_id` to manage multiple books
✓ **Configurable silence** - Control pause duration between pages
✓ **File size reporting** - Get size in both bytes and MB

---

For detailed documentation, see [FLASK_API_GUIDE.md](FLASK_API_GUIDE.md)
