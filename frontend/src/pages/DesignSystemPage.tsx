/**
 * Design System Page
 * Design System: Color Schemes Management
 *
 * Comprehensive design system page with:
 * - Color scheme management (create, edit, delete, apply)
 * - Live preview of all component styles
 * - Button styles (normal, inactive, abort, special, danger, success)
 * - Typography styles (headings, body, labels, code)
 * - Input field styles
 * - Card/Panel styles
 * - Badge styles
 * - Alert styles
 *
 * BUG-004 Fix: Updated modal translation keys to match translation files:
 * - modal.createTitle -> modal.create.title
 * - modal.schemeName -> modal.create.placeholder
 * - modal.deleteTitle -> modal.delete.title
 * - modal.deleteConfirm -> modal.delete.confirm
 *
 * Color scheme descriptions now support i18n via description_key field
 * which maps to schemeDescriptions.{key} in the design translation namespace.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { designService, ColorScheme, UpdateColorSchemeDto, ImportColorSchemeDto } from '../services/designService';
import { useAuth } from '../contexts/AuthContext';
import {
  TabType,
  TabDefinition,
  deepMerge,
  BaseTab,
  ButtonsTab,
  TypographyTab,
  InputsTab,
  CardsTab,
  BadgesTab,
  AlertsTab,
} from '../components/design';

// Helper to apply a color change directly to CSS variables for live preview
function applyCssVariable(path: string, value: string): void {
  const root = document.documentElement;

  // Map design system paths to CSS variable names
  const pathToCssVar: Record<string, string> = {
    'colors.primary': '--color-primary',
    'colors.primaryHover': '--color-primary-hover',
    'colors.primaryLight': '--color-primary-light',
    'colors.secondary': '--color-secondary',
    'colors.accent': '--color-accent',
    'colors.background.page': '--color-background-page',
    'colors.background.card': '--color-background-card',
    'colors.background.sidebar': '--color-background-sidebar',
    'colors.background.modal': '--color-background-modal',
    'colors.background.input': '--color-background-input',
    'colors.text.primary': '--color-text-primary',
    'colors.text.secondary': '--color-text-secondary',
    'colors.text.muted': '--color-text-muted',
    'colors.text.inverse': '--color-text-inverse',
    'colors.text.link': '--color-text-link',
    'colors.status.success': '--color-success',
    'colors.status.warning': '--color-warning',
    'colors.status.error': '--color-error',
    'colors.status.info': '--color-info',
    'colors.border.light': '--color-border-light',
    'colors.border.default': '--color-border-default',
    'colors.border.dark': '--color-border-dark',
  };

  const cssVar = pathToCssVar[path];
  if (cssVar) {
    root.style.setProperty(cssVar, value);
  }
}

export function DesignSystemPage() {
  const { t } = useTranslation('design');
  const { hasPermission } = useAuth();
  const canManage = hasPermission('design.manage');

  // State
  const [schemes, setSchemes] = useState<ColorScheme[]>([]);
  const [selectedScheme, setSelectedScheme] = useState<ColorScheme | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('base');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newSchemeName, setNewSchemeName] = useState('');
  const [renameSchemeName, setRenameSchemeName] = useState('');
  const [importData, setImportData] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refs for debounced color changes
  const pendingChangesRef = useRef<UpdateColorSchemeDto>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingColorRef = useRef(false);

  // Load schemes
  const loadSchemes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await designService.getSchemes();
      setSchemes(data);
      // Select the active scheme by default
      const active = data.find(s => s.is_active) || data[0];
      if (active) {
        setSelectedScheme(active);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load color schemes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchemes();
  }, [loadSchemes]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Create new scheme
  const handleCreateScheme = async () => {
    if (!newSchemeName.trim()) return;

    setIsSaving(true);
    try {
      const newScheme = await designService.createScheme({
        name: newSchemeName.trim(),
        description: 'New custom color scheme',
      });
      setSchemes(prev => [...prev, newScheme]);
      setSelectedScheme(newScheme);
      setShowCreateModal(false);
      setNewSchemeName('');
      setSuccessMessage('Color scheme created successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create color scheme');
    } finally {
      setIsSaving(false);
    }
  };

  // Duplicate scheme
  const handleDuplicateScheme = async () => {
    if (!selectedScheme) return;

    setIsSaving(true);
    try {
      const duplicated = await designService.duplicateScheme(
        selectedScheme.id,
        `${selectedScheme.name} (Copy)`
      );
      setSchemes(prev => [...prev, duplicated]);
      setSelectedScheme(duplicated);
      setSuccessMessage('Color scheme duplicated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate color scheme');
    } finally {
      setIsSaving(false);
    }
  };

  // Rename scheme
  const handleRenameScheme = async () => {
    if (!selectedScheme || !renameSchemeName.trim()) return;

    setIsSaving(true);
    try {
      const renamed = await designService.renameScheme(selectedScheme.id, renameSchemeName.trim());
      setSchemes(prev => prev.map(s => s.id === renamed.id ? renamed : s));
      setSelectedScheme(renamed);
      setShowRenameModal(false);
      setRenameSchemeName('');
      setSuccessMessage(t('messages.schemeRenamed'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.renameFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  // Open rename modal
  const openRenameModal = () => {
    if (selectedScheme) {
      setRenameSchemeName(selectedScheme.name);
      setShowRenameModal(true);
    }
  };

  // Apply scheme
  const handleApplyScheme = async () => {
    if (!selectedScheme) return;

    setIsSaving(true);
    try {
      const applied = await designService.applyScheme(selectedScheme.id);
      setSchemes(prev => prev.map(s => ({
        ...s,
        is_active: s.id === applied.id,
      })));
      setSelectedScheme(applied);
      setSuccessMessage('Color scheme applied successfully');
      // Trigger theme refresh
      window.dispatchEvent(new CustomEvent('theme-changed'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply color scheme');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete scheme
  const handleDeleteScheme = async () => {
    if (!selectedScheme || selectedScheme.is_default) return;

    setIsSaving(true);
    try {
      await designService.deleteScheme(selectedScheme.id);
      const remaining = schemes.filter(s => s.id !== selectedScheme.id);
      setSchemes(remaining);
      setSelectedScheme(remaining[0] || null);
      setShowDeleteModal(false);
      setSuccessMessage('Color scheme deleted successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete color scheme');
    } finally {
      setIsSaving(false);
    }
  };

  // Save pending color changes to API
  const savePendingChanges = useCallback(async () => {
    if (!selectedScheme || isSavingColorRef.current) return;

    const changes = pendingChangesRef.current;
    if (Object.keys(changes).length === 0) return;

    isSavingColorRef.current = true;
    const schemeId = selectedScheme.id;
    const isActiveScheme = selectedScheme.is_active;

    // Clear pending changes before saving
    pendingChangesRef.current = {};

    try {
      const updated = await designService.updateScheme(schemeId, changes);
      // Only update if there are no new pending changes
      if (Object.keys(pendingChangesRef.current).length === 0) {
        setSchemes(prev => prev.map(s => s.id === updated.id ? updated : s));
        setSelectedScheme(updated);
      }
      // If we're editing the active scheme, refresh the global theme
      if (isActiveScheme) {
        window.dispatchEvent(new CustomEvent('theme-changed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update color');
      // Re-add failed changes to pending
      pendingChangesRef.current = deepMerge(changes, pendingChangesRef.current);
    } finally {
      isSavingColorRef.current = false;
      // If new changes accumulated during save, trigger another save
      if (Object.keys(pendingChangesRef.current).length > 0) {
        savePendingChanges();
      }
    }
  }, [selectedScheme]);

  // Update color/typography in scheme with debouncing
  const handleColorChange = useCallback((path: string, value: string) => {
    if (!selectedScheme || !canManage) return;

    // Parse path like "colors.primary", "colors.background.page", or "typography.heading.h1.fontSize"
    const parts = path.split('.');
    const category = parts[0] as keyof UpdateColorSchemeDto;

    // Build update object based on path depth
    let updateData: UpdateColorSchemeDto = {};
    if (parts.length === 2) {
      // e.g., "colors.primary"
      updateData = { [category]: { [parts[1]]: value } };
    } else if (parts.length === 3) {
      // e.g., "colors.background.page" or "typography.fontFamily.primary"
      updateData = { [category]: { [parts[1]]: { [parts[2]]: value } } };
    } else if (parts.length === 4) {
      // e.g., "typography.heading.h1.fontSize"
      updateData = { [category]: { [parts[1]]: { [parts[2]]: { [parts[3]]: value } } } };
    }

    // Accumulate changes
    pendingChangesRef.current = deepMerge(pendingChangesRef.current, updateData);

    // Update local state immediately (optimistic update)
    setSelectedScheme(prev => {
      if (!prev) return prev;
      return deepMerge(prev, updateData);
    });
    setSchemes(prev => prev.map(s => {
      if (s.id !== selectedScheme.id) return s;
      return deepMerge(s, updateData);
    }));

    // Apply CSS variable immediately for live preview if editing the active scheme
    if (selectedScheme.is_active) {
      applyCssVariable(path, value);
    }

    // Debounce API call - wait 500ms after last change
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      savePendingChanges();
    }, 500);
  }, [selectedScheme, canManage, savePendingChanges]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Set scheme as light mode
  const handleSetAsLightScheme = async (schemeId: number, isLight: boolean) => {
    if (!canManage) return;

    setIsSaving(true);
    try {
      if (isLight) {
        await designService.setAsLightScheme(schemeId);
      } else {
        await designService.clearLightScheme(schemeId);
      }
      await loadSchemes();
      setSuccessMessage(isLight ? 'Scheme set as Light Mode' : 'Light Mode cleared');
      // Notify DarkModeContext about the change
      window.dispatchEvent(new CustomEvent('scheme-modes-changed'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update light mode');
    } finally {
      setIsSaving(false);
    }
  };

  // Set scheme as dark mode
  const handleSetAsDarkScheme = async (schemeId: number, isDark: boolean) => {
    if (!canManage) return;

    setIsSaving(true);
    try {
      if (isDark) {
        await designService.setAsDarkScheme(schemeId);
      } else {
        await designService.clearDarkScheme(schemeId);
      }
      await loadSchemes();
      setSuccessMessage(isDark ? 'Scheme set as Dark Mode' : 'Dark Mode cleared');
      // Notify DarkModeContext about the change
      window.dispatchEvent(new CustomEvent('scheme-modes-changed'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update dark mode');
    } finally {
      setIsSaving(false);
    }
  };

  // Export scheme
  const handleExportScheme = async () => {
    if (!selectedScheme) return;

    try {
      const exportData = await designService.exportScheme(selectedScheme.id);
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportData.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-theme.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessMessage(t('messages.exportSuccess'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('messages.exportError'));
    }
  };

  // Handle file selection for import
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportData(content);
      setImportError(null);
    };
    reader.onerror = () => {
      setImportError(t('messages.fileReadError'));
    };
    reader.readAsText(file);
  };

  // Import scheme
  const handleImportScheme = async () => {
    if (!importData.trim()) {
      setImportError(t('messages.noDataToImport'));
      return;
    }

    try {
      const parsed = JSON.parse(importData);

      // Validate required fields
      if (!parsed.name || !parsed.colors || !parsed.buttons || !parsed.typography ||
          !parsed.inputs || !parsed.cards || !parsed.badges || !parsed.alerts) {
        setImportError(t('messages.invalidSchemeFormat'));
        return;
      }

      const importDto: ImportColorSchemeDto = {
        name: parsed.name,
        description: parsed.description,
        colors: parsed.colors,
        buttons: parsed.buttons,
        typography: parsed.typography,
        inputs: parsed.inputs,
        cards: parsed.cards,
        badges: parsed.badges,
        alerts: parsed.alerts,
      };

      setIsSaving(true);
      const newScheme = await designService.importScheme(importDto);
      setSchemes(prev => [...prev, newScheme]);
      setSelectedScheme(newScheme);
      setShowImportModal(false);
      setImportData('');
      setImportError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSuccessMessage(t('messages.importSuccess'));
    } catch (err) {
      if (err instanceof SyntaxError) {
        setImportError(t('messages.invalidJson'));
      } else {
        setImportError(err instanceof Error ? err.message : t('messages.importError'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Render tabs
  const tabs: TabDefinition[] = [
    { id: 'base', label: t('tabs.base') },
    { id: 'buttons', label: t('tabs.buttons') },
    { id: 'typography', label: t('tabs.typography') },
    { id: 'inputs', label: t('tabs.inputs') },
    { id: 'cards', label: t('tabs.cards') },
    { id: 'badges', label: t('tabs.badges') },
    { id: 'alerts', label: t('tabs.alerts') },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-background-page)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-neutral-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-neutral-200 rounded w-1/2 mb-8"></div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-neutral-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background-page)' }}>
      <div className="max-w-7xl mx-auto p-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">{t('title')}</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">
            {t('subtitle')}
          </p>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 animate-fade-in">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-green-700">{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-red-700">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex gap-8">
          {/* Sidebar - Scheme List */}
          <div className="w-64 flex-shrink-0">
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-background-card)', border: '1px solid var(--color-border-default)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-[var(--color-text-primary)]">{t('sidebar.title')}</h2>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="p-1.5 text-[var(--color-text-tertiary)] hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title={t('buttons.import')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="p-1.5 text-[var(--color-text-tertiary)] hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title={t('sidebar.createNew')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {schemes.map(scheme => (
                  <button
                    key={scheme.id}
                    onClick={() => setSelectedScheme(scheme)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedScheme?.id === scheme.id
                        ? 'bg-primary-50 text-primary-700 border border-primary-200'
                        : 'hover:bg-[var(--color-background-surface)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border border-neutral-300"
                        style={{ backgroundColor: scheme.colors.primary }}
                      />
                      <span className="font-medium truncate">{scheme.name}</span>
                      {scheme.is_active && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          {t('labels.active')}
                        </span>
                      )}
                      {scheme.is_light_scheme && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                          {t('labels.light')}
                        </span>
                      )}
                      {scheme.is_dark_scheme && (
                        <span className="text-xs bg-slate-700 text-white px-1.5 py-0.5 rounded">
                          {t('labels.dark')}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {selectedScheme && (
              <>
                {/* Scheme Header */}
                <div className="rounded-xl p-6 mb-6" style={{ backgroundColor: 'var(--color-background-card)', border: '1px solid var(--color-border-default)' }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-[var(--color-text-primary)]" data-testid="scheme-name">{selectedScheme.name}</h2>
                      <p className="text-[var(--color-text-tertiary)] mt-1" data-testid="scheme-description">
                        {selectedScheme.description_key
                          ? t(selectedScheme.description_key)
                          : selectedScheme.description || t('labels.noDescription')}
                      </p>

                      {/* Dark Mode Assignment Checkboxes */}
                      {canManage && (
                        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-neutral-100">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedScheme.is_light_scheme}
                              onChange={(e) => handleSetAsLightScheme(selectedScheme.id, e.target.checked)}
                              disabled={isSaving}
                              className="w-4 h-4 text-amber-600 bg-neutral-100 border-neutral-300 rounded focus:ring-amber-500"
                            />
                            <span className="text-sm text-[var(--color-text-secondary)]">
                              {t('labels.useAsLightMode')}
                              {selectedScheme.is_light_scheme && (
                                <span className="ml-1 text-xs text-amber-600">({t('labels.active')})</span>
                              )}
                            </span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedScheme.is_dark_scheme}
                              onChange={(e) => handleSetAsDarkScheme(selectedScheme.id, e.target.checked)}
                              disabled={isSaving}
                              className="w-4 h-4 text-slate-600 bg-neutral-100 border-neutral-300 rounded focus:ring-slate-500"
                            />
                            <span className="text-sm text-[var(--color-text-secondary)]">
                              {t('labels.useAsDarkMode')}
                              {selectedScheme.is_dark_scheme && (
                                <span className="ml-1 text-xs text-slate-600">({t('labels.active')})</span>
                              )}
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleExportScheme}
                          disabled={isSaving}
                          className="px-3 py-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background-surface)] rounded-lg transition-colors flex items-center gap-1"
                          title={t('buttons.export')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          {t('buttons.export')}
                        </button>
                        <button
                          onClick={handleDuplicateScheme}
                          disabled={isSaving}
                          className="px-3 py-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background-surface)] rounded-lg transition-colors"
                        >
                          {t('buttons.duplicate')}
                        </button>
                        <button
                          onClick={openRenameModal}
                          disabled={isSaving}
                          className="px-3 py-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background-surface)] rounded-lg transition-colors"
                        >
                          {t('buttons.rename')}
                        </button>
                        {!selectedScheme.is_active && (
                          <button
                            onClick={handleApplyScheme}
                            disabled={isSaving}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                          >
                            {t('buttons.applyScheme')}
                          </button>
                        )}
                        {!selectedScheme.is_default && (
                          <button
                            onClick={() => setShowDeleteModal(true)}
                            disabled={isSaving}
                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            {t('buttons.delete')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-background-card)', border: '1px solid var(--color-border-default)' }}>
                  <div className="border-b border-neutral-200">
                    <nav className="flex overflow-x-auto">
                      {tabs.map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`px-4 py-3 font-medium text-sm whitespace-nowrap transition-colors ${
                            activeTab === tab.id
                              ? 'text-[var(--color-primary,#3b82f6)] border-b-2 border-[var(--color-primary,#3b82f6)] bg-[var(--color-primary-light,#dbeafe)]/50'
                              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background-surface)]'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </nav>
                  </div>

                  {/* Tab Content */}
                  <div className="p-6">
                    {activeTab === 'base' && (
                      <BaseTab
                        scheme={selectedScheme}
                        t={t}
                        onColorChange={handleColorChange}
                        canEdit={canManage}
                      />
                    )}
                    {activeTab === 'buttons' && (
                      <ButtonsTab
                        scheme={selectedScheme}
                        t={t}
                        onColorChange={handleColorChange}
                        canEdit={canManage}
                      />
                    )}
                    {activeTab === 'typography' && (
                      <TypographyTab
                        scheme={selectedScheme}
                        onTypographyChange={handleColorChange}
                        canEdit={canManage}
                      />
                    )}
                    {activeTab === 'inputs' && (
                      <InputsTab
                        scheme={selectedScheme}
                        t={t}
                        onColorChange={handleColorChange}
                        canEdit={canManage}
                      />
                    )}
                    {activeTab === 'cards' && (
                      <CardsTab
                        scheme={selectedScheme}
                        t={t}
                        onColorChange={handleColorChange}
                        canEdit={canManage}
                      />
                    )}
                    {activeTab === 'badges' && (
                      <BadgesTab
                        scheme={selectedScheme}
                        t={t}
                        onColorChange={handleColorChange}
                        canEdit={canManage}
                      />
                    )}
                    {activeTab === 'alerts' && (
                      <AlertsTab
                        scheme={selectedScheme}
                        t={t}
                        onColorChange={handleColorChange}
                        canEdit={canManage}
                      />
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-xl p-6 w-full max-w-md" style={{ backgroundColor: 'var(--color-background-card)' }}>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">{t('modal.create.title')}</h3>
            <input
              type="text"
              value={newSchemeName}
              onChange={(e) => setNewSchemeName(e.target.value)}
              placeholder={t('modal.create.placeholder')}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewSchemeName('');
                }}
                className="px-4 py-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-background-surface)] rounded-lg transition-colors"
              >
                {t('buttons.cancel')}
              </button>
              <button
                onClick={handleCreateScheme}
                disabled={!newSchemeName.trim() || isSaving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {t('buttons.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-xl p-6 w-full max-w-md" style={{ backgroundColor: 'var(--color-background-card)' }}>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">{t('modal.delete.title')}</h3>
            <p className="text-[var(--color-text-secondary)] mb-6">
              {t('modal.delete.confirm', { name: selectedScheme?.name })}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-background-surface)] rounded-lg transition-colors"
              >
                {t('buttons.cancel')}
              </button>
              <button
                onClick={handleDeleteScheme}
                disabled={isSaving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {t('buttons.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-xl p-6 w-full max-w-lg" style={{ backgroundColor: 'var(--color-background-card)' }}>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">{t('modal.import.title')}</h3>

            {/* File Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                {t('modal.import.selectFile')}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
            </div>

            {/* Or paste JSON */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                {t('modal.import.orPasteJson')}
              </label>
              <textarea
                value={importData}
                onChange={(e) => {
                  setImportData(e.target.value);
                  setImportError(null);
                }}
                placeholder={t('modal.import.jsonPlaceholder')}
                rows={8}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
              />
            </div>

            {/* Error message */}
            {importError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {importError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportData('');
                  setImportError(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="px-4 py-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-background-surface)] rounded-lg transition-colors"
              >
                {t('buttons.cancel')}
              </button>
              <button
                onClick={handleImportScheme}
                disabled={!importData.trim() || isSaving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {t('buttons.import')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-xl p-6 w-full max-w-md" style={{ backgroundColor: 'var(--color-background-card)' }}>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">{t('modal.rename.title')}</h3>
            <input
              type="text"
              value={renameSchemeName}
              onChange={(e) => setRenameSchemeName(e.target.value)}
              placeholder={t('modal.rename.placeholder')}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameSchemeName.trim()) {
                  handleRenameScheme();
                }
              }}
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRenameModal(false);
                  setRenameSchemeName('');
                }}
                className="px-4 py-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-background-surface)] rounded-lg transition-colors"
              >
                {t('buttons.cancel')}
              </button>
              <button
                onClick={handleRenameScheme}
                disabled={!renameSchemeName.trim() || isSaving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {t('buttons.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DesignSystemPage;
