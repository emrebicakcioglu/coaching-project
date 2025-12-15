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
 */

import { useState, useEffect, useCallback } from 'react';
import { designService, ColorScheme, UpdateColorSchemeDto } from '../services/designService';
import { useAuth } from '../contexts/AuthContext';

type TabType = 'overview' | 'colors' | 'buttons' | 'typography' | 'inputs' | 'cards' | 'badges' | 'alerts';

export function DesignSystemPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('design.manage');

  // State
  const [schemes, setSchemes] = useState<ColorScheme[]>([]);
  const [selectedScheme, setSelectedScheme] = useState<ColorScheme | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newSchemeName, setNewSchemeName] = useState('');

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

  // Update color in scheme
  const handleColorChange = async (path: string, value: string) => {
    if (!selectedScheme || !canManage) return;

    // Parse path like "colors.primary" or "colors.background.page"
    const parts = path.split('.');
    const category = parts[0] as keyof UpdateColorSchemeDto;

    // Build update object
    let updateData: UpdateColorSchemeDto = {};
    if (parts.length === 2) {
      updateData = { [category]: { [parts[1]]: value } };
    } else if (parts.length === 3) {
      updateData = { [category]: { [parts[1]]: { [parts[2]]: value } } };
    }

    try {
      const updated = await designService.updateScheme(selectedScheme.id, updateData);
      setSchemes(prev => prev.map(s => s.id === updated.id ? updated : s));
      setSelectedScheme(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update color');
    }
  };
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


  // Render tabs
  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'colors', label: 'Colors' },
    { id: 'buttons', label: 'Buttons' },
    { id: 'typography', label: 'Typography' },
    { id: 'inputs', label: 'Inputs' },
    { id: 'cards', label: 'Cards' },
    { id: 'badges', label: 'Badges' },
    { id: 'alerts', label: 'Alerts' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 p-8">
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
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Design System</h1>
          <p className="text-neutral-600 mt-1">
            Manage color schemes and design tokens for the application
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
                <h2 className="font-semibold text-[var(--color-text-primary)]">Color Schemes</h2>
                {canManage && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="p-1.5 text-neutral-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Create new scheme"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
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
                        : 'hover:bg-neutral-50 text-neutral-700'
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
                          Active
                        </span>
                      )}
                      {scheme.is_light_scheme && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                          Light
                        </span>
                      )}
                      {scheme.is_dark_scheme && (
                        <span className="text-xs bg-slate-700 text-white px-1.5 py-0.5 rounded">
                          Dark
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
                      <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">{selectedScheme.name}</h2>
                      <p className="text-neutral-500 mt-1">{selectedScheme.description || 'No description'}</p>
                      
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
                            <span className="text-sm text-neutral-700">
                              Use as Light Mode
                              {selectedScheme.is_light_scheme && (
                                <span className="ml-1 text-xs text-amber-600">(Active)</span>
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
                            <span className="text-sm text-neutral-700">
                              Use as Dark Mode
                              {selectedScheme.is_dark_scheme && (
                                <span className="ml-1 text-xs text-slate-600">(Active)</span>
                              )}
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleDuplicateScheme}
                          disabled={isSaving}
                          className="px-3 py-2 text-neutral-600 hover:text-[var(--color-text-primary)] hover:bg-neutral-100 rounded-lg transition-colors"
                        >
                          Duplicate
                        </button>
                        {!selectedScheme.is_active && (
                          <button
                            onClick={handleApplyScheme}
                            disabled={isSaving}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                          >
                            Apply Scheme
                          </button>
                        )}
                        {!selectedScheme.is_default && (
                          <button
                            onClick={() => setShowDeleteModal(true)}
                            disabled={isSaving}
                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            Delete
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
                              ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50'
                              : 'text-neutral-600 hover:text-[var(--color-text-primary)] hover:bg-neutral-50'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </nav>
                  </div>

                  {/* Tab Content */}
                  <div className="p-6">
                    {activeTab === 'overview' && (
                      <OverviewTab scheme={selectedScheme} />
                    )}
                    {activeTab === 'colors' && (
                      <ColorsTab
                        scheme={selectedScheme}
                        onColorChange={handleColorChange}
                        canEdit={canManage}
                      />
                    )}
                    {activeTab === 'buttons' && (
                      <ButtonsTab scheme={selectedScheme} />
                    )}
                    {activeTab === 'typography' && (
                      <TypographyTab scheme={selectedScheme} />
                    )}
                    {activeTab === 'inputs' && (
                      <InputsTab scheme={selectedScheme} />
                    )}
                    {activeTab === 'cards' && (
                      <CardsTab scheme={selectedScheme} />
                    )}
                    {activeTab === 'badges' && (
                      <BadgesTab scheme={selectedScheme} />
                    )}
                    {activeTab === 'alerts' && (
                      <AlertsTab scheme={selectedScheme} />
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
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Create Color Scheme</h3>
            <input
              type="text"
              value={newSchemeName}
              onChange={(e) => setNewSchemeName(e.target.value)}
              placeholder="Scheme name"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewSchemeName('');
                }}
                className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateScheme}
                disabled={!newSchemeName.trim() || isSaving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-xl p-6 w-full max-w-md" style={{ backgroundColor: 'var(--color-background-card)' }}>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Delete Color Scheme</h3>
            <p className="text-neutral-600 mb-6">
              Are you sure you want to delete "{selectedScheme?.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteScheme}
                disabled={isSaving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Tab Components

function OverviewTab({ scheme }: { scheme: ColorScheme }) {
  return (
    <div className="space-y-8">
      {/* Color Palette Preview */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Color Palette</h3>
        <div className="grid grid-cols-6 gap-4">
          {['primary', 'secondary', 'accent'].map(color => (
            <div key={color} className="text-center">
              <div
                className="w-full aspect-square rounded-lg border border-neutral-200 mb-2"
                style={{ backgroundColor: (scheme.colors as any)[color] }}
              />
              <span className="text-sm text-neutral-600 capitalize">{color}</span>
            </div>
          ))}
          {['success', 'warning', 'error'].map(color => (
            <div key={color} className="text-center">
              <div
                className="w-full aspect-square rounded-lg border border-neutral-200 mb-2"
                style={{ backgroundColor: (scheme.colors.status as any)[color] }}
              />
              <span className="text-sm text-neutral-600 capitalize">{color}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Preview */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Quick Preview</h3>
        <div
          className="p-6 rounded-xl border"
          style={{
            backgroundColor: scheme.colors.background.card,
            borderColor: scheme.colors.border.light,
          }}
        >
          <h4
            className="text-xl font-semibold mb-2"
            style={{ color: scheme.colors.text.primary }}
          >
            Sample Card Title
          </h4>
          <p
            className="mb-4"
            style={{ color: scheme.colors.text.secondary }}
          >
            This is a preview of how content will look with this color scheme applied.
          </p>
          <div className="flex gap-3">
            <button
              className="px-4 py-2 rounded-lg font-medium"
              style={{
                backgroundColor: scheme.buttons.normal.background,
                color: scheme.buttons.normal.text,
              }}
            >
              Primary Button
            </button>
            <button
              className="px-4 py-2 rounded-lg font-medium"
              style={{
                backgroundColor: scheme.buttons.abort.background,
                color: scheme.buttons.abort.text,
                border: `1px solid ${scheme.buttons.abort.border}`,
              }}
            >
              Secondary Button
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorsTab({
  scheme,
  onColorChange,
  canEdit,
}: {
  scheme: ColorScheme;
  onColorChange: (path: string, value: string) => void;
  canEdit: boolean;
}) {
  const ColorInput = ({
    label,
    path,
    value,
  }: {
    label: string;
    path: string;
    value: string;
  }) => (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => canEdit && onColorChange(path, e.target.value)}
        disabled={!canEdit}
        className="w-10 h-10 rounded cursor-pointer disabled:cursor-not-allowed"
      />
      <div className="flex-1">
        <label className="text-sm font-medium text-neutral-700">{label}</label>
        <div className="text-xs text-neutral-500 font-mono">{value}</div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-8">
      {/* Primary Colors */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Primary Colors</h3>
        <div className="space-y-4">
          <ColorInput label="Primary" path="colors.primary" value={scheme.colors.primary} />
          <ColorInput label="Primary Hover" path="colors.primaryHover" value={scheme.colors.primaryHover} />
          <ColorInput label="Primary Light" path="colors.primaryLight" value={scheme.colors.primaryLight} />
          <ColorInput label="Secondary" path="colors.secondary" value={scheme.colors.secondary} />
          <ColorInput label="Accent" path="colors.accent" value={scheme.colors.accent} />
        </div>
      </div>

      {/* Background Colors */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Background Colors</h3>
        <div className="space-y-4">
          <ColorInput label="Page Background" path="colors.background.page" value={scheme.colors.background.page} />
          <ColorInput label="Card Background" path="colors.background.card" value={scheme.colors.background.card} />
          <ColorInput label="Sidebar Background" path="colors.background.sidebar" value={scheme.colors.background.sidebar} />
          <ColorInput label="Modal Background" path="colors.background.modal" value={scheme.colors.background.modal} />
          <ColorInput label="Input Background" path="colors.background.input" value={scheme.colors.background.input} />
        </div>
      </div>

      {/* Text Colors */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Text Colors</h3>
        <div className="space-y-4">
          <ColorInput label="Primary Text" path="colors.text.primary" value={scheme.colors.text.primary} />
          <ColorInput label="Secondary Text" path="colors.text.secondary" value={scheme.colors.text.secondary} />
          <ColorInput label="Muted Text" path="colors.text.muted" value={scheme.colors.text.muted} />
          <ColorInput label="Inverse Text" path="colors.text.inverse" value={scheme.colors.text.inverse} />
          <ColorInput label="Link Text" path="colors.text.link" value={scheme.colors.text.link} />
        </div>
      </div>

      {/* Status Colors */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Status Colors</h3>
        <div className="space-y-4">
          <ColorInput label="Success" path="colors.status.success" value={scheme.colors.status.success} />
          <ColorInput label="Success Light" path="colors.status.successLight" value={scheme.colors.status.successLight} />
          <ColorInput label="Warning" path="colors.status.warning" value={scheme.colors.status.warning} />
          <ColorInput label="Warning Light" path="colors.status.warningLight" value={scheme.colors.status.warningLight} />
          <ColorInput label="Error" path="colors.status.error" value={scheme.colors.status.error} />
          <ColorInput label="Error Light" path="colors.status.errorLight" value={scheme.colors.status.errorLight} />
        </div>
      </div>

      {/* Border Colors */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Border Colors</h3>
        <div className="space-y-4">
          <ColorInput label="Border Light" path="colors.border.light" value={scheme.colors.border.light} />
          <ColorInput label="Border Default" path="colors.border.default" value={scheme.colors.border.default} />
          <ColorInput label="Border Dark" path="colors.border.dark" value={scheme.colors.border.dark} />
        </div>
      </div>
    </div>
  );
}

function ButtonsTab({ scheme }: { scheme: ColorScheme }) {
  const buttonTypes = [
    { key: 'normal', label: 'Normal Button', description: 'Primary action button' },
    { key: 'inactive', label: 'Inactive Button', description: 'Disabled state button' },
    { key: 'abort', label: 'Abort Button', description: 'Cancel/secondary action' },
    { key: 'special', label: 'Special Button', description: 'Gradient/highlighted action' },
    { key: 'danger', label: 'Danger Button', description: 'Destructive actions' },
    { key: 'success', label: 'Success Button', description: 'Positive actions' },
  ] as const;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Button Styles</h3>
      <div className="grid grid-cols-3 gap-6">
        {buttonTypes.map(({ key, label, description }) => {
          const style = scheme.buttons[key];
          return (
            <div key={key} className="p-4 bg-neutral-50 rounded-lg">
              <div className="mb-4">
                <h4 className="font-medium text-[var(--color-text-primary)]">{label}</h4>
                <p className="text-sm text-neutral-500">{description}</p>
              </div>
              <div className="space-y-3">
                <button
                  className="w-full px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{
                    background: style.background,
                    color: style.text,
                    border: style.border !== 'transparent' ? `1px solid ${style.border}` : 'none',
                  }}
                >
                  {label}
                </button>
                <button
                  className="w-full px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{
                    background: style.hoverBackground,
                    color: style.hoverText,
                    border: style.hoverBorder !== 'transparent' ? `1px solid ${style.hoverBorder}` : 'none',
                  }}
                >
                  Hover State
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TypographyTab({ scheme }: { scheme: ColorScheme }) {
  return (
    <div className="space-y-8">
      {/* Headings */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Headings</h3>
        <div className="space-y-4 p-6 bg-neutral-50 rounded-lg">
          {(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const).map(tag => {
            const style = scheme.typography.heading[tag];
            return (
              <div
                key={tag}
                style={{
                  fontSize: style.fontSize,
                  fontWeight: style.fontWeight,
                  lineHeight: style.lineHeight,
                  fontFamily: scheme.typography.fontFamily.primary,
                  color: scheme.colors.text.primary,
                }}
              >
                {tag.toUpperCase()} - {style.fontSize} / {style.fontWeight}
              </div>
            );
          })}
        </div>
      </div>

      {/* Body Text */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Body Text</h3>
        <div className="space-y-4 p-6 bg-neutral-50 rounded-lg">
          {(['large', 'normal', 'small'] as const).map(size => {
            const style = scheme.typography.body[size];
            return (
              <p
                key={size}
                style={{
                  fontSize: style.fontSize,
                  fontWeight: style.fontWeight,
                  lineHeight: style.lineHeight,
                  fontFamily: scheme.typography.fontFamily.primary,
                  color: size === 'small' ? scheme.colors.text.secondary : scheme.colors.text.primary,
                }}
              >
                Body {size}: The quick brown fox jumps over the lazy dog. ({style.fontSize})
              </p>
            );
          })}
        </div>
      </div>

      {/* Labels */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Labels</h3>
        <div className="flex gap-6 p-6 bg-neutral-50 rounded-lg">
          {(['large', 'normal', 'small'] as const).map(size => {
            const style = scheme.typography.label[size];
            return (
              <span
                key={size}
                style={{
                  fontSize: style.fontSize,
                  fontWeight: style.fontWeight,
                  lineHeight: style.lineHeight,
                  textTransform: style.textTransform as any,
                  letterSpacing: style.letterSpacing,
                  color: scheme.colors.text.secondary,
                }}
              >
                Label {size}
              </span>
            );
          })}
        </div>
      </div>

      {/* Code */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Code</h3>
        <div className="p-6 bg-neutral-50 rounded-lg">
          <code
            className="px-2 py-1 rounded"
            style={{
              fontSize: scheme.typography.code.fontSize,
              fontFamily: scheme.typography.fontFamily.mono,
              backgroundColor: scheme.typography.code.background,
              color: scheme.typography.code.color,
            }}
          >
            const example = "code styling";
          </code>
        </div>
      </div>
    </div>
  );
}

function InputsTab({ scheme }: { scheme: ColorScheme }) {
  const inputStates = [
    { key: 'normal', label: 'Normal', placeholder: 'Enter text...' },
    { key: 'error', label: 'Error', placeholder: 'Invalid input' },
    { key: 'disabled', label: 'Disabled', placeholder: 'Disabled field' },
  ] as const;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Input Field Styles</h3>
      <div className="grid grid-cols-3 gap-6">
        {inputStates.map(({ key, label, placeholder }) => {
          const style = scheme.inputs[key];
          return (
            <div key={key} className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">{label} State</label>
              <input
                type="text"
                placeholder={placeholder}
                disabled={key === 'disabled'}
                className="w-full px-3 py-2 rounded-lg transition-all"
                style={{
                  backgroundColor: style.background,
                  color: style.text,
                  border: `1px solid ${style.border}`,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Textarea */}
      <div>
        <label className="text-sm font-medium text-neutral-700">Textarea</label>
        <textarea
          placeholder="Enter longer text..."
          rows={4}
          className="w-full mt-2 px-3 py-2 rounded-lg transition-all"
          style={{
            backgroundColor: scheme.inputs.normal.background,
            color: scheme.inputs.normal.text,
            border: `1px solid ${scheme.inputs.normal.border}`,
          }}
        />
      </div>

      {/* Select */}
      <div>
        <label className="text-sm font-medium text-neutral-700">Select</label>
        <select
          className="w-full mt-2 px-3 py-2 rounded-lg transition-all"
          style={{
            backgroundColor: scheme.inputs.normal.background,
            color: scheme.inputs.normal.text,
            border: `1px solid ${scheme.inputs.normal.border}`,
          }}
        >
          <option>Option 1</option>
          <option>Option 2</option>
          <option>Option 3</option>
        </select>
      </div>
    </div>
  );
}

function CardsTab({ scheme }: { scheme: ColorScheme }) {
  const cardStyles = [
    { key: 'default', label: 'Default Card' },
    { key: 'elevated', label: 'Elevated Card' },
    { key: 'flat', label: 'Flat Card' },
  ] as const;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Card Styles</h3>
      <div className="grid grid-cols-3 gap-6">
        {cardStyles.map(({ key, label }) => {
          const style = scheme.cards[key];
          return (
            <div
              key={key}
              className="p-6"
              style={{
                backgroundColor: style.background,
                border: style.border !== 'transparent' ? `1px solid ${style.border}` : 'none',
                boxShadow: style.shadow,
                borderRadius: style.borderRadius,
              }}
            >
              <h4 className="font-semibold mb-2" style={{ color: scheme.colors.text.primary }}>
                {label}
              </h4>
              <p className="text-sm" style={{ color: scheme.colors.text.secondary }}>
                This is an example of the {key} card style with its defined properties.
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BadgesTab({ scheme }: { scheme: ColorScheme }) {
  const badgeTypes = ['default', 'primary', 'secondary', 'success', 'warning', 'error', 'info'] as const;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Badge Styles</h3>
      <div className="flex flex-wrap gap-4">
        {badgeTypes.map(type => {
          const style = scheme.badges[type];
          return (
            <span
              key={type}
              className="px-3 py-1 rounded-full text-sm font-medium capitalize"
              style={{
                backgroundColor: style.background,
                color: style.text,
              }}
            >
              {type}
            </span>
          );
        })}
      </div>

      {/* Badge sizes */}
      <div>
        <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Badge Sizes</h4>
        <div className="flex items-center gap-4">
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: scheme.badges.primary.background,
              color: scheme.badges.primary.text,
            }}
          >
            Small
          </span>
          <span
            className="px-3 py-1 rounded-full text-sm font-medium"
            style={{
              backgroundColor: scheme.badges.primary.background,
              color: scheme.badges.primary.text,
            }}
          >
            Medium
          </span>
          <span
            className="px-4 py-1.5 rounded-full text-base font-medium"
            style={{
              backgroundColor: scheme.badges.primary.background,
              color: scheme.badges.primary.text,
            }}
          >
            Large
          </span>
        </div>
      </div>
    </div>
  );
}

function AlertsTab({ scheme }: { scheme: ColorScheme }) {
  const alertTypes = ['success', 'warning', 'error', 'info'] as const;
  const alertMessages = {
    success: 'Operation completed successfully!',
    warning: 'Please review your changes before proceeding.',
    error: 'An error occurred. Please try again.',
    info: 'Here is some helpful information for you.',
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Alert Styles</h3>
      <div className="space-y-4">
        {alertTypes.map(type => {
          const style = scheme.alerts[type];
          return (
            <div
              key={type}
              className="p-4 rounded-lg flex items-start gap-3"
              style={{
                backgroundColor: style.background,
                border: `1px solid ${style.border}`,
              }}
            >
              <svg
                className="w-5 h-5 flex-shrink-0 mt-0.5"
                style={{ color: style.icon }}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                {type === 'success' && (
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                )}
                {type === 'warning' && (
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                )}
                {type === 'error' && (
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                )}
                {type === 'info' && (
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                )}
              </svg>
              <div>
                <h4 className="font-medium capitalize" style={{ color: style.text }}>
                  {type} Alert
                </h4>
                <p className="text-sm mt-1" style={{ color: style.text }}>
                  {alertMessages[type]}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DesignSystemPage;
