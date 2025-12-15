/**
 * Backup Codes List Component
 * STORY-005C: MFA UI (Frontend)
 *
 * Displays MFA backup codes with copy and download functionality.
 * Allows users to save their backup codes securely.
 *
 * Features:
 * - Display backup codes in a grid layout
 * - Copy all codes to clipboard
 * - Download codes as a text file
 * - Mark used codes (optional)
 * - Responsive design
 * - Accessible with keyboard navigation
 */

import React, { useState, useCallback } from 'react';
import './BackupCodesList.css';

/**
 * BackupCodesList Props
 */
export interface BackupCodesListProps {
  /** Array of backup codes */
  codes: string[];
  /** Array of used/consumed code indices */
  usedCodes?: number[];
  /** Whether to show download button */
  showDownload?: boolean;
  /** Whether to show copy button */
  showCopy?: boolean;
  /** Application name for the downloaded file */
  appName?: string;
  /** Test ID for E2E tests */
  'data-testid'?: string;
}

/**
 * BackupCodesList Component
 *
 * Displays MFA backup codes with copy and download functionality.
 */
export const BackupCodesList: React.FC<BackupCodesListProps> = ({
  codes,
  usedCodes = [],
  showDownload = true,
  showCopy = true,
  appName = 'App',
  'data-testid': testId = 'backup-codes-list',
}) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  /**
   * Copy all codes to clipboard
   */
  const handleCopyToClipboard = useCallback(async () => {
    const codesText = codes.join('\n');
    try {
      await navigator.clipboard.writeText(codesText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      // Fallback for browsers without clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = codesText;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [codes]);

  /**
   * Download codes as a text file
   */
  const handleDownload = useCallback(() => {
    const date = new Date().toISOString().split('T')[0];
    const filename = `${appName.toLowerCase().replace(/\s+/g, '-')}-backup-codes-${date}.txt`;

    const header = `# ${appName} - MFA Backup Codes\n`;
    const generatedDate = `# Generated: ${new Date().toLocaleDateString('de-DE')}\n`;
    const warning = `# WARNING: Keep these codes safe and secure!\n`;
    const separator = `# Each code can only be used once.\n\n`;
    const codesText = codes.map((code, i) => `${i + 1}. ${code}`).join('\n');

    const content = header + generatedDate + warning + separator + codesText;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2000);
  }, [codes, appName]);

  /**
   * Check if a code is used
   */
  const isCodeUsed = useCallback(
    (index: number): boolean => {
      return usedCodes.includes(index);
    },
    [usedCodes]
  );

  return (
    <div className="backup-codes-list" data-testid={testId}>
      {/* Header */}
      <div className="backup-codes-list__header">
        <h3 className="backup-codes-list__title">Backup-Codes</h3>
        <p className="backup-codes-list__description">
          Speichern Sie diese Codes an einem sicheren Ort. Jeder Code kann nur einmal verwendet werden.
        </p>
      </div>

      {/* Codes Grid */}
      <div className="backup-codes-list__grid" data-testid={`${testId}-grid`}>
        {codes.map((code, index) => (
          <div
            key={index}
            className={`backup-codes-list__code ${isCodeUsed(index) ? 'backup-codes-list__code--used' : ''}`}
            data-testid={`${testId}-code-${index}`}
          >
            <span className="backup-codes-list__code-number">{index + 1}.</span>
            <code className="backup-codes-list__code-value">
              {isCodeUsed(index) ? (
                <span className="backup-codes-list__code-used">Verwendet</span>
              ) : (
                code
              )}
            </code>
          </div>
        ))}
      </div>

      {/* Warning */}
      <div className="backup-codes-list__warning" role="alert">
        <span className="backup-codes-list__warning-icon" aria-hidden="true">
          ⚠️
        </span>
        <span>
          Diese Codes werden nur einmal angezeigt. Laden Sie sie herunter oder kopieren Sie sie jetzt.
        </span>
      </div>

      {/* Actions */}
      <div className="backup-codes-list__actions">
        {showCopy && (
          <button
            type="button"
            onClick={handleCopyToClipboard}
            className="backup-codes-list__button backup-codes-list__button--secondary"
            aria-label="Codes in Zwischenablage kopieren"
            data-testid={`${testId}-copy-button`}
          >
            {copySuccess ? (
              <>
                <span aria-hidden="true">✓</span>
                Kopiert!
              </>
            ) : (
              <>
                <span aria-hidden="true">📋</span>
                Codes kopieren
              </>
            )}
          </button>
        )}
        {showDownload && (
          <button
            type="button"
            onClick={handleDownload}
            className="backup-codes-list__button backup-codes-list__button--primary"
            aria-label="Codes als Datei herunterladen"
            data-testid={`${testId}-download-button`}
          >
            {downloadSuccess ? (
              <>
                <span aria-hidden="true">✓</span>
                Heruntergeladen!
              </>
            ) : (
              <>
                <span aria-hidden="true">⬇️</span>
                Codes herunterladen
              </>
            )}
          </button>
        )}
      </div>

      {/* Remaining count */}
      {usedCodes.length > 0 && (
        <p className="backup-codes-list__remaining">
          {codes.length - usedCodes.length} von {codes.length} Codes verbleibend
        </p>
      )}
    </div>
  );
};

export default BackupCodesList;
