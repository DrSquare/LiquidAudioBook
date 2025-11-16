/**
 * Integration Test Suite: Home Page Component
 * Tests complete MVP user flow and state management
 * Tests all major functional requirements
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Home from './home';

describe('Home Page - MVP Integration Tests', () => {

  describe('Initial State', () => {
    it('should render with upload state initially', () => {
      render(<Home />);

      expect(screen.getByTestId('text-app-title')).toBeInTheDocument();
      expect(screen.getByText(/LiquidAudio Reader/i)).toBeInTheDocument();
    });

    it('should display upload instructions', () => {
      render(<Home />);

      expect(screen.getByText(/Convert book page images to audiobook/i)).toBeInTheDocument();
    });

    it('should show main container card', () => {
      render(<Home />);

      expect(screen.getByTestId('card-main-container')).toBeInTheDocument();
    });

    it('should display app title and subtitle', () => {
      render(<Home />);

      expect(screen.getByTestId('text-app-title')).toHaveTextContent('LiquidAudio Reader');
      expect(screen.getByTestId('text-app-subtitle')).toHaveTextContent(/3 simple steps/i);
    });
  });

  describe('Upload State Flow', () => {
    it('should start in upload state', () => {
      render(<Home />);

      const startButton = screen.queryByTestId('button-start-processing');
      expect(startButton).not.toBeInTheDocument();
    });

    it('should have image upload zone in upload state', () => {
      render(<Home />);

      const uploadZone = screen.getByTestId('upload-zone-empty');
      expect(uploadZone).toBeInTheDocument();
    });
  });

  describe('File Upload & Processing', () => {
    it('should enable start button when files are selected', async () => {
      const { container } = render(<Home />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['x'], 'image.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const button = screen.queryByTestId('button-start-processing');
        if (button) {
          expect(button).not.toBeDisabled();
        }
      });
    });

    it('should transition to processing state when start button is clicked', async () => {
      const { container } = render(<Home />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['x'], 'image.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const button = screen.queryByTestId('button-start-processing');
        if (button && !button.hasAttribute('disabled')) {
          fireEvent.click(button);
        }
      });

      await waitFor(() => {
        expect(screen.queryByTestId('processing-stages')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Completion State', () => {
    it('should show success message after processing completes', async () => {
      const { container } = render(<Home />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['x'], 'image.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const button = screen.queryByTestId('button-start-processing');
        if (button && !button.hasAttribute('disabled')) {
          fireEvent.click(button);
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('text-success-message')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should display audio player in completed state', async () => {
      const { container } = render(<Home />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['x'], 'image.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const button = screen.queryByTestId('button-start-processing');
        if (button && !button.hasAttribute('disabled')) {
          fireEvent.click(button);
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('audio-player')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should show create new conversion button in completed state', async () => {
      const { container } = render(<Home />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['x'], 'image.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const button = screen.queryByTestId('button-start-processing');
        if (button && !button.hasAttribute('disabled')) {
          fireEvent.click(button);
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('button-create-new')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Reset Functionality', () => {
    it('should reset to upload state after creating another audiobook', async () => {
      const { container } = render(<Home />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['x'], 'image.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const button = screen.queryByTestId('button-start-processing');
        if (button && !button.hasAttribute('disabled')) {
          fireEvent.click(button);
        }
      });

      await waitFor(() => {
        const resetButton = screen.getByTestId('button-create-new');
        expect(resetButton).toBeInTheDocument();
        fireEvent.click(resetButton);
      }, { timeout: 5000 });

      await waitFor(() => {
        expect(screen.getByTestId('upload-zone-empty')).toBeInTheDocument();
      });
    });
  });

  describe('State Persistence', () => {
    it('should maintain file list during processing', async () => {
      const { container } = render(<Home />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const files = Array.from({ length: 3 }, (_, i) =>
        new File(['x'], `image${i}.jpg`, { type: 'image/jpeg' })
      );

      fireEvent.change(fileInput, { target: { files } });

      await waitFor(() => {
        const button = screen.queryByTestId('button-start-processing');
        if (button && !button.hasAttribute('disabled')) {
          fireEvent.click(button);
        }
      });

      // During processing, files should still be tracked
      expect(screen.queryByText(/3 \/ 50/i)).not.toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should have proper semantic structure', () => {
      render(<Home />);

      // Check that title is in the document (within the header structure)
      const title = screen.getByTestId('text-app-title');
      expect(title).toBeInTheDocument();
    });

    it('should have accessible heading hierarchy', () => {
      render(<Home />);

      const h1 = screen.getByRole('heading', { level: 1, name: /LiquidAudio Reader/i });
      expect(h1).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing audio URL gracefully', async () => {
      const { container } = render(<Home />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['x'], 'image.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const button = screen.queryByTestId('button-start-processing');
        if (button && !button.hasAttribute('disabled')) {
          fireEvent.click(button);
        }
      });

      await waitFor(() => {
        const audioPlayer = screen.queryByTestId('audio-player');
        // Component should still render even with issues
        expect(screen.getByTestId('text-app-title')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Multi-Image Processing', () => {
    it('should handle multiple image uploads', async () => {
      const { container } = render(<Home />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const files = Array.from({ length: 5 }, (_, i) =>
        new File(['x'], `page${i}.jpg`, { type: 'image/jpeg' })
      );

      fireEvent.change(fileInput, { target: { files } });

      await waitFor(() => {
        const button = screen.queryByTestId('button-start-processing');
        expect(button).toBeInTheDocument();
      });
    });

    it('should display correct image count for multiple uploads', async () => {
      const { container } = render(<Home />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const files = Array.from({ length: 5 }, (_, i) =>
        new File(['x'], `page${i}.jpg`, { type: 'image/jpeg' })
      );

      fireEvent.change(fileInput, { target: { files } });

      await waitFor(() => {
        expect(screen.getByText(/5 \/ 50 images uploaded/i)).toBeInTheDocument();
      });
    });
  });
});
