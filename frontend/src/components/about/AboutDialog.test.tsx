/**
 * AboutDialog Unit Tests
 * STORY-030: Application Versioning
 *
 * Tests for the AboutDialog component.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AboutDialog } from './AboutDialog';
import { versionService } from '../../services';

// Mock the versionService
vi.mock('../../services', () => ({
  versionService: {
    getVersion: vi.fn(),
  },
}));

// Mock the useResponsive hook
vi.mock('../../hooks', () => ({
  useResponsive: () => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
  }),
}));

describe('AboutDialog', () => {
  const mockVersionInfo = {
    version: '1.0.0',
    name: 'core-app-backend',
    description: 'Core Application Backend API',
    timestamp: '2025-12-08T10:00:00.000Z',
    build: '12345',
    commit: 'abc123def456',
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (versionService.getVersion as ReturnType<typeof vi.fn>).mockResolvedValue(mockVersionInfo);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open', async () => {
    render(<AboutDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('about-dialog')).toBeInTheDocument();
    });
  });

  it('should not render when closed', () => {
    render(<AboutDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId('about-dialog')).not.toBeInTheDocument();
  });

  it('should display version information', async () => {
    render(<AboutDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('about-dialog-version')).toHaveTextContent('1.0.0');
    });
  });

  it('should display application name', async () => {
    render(<AboutDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('about-dialog-name')).toHaveTextContent('core-app-backend');
    });
  });

  it('should display application description', async () => {
    render(<AboutDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('about-dialog-description')).toHaveTextContent(
        'Core Application Backend API'
      );
    });
  });

  it('should display build number when available', async () => {
    render(<AboutDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('about-dialog-build')).toHaveTextContent('12345');
    });
  });

  it('should display git commit when available', async () => {
    render(<AboutDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('about-dialog-commit')).toHaveTextContent('abc123def456');
    });
  });

  it('should not display build number when not available', async () => {
    const versionWithoutBuild = {
      ...mockVersionInfo,
      build: undefined,
    };
    (versionService.getVersion as ReturnType<typeof vi.fn>).mockResolvedValue(versionWithoutBuild);

    render(<AboutDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('about-dialog-version')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('about-dialog-build')).not.toBeInTheDocument();
  });

  it('should not display git commit when not available', async () => {
    const versionWithoutCommit = {
      ...mockVersionInfo,
      commit: undefined,
    };
    (versionService.getVersion as ReturnType<typeof vi.fn>).mockResolvedValue(versionWithoutCommit);

    render(<AboutDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('about-dialog-version')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('about-dialog-commit')).not.toBeInTheDocument();
  });

  it('should show loading state while fetching', () => {
    // Make the promise never resolve to keep loading state
    (versionService.getVersion as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {})
    );

    render(<AboutDialog {...defaultProps} />);

    // Loading spinner should be present
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<AboutDialog {...defaultProps} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByTestId('about-dialog-version')).toBeInTheDocument();
    });

    const closeButton = screen.getByTestId('about-dialog-close-button');
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should have correct title', async () => {
    render(<AboutDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /about/i })).toBeInTheDocument();
    });
  });

  it('should display copyright notice', async () => {
    render(<AboutDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/all rights reserved/i)).toBeInTheDocument();
    });
  });

  it('should fetch version when dialog opens', async () => {
    render(<AboutDialog {...defaultProps} />);

    await waitFor(() => {
      expect(versionService.getVersion).toHaveBeenCalled();
    });
  });

  it('should use custom test ID when provided', async () => {
    render(<AboutDialog {...defaultProps} data-testid="custom-about" />);

    await waitFor(() => {
      expect(screen.getByTestId('custom-about')).toBeInTheDocument();
    });
  });
});
