# LiquidAudio Reader - Architecture & API Documentation
## LFM2 Large Foundation Models Implementation

**Version:** 3.0 - LFM2 Implementation
**Date:** November 15, 2025
**Models:** Liquid AI LFM2 Series

---

## 1. System Architecture

### 1.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     REACT FRONTEND (Port 5000)                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  User Interface Layer                     │   │
│  │  • Image Upload (JPG, PNG - max 50 images, 5MB each)    │   │
│  │  • Real-time Progress Display (3 stages)                │   │
│  │  • Audio Player (play/pause/stop/seek)                  │   │
│  │  • Download Audio as MP3                                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────┬──────────────────────────────────────────────┘
                  │ HTTP/REST (port 5000)
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│               EXPRESS.JS BACKEND (Port 5000)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  API Routes & Orchestration Layer                        │   │
│  │  ✓ POST /api/extract-text                               │   │
│  │  ✓ POST /api/refine-text                                │   │
│  │  ✓ POST /api/generate-audio                             │   │
│  │  ✓ GET /api/jobs/:jobId                                 │   │
│  │  ✓ GET /api/audio/:jobId                                │   │
│  │  ✓ GET /api/models/status                               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────┬──────────────────────────────────────────────┘
                  │ HTTP/REST (port 5001)
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│             FLASK BACKEND - ML SERVICE (Port 5001)               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Service Layer with LFM2 Model Integration               │   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │ Image Text Extraction Service                      │ │   │
│  │  │ Model: LFM2-VL-3B (Vision/Language)               │ │   │
│  │  │ Task: Extract text from book page images          │ │   │
│  │  │ Input: Image bytes (JPG/PNG)                      │ │   │
│  │  │ Output: Raw extracted text per page               │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │ Text Refinement/Extraction Service                │ │   │
│  │  │ Model: LFM2-1.2B-Extract (Language)              │ │   │
│  │  │ Task: Clean, refine, and enhance text            │ │   │
│  │  │ Input: Raw OCR text from all pages               │ │   │
│  │  │ Output: Refined, high-quality text               │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │ Audio Generation Service                           │ │   │
│  │  │ Models: LFM2-Audio-1.5B + MMProj + Decoder       │ │   │
│  │  │ Task: Generate natural speech from text           │ │   │
│  │  │ Input: Refined text                               │ │   │
│  │  │ Output: MP3 audio file                            │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │ Image Processor Service                            │ │   │
│  │  │ Task: Validate image format, size, metadata       │ │   │
│  │  │ Input: Image bytes                                │ │   │
│  │  │ Output: Validation result + image info            │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────┬──────────────────────────────────────────────┘
                  │ GGUF Model Loading
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│         LIQUID AI LFM2 MODELS (Local - GGUF Format)              │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ LFM2-VL-3B (Vision-Language)                            │   │
│  │ Size: ~3.5GB (F16)                                      │   │
│  │ Type: Multimodal Vision + Language Model               │   │
│  │ Purpose: Extract text from images                      │   │
│  │ Location: ~/models/LFM2-VL-3B-GGUF:F16               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ LFM2-1.2B-Extract (Language)                            │   │
│  │ Size: ~1.5GB (F16)                                      │   │
│  │ Type: Text-only Language Model                         │   │
│  │ Purpose: Text refinement and extraction                │   │
│  │ Location: ~/models/LFM2-1.2B-Extract-GGUF:F16         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ LFM2-Audio-1.5B (Audio Synthesis)                       │   │
│  │ Size: ~2GB (F16)                                        │   │
│  │ Type: Text-to-Speech Model                             │   │
│  │ Components:                                             │   │
│  │   • Audio Model: Core TTS (1.5B)                       │   │
│  │   • MMProj: Multimodal Projection Layer                │   │
│  │   • Audio Decoder: Vocoder for audio synthesis         │   │
│  │ Purpose: Generate natural speech audio from text       │   │
│  │ Location: ~/models/lfm2-audio-*.gguf                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Storage Layer:
└─ Job Database (In-Memory or PostgreSQL)
   ├─ audiobook_jobs (Job tracking)
   ├─ job_images (Image metadata)
   └─ audio_files (Generated audio references)
```

---

## 2. Processing Pipeline Flow

### 2.1 Complete Processing Flow

```
USER UPLOADS IMAGES (5 pages, book chapter)
                │
                ▼
    ┌───────────────────────────────┐
    │ STAGE 1: TEXT EXTRACTION      │
    │ (LFM2-VL-3B Vision Model)    │
    │ ~60 seconds per image         │
    └───────────────────────────────┘
                │
    ┌───────────┴───────────┐
    │                       │
Page 1 Image           Page 2 Image
    │                       │
    ▼ Extract Text         ▼ Extract Text
    │                       │
 "Chapter 1        "The quick brown
  begins with      fox jumps over
  an introduction  the lazy dog..."
  of key concepts.
  In this section"                │
                │               │
                └─────┬─────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │ COMBINE EXTRACTED TEXTS     │
        │ All 5 pages → Single block  │
        └─────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │ STAGE 2: TEXT REFINEMENT    │
        │ (LFM2-1.2B-Extract Model)   │
        │ ~30-40 seconds total        │
        └─────────────────────────────┘
                      │
        ┌─────────────────────────────────┐
        │ REFINED TEXT OUTPUT:            │
        │ - Fixed OCR errors              │
        │ - Corrected grammar             │
        │ - Enhanced punctuation          │
        │ - Improved readability          │
        │ - Consistent formatting         │
        └─────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │ STAGE 3: AUDIO GENERATION   │
        │ (LFM2-Audio-1.5B TTS Model) │
        │ ~60-120 seconds (5 min text)│
        └─────────────────────────────┘
                      │
        ┌─────────────────────────────────┐
        │ GENERATED AUDIO:                │
        │ - MP3 format                    │
        │ - Natural speech synthesis      │
        │ - Proper pacing & intonation    │
        │ - ~100-150 words per minute     │
        └─────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │ AUDIO READY FOR PLAYBACK    │
        │ User can:                   │
        │ • Play with controls        │
        │ • Seek to any position      │
        │ • Download as MP3           │
        └─────────────────────────────┘

Total Time for 5-page chapter: ~5-8 minutes
```

---

## 3. API Endpoints & Data Contracts

### 3.1 Express Backend → Flask Backend Communication

```
EXPRESS BACKEND (Port 5000)
    │
    ├─── POST /api/extract-text
    │    └─→ Calls: POST localhost:5001/api/extract-text
    │
    ├─── POST /api/refine-text
    │    └─→ Calls: POST localhost:5001/api/refine-text
    │
    ├─── POST /api/generate-audio
    │    └─→ Calls: POST localhost:5001/api/generate-audio
    │
    └─── GET /api/models/status
         └─→ Calls: GET localhost:5001/api/status
```

### 3.2 Flask API Endpoint Details

#### Endpoint 1: Extract Text from Images
```
POST /api/extract-text

REQUEST:
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "images": [
    "base64_encoded_image_1",
    "base64_encoded_image_2",
    "base64_encoded_image_3"
  ]
}

RESPONSE (200 OK):
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "extractedTexts": [
    {
      "pageNumber": 1,
      "text": "Chapter One: Introduction to Large Language Models...",
      "confidence": 0.94,
      "processingTimeMs": 58000
    },
    {
      "pageNumber": 2,
      "text": "In recent years, the field of Natural Language Processing...",
      "confidence": 0.92,
      "processingTimeMs": 61000
    },
    {
      "pageNumber": 3,
      "text": "These models have demonstrated remarkable capabilities...",
      "confidence": 0.89,
      "processingTimeMs": 59000
    }
  ],
  "totalPages": 3,
  "totalProcessingTimeMs": 178000,
  "timestamp": "2025-11-15T23:45:00.000Z"
}

ERROR RESPONSE (503):
{
  "error": "Ollama server not available",
  "message": "Cannot connect to model at localhost:11434",
  "timestamp": "2025-11-15T23:45:00.000Z"
}
```

#### Endpoint 2: Refine Extracted Text
```
POST /api/refine-text

REQUEST:
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "extractedTexts": [
    "Chapter One: Introduction to Large Language Models...",
    "In recent years, the field of Natural Language Processing..."
  ],
  "refinementInstructions": "Fix OCR errors and improve clarity"
}

RESPONSE (200 OK):
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "refinedText": "Chapter One: Introduction to Large Language Models\n\nIn recent years, the field of Natural Language Processing has undergone remarkable transformations...",
  "processingTimeMs": 35000,
  "characterCount": 12450,
  "wordCount": 2100,
  "timestamp": "2025-11-15T23:46:00.000Z"
}
```

#### Endpoint 3: Generate Audio
```
POST /api/generate-audio

REQUEST:
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "text": "Chapter One: Introduction to Large Language Models. In recent years...",
  "voice": "default",
  "rate": 150
}

RESPONSE (200 OK):
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "audioData": "SUQzBAAAI...base64_encoded_mp3_data...",
  "durationMs": 480000,
  "mimeType": "audio/mpeg",
  "processingTimeMs": 95000,
  "timestamp": "2025-11-15T23:47:00.000Z"
}
```

#### Endpoint 4: Get System Status
```
GET /api/status

RESPONSE (200 OK):
{
  "status": "ready",
  "ollama": {
    "isRunning": true,
    "baseUrl": "http://localhost:11434"
  },
  "models": {
    "vision": {
      "name": "LFM2-VL-3B",
      "loaded": true,
      "type": "Vision-Language",
      "sizeGb": 3.5,
      "memoryRequiredGb": 8
    },
    "extractor": {
      "name": "LFM2-1.2B-Extract",
      "loaded": true,
      "type": "Language",
      "sizeGb": 1.5,
      "memoryRequiredGb": 4
    },
    "audio": {
      "name": "LFM2-Audio-1.5B",
      "loaded": true,
      "type": "Text-to-Speech",
      "components": ["audio_model", "mmproj", "decoder"],
      "totalSizeGb": 2.0,
      "memoryRequiredGb": 5
    }
  },
  "systemInfo": {
    "totalMemoryGb": 16,
    "availableMemoryGb": 8,
    "gpuAvailable": true,
    "gpuMemoryGb": 8
  },
  "timestamp": "2025-11-15T23:45:00.000Z"
}
```

---

## 4. Model Specifications

### 4.1 LFM2-VL-3B (Vision-Language Model)

| Property | Value |
|----------|-------|
| **Model Name** | LFM2-VL-3B |
| **Type** | Vision-Language (Multimodal) |
| **Base Architecture** | LLaVA-style (Vision + Language) |
| **Parameters** | 3 Billion |
| **Quantization** | F16 (Float16) |
| **Size (Disk)** | ~3.5 GB |
| **Size (Memory)** | ~7-8 GB when loaded |
| **Input** | Images (JPG, PNG, WebP) |
| **Output** | Extracted text from image |
| **Processing Time** | 30-60 seconds per image |
| **Accuracy** | 85-95% on book pages (varies by quality) |
| **Task** | Image-to-Text Extraction (OCR++) |
| **Download** | `huggingface.co/LiquidAI/LFM2-VL-3B-GGUF` |

### 4.2 LFM2-1.2B-Extract (Text Extraction Model)

| Property | Value |
|----------|-------|
| **Model Name** | LFM2-1.2B-Extract |
| **Type** | Language Model (Text-only) |
| **Base Architecture** | Transformer |
| **Parameters** | 1.2 Billion |
| **Quantization** | F16 (Float16) |
| **Size (Disk)** | ~1.5 GB |
| **Size (Memory)** | ~3-4 GB when loaded |
| **Input** | Raw extracted text |
| **Output** | Refined, cleaned text |
| **Processing Time** | 20-40 seconds for 2000 words |
| **Task** | Text Refinement & Extraction |
| **Specialization** | OCR error correction, grammar, clarity |
| **Download** | `huggingface.co/LiquidAI/LFM2-1.2B-Extract-GGUF` |

### 4.3 LFM2-Audio-1.5B (Text-to-Speech Model)

| Property | Value |
|----------|-------|
| **Model Name** | LFM2-Audio-1.5B |
| **Type** | Text-to-Speech (Audio Synthesis) |
| **Components** | 3 (Audio Model + MMProj + Decoder) |
| **Base Architecture** | Transformer + Vocoder |
| **Parameters** | 1.5 Billion (audio model) |
| **Quantization** | F16 (Float16) |
| **Total Size** | ~2.0-2.5 GB |
| **Memory Required** | ~5-6 GB when loaded |
| **Input** | Text (any language) |
| **Output** | MP3 audio file |
| **Audio Format** | MP3 @ 44.1kHz, 128kbps |
| **Speaking Rate** | 120-180 WPM (configurable) |
| **Naturalness** | High quality, natural intonation |
| **Processing Time** | ~60-120 seconds for 5-minute content |
| **Task** | Text-to-Speech Synthesis |
| **Voice Style** | Professional, clear narration |

---

## 5. System Requirements

### 5.1 Hardware Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|------------|
| **CPU** | Intel i5/Ryzen 5 (4 cores) | Intel i7/Ryzen 7 (8+ cores) |
| **RAM** | 16 GB | 32 GB |
| **GPU (Optional)** | - | NVIDIA RTX 3060 (12GB) or better |
| **Disk Space** | 20 GB free | 50 GB free |
| **SSD** | Required | Strongly recommended |

### 5.2 Software Requirements

| Component | Version |
|-----------|---------|
| **Windows** | 10 (21H2) or 11 |
| **Python** | 3.8+ |
| **Node.js** | 18+ |
| **Ollama** | Latest (models via GGUF) |

---

## 6. Performance Expectations

### 6.1 Processing Times by Operation

| Operation | Time | Model | Notes |
|-----------|------|-------|-------|
| Load vision model | 30-60s | LFM2-VL-3B | One-time on startup |
| Extract text (1 image) | 30-60s | LFM2-VL-3B | Quality book pages |
| Extract text (5 images) | 150-300s | LFM2-VL-3B | Sequential processing |
| Refine text (5 pages/2K words) | 20-40s | LFM2-1.2B | Parallel processing ready |
| Generate audio (5 min read) | 60-120s | LFM2-Audio-1.5B | Quality MP3 output |
| **Total (5-page chapter)** | **5-8 min** | **All models** | **Typical workflow** |

### 6.2 With GPU Acceleration

If NVIDIA GPU available (RTX 3060+ with CUDA):
- Vision extraction: 15-30s per image (2x faster)
- Text refinement: 10-20s (2-3x faster)
- Audio generation: 30-60s (1.5-2x faster)
- **Total: 2-4 minutes for typical workflow**

---

## 7. Error Handling & Status Codes

| Code | Scenario | Solution |
|------|----------|----------|
| **200** | Success | Processing completed |
| **400** | Bad request | Check input format/size |
| **503** | Service unavailable | Start Ollama: `ollama serve` |
| **504** | Timeout | Increase OLLAMA_TIMEOUT or reduce batch size |
| **507** | Out of memory | Close apps or use smaller models |

---

## 8. Model Download & Setup

### 8.1 Download Models from Hugging Face

```bash
# Vision Model
huggingface-cli download LiquidAI/LFM2-VL-3B-GGUF --repo-type model

# Text Extraction Model
huggingface-cli download LiquidAI/LFM2-1.2B-Extract-GGUF --repo-type model

# Audio Models (if not using Ollama)
huggingface-cli download LiquidAI/LFM2-Audio-1.5B-GGUF --repo-type model
```

### 8.2 Configure Environment

```bash
# backend/.env
IMAGE_MODEL_PATH=hf.co/LiquidAI/LFM2-VL-3B-GGUF:F16
EXTRACTOR_MODEL_PATH=hf.co/LiquidAI/LFM2-1.2B-Extract-GGUF:F16
AUDIO_MODEL_PATH=/path/to/lfm2-audio-1.5b-f16.gguf
```

---

## 9. Integration Points

### 9.1 Frontend to Express Backend
- Port: 5000
- Protocol: HTTP/REST
- Format: JSON

### 9.2 Express Backend to Flask Backend
- Port: 5001
- Protocol: HTTP/REST
- Format: JSON with base64-encoded images/audio

### 9.3 Flask Backend to Models
- Format: GGUF (GPU-compatible quantized format)
- Loading: Via Ollama or direct inference
- Memory: 15-20 GB total for all models

