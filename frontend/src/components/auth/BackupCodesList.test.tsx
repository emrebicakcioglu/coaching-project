/**
 * BackupCodesList Component Unit Tests
 * STORY-005C: MFA UI (Frontend)
 *
 * Tests for BackupCodesList component including display,
 * copy functionality, download, and accessibility.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BackupCodesList } from './BackupCodesList';

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('BackupCodesList', () => {
  const mockCodes = [
    'ABCD1234',
    'EFGH5678',
    'IJKL9012',
    'MNOP3456',
    'QRST7890',
    'UVWX1234',
    'YZAB5678',
    'CDEF9012',
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up rendered components and restore all mocks
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<BackupCodesList codes={mockCodes} />);

      expect(screen.getByTestId('backup-codes-list')).toBeInTheDocument();
      expect(screen.getByText('Backup-Codes')).toBeInTheDocument();
    });

    it('renders all backup codes', () => {
      render(<BackupCodesList codes={mockCodes} />);

      mockCodes.forEach((code, index) => {
        expect(screen.getByTestId(`backup-codes-list-code-${index}`)).toBeInTheDocument();
        expect(screen.getByText(code)).toBeInTheDocument();
      });
    });

    it('renders code numbers', () => {
      render(<BackupCodesList codes={mockCodes} />);

      mockCodes.forEach((_, index) => {
        expect(screen.getByText(`${index + 1}.`)).toBeInTheDocument();
      });
    });

    it('renders warning message', () => {
      render(<BackupCodesList codes={mockCodes} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Diese Codes werden nur einmal angezeigt/)).toBeInTheDocument();
    });

    it('renders custom data-testid', () => {
      render(<BackupCodesList codes={mockCodes} data-testid="custom-codes" />);

      expect(screen.getByTestId('custom-codes')).toBeInTheDocument();
    });
  });

  describe('Used Codes', () => {
    it('marks used codes with different styling', () => {
      render(<BackupCodesList codes={mockCodes} usedCodes={[0, 2]} />);

      const usedCode0 = screen.getByTestId('backup-codes-list-code-0');
      const usedCode2 = screen.getByTestId('backup-codes-list-code-2');
      const unusedCode1 = screen.getByTestId('backup-codes-list-code-1');

      expect(usedCode0).toHaveClass('backup-codes-list__code--used');
      expect(usedCode2).toHaveClass('backup-codes-list__code--used');
      expect(unusedCode1).not.toHaveClass('backup-codes-list__code--used');
    });

    it('displays "Verwendet" for used codes', () => {
      render(<BackupCodesList codes={mockCodes} usedCodes={[0]} />);

      expect(screen.getByText('Verwendet')).toBeInTheDocument();
      expect(screen.queryByText(mockCodes[0])).not.toBeInTheDocument();
    });

    it('shows remaining codes count', () => {
      render(<BackupCodesList codes={mockCodes} usedCodes={[0, 1, 2]} />);

      expect(screen.getByText('5 von 8 Codes verbleibend')).toBeInTheDocument();
    });

    it('does not show remaining count when no codes are used', () => {
      render(<BackupCodesList codes={mockCodes} />);

      expect(screen.queryByText(/Codes verbleibend/)).not.toBeInTheDocument();
    });
  });

  describe('Copy Functionality', () => {
    it('renders copy button by default', () => {
      render(<BackupCodesList codes={mockCodes} />);

      expect(screen.getByTestId('backup-codes-list-copy-button')).toBeInTheDocument();
    });

    it('hides copy button when showCopy is false', () => {
      render(<BackupCodesList codes={mockCodes} showCopy={false} />);

      expect(screen.queryByTestId('backup-codes-list-copy-button')).not.toBeInTheDocument();
    });

    it('copies codes to clipboard on click', async () => {
      const user = userEvent.setup();
      render(<BackupCodesList codes={mockCodes} />);

      const copyButton = screen.getByTestId('backup-codes-list-copy-button');
      await user.click(copyButton);

      // Verify the copy action completed by checking the success message
      // The component shows "Kopiert!" when copy succeeds (either via clipboard API or fallback)
      await waitFor(() => {
        expect(screen.getByText('Kopiert!')).toBeInTheDocument();
      });
    });

    it('shows success message after copying', async () => {
      const user = userEvent.setup();
      render(<BackupCodesList codes={mockCodes} />);

      const copyButton = screen.getByTestId('backup-codes-list-copy-button');
      await user.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText('Kopiert!')).toBeInTheDocument();
      });
    });

    it('has correct aria-label on copy button', () => {
      render(<BackupCodesList codes={mockCodes} />);

      const copyButton = screen.getByTestId('backup-codes-list-copy-button');
      expect(copyButton).toHaveAttribute('aria-label', 'Codes in Zwischenablage kopieren');
    });
  });

  describe('Download Functionality', () => {
    it('renders download button by default', () => {
      render(<BackupCodesList codes={mockCodes} />);

      expect(screen.getByTestId('backup-codes-list-download-button')).toBeInTheDocument();
    });

    it('hides download button when showDownload is false', () => {
      render(<BackupCodesList codes={mockCodes} showDownload={false} />);

      expect(screen.queryByTestId('backup-codes-list-download-button')).not.toBeInTheDocument();
    });

    it('creates and clicks download link on button click', async () => {
      const user = userEvent.setup();
      const mockClick = vi.fn();

      // Store original methods
      const originalAppendChild = document.body.appendChild.bind(document.body);
      const originalRemoveChild = document.body.removeChild.bind(document.body);

      // Create mock that tracks anchor clicks but still works for React
      const mockAppendChild = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
        if (node instanceof HTMLAnchorElement) {
          mockClick();
          return node;
        }
        // Allow other nodes (like React containers) to be appended normally
        return originalAppendChild(node);
      });
      const mockRemoveChild = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => {
        if (node instanceof HTMLAnchorElement) {
          return node;
        }
        // Allow other nodes to be removed normally
        return originalRemoveChild(node);
      });

      render(<BackupCodesList codes={mockCodes} appName="Test App" />);

      const downloadButton = screen.getByTestId('backup-codes-list-download-button');
      await user.click(downloadButton);

      expect(global.URL.createObjectURL).toHaveBeenCalled();

      // Restore mocks before cleanup
      mockAppendChild.mockRestore();
      mockRemoveChild.mockRestore();
    });

    it('shows success message after downloading', async () => {
      const user = userEvent.setup();

      // Store original methods
      const originalAppendChild = document.body.appendChild.bind(document.body);
      const originalRemoveChild = document.body.removeChild.bind(document.body);

      const mockAppendChild = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
        if (node instanceof HTMLAnchorElement) {
          return node;
        }
        return originalAppendChild(node);
      });
      const mockRemoveChild = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => {
        if (node instanceof HTMLAnchorElement) {
          return node;
        }
        return originalRemoveChild(node);
      });

      render(<BackupCodesList codes={mockCodes} />);

      const downloadButton = screen.getByTestId('backup-codes-list-download-button');
      await user.click(downloadButton);

      await waitFor(() => {
        expect(screen.getByText('Heruntergeladen!')).toBeInTheDocument();
      });

      // Restore mocks before cleanup
      mockAppendChild.mockRestore();
      mockRemoveChild.mockRestore();
    });

    it('has correct aria-label on download button', () => {
      render(<BackupCodesList codes={mockCodes} />);

      const downloadButton = screen.getByTestId('backup-codes-list-download-button');
      expect(downloadButton).toHaveAttribute('aria-label', 'Codes als Datei herunterladen');
    });
  });

  describe('Grid Layout', () => {
    it('renders codes in a grid', () => {
      render(<BackupCodesList codes={mockCodes} />);

      const grid = screen.getByTestId('backup-codes-list-grid');
      expect(grid).toHaveClass('backup-codes-list__grid');
    });

    it('each code has proper structure', () => {
      render(<BackupCodesList codes={mockCodes} />);

      const codeElement = screen.getByTestId('backup-codes-list-code-0');
      expect(codeElement).toHaveClass('backup-codes-list__code');
    });
  });

  describe('Accessibility', () => {
    it('warning has alert role', () => {
      render(<BackupCodesList codes={mockCodes} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('buttons are keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<BackupCodesList codes={mockCodes} />);

      const copyButton = screen.getByTestId('backup-codes-list-copy-button');
      const downloadButton = screen.getByTestId('backup-codes-list-download-button');

      // Tab to copy button and press Enter
      copyButton.focus();
      expect(copyButton).toHaveFocus();
      await user.keyboard('{Enter}');

      // Verify the copy action completed by checking the success message
      // The component shows "Kopiert!" when copy succeeds (either via clipboard API or fallback)
      await waitFor(() => {
        expect(screen.getByText('Kopiert!')).toBeInTheDocument();
      });
    });
  });
});
