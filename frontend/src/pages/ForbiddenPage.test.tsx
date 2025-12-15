/**
 * ForbiddenPage Component Unit Tests
 * STORY-008B: Permission-System (Frontend)
 *
 * Tests for ForbiddenPage component including accessibility,
 * navigation, and content rendering.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ForbiddenPage } from './ForbiddenPage';
import React from 'react';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Test wrapper with routing
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MemoryRouter initialEntries={['/forbidden']}>
    <Routes>
      <Route path="/forbidden" element={children} />
      <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard</div>} />
      <Route path="/help" element={<div data-testid="help">Help</div>} />
    </Routes>
  </MemoryRouter>
);

describe('ForbiddenPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Content Rendering', () => {
    it('renders forbidden page with all elements', () => {
      render(
        <TestWrapper>
          <ForbiddenPage />
        </TestWrapper>
      );

      // Check main container
      expect(screen.getByTestId('forbidden-page')).toBeInTheDocument();

      // Check title
      expect(screen.getByTestId('forbidden-title')).toHaveTextContent('Zugriff verweigert');

      // Check message
      expect(screen.getByTestId('forbidden-message')).toBeInTheDocument();

      // Check error code
      expect(screen.getByTestId('error-code')).toHaveTextContent('403');
    });

    it('displays go back button', () => {
      render(
        <TestWrapper>
          <ForbiddenPage />
        </TestWrapper>
      );

      const goBackButton = screen.getByTestId('go-back-button');
      expect(goBackButton).toBeInTheDocument();
      expect(goBackButton).toHaveTextContent('Zurück zur vorherigen Seite');
    });

    it('displays dashboard link', () => {
      render(
        <TestWrapper>
          <ForbiddenPage />
        </TestWrapper>
      );

      const dashboardLink = screen.getByTestId('dashboard-link');
      expect(dashboardLink).toBeInTheDocument();
      expect(dashboardLink).toHaveTextContent('Zum Dashboard');
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    });

    it('displays help link', () => {
      render(
        <TestWrapper>
          <ForbiddenPage />
        </TestWrapper>
      );

      const helpLink = screen.getByTestId('help-link');
      expect(helpLink).toBeInTheDocument();
      expect(helpLink).toHaveAttribute('href', '/help');
    });
  });

  describe('Navigation', () => {
    it('calls navigate(-1) when go back button is clicked', () => {
      render(
        <TestWrapper>
          <ForbiddenPage />
        </TestWrapper>
      );

      const goBackButton = screen.getByTestId('go-back-button');
      fireEvent.click(goBackButton);

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(
        <TestWrapper>
          <ForbiddenPage />
        </TestWrapper>
      );

      // h1 should be present
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Zugriff verweigert');
    });

    it('buttons and links are keyboard accessible', () => {
      render(
        <TestWrapper>
          <ForbiddenPage />
        </TestWrapper>
      );

      const goBackButton = screen.getByTestId('go-back-button');
      const dashboardLink = screen.getByTestId('dashboard-link');
      const helpLink = screen.getByTestId('help-link');

      // All should be focusable
      expect(goBackButton).not.toHaveAttribute('tabindex', '-1');
      expect(dashboardLink).not.toHaveAttribute('tabindex', '-1');
      expect(helpLink).not.toHaveAttribute('tabindex', '-1');
    });

    it('has descriptive content for screen readers', () => {
      render(
        <TestWrapper>
          <ForbiddenPage />
        </TestWrapper>
      );

      // Check for meaningful content
      expect(screen.getByText(/Zugriff verweigert/i)).toBeInTheDocument();
      expect(screen.getByText(/keine Berechtigung/i)).toBeInTheDocument();
      expect(screen.getByText(/kontaktieren Sie den Support/i)).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('uses auth page styling', () => {
      render(
        <TestWrapper>
          <ForbiddenPage />
        </TestWrapper>
      );

      // Check that it uses auth-page class structure
      const pageContainer = screen.getByTestId('forbidden-page');
      expect(pageContainer).toHaveClass('auth-page');
    });
  });
});
