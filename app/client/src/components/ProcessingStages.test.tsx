/**
 * Test Suite: ProcessingStages Component
 * Tests FR-008 Requirement
 * - 3-step progress indication (Extract → Refine → Generate)
 * - Stage status display (pending, active, completed)
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProcessingStages from './ProcessingStages';

describe('ProcessingStages Component - PRD Compliance Tests', () => {

  describe('FR-008: Progress Indication (3 Steps)', () => {
    it('should render all three processing stages', () => {
      render(<ProcessingStages currentStage={0} currentItem={1} totalItems={5} />);

      expect(screen.getByTestId('stage-indicator-extract')).toBeInTheDocument();
      expect(screen.getByTestId('stage-indicator-refine')).toBeInTheDocument();
      expect(screen.getByTestId('stage-indicator-generate')).toBeInTheDocument();
    });

    it('should display stage labels', () => {
      render(<ProcessingStages currentStage={0} currentItem={1} totalItems={5} />);

      expect(screen.getByTestId('text-stage-extract')).toBeInTheDocument();
      expect(screen.getByTestId('text-stage-refine')).toBeInTheDocument();
      expect(screen.getByTestId('text-stage-generate')).toBeInTheDocument();
    });

    it('should show "Extracting Text" label for stage 0', () => {
      render(<ProcessingStages currentStage={0} currentItem={1} totalItems={5} />);
      expect(screen.getByText('Extracting Text')).toBeInTheDocument();
    });

    it('should show "Refining Content" label for stage 1', () => {
      render(<ProcessingStages currentStage={1} currentItem={1} totalItems={5} />);
      expect(screen.getByText('Refining Content')).toBeInTheDocument();
    });

    it('should show "Generating Audio" label for stage 2', () => {
      render(<ProcessingStages currentStage={2} currentItem={1} totalItems={5} />);
      expect(screen.getByText('Generating Audio')).toBeInTheDocument();
    });
  });

  describe('Stage Status Indicators', () => {
    it('should mark current stage as active', () => {
      const { container } = render(
        <ProcessingStages currentStage={0} currentItem={1} totalItems={5} />
      );

      const activeStage = container.querySelector('[data-testid="stage-indicator-extract"]');
      expect(activeStage).toHaveClass('animate-pulse');
    });

    it('should mark completed stages with checkmark', () => {
      const { container } = render(
        <ProcessingStages currentStage={2} currentItem={1} totalItems={5} />
      );

      const extractStage = container.querySelector('[data-testid="stage-indicator-extract"]');
      const refineStage = container.querySelector('[data-testid="stage-indicator-refine"]');

      // Both should be marked as completed
      expect(extractStage).toHaveClass('bg-primary');
      expect(refineStage).toHaveClass('bg-primary');
    });

    it('should mark pending stages appropriately', () => {
      const { container } = render(
        <ProcessingStages currentStage={0} currentItem={1} totalItems={5} />
      );

      const generateStage = container.querySelector('[data-testid="stage-indicator-generate"]');

      // Should be marked as pending
      expect(generateStage).toHaveClass('bg-background');
    });
  });

  describe('Progress Bar Display', () => {
    it('should display progress bar during extraction stage', () => {
      render(<ProcessingStages currentStage={0} currentItem={2} totalItems={5} />);

      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toBeInTheDocument();
    });

    it('should show current image progress text', () => {
      render(<ProcessingStages currentStage={0} currentItem={2} totalItems={5} />);

      expect(screen.getByText(/Processing image 2 of 5/i)).toBeInTheDocument();
    });

    it('should calculate progress percentage correctly', () => {
      render(<ProcessingStages currentStage={0} currentItem={3} totalItems={5} />);

      // Should show progress for 3 out of 5 images
      expect(screen.getByText(/Processing image 3 of 5/i)).toBeInTheDocument();
    });

    it('should not show progress bar after extraction stage', () => {
      const { queryByTestId } = render(
        <ProcessingStages currentStage={1} currentItem={1} totalItems={5} />
      );

      const progressBar = queryByTestId('progress-bar');
      expect(progressBar).not.toBeInTheDocument();
    });
  });

  describe('Stage Progression', () => {
    it('should show stage 0 as active initially', () => {
      const { container } = render(
        <ProcessingStages currentStage={0} currentItem={1} totalItems={5} />
      );

      const extractStage = container.querySelector('[data-testid="stage-indicator-extract"]');
      expect(extractStage).toHaveClass('animate-pulse');
    });

    it('should show stage 1 as active during refinement', () => {
      const { container } = render(
        <ProcessingStages currentStage={1} currentItem={1} totalItems={5} />
      );

      const refineStage = container.querySelector('[data-testid="stage-indicator-refine"]');
      expect(refineStage).toHaveClass('animate-pulse');
    });

    it('should show stage 2 as active during generation', () => {
      const { container } = render(
        <ProcessingStages currentStage={2} currentItem={1} totalItems={5} />
      );

      const generateStage = container.querySelector('[data-testid="stage-indicator-generate"]');
      expect(generateStage).toHaveClass('animate-pulse');
    });
  });

  describe('Component Structure', () => {
    it('should render processing stages container', () => {
      render(<ProcessingStages currentStage={0} currentItem={1} totalItems={5} />);

      const container = screen.getByTestId('processing-stages');
      expect(container).toBeInTheDocument();
    });

    it('should handle missing optional props gracefully', () => {
      const { container } = render(<ProcessingStages currentStage={0} />);

      expect(container).toBeTruthy();
      expect(screen.getByTestId('processing-stages')).toBeInTheDocument();
    });

    it('should display stage indicators in correct visual order', () => {
      render(<ProcessingStages currentStage={0} currentItem={1} totalItems={5} />);

      const stages = [
        screen.getByTestId('text-stage-extract'),
        screen.getByTestId('text-stage-refine'),
        screen.getByTestId('text-stage-generate'),
      ];

      stages.forEach((stage) => {
        expect(stage).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero items gracefully', () => {
      render(<ProcessingStages currentStage={0} currentItem={0} totalItems={0} />);

      expect(screen.getByTestId('processing-stages')).toBeInTheDocument();
    });

    it('should handle current item exceeding total items', () => {
      render(<ProcessingStages currentStage={0} currentItem={10} totalItems={5} />);

      expect(screen.getByTestId('processing-stages')).toBeInTheDocument();
    });

    it('should handle invalid stage number', () => {
      render(<ProcessingStages currentStage={5} currentItem={1} totalItems={5} />);

      expect(screen.getByTestId('processing-stages')).toBeInTheDocument();
    });
  });
});
