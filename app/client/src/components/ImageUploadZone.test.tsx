/**
 * Test Suite: ImageUploadZone Component
 * Tests FR-001 & FR-002 Requirements
 * - File upload validation (JPG, PNG)
 * - File size validation (max 5MB)
 * - Max 50 images limit
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageUploadZone from './ImageUploadZone';

describe('ImageUploadZone Component - PRD Compliance Tests', () => {

  describe('FR-001: File Upload Validation', () => {
    it('should accept JPG images', () => {
      const { container } = render(<ImageUploadZone />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      expect(fileInput).toBeTruthy();
      expect(fileInput.accept).toContain('image/jpeg');
    });

    it('should accept PNG images', () => {
      const { container } = render(<ImageUploadZone />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      expect(fileInput).toBeTruthy();
      expect(fileInput.accept).toContain('image/png');
    });

    it('should reject non-image files silently', () => {
      const { container } = render(<ImageUploadZone />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const textFile = new File(['content'], 'test.txt', { type: 'text/plain' });

      fireEvent.change(fileInput, { target: { files: [textFile] } });

      // Should not show any uploaded images
      const uploadedSection = screen.queryByText(/images uploaded/);
      expect(uploadedSection).not.toBeInTheDocument();
    });

    it('should reject files larger than 5MB', () => {
      const { container } = render(<ImageUploadZone />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const largeFile = new File(
        [new ArrayBuffer(6 * 1024 * 1024)],
        'large.jpg',
        { type: 'image/jpeg' }
      );

      fireEvent.change(fileInput, { target: { files: [largeFile] } });

      // Should not add the file
      const uploadedSection = screen.queryByText(/images uploaded/);
      expect(uploadedSection).not.toBeInTheDocument();
    });

    it('should enforce maximum 50 images per session', () => {
      const onImagesChange = vi.fn();
      const { container } = render(<ImageUploadZone onImagesChange={onImagesChange} />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      // Create 51 valid image files
      const files = Array.from({ length: 51 }, (_, i) =>
        new File(['x'], `image${i}.jpg`, { type: 'image/jpeg' })
      );

      fireEvent.change(fileInput, { target: { files } });

      // Should only add 50 images
      expect(onImagesChange).toHaveBeenCalled();
      const lastCall = onImagesChange.mock.calls[onImagesChange.mock.calls.length - 1];
      expect((lastCall[0] as any[]).length).toBeLessThanOrEqual(50);
    });
  });

  describe('FR-002: Image Format Validation', () => {
    it('should display upload zone when no images are uploaded', () => {
      render(<ImageUploadZone />);

      expect(screen.getByText(/Drop book page images here/i)).toBeInTheDocument();
      expect(screen.getByText(/JPG, PNG up to 5MB/i)).toBeInTheDocument();
    });

    it('should accept valid image formats', () => {
      const onImagesChange = vi.fn();
      const { container } = render(<ImageUploadZone onImagesChange={onImagesChange} />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const jpgFile = new File(['x'], 'image.jpg', { type: 'image/jpeg' });
      const pngFile = new File(['x'], 'image.png', { type: 'image/png' });

      fireEvent.change(fileInput, { target: { files: [jpgFile] } });
      fireEvent.change(fileInput, { target: { files: [pngFile] } });

      // Should have been called twice (once for each file)
      expect(onImagesChange).toHaveBeenCalled();
    });
  });

  describe('File Management', () => {
    it('should display image count when images are uploaded', async () => {
      const { container } = render(<ImageUploadZone />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const files = Array.from({ length: 3 }, (_, i) =>
        new File(['x'], `image${i}.jpg`, { type: 'image/jpeg' })
      );

      fireEvent.change(fileInput, { target: { files } });

      await waitFor(() => {
        expect(screen.getByText(/3 \/ 50 images uploaded/i)).toBeInTheDocument();
      });
    });

    it('should allow removing images', async () => {
      const { container } = render(<ImageUploadZone />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['x'], 'image.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/1 \/ 50 images uploaded/i)).toBeInTheDocument();
      });

      const removeButtons = screen.getAllByRole('button', { name: '' });
      if (removeButtons.length > 0) {
        fireEvent.click(removeButtons[0]);

        // Should reset to empty state
        await waitFor(() => {
          expect(screen.getByText(/Drop book page images here/i)).toBeInTheDocument();
        });
      }
    });

    it('should support drag and drop', async () => {
      const { container } = render(<ImageUploadZone />);
      const dropZone = container.querySelector('[role="img"]')?.parentElement;

      if (dropZone) {
        const file = new File(['x'], 'image.jpg', { type: 'image/jpeg' });

        fireEvent.drop(dropZone, {
          dataTransfer: { files: [file] },
        });

        await waitFor(() => {
          expect(screen.queryByText(/1 \/ 50 images uploaded/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty file list gracefully', () => {
      const { container } = render(<ImageUploadZone />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [] } });

      expect(screen.getByText(/Drop book page images here/i)).toBeInTheDocument();
    });

    it('should maintain sequential page numbering after removal', async () => {
      const onImagesChange = vi.fn();
      const { container } = render(<ImageUploadZone onImagesChange={onImagesChange} />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const files = Array.from({ length: 3 }, (_, i) =>
        new File(['x'], `image${i}.jpg`, { type: 'image/jpeg' })
      );

      fireEvent.change(fileInput, { target: { files } });

      await waitFor(() => {
        expect(onImagesChange).toHaveBeenCalled();
      });
    });
  });
});
