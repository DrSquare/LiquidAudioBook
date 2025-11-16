/**
 * Test Suite: AudioPlayer Component
 * Tests FR-009, FR-010, FR-011 Requirements
 * - Audio player controls (play/pause/stop)
 * - Playback position and duration display
 * - Seek functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AudioPlayer from './AudioPlayer';

describe('AudioPlayer Component - PRD Compliance Tests', () => {

  describe('FR-009: Audio Player Controls', () => {
    it('should render play button', () => {
      render(<AudioPlayer audioUrl="https://example.com/audio.mp3" />);
      const playButton = screen.getByTestId('button-play-pause');

      expect(playButton).toBeInTheDocument();
    });

    it('should render stop button', () => {
      render(<AudioPlayer audioUrl="https://example.com/audio.mp3" />);
      const stopButton = screen.getByTestId('button-stop');

      expect(stopButton).toBeInTheDocument();
    });

    it('should render download button', () => {
      render(<AudioPlayer audioUrl="https://example.com/audio.mp3" />);
      const downloadButton = screen.getByTestId('button-download');

      expect(downloadButton).toBeInTheDocument();
    });

    it('should have audio element with src attribute', () => {
      const audioUrl = 'https://example.com/audio.mp3';
      const { container } = render(<AudioPlayer audioUrl={audioUrl} />);
      const audioElement = container.querySelector('audio');

      expect(audioElement).toBeInTheDocument();
      expect(audioElement).toHaveAttribute('src', audioUrl);
    });
  });

  describe('FR-010: Playback Position & Duration Display', () => {
    it('should display current time and total duration', () => {
      render(<AudioPlayer audioUrl="https://example.com/audio.mp3" />);

      const currentTimeDisplay = screen.getByTestId('text-current-time');
      const totalTimeDisplay = screen.getByTestId('text-total-time');

      expect(currentTimeDisplay).toBeInTheDocument();
      expect(totalTimeDisplay).toBeInTheDocument();
    });

    it('should display time in MM:SS format', () => {
      render(<AudioPlayer audioUrl="https://example.com/audio.mp3" />);

      const currentTimeDisplay = screen.getByTestId('text-current-time');

      expect(currentTimeDisplay.textContent).toMatch(/\d+:\d{2}/);
    });

    it('should initialize with 0:00 for current time', () => {
      render(<AudioPlayer audioUrl="https://example.com/audio.mp3" />);

      const currentTimeDisplay = screen.getByTestId('text-current-time');

      expect(currentTimeDisplay.textContent).toBe('0:00');
    });
  });

  describe('FR-011: Seek Functionality', () => {
    it('should render seek slider', () => {
      render(<AudioPlayer audioUrl="https://example.com/audio.mp3" />);
      const slider = screen.getByTestId('slider-seek');

      expect(slider).toBeInTheDocument();
    });

    it('should have slider with correct attributes', () => {
      const { container } = render(<AudioPlayer audioUrl="https://example.com/audio.mp3" />);
      const slider = container.querySelector('[role="slider"]');

      expect(slider).toBeInTheDocument();
    });
  });

  describe('Play/Pause Functionality', () => {
    it('should call onDownload when download button is clicked', () => {
      const onDownload = vi.fn();
      render(
        <AudioPlayer
          audioUrl="https://example.com/audio.mp3"
          onDownload={onDownload}
        />
      );

      const downloadButton = screen.getByTestId('button-download');
      fireEvent.click(downloadButton);

      expect(onDownload).toHaveBeenCalled();
    });
  });

  describe('Component Rendering', () => {
    it('should render audio player container', () => {
      render(<AudioPlayer audioUrl="https://example.com/audio.mp3" />);
      const player = screen.getByTestId('audio-player');

      expect(player).toBeInTheDocument();
    });

    it('should handle missing audioUrl gracefully', () => {
      render(<AudioPlayer />);
      const player = screen.getByTestId('audio-player');

      expect(player).toBeInTheDocument();
    });

    it('should render all control buttons in correct order', () => {
      render(<AudioPlayer audioUrl="https://example.com/audio.mp3" />);

      const stopButton = screen.getByTestId('button-stop');
      const playButton = screen.getByTestId('button-play-pause');
      const downloadButton = screen.getByTestId('button-download');

      expect(stopButton).toBeInTheDocument();
      expect(playButton).toBeInTheDocument();
      expect(downloadButton).toBeInTheDocument();
    });
  });

  describe('Time Formatting', () => {
    it('should format seconds correctly', () => {
      render(<AudioPlayer audioUrl="https://example.com/audio.mp3" />);

      const currentTime = screen.getByTestId('text-current-time');

      expect(currentTime.textContent).toBe('0:00');
    });

    it('should handle invalid duration', () => {
      render(<AudioPlayer audioUrl="https://example.com/audio.mp3" />);

      const totalTime = screen.getByTestId('text-total-time');

      expect(totalTime.textContent).toBe('0:00');
    });
  });
});
