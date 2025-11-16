/**
 * Integration Tests for Express Routes with Flask Backend
 * Tests the full pipeline: Express → Flask → Response
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import express, { type Express } from "express";
import { registerRoutes } from "./routes";
import {
  startMockFlaskServer,
  stopMockFlaskServer,
} from "./services/mock-flask-server";
import type { Server } from "http";

describe("Express Routes Integration with Flask Backend", () => {
  let app: Express;
  let httpServer: Server;
  const mockFlaskPort = 5001;

  beforeAll(async () => {
    // Start mock Flask server
    await startMockFlaskServer(mockFlaskPort, false); // disable delay for tests

    // Create Express app and register routes
    app = express();
    httpServer = await registerRoutes(app);

    // Give servers time to start
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    // Clean up
    await stopMockFlaskServer();
    if (httpServer) {
      httpServer.close();
    }
  });

  describe("Health Check Endpoints", () => {
    it("should return health status including Flask service status", async () => {
      const response = await fetch("http://localhost:3000/api/health");
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("status");
      expect(data).toHaveProperty("services");
      expect(data.services).toHaveProperty("express");
    });

    it("should return Flask ML service status", async () => {
      const response = await fetch("http://localhost:3000/api/flask-status");
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("status");
      expect(data).toHaveProperty("ollama");
    });
  });

  describe("Text Extraction Endpoint", () => {
    it("should extract text from uploaded images", async () => {
      // Create mock FormData with file
      const formData = new FormData();
      const mockImage = new Blob(["fake image data"], { type: "image/jpeg" });
      formData.append("images", mockImage, "test.jpg");

      const response = await fetch("http://localhost:3000/api/extract-text", {
        method: "POST",
        body: formData,
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty("jobId");
      expect(data).toHaveProperty("status");
      expect(data.status).toBe("completed");
      expect(data).toHaveProperty("extractedTexts");
      expect(Array.isArray(data.extractedTexts)).toBe(true);
      expect(data.extractedTexts.length).toBeGreaterThan(0);
      expect(data.extractedTexts[0]).toHaveProperty("pageNumber");
      expect(data.extractedTexts[0]).toHaveProperty("text");
    });

    it("should handle multiple images", async () => {
      const formData = new FormData();
      const mockImage1 = new Blob(["fake image 1"], { type: "image/jpeg" });
      const mockImage2 = new Blob(["fake image 2"], { type: "image/jpeg" });

      formData.append("images", mockImage1, "page1.jpg");
      formData.append("images", mockImage2, "page2.jpg");

      const response = await fetch("http://localhost:3000/api/extract-text", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      expect(data.extractedTexts.length).toBe(2);
      expect(data.extractedTexts[0].pageNumber).toBe(1);
      expect(data.extractedTexts[1].pageNumber).toBe(2);
    });

    it("should return error if no images provided", async () => {
      const formData = new FormData();

      const response = await fetch("http://localhost:3000/api/extract-text", {
        method: "POST",
        body: formData,
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty("message");
    });

    it("should create job record with correct status", async () => {
      const formData = new FormData();
      const mockImage = new Blob(["fake image data"], { type: "image/jpeg" });
      formData.append("images", mockImage, "test.jpg");

      const response = await fetch("http://localhost:3000/api/extract-text", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      const jobId = data.jobId;

      // Check job status
      const statusResponse = await fetch(
        `http://localhost:3000/api/jobs/${jobId}`
      );
      expect(statusResponse.status).toBe(200);

      const jobStatus = await statusResponse.json();
      expect(jobStatus.jobId).toBe(jobId);
      expect(jobStatus.status).toBe("extracting_completed");
    });
  });

  describe("Text Refinement Endpoint", () => {
    it("should refine extracted text", async () => {
      const requestBody = {
        jobId: "test-job-123",
        extractedTexts: ["Page 1 text", "Page 2 text"],
      };

      const response = await fetch("http://localhost:3000/api/refine-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty("jobId");
      expect(data.status).toBe("completed");
      expect(data).toHaveProperty("refinedText");
      expect(typeof data.refinedText).toBe("string");
      expect(data.refinedText.length).toBeGreaterThan(0);
    });

    it("should handle refinement instructions", async () => {
      const requestBody = {
        jobId: "test-job-456",
        extractedTexts: ["Some text"],
        refinementInstructions: "Remove OCR errors and format as chapters",
      };

      const response = await fetch("http://localhost:3000/api/refine-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(200);
    });

    it("should return error if required fields missing", async () => {
      const requestBody = {
        jobId: "test-job-789",
        // missing extractedTexts
      };

      const response = await fetch("http://localhost:3000/api/refine-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("Audio Generation Endpoint", () => {
    it("should generate audio from text", async () => {
      const requestBody = {
        jobId: "test-job-audio-1",
        text: "This is test text for audio generation. It should be converted to speech using the TTS engine.",
      };

      const response = await fetch("http://localhost:3000/api/generate-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty("jobId");
      expect(data.status).toBe("completed");
      expect(data).toHaveProperty("audioUrl");
      expect(typeof data.audioUrl).toBe("string");
    });

    it("should support voice and rate parameters", async () => {
      const requestBody = {
        jobId: "test-job-audio-2",
        text: "Test text",
        voice: "female",
        rate: 120,
      };

      const response = await fetch("http://localhost:3000/api/generate-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(200);
    });

    it("should return error if jobId or text missing", async () => {
      const requestBody = {
        // missing both jobId and text
      };

      const response = await fetch("http://localhost:3000/api/generate-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("Job Status Polling Endpoint", () => {
    it("should return job status by jobId", async () => {
      // First extract text to create a job
      const formData = new FormData();
      const mockImage = new Blob(["fake image data"], { type: "image/jpeg" });
      formData.append("images", mockImage, "test.jpg");

      const extractResponse = await fetch(
        "http://localhost:3000/api/extract-text",
        {
          method: "POST",
          body: formData,
        }
      );

      const extractData = await extractResponse.json();
      const jobId = extractData.jobId;

      // Then check job status
      const statusResponse = await fetch(
        `http://localhost:3000/api/jobs/${jobId}`
      );

      expect(statusResponse.status).toBe(200);
      const statusData = await statusResponse.json();

      expect(statusData.jobId).toBe(jobId);
      expect(statusData).toHaveProperty("stage");
      expect(statusData).toHaveProperty("status");
    });

    it("should return 404 for non-existent job", async () => {
      const response = await fetch(
        "http://localhost:3000/api/jobs/non-existent-job"
      );
      expect(response.status).toBe(404);
    });
  });

  describe("Audio Download Endpoint", () => {
    it("should download audio file if available", async () => {
      // First generate audio
      const requestBody = {
        jobId: "test-job-download",
        text: "Test text for audio generation",
      };

      const generateResponse = await fetch(
        "http://localhost:3000/api/generate-audio",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );

      const generateData = await generateResponse.json();
      const jobId = generateData.jobId;

      // Then try to download
      const downloadResponse = await fetch(
        `http://localhost:3000/api/audio/${jobId}`
      );

      expect(downloadResponse.status).toBe(200);
      expect(downloadResponse.headers.get("content-type")).toContain("audio");
    });

    it("should return 404 if audio not found", async () => {
      const response = await fetch(
        "http://localhost:3000/api/audio/non-existent-job"
      );
      expect(response.status).toBe(404);
    });
  });

  describe("End-to-End Pipeline", () => {
    it("should process complete pipeline: extract → refine → generate", async () => {
      // Step 1: Extract text
      const formData = new FormData();
      const mockImage = new Blob(["fake image data"], { type: "image/jpeg" });
      formData.append("images", mockImage, "page.jpg");

      const extractResponse = await fetch(
        "http://localhost:3000/api/extract-text",
        {
          method: "POST",
          body: formData,
        }
      );

      expect(extractResponse.status).toBe(200);
      const extractData = await extractResponse.json();
      const jobId = extractData.jobId;
      const extractedTexts = extractData.extractedTexts.map(
        (item: Record<string, string>) => item.text
      );

      // Step 2: Refine text
      const refineResponse = await fetch("http://localhost:3000/api/refine-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          extractedTexts,
        }),
      });

      expect(refineResponse.status).toBe(200);
      const refineData = await refineResponse.json();
      const refinedText = refineData.refinedText;

      // Step 3: Generate audio
      const audioResponse = await fetch(
        "http://localhost:3000/api/generate-audio",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId,
            text: refinedText,
          }),
        }
      );

      expect(audioResponse.status).toBe(200);
      const audioData = await audioResponse.json();

      expect(audioData.jobId).toBe(jobId);
      expect(audioData.status).toBe("completed");
      expect(audioData).toHaveProperty("audioUrl");

      // Step 4: Download audio
      const downloadResponse = await fetch(
        `http://localhost:3000/api/audio/${jobId}`
      );

      expect(downloadResponse.status).toBe(200);
      expect(downloadResponse.headers.get("content-type")).toContain("audio");
    });
  });
});
