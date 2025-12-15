/**
 * VersionFooter Unit Tests
 * STORY-030: Application Versioning
 *
 * Tests for the VersionFooter component.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VersionFooter } from './VersionFooter';
import { versionService } from '../../services';

// Mock the versionService
vi.mock('../../services', () => ({
  versionService: {
    getVersion: vi.fn(),
  },
}));

// Mock the useResponsive hook for AboutDialog
vi.mock('../../hooks', () => ({
  useResponsive: () => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
  }),
}));

describe('VersionFooter', () => {
  const mockVersionInfo = {
    version: '1.0.0',
    name: 'core-app-backend',
    description: 'Core Application Backend API',
    timestamp: '2025-12-08T10:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (versionService.getVersion as ReturnType<typeof vi.fn>).mockResolvedValue(mockVersionInfo);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('expanded mode', () => {
    it('should render in expanded mode by default', async () => {
      render(<VersionFooter />);

      await waitFor(() => {
        expect(screen.getByTestId('version-footer')).toBeInTheDocument();
      });
    });

    it('should display version string', async () => {
      render(<VersionFooter isCollapsed={false} />);

      await waitFor(() => {
        expect(screen.getByTestId('version-footer-version')).toHaveTextContent('v1.0.0');
      });
    });

    it('should display About text', async () => {
      render(<VersionFooter isCollapsed={false} />);

      await waitFor(() => {
        expect(screen.getByText('About')).toBeInTheDocument();
      });
    });

    it('should open AboutDialog when clicked', async () => {
      const user = userEvent.setup();
      render(<VersionFooter isCollapsed={false} />);

      await waitFor(() => {
        expect(screen.getByTestId('version-footer')).toBeInTheDocument();
      });

      const button = screen.getByTestId('version-footer');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('about-dialog')).toBeInTheDocument();
      });
    });

    it('should have accessible aria-label', async () => {
      render(<VersionFooter isCollapsed={false} />);

      await waitFor(() => {
        const button = screen.getByTestId('version-footer');
        expect(button).toHaveAttribute('aria-label');
        expect(button.getAttribute('aria-label')).toContain('v1.0.0');
      });
    });
  });

  describe('collapsed mode', () => {
    it('should render in collapsed mode when isCollapsed is true', async () => {
      render(<VersionFooter isCollapsed={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('version-footer')).toBeInTheDocument();
      });
    });

    it('should not display version text in collapsed mode', async () => {
      render(<VersionFooter isCollapsed={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('version-footer')).toBeInTheDocument();
      });

      // Version text element should not exist in collapsed mode
      expect(screen.queryByTestId('version-footer-version')).not.toBeInTheDocument();
    });

    it('should have tooltip with version in collapsed mode', async () => {
      render(<VersionFooter isCollapsed={true} />);

      await waitFor(() => {
        const button = screen.getByTestId('version-footer');
        expect(button).toHaveAttribute('title');
        expect(button.getAttribute('title')).toContain('v1.0.0');
      });
    });

    it('should open AboutDialog when clicked in collapsed mode', async () => {
      const user = userEvent.setup();
      render(<VersionFooter isCollapsed={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('version-footer')).toBeInTheDocument();
      });

      const button = screen.getByTestId('version-footer');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('about-dialog')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should display fallback version on error', async () => {
      (versionService.getVersion as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('API error')
      );

      render(<VersionFooter isCollapsed={false} />);

      await waitFor(() => {
        expect(screen.getByTestId('version-footer-version')).toHaveTextContent('v1.0.0');
      });
    });
  });

  describe('custom test ID', () => {
    it('should use custom test ID when provided', async () => {
      render(<VersionFooter data-testid="custom-version" />);

      await waitFor(() => {
        expect(screen.getByTestId('custom-version')).toBeInTheDocument();
      });
    });
  });

  describe('AboutDialog integration', () => {
    it('should close AboutDialog when onClose is triggered', async () => {
      const user = userEvent.setup();
      render(<VersionFooter isCollapsed={false} />);

      // Open the dialog
      await waitFor(() => {
        expect(screen.getByTestId('version-footer')).toBeInTheDocument();
      });

      const button = screen.getByTestId('version-footer');
      await user.click(button);

      // Dialog should be open
      await waitFor(() => {
        expect(screen.getByTestId('about-dialog')).toBeInTheDocument();
      });

      // Close the dialog
      const closeButton = screen.getByTestId('about-dialog-close-button');
      await user.click(closeButton);

      // Dialog should be closed
      await waitFor(() => {
        expect(screen.queryByTestId('about-dialog')).not.toBeInTheDocument();
      });
    });
  });
});
