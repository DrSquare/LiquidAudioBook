# Product Requirements Document (PRD) - MVP Edition
# LiquidAudio Reader: Hackathon MVP

**Document Version:** 2.0 (MVP Hackathon Edition)
**Date:** November 15, 2025
**Product Name:** LiquidAudio Reader MVP
**Platform:** Windows Desktop
**Duration:** Hackathon (48 hours)

---

## 1. Executive Summary

LiquidAudio Reader MVP is a simple Windows desktop application that converts image sequences of book pages into audiobooks. Users upload images from a book (one image per page), the app extracts and refines text using AI models, and generates audio narration using Liquid.ai's text-to-speech model.

### Core Value Proposition
- Convert book page images to audiobook in 3 steps: upload → extract → listen
- Two-stage text processing for high-quality extraction
- High-quality audio synthesis
- Minimal, focused user interface

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

### 2.3 Core Features (MVP Only)
1. **Image Upload** - Upload multiple book page images (JPG, PNG)
2. **Text Extraction** - Extract text from images using Liquid.ai vision model
3. **Text Refinement** - Process extracted text using Liquid.ai text extraction model
4. **Text-to-Speech** - Convert refined text to audio
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
- **FR-003:** Extract text from images using Liquid.ai vision model
- **FR-004:** Refine extracted text using Liquid.ai text extraction model
- **FR-005:** Process images sequentially, preserving order
- **FR-006:** Combine refined text from all images into single document

### 4.3 Audio Generation
- **FR-007:** Convert refined text to speech using Liquid.ai TTS model
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

### 5.2 Backend (Minimal)
- **Framework:** Python Flask
- **Liquid.ai Integration:** Use Liquid.ai SDK for vision + text extraction + TTS
- **Image Processing:** Pillow for image validation
- **Processing:** Simple sequential pipeline (no queue needed for MVP)

### 5.3 System Requirements
- Windows 10/11 (64-bit)
- Internet connection (for Liquid.ai API calls)
- Minimum 4GB RAM

---

## 6. System Architecture (Simplified)

```
┌──────────────────────────────────┐
│   User Interface Layer           │
│  (React/Electron Desktop App)    │
├──────────────────────────────────┤
│   • Image Upload Interface       │
│   • Progress Indicator           │
│   • Audio Player                 │
├──────────────────────────────────┤
│   Backend Service (Flask)        │
│  • Image validation              │
│  • Two-stage text processing     │
│  • Liquid.ai API orchestration   │
├──────────────────────────────────┤
│   Liquid.ai Models               │
│  • Vision Model (text from image)│
│  • Text Model (refinement)       │
│  • TTS Model (audio generation)  │
└──────────────────────────────────┘
```

---

## 7. Processing Pipeline

```
Upload Images
     ↓
[Image 1] → Vision Model → Raw Text 1
[Image 2] → Vision Model → Raw Text 2
[Image 3] → Vision Model → Raw Text 3
     ↓
Combine All Raw Text
     ↓
Text Extraction Model → Refined Text
     ↓
TTS Model → Audio File
     ↓
User Plays/Downloads Audio
```

---

## 8. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Vision extraction per image | < 2 seconds |
| Text refinement (full document) | < 3 seconds |
| TTS generation (1000 words) | < 5 seconds |
| UI responsiveness | < 500ms |
| Supported image sizes | Up to 5MB per image |
| Max total images | 50 images per session |

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

**End of MVP PRD**
