import {
  type User,
  type InsertUser,
  type AudiobookJob,
  type InsertAudiobookJob,
  type JobImage,
  type InsertJobImage,
  type AudioFile,
  type InsertAudioFile,
} from "@shared/schema";
import { randomUUID } from "crypto";

// Storage interface for all CRUD operations
export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Job methods
  createJob(job: Omit<InsertAudiobookJob, "id">): Promise<AudiobookJob>;
  getJob(jobId: string): Promise<AudiobookJob | undefined>;
  updateJob(
    jobId: string,
    updates: Partial<Omit<AudiobookJob, "id">>
  ): Promise<void>;
  deleteJob(jobId: string): Promise<void>;
  listJobs(): Promise<AudiobookJob[]>;

  // Image methods
  createImage(image: InsertJobImage): Promise<JobImage>;
  getImages(jobId: string): Promise<JobImage[]>;
  deleteImages(jobId: string): Promise<void>;

  // Audio methods
  saveAudio(jobId: string, buffer: Buffer): Promise<string>;
  getAudio(jobId: string): Promise<Buffer | undefined>;
  deleteAudio(jobId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private jobs: Map<string, AudiobookJob>;
  private images: Map<string, JobImage>;
  private audioData: Map<string, Buffer>;
  private audioFiles: Map<string, AudioFile>;

  constructor() {
    this.users = new Map();
    this.jobs = new Map();
    this.images = new Map();
    this.audioData = new Map();
    this.audioFiles = new Map();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Job methods
  async createJob(job: Omit<InsertAudiobookJob, "id">): Promise<AudiobookJob> {
    const id = randomUUID() as unknown as string;
    const newJob: AudiobookJob = {
      id: id as unknown as any,
      ...job,
      createdAt: new Date(),
      completedAt: null,
    };
    this.jobs.set(id, newJob);
    console.log(`[Storage] Created job ${id}`);
    return newJob;
  }

  async getJob(jobId: string): Promise<AudiobookJob | undefined> {
    return this.jobs.get(jobId);
  }

  async updateJob(
    jobId: string,
    updates: Partial<Omit<AudiobookJob, "id">>
  ): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    const updatedJob: AudiobookJob = {
      ...job,
      ...updates,
    };
    this.jobs.set(jobId, updatedJob);
    console.log(`[Storage] Updated job ${jobId}:`, updates);
  }

  async deleteJob(jobId: string): Promise<void> {
    this.jobs.delete(jobId);
    await this.deleteImages(jobId);
    await this.deleteAudio(jobId);
    console.log(`[Storage] Deleted job ${jobId}`);
  }

  async listJobs(): Promise<AudiobookJob[]> {
    return Array.from(this.jobs.values());
  }

  // Image methods
  async createImage(image: InsertJobImage): Promise<JobImage> {
    const id = randomUUID() as unknown as string;
    const newImage: JobImage = {
      id: id as unknown as any,
      ...image,
      createdAt: new Date(),
    };
    this.images.set(id, newImage);
    console.log(`[Storage] Created image ${id} for job ${image.jobId}`);
    return newImage;
  }

  async getImages(jobId: string): Promise<JobImage[]> {
    return Array.from(this.images.values()).filter(
      (img) => String(img.jobId) === jobId
    );
  }

  async deleteImages(jobId: string): Promise<void> {
    const imagesToDelete = Array.from(this.images.entries())
      .filter(([, img]) => String(img.jobId) === jobId)
      .map(([id]) => id);

    imagesToDelete.forEach((id) => this.images.delete(id));
    console.log(`[Storage] Deleted ${imagesToDelete.length} images for job ${jobId}`);
  }

  // Audio methods
  async saveAudio(jobId: string, buffer: Buffer): Promise<string> {
    const audioId = randomUUID();
    this.audioData.set(jobId, buffer);

    const audioFile: AudioFile = {
      id: audioId as unknown as any,
      jobId: jobId as unknown as any,
      filePath: `/api/audio/${jobId}`,
      mimeType: "audio/mpeg",
      fileSize: buffer.length,
      createdAt: new Date(),
    };
    this.audioFiles.set(audioId, audioFile);

    const audioUrl = `/api/audio/${jobId}`;
    console.log(`[Storage] Saved audio for job ${jobId}, size: ${buffer.length} bytes`);
    return audioUrl;
  }

  async getAudio(jobId: string): Promise<Buffer | undefined> {
    return this.audioData.get(jobId);
  }

  async deleteAudio(jobId: string): Promise<void> {
    this.audioData.delete(jobId);
    const audioFilesToDelete = Array.from(this.audioFiles.entries())
      .filter(([, file]) => String(file.jobId) === jobId)
      .map(([id]) => id);

    audioFilesToDelete.forEach((id) => this.audioFiles.delete(id));
    console.log(`[Storage] Deleted audio for job ${jobId}`);
  }
}

export const storage = new MemStorage();
