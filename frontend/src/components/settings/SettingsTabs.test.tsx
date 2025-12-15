/**
 * SettingsTabs Component Tests
 * STORY-013B: In-App Settings Frontend UI
 *
 * Unit tests for the SettingsTabs navigation component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsTabs, SettingsTab } from './SettingsTabs';

describe('SettingsTabs', () => {
  const mockOnTabChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders all three tabs', () => {
      render(
        <SettingsTabs
          activeTab="general"
          onTabChange={mockOnTabChange}
        />
      );

      expect(screen.getByTestId('tab-general')).toBeInTheDocument();
      expect(screen.getByTestId('tab-security')).toBeInTheDocument();
      expect(screen.getByTestId('tab-email')).toBeInTheDocument();
    });

    it('renders tab labels correctly', () => {
      render(
        <SettingsTabs
          activeTab="general"
          onTabChange={mockOnTabChange}
        />
      );

      expect(screen.getByText('Allgemein')).toBeInTheDocument();
      expect(screen.getByText('Sicherheit')).toBeInTheDocument();
      expect(screen.getByText('E-Mail')).toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      render(
        <SettingsTabs
          activeTab="general"
          onTabChange={mockOnTabChange}
          data-testid="custom-tabs"
        />
      );

      expect(screen.getByTestId('custom-tabs')).toBeInTheDocument();
    });
  });

  describe('active tab indication', () => {
    it('shows general tab as active when activeTab is general', () => {
      render(
        <SettingsTabs
          activeTab="general"
          onTabChange={mockOnTabChange}
        />
      );

      const generalTab = screen.getByTestId('tab-general');
      expect(generalTab).toHaveAttribute('aria-selected', 'true');
      expect(generalTab).toHaveClass('border-primary-500');
    });

    it('shows security tab as active when activeTab is security', () => {
      render(
        <SettingsTabs
          activeTab="security"
          onTabChange={mockOnTabChange}
        />
      );

      const securityTab = screen.getByTestId('tab-security');
      expect(securityTab).toHaveAttribute('aria-selected', 'true');
    });

    it('shows email tab as active when activeTab is email', () => {
      render(
        <SettingsTabs
          activeTab="email"
          onTabChange={mockOnTabChange}
        />
      );

      const emailTab = screen.getByTestId('tab-email');
      expect(emailTab).toHaveAttribute('aria-selected', 'true');
    });

    it('only one tab is active at a time', () => {
      render(
        <SettingsTabs
          activeTab="security"
          onTabChange={mockOnTabChange}
        />
      );

      expect(screen.getByTestId('tab-general')).toHaveAttribute('aria-selected', 'false');
      expect(screen.getByTestId('tab-security')).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('tab-email')).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('tab switching', () => {
    it('calls onTabChange when clicking a tab', () => {
      render(
        <SettingsTabs
          activeTab="general"
          onTabChange={mockOnTabChange}
        />
      );

      fireEvent.click(screen.getByTestId('tab-security'));
      expect(mockOnTabChange).toHaveBeenCalledWith('security');
    });

    it('calls onTabChange with correct tab id', () => {
      render(
        <SettingsTabs
          activeTab="general"
          onTabChange={mockOnTabChange}
        />
      );

      fireEvent.click(screen.getByTestId('tab-email'));
      expect(mockOnTabChange).toHaveBeenCalledWith('email');

      fireEvent.click(screen.getByTestId('tab-general'));
      expect(mockOnTabChange).toHaveBeenCalledWith('general');
    });
  });

  describe('unsaved changes warning', () => {
    it('shows confirmation when switching with unsaved changes', () => {
      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <SettingsTabs
          activeTab="general"
          onTabChange={mockOnTabChange}
          hasUnsavedChanges={true}
        />
      );

      fireEvent.click(screen.getByTestId('tab-security'));

      expect(confirmSpy).toHaveBeenCalled();
      expect(mockOnTabChange).toHaveBeenCalledWith('security');

      confirmSpy.mockRestore();
    });

    it('does not switch tab when user cancels confirmation', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(
        <SettingsTabs
          activeTab="general"
          onTabChange={mockOnTabChange}
          hasUnsavedChanges={true}
        />
      );

      fireEvent.click(screen.getByTestId('tab-security'));

      expect(confirmSpy).toHaveBeenCalled();
      expect(mockOnTabChange).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('does not show confirmation when no unsaved changes', () => {
      const confirmSpy = vi.spyOn(window, 'confirm');

      render(
        <SettingsTabs
          activeTab="general"
          onTabChange={mockOnTabChange}
          hasUnsavedChanges={false}
        />
      );

      fireEvent.click(screen.getByTestId('tab-security'));

      expect(confirmSpy).not.toHaveBeenCalled();
      expect(mockOnTabChange).toHaveBeenCalledWith('security');

      confirmSpy.mockRestore();
    });
  });

  describe('keyboard navigation', () => {
    it('switches tab on Enter key', () => {
      render(
        <SettingsTabs
          activeTab="general"
          onTabChange={mockOnTabChange}
        />
      );

      const securityTab = screen.getByTestId('tab-security');
      fireEvent.keyDown(securityTab, { key: 'Enter' });

      expect(mockOnTabChange).toHaveBeenCalledWith('security');
    });

    it('switches tab on Space key', () => {
      render(
        <SettingsTabs
          activeTab="general"
          onTabChange={mockOnTabChange}
        />
      );

      const emailTab = screen.getByTestId('tab-email');
      fireEvent.keyDown(emailTab, { key: ' ' });

      expect(mockOnTabChange).toHaveBeenCalledWith('email');
    });

    it('navigates to next tab on ArrowRight', () => {
      render(
        <SettingsTabs
          activeTab="general"
          onTabChange={mockOnTabChange}
        />
      );

      const generalTab = screen.getByTestId('tab-general');
      fireEvent.keyDown(generalTab, { key: 'ArrowRight' });

      expect(mockOnTabChange).toHaveBeenCalledWith('security');
    });

    it('navigates to previous tab on ArrowLeft', () => {
      render(
        <SettingsTabs
          activeTab="security"
          onTabChange={mockOnTabChange}
        />
      );

      const securityTab = screen.getByTestId('tab-security');
      fireEvent.keyDown(securityTab, { key: 'ArrowLeft' });

      expect(mockOnTabChange).toHaveBeenCalledWith('general');
    });

    it('wraps around when navigating past last tab', () => {
      render(
        <SettingsTabs
          activeTab="email"
          onTabChange={mockOnTabChange}
        />
      );

      const emailTab = screen.getByTestId('tab-email');
      fireEvent.keyDown(emailTab, { key: 'ArrowRight' });

      expect(mockOnTabChange).toHaveBeenCalledWith('general');
    });

    it('wraps around when navigating before first tab', () => {
      render(
        <SettingsTabs
          activeTab="general"
          onTabChange={mockOnTabChange}
        />
      );

      const generalTab = screen.getByTestId('tab-general');
      fireEvent.keyDown(generalTab, { key: 'ArrowLeft' });

      expect(mockOnTabChange).toHaveBeenCalledWith('email');
    });
  });

  describe('accessibility', () => {
    it('has role tablist on navigation', () => {
      render(
        <SettingsTabs
          activeTab="general"
          onTabChange={mockOnTabChange}
        />
      );

      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('tabs have role tab', () => {
      render(
        <SettingsTabs
          activeTab="general"
          onTabChange={mockOnTabChange}
        />
      );

      expect(screen.getAllByRole('tab')).toHaveLength(3);
    });

    it('active tab has tabindex 0', () => {
      render(
        <SettingsTabs
          activeTab="security"
          onTabChange={mockOnTabChange}
        />
      );

      expect(screen.getByTestId('tab-security')).toHaveAttribute('tabindex', '0');
    });

    it('inactive tabs have tabindex -1', () => {
      render(
        <SettingsTabs
          activeTab="security"
          onTabChange={mockOnTabChange}
        />
      );

      expect(screen.getByTestId('tab-general')).toHaveAttribute('tabindex', '-1');
      expect(screen.getByTestId('tab-email')).toHaveAttribute('tabindex', '-1');
    });

    it('has aria-controls attribute', () => {
      render(
        <SettingsTabs
          activeTab="general"
          onTabChange={mockOnTabChange}
        />
      );

      expect(screen.getByTestId('tab-general')).toHaveAttribute('aria-controls', 'tabpanel-general');
      expect(screen.getByTestId('tab-security')).toHaveAttribute('aria-controls', 'tabpanel-security');
      expect(screen.getByTestId('tab-email')).toHaveAttribute('aria-controls', 'tabpanel-email');
    });
  });
});
