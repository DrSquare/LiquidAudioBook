/**
 * Mock Flask Server for Integration Testing
 * Simulates the Flask ML service for local development and testing
 * Provides realistic responses that match the actual Flask API
 */

import type { RequestHandler, Express } from "express";
import express from "express";
import type { Server } from "http";
import { createServer } from "http";

interface MockConfig {
  port: number;
  enableDelay: boolean;
  delayMs: number;
}

export class MockFlaskServer {
  private app: express.Application;
  private server: Server | null = null;
  private config: MockConfig;
  private requestCount: Record<string, number> = {};

  constructor(
    port: number = 5001,
    enableDelay: boolean = true,
    delayMs: number = 1000
  ) {
    this.app = express();
    this.config = { port, enableDelay, delayMs };
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.app.use(express.json());

    // Health check
    this.app.get("/api/health", this.createDelayedHandler((req, res) => {
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
      });
    }));

    // Server status
    this.app.get("/api/status", this.createDelayedHandler((req, res) => {
      res.json({
        status: "ready",
        ollama: {
          isRunning: true,
          models: {
            vision: {
              name: "LFM2-VL-3B",
              loaded: true,
            },
            text: {
              name: "LFM2-1.2B-Extract",
              loaded: true,
            },
          },
        },
      });
    }));

    // Extract text from images
    this.app.post("/api/extract-text", this.createDelayedHandler((req, res) => {
      const { jobId, images } = req.body;

      if (!jobId || !images || !Array.isArray(images)) {
        return res.status(400).json({
          error: "Invalid request",
          message: "jobId and images array required",
        });
      }

      const extractedTexts = images.map((img: string, index: number) => {
        // Generate mock extracted text based on image index
        const mockText = `
          Chapter ${index + 1}

          This is mock extracted text from page ${index + 1}.
          The vision model (LFM2-VL-3B) has processed this image and extracted the following content.

          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
          Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
        `.trim();

        return {
          pageNumber: index + 1,
          text: mockText,
          processingTimeMs: 45000 + Math.random() * 15000,
        };
      });

      res.json({
        jobId,
        status: "completed",
        extractedTexts,
      });
    }));

    // Refine text
    this.app.post("/api/refine-text", this.createDelayedHandler((req, res) => {
      const { jobId, extractedTexts, refinementInstructions } = req.body;

      if (!jobId || !extractedTexts || !Array.isArray(extractedTexts)) {
        return res.status(400).json({
          error: "Invalid request",
          message: "jobId and extractedTexts array required",
        });
      }

      // Simulate text refinement
      const refinedText = `
        REFINED DOCUMENT

        ${extractedTexts.map((text: string, i: number) => `[Page ${i + 1}]\n${text}`).join("\n\n---\n\n")}

        This text has been refined using the LFM2-1.2B-Extract model.
        The text has been cleaned, formatted, and optimized for TTS generation.
      `.trim();

      res.json({
        jobId,
        status: "completed",
        refinedText,
        processingTimeMs: 30000 + Math.random() * 10000,
      });
    }));

    // Generate audio
    this.app.post("/api/generate-audio", this.createDelayedHandler((req, res) => {
      const { jobId, text, voice, rate } = req.body;

      if (!jobId || !text) {
        return res.status(400).json({
          error: "Invalid request",
          message: "jobId and text required",
        });
      }

      // Create mock audio data (simulated MP3 bytes)
      const mockAudioBuffer = Buffer.alloc(1024 * 100); // 100KB mock audio
      mockAudioBuffer.fill(0x42); // Fill with "B" character for mock data
      const base64Audio = mockAudioBuffer.toString("base64");

      // Estimate duration based on text length (rough approximation: 150 WPM)
      const wordCount = text.split(/\s+/).length;
      const estimatedDurationMs = (wordCount / 150) * 60 * 1000;

      res.json({
        jobId,
        status: "completed",
        audioData: base64Audio,
        durationMs: estimatedDurationMs,
        processingTimeMs: 45000 + Math.random() * 15000,
      });
    }));

    // List available models
    this.app.get("/api/models", this.createDelayedHandler((req, res) => {
      res.json({
        models: [
          {
            name: "LFM2-VL-3B",
            size: 3500000000,
            type: "vision",
            modifiedAt: new Date().toISOString(),
          },
          {
            name: "LFM2-1.2B-Extract",
            size: 1500000000,
            type: "text",
            modifiedAt: new Date().toISOString(),
          },
        ],
      });
    }));

    // Error handling for undefined routes
    this.app.use((req, res) => {
      res.status(404).json({
        error: "Not found",
        message: `${req.method} ${req.path} not found`,
      });
    });
  }

  private createDelayedHandler(handler: RequestHandler): RequestHandler {
    return async (req, res, next) => {
      if (this.config.enableDelay) {
        // Add realistic processing delay
        const delay = this.config.delayMs + Math.random() * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      handler(req, res, next);
    };
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = createServer(this.app);
      this.server.listen(this.config.port, () => {
        console.log(
          `Mock Flask server started on http://localhost:${this.config.port}`
        );
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err) => {
          if (err) reject(err);
          console.log("Mock Flask server stopped");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getPort(): number {
    return this.config.port;
  }

  getServer(): Server | null {
    return this.server;
  }

  // Enable/disable delay for testing
  setDelayEnabled(enabled: boolean): void {
    this.config.enableDelay = enabled;
  }

  // Get request count for specific endpoint (for testing)
  getRequestCount(endpoint: string): number {
    return this.requestCount[endpoint] || 0;
  }

  resetRequestCount(): void {
    this.requestCount = {};
  }
}

// Export singleton for easy testing
let mockServer: MockFlaskServer | null = null;

export async function startMockFlaskServer(
  port: number = 5001,
  enableDelay: boolean = false
): Promise<MockFlaskServer> {
  if (mockServer) {
    await mockServer.stop();
  }

  mockServer = new MockFlaskServer(port, enableDelay);
  await mockServer.start();
  return mockServer;
}

export async function stopMockFlaskServer(): Promise<void> {
  if (mockServer) {
    await mockServer.stop();
    mockServer = null;
  }
}

export function getMockFlaskServer(): MockFlaskServer | null {
  return mockServer;
}
