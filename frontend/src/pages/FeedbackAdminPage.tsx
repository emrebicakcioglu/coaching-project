/**
 * Feedback Admin Page
 * STORY-041H: Feedback Admin Page
 *
 * Admin page for managing user feedback submissions.
 * Provides list view, detail modal, delete functionality, and Jira integration.
 *
 * Features:
 * - Paginated list of feedback submissions
 * - Screenshot thumbnails
 * - Detail modal with full information
 * - Delete with confirmation
 * - Jira ticket creation
 * - Empty state handling
 *
 * @example
 * ```tsx
 * <Route path="/admin/feedback" element={<FeedbackAdminPage />} />
 * ```
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Container } from '../components/layout';
import {
  Toast,
  FeedbackListItem,
  FeedbackDetailModal,
  FeedbackDeleteDialog,
} from '../components/feedback';
import { Button } from '../components/ui';
import {
  feedbackAdminService,
  FeedbackListItem as FeedbackListItemType,
  FeedbackPagination,
} from '../services/feedbackAdminService';
import { logger } from '../services/loggerService';
import { useAuth } from '../contexts/AuthContext';
import type { ToastType } from '../components/feedback';
import './FeedbackAdminPage.css';

/**
 * Toast state interface
 */
interface ToastState {
  message: string;
  type: ToastType;
}

/**
 * FeedbackAdminPage Component
 */
export const FeedbackAdminPage: React.FC = () => {
  // Feedback data state
  const [feedbacks, setFeedbacks] = useState<FeedbackListItemType[]>([]);
  const [pagination, setPagination] = useState<FeedbackPagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Jira configuration state
  const [jiraConfigured, setJiraConfigured] = useState(false);
  const [isCheckingJira, setIsCheckingJira] = useState(true);

  // Modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackListItemType | null>(null);

  // Toast state
  const [toast, setToast] = useState<ToastState | null>(null);

  // Auth context for permission checks
  const { hasPermission } = useAuth();

  /**
   * Check Jira configuration status
   */
  const checkJiraConfig = useCallback(async () => {
    setIsCheckingJira(true);
    try {
      const status = await feedbackAdminService.checkJiraConfig();
      setJiraConfigured(status.configured);
    } catch (err) {
      logger.error('Failed to check Jira configuration', err);
      setJiraConfigured(false);
    } finally {
      setIsCheckingJira(false);
    }
  }, []);

  /**
   * Fetch feedbacks from API
   */
  const fetchFeedbacks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await feedbackAdminService.list(
        pagination.page,
        pagination.limit
      );
      setFeedbacks(response.data);
      setPagination(response.pagination);
    } catch (err) {
      logger.error('Failed to load feedbacks', err);
      setError('Feedbacks konnten nicht geladen werden.');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  // Fetch feedbacks and check Jira config on mount
  useEffect(() => {
    fetchFeedbacks();
    checkJiraConfig();
  }, [fetchFeedbacks, checkJiraConfig]);

  /**
   * Handle page change
   */
  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  /**
   * Handle refresh button click
   */
  const handleRefresh = () => {
    fetchFeedbacks();
  };

  /**
   * Open detail modal
   */
  const handleOpenDetail = (feedback: FeedbackListItemType) => {
    setSelectedFeedback(feedback);
    setShowDetailModal(true);
  };

  /**
   * Open delete dialog
   */
  const handleOpenDelete = (feedback: FeedbackListItemType) => {
    setSelectedFeedback(feedback);
    setShowDeleteDialog(true);
  };

  /**
   * Handle Jira ticket creation from list
   */
  const handleCreateJiraFromList = async (feedback: FeedbackListItemType) => {
    setSelectedFeedback(feedback);
    setShowDetailModal(true);
  };

  /**
   * Handle Jira ticket creation
   */
  const handleCreateJira = async (deleteAfter: boolean) => {
    if (!selectedFeedback) return;

    try {
      const result = await feedbackAdminService.createJiraTicket(
        selectedFeedback.id,
        deleteAfter
      );
      setToast({
        message: `Jira Ticket ${result.issueKey} erfolgreich erstellt.`,
        type: 'success',
      });

      // Close modal and refresh if delete was requested
      if (deleteAfter) {
        setShowDetailModal(false);
      }
      fetchFeedbacks();
    } catch (err: unknown) {
      logger.error('Failed to create Jira ticket', err);
      const apiError = err as { response?: { data?: { message?: string } } };
      setToast({
        message: apiError.response?.data?.message || 'Jira Ticket konnte nicht erstellt werden.',
        type: 'error',
      });
    }
  };

  /**
   * Handle feedback deleted successfully
   */
  const handleFeedbackDeleted = () => {
    if (selectedFeedback) {
      setToast({
        message: 'Feedback wurde erfolgreich gelöscht.',
        type: 'success',
      });
    }
    fetchFeedbacks();
  };

  /**
   * Handle delete from detail modal
   */
  const handleDeleteFromModal = () => {
    setShowDetailModal(false);
    setShowDeleteDialog(true);
  };

  /**
   * Close all modals
   */
  const handleCloseModals = () => {
    setShowDetailModal(false);
    setShowDeleteDialog(false);
    setSelectedFeedback(null);
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <div className="feedback-admin__empty" data-testid="feedback-admin-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" className="feedback-admin__empty-icon">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h3 className="feedback-admin__empty-title">Keine Feedbacks vorhanden</h3>
      <p className="feedback-admin__empty-text">
        Es wurden noch keine Feedbacks eingereicht.
      </p>
    </div>
  );

  /**
   * Render Jira warning
   */
  const renderJiraWarning = () => {
    if (isCheckingJira || jiraConfigured) return null;

    return (
      <div className="feedback-admin__jira-warning" data-testid="feedback-admin-jira-warning">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>
          <strong>Jira nicht konfiguriert:</strong> Um Jira Tickets zu erstellen, konfigurieren Sie Jira in den Einstellungen.
        </span>
      </div>
    );
  };

  return (
    <Container className="py-8" data-testid="feedback-admin-page">
      {/* Toast notifications */}
      {toast && (
        <div className="feedback-admin__toast-container">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
            data-testid="feedback-admin-toast"
          />
        </div>
      )}

      {/* Page header */}
      <div className="page-header page-header--with-actions">
        <div>
          <h1 className="page-title">Feedback Verwaltung</h1>
        </div>
        <Button
          variant="secondary"
          onClick={handleRefresh}
          disabled={isLoading}
          data-testid="feedback-admin-refresh"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="feedback-admin__refresh-icon" aria-hidden="true">
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Aktualisieren
        </Button>
      </div>

      {/* Jira warning */}
      {renderJiraWarning()}

      {/* Error message */}
      {error && (
        <div className="feedback-admin__error" role="alert" data-testid="feedback-admin-error">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="feedback-admin__loading" data-testid="feedback-admin-loading">
          <svg className="feedback-admin__loading-spinner" viewBox="0 0 24 24" aria-hidden="true">
            <circle
              className="feedback-admin__loading-circle"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
          </svg>
          Lade Feedbacks...
        </div>
      ) : (
        <>
          {/* Empty state */}
          {feedbacks.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
              {/* Feedbacks table */}
              <div className="feedback-admin__table-container">
                <table className="feedback-admin__table" data-testid="feedback-admin-table">
                  <thead>
                    <tr>
                      <th className="feedback-admin__th feedback-admin__th--thumbnail">
                        <span className="sr-only">Screenshot</span>
                      </th>
                      <th className="feedback-admin__th">Benutzer</th>
                      <th className="feedback-admin__th">Kommentar</th>
                      <th className="feedback-admin__th">Datum</th>
                      <th className="feedback-admin__th feedback-admin__th--actions">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbacks.map((feedback) => (
                      <FeedbackListItem
                        key={feedback.id}
                        feedback={feedback}
                        onView={() => handleOpenDetail(feedback)}
                        onDelete={() => handleOpenDelete(feedback)}
                        onCreateJira={() => handleCreateJiraFromList(feedback)}
                        jiraConfigured={jiraConfigured}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="feedback-admin__pagination" data-testid="feedback-admin-pagination">
                  <button
                    type="button"
                    className="feedback-admin__page-btn"
                    disabled={pagination.page <= 1}
                    onClick={() => handlePageChange(pagination.page - 1)}
                    data-testid="feedback-pagination-prev"
                  >
                    &lt;
                  </button>

                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      className={`feedback-admin__page-btn ${
                        pageNum === pagination.page ? 'feedback-admin__page-btn--active' : ''
                      }`}
                      onClick={() => handlePageChange(pageNum)}
                      data-testid={`feedback-pagination-${pageNum}`}
                    >
                      {pageNum}
                    </button>
                  ))}

                  <button
                    type="button"
                    className="feedback-admin__page-btn"
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => handlePageChange(pagination.page + 1)}
                    data-testid="feedback-pagination-next"
                  >
                    &gt;
                  </button>
                </div>
              )}

              {/* Page info */}
              <div className="feedback-admin__page-info" data-testid="feedback-admin-page-info">
                Seite {pagination.page} von {pagination.pages} ({pagination.total} Einträge)
              </div>
            </>
          )}
        </>
      )}

      {/* Detail Modal */}
      <FeedbackDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        feedbackId={selectedFeedback?.id ?? null}
        onDelete={handleDeleteFromModal}
        onCreateJira={handleCreateJira}
        jiraConfigured={jiraConfigured}
      />

      {/* Delete Dialog */}
      <FeedbackDeleteDialog
        isOpen={showDeleteDialog}
        onClose={handleCloseModals}
        feedback={selectedFeedback}
        onSuccess={handleFeedbackDeleted}
      />
    </Container>
  );
};

export default FeedbackAdminPage;
