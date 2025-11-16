# Product Requirements Document (PRD) - MVP Edition
# LiquidAudio Reader: Hackathon MVP

**Document Version:** 3.0 (MVP with Ollama + LFM Implementation)
**Date:** November 15, 2025
**Product Name:** LiquidAudio Reader MVP
**Platform:** Windows Desktop
**Duration:** Hackathon (48 hours)
**ML Stack:** Ollama + Open-Source LFM (Large Foundation Models)

---

## 1. Executive Summary

LiquidAudio Reader MVP is a simple Windows desktop application that converts image sequences of book pages into audiobooks. Users upload images from a book (one image per page), the app extracts and refines text using open-source LFM models running locally via Ollama, and generates audio narration using pyttsx3 TTS.

### Core Value Proposition
- Convert book page images to audiobook in 3 steps: upload → extract → listen
- Two-stage text processing for high-quality extraction using local LFM models
- High-quality audio synthesis with local TTS
- Fully local, no external API dependencies
- Minimal, focused user interface
- Privacy-first: All processing happens locally

---

## 2. Product Overview

### 2.1 What It Does
Users photograph or scan pages from a book, upload the image sequence to the app. The app automatically:
1. Extracts text from images using vision model
2. Refines extracted text using text extraction model
3. Converts refined text to audio

### 2.2 Target Users
- Students wanting to listen to textbooks
- Readers converting physical books to audio format
- Anyone preferring audio content
- Users who prefer local-only processing (privacy-conscious)

### 2.3 Core Features (MVP Only)
1. **Image Upload** - Upload multiple book page images (JPG, PNG)
2. **Text Extraction** - Extract text from images using LFM2-VL-3B vision-language model via Ollama
3. **Text Refinement** - Refine extracted text using LFM2-1.2B-Extract model via Ollama
4. **Text-to-Speech** - Convert refined text to audio using pyttsx3 (with LFM2-Audio-1.5B model integration pending)
5. **Audio Playback** - Play generated audio with basic controls (play/pause/stop)
6. **Audio Download** - Save audio file locally

---

## 3. User Story

**As a** student
**I want to** upload images of book pages and get audio narration
**So that** I can listen to the book content

**Acceptance Criteria:**
- User can select and upload multiple image files
- App extracts text from all images in sequence
- App refines extracted text for better quality
- Generated audio plays in the app
- User can download the audio file

---

## 4. Functional Requirements

### 4.1 Input
- **FR-001:** Accept JPG and PNG image uploads (max 5MB per image, up to 50 images)
- **FR-002:** Validate image format before processing

### 4.2 Text Extraction (Two-Stage)
- **FR-003:** Extract text from images using LFM2-VL-3B vision-language model (Ollama) - 3B parameters, 3.5GB model size
- **FR-004:** Refine extracted text using LFM2-1.2B-Extract model (Ollama) - 1.2B parameters, 1.5GB model size
- **FR-005:** Process images sequentially, preserving order
- **FR-006:** Combine refined text from all images into single document

### 4.3 Audio Generation
- **FR-007:** Convert refined text to speech using pyttsx3 TTS engine (LFM2-Audio-1.5B Ollama integration planned for post-MVP)
- **FR-008:** Show progress during entire conversion process

### 4.4 Playback
- **FR-009:** Play audio with play/pause/stop controls
- **FR-010:** Show current playback position and total duration
- **FR-011:** Allow seeking to any position in audio

### 4.5 Export
- **FR-012:** Download generated audio as MP3 file

---

## 5. Technical Requirements

### 5.1 Frontend
- **Framework:** React (desktop) using Electron or similar
- **Language:** TypeScript
- **UI Library:** React + Tailwind CSS or Material UI
- **Audio Player:** HTML5 audio player or react-audio-player
- **State Management:** React Context or simple useState

### 5.2 Backend (ML Service)
- **Framework:** Python Flask (microservice architecture)
- **LFM2 Model Integration:** Ollama server with LFM2-VL-3B (vision), LFM2-1.2B-Extract (text refinement)
  - Vision Model: LFM2-VL-3B-GGUF:F16 (3.5GB)
  - Text Model: LFM2-1.2B-Extract-GGUF:F16 (1.5GB)
  - Audio Model: LFM2-Audio-1.5B-GGUF:F16 (pending, 2GB)
- **Ollama Configuration:** Local inference server on port 11434
- **TTS Engine:** pyttsx3 for speech synthesis
- **Image Processing:** Pillow for image validation and base64 encoding
- **Processing Architecture:** Sequential pipeline with model status monitoring

### 5.3 System Requirements
- Windows 10/11 (64-bit)
- Minimum 16GB RAM (for LFM2 models: 3.5GB + 1.5GB + overhead)
- Optional: NVIDIA GPU with CUDA support for faster inference
- Ollama server installed and running on localhost:11434

---

## 6. System Architecture (Simplified)

```
┌─────────────────────────────────────┐
│   React Frontend (Port 5000)         │
│  • Image Upload Interface           │
│  • Progress Tracking                │
│  • Audio Player with Controls       │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│   Express Backend (Port 5000)        │
│  • HTTP request routing             │
│  • File upload handling             │
│  • Job state management             │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│   Flask ML Service (Port 5001)       │
│  • Image validation                 │
│  • Ollama API orchestration         │
│  • TTS audio generation             │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│   Ollama Server (Port 11434)         │
│  • LFM2-VL-3B (vision-language)     │
│  • LFM2-1.2B-Extract (text)         │
│  • LFM2-Audio-1.5B (TTS - pending)  │
└─────────────────────────────────────┘
```

---

## 7. Processing Pipeline

```
Upload Images (JPG/PNG)
     ↓
[Image 1] ─→ LFM2-VL-3B (Ollama) → Raw Text 1
[Image 2] ─→ LFM2-VL-3B (Ollama) → Raw Text 2
[Image 3] ─→ LFM2-VL-3B (Ollama) → Raw Text 3
     ↓
Combine All Raw Texts
     ↓
LFM2-1.2B-Extract (Ollama) → Refined Text
     ↓
pyttsx3 TTS Engine → MP3 Audio File
     ↓
User Plays/Downloads Audio
```

**Model Processing Details:**
- **Stage 1 (Vision):** LFM2-VL-3B processes each image sequentially (~30-60s per image)
- **Stage 2 (Refinement):** LFM2-1.2B-Extract refines combined text (~20-40s for 5 pages)
- **Stage 3 (Audio):** pyttsx3 converts text to speech (~30-60s for 5 min of audio)

---

## 8. Non-Functional Requirements

| Requirement | Target | Notes |
|---|---|---|
| Vision extraction per image (LFM2-VL-3B) | 30-60 seconds | CPU-dependent, ~3.5GB model |
| Text refinement (full document, LFM2-1.2B) | 20-40 seconds | ~1.5GB model, varies with text length |
| TTS generation (1000 words) | 30-60 seconds | pyttsx3 local synthesis |
| Total pipeline (5 pages) | 3-7 minutes | End-to-end typical workflow |
| UI responsiveness | < 500ms | Real-time progress updates |
| Supported image sizes | Up to 5MB per image | JPG/PNG formats |
| Max total images | 50 images per session | Memory-dependent |

---

## 8.5 LFM2 Model Specifications

### LFM2-VL-3B (Vision-Language Model)
- **Purpose:** Extract text from book page images
- **Model Size:** 3 Billion parameters
- **File Size:** ~3.5GB (GGUF F16 format)
- **Input:** JPG/PNG images (base64 encoded)
- **Output:** Extracted raw text from image
- **Source:** Hugging Face - `LiquidAI/LFM2-VL-3B-GGUF:F16`

### LFM2-1.2B-Extract (Text Refinement Model)
- **Purpose:** Refine and clean extracted text for better readability
- **Model Size:** 1.2 Billion parameters
- **File Size:** ~1.5GB (GGUF F16 format)
- **Input:** Combined raw text from all images
- **Output:** Refined, structured text
- **Source:** Hugging Face - `LiquidAI/LFM2-1.2B-Extract-GGUF:F16`

### LFM2-Audio-1.5B (Text-to-Speech Model - Pending)
- **Purpose:** High-quality audio synthesis from text
- **Model Size:** 1.5 Billion parameters
- **Components:**
  - Audio Model: ~1.5GB
  - MMProj (multimodal projector): ~0.3GB
  - Audio Decoder: ~0.2GB
- **Total Size:** ~2GB
- **Status:** Integration planned for post-MVP release
- **Current Fallback:** pyttsx3 TTS engine (Windows native)

---

## 9. Out of Scope (Not for MVP)

- ❌ PDF input
- ❌ URL input
- ❌ Multiple voice options
- ❌ Speed/pitch adjustment
- ❌ Text editing interface
- ❌ User authentication
- ❌ Cloud storage
- ❌ Bookmarks/resume functionality
- ❌ Batch processing optimization
- ❌ Mobile version

---

## 10. Success Criteria

MVP is successful if:
1. Users can upload book page images
2. Text is extracted using vision model
3. Extracted text is refined using text extraction model
4. Audio is generated from refined text and plays without errors
5. Audio can be downloaded as MP3
6. Entire flow (upload to audio) works end-to-end

---

## 11. Deliverables

- Working Windows desktop app
- Image upload interface
- Vision model text extraction
- Text extraction model refinement
- TTS audio generation
- Functional audio player
- Audio download capability
- Basic error handling

---

## 12. Next Phase (Post-MVP Roadmap)

### Planned Enhancements
1. **LFM2-Audio-1.5B Integration** - Replace pyttsx3 with native LFM2 TTS model for superior audio quality
2. **GPU Acceleration** - NVIDIA CUDA support for 2-3x faster processing
3. **Batch Processing** - Parallel image processing instead of sequential
4. **Model Caching** - Keep models in memory after first use
5. **Advanced UI** - Text preview and editing before audio generation
6. **PDF Support** - Convert PDF pages to images internally
7. **Voice Selection** - Multiple voice profiles for LFM2-Audio model
8. **Speed/Pitch Control** - Audio playback customization

---

**End of MVP PRD**
**Last Updated:** November 16, 2025
**Status:** Updated with LFM2 model specifications and Ollama architecture
