/**
 * Languages Management Page
 * Multi-Language System
 *
 * Admin page for managing languages and translations.
 * Features:
 * - Language CRUD operations
 * - Translation table with inline editing
 * - Import/export functionality
 * - Namespace filtering
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Container } from '../components/layout';
import { Button, Card } from '../components/ui';
import { useAuth } from '../contexts';
import { languagesService, Language, CreateLanguageDto, UpdateLanguageDto } from '../services/languagesService';
import { logger } from '../services/loggerService';

// Styles
const styles = {
  container: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    margin: 0,
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
  },
  button: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  primaryButton: {
    backgroundColor: 'var(--color-primary)',
    color: 'white',
  },
  secondaryButton: {
    backgroundColor: 'var(--color-background-card)',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border-default)',
  },
  dangerButton: {
    backgroundColor: '#dc2626',
    color: 'white',
  },
  section: {
    backgroundColor: 'var(--color-background-card, #ffffff)',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '24px',
    border: '1px solid var(--color-border-default, #e5e7eb)',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    margin: '0 0 16px 0',
  },
  languageGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '12px',
  },
  languageCard: {
    padding: '16px',
    borderRadius: '8px',
    border: '2px solid var(--color-border-default)',
    minWidth: '140px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  languageCardActive: {
    borderColor: 'var(--color-primary)',
    backgroundColor: 'var(--color-primary-light, rgba(59, 130, 246, 0.1))',
  },
  languageCardDefault: {
    borderStyle: 'dashed' as const,
  },
  languageFlag: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  languageCode: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
  },
  languageName: {
    fontSize: '12px',
    color: 'var(--color-text-secondary)',
  },
  addCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100px',
    border: '2px dashed var(--color-border-default)',
    backgroundColor: 'transparent',
  },
  filterBar: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap' as const,
  },
  select: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--color-border-default)',
    backgroundColor: 'var(--color-background-card)',
    color: 'var(--color-text-primary)',
    fontSize: '14px',
  },
  searchInput: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--color-border-default)',
    backgroundColor: 'var(--color-background-card)',
    color: 'var(--color-text-primary)',
    fontSize: '14px',
    flex: 1,
    minWidth: '200px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '14px',
  },
  th: {
    padding: '12px',
    textAlign: 'left' as const,
    borderBottom: '2px solid var(--color-border-default)',
    color: 'var(--color-text-secondary)',
    fontWeight: 600,
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid var(--color-border-default)',
    color: 'var(--color-text-primary)',
  },
  editableCell: {
    cursor: 'text',
    padding: '8px',
    borderRadius: '4px',
  },
  cellInput: {
    width: '100%',
    padding: '8px',
    border: '1px solid var(--color-primary)',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'var(--color-background-card)',
    color: 'var(--color-text-primary)',
  },
  emptyCell: {
    color: 'var(--color-text-muted)',
    fontStyle: 'italic' as const,
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '11px',
    fontWeight: 500,
  },
  defaultBadge: {
    backgroundColor: 'var(--color-primary)',
    color: 'white',
  },
  modal: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'var(--color-background-card)',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 600,
    marginBottom: '20px',
    color: 'var(--color-text-primary)',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--color-text-primary)',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid var(--color-border-default)',
    backgroundColor: 'var(--color-background-card)',
    color: 'var(--color-text-primary)',
    fontSize: '14px',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
  },
  toast: {
    position: 'fixed' as const,
    bottom: '24px',
    right: '24px',
    padding: '12px 24px',
    borderRadius: '8px',
    backgroundColor: '#10b981',
    color: 'white',
    fontSize: '14px',
    fontWeight: 500,
    zIndex: 1001,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
  toastError: {
    backgroundColor: '#ef4444',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '16px',
  },
};

/**
 * Translation row interface
 */
interface TranslationRow {
  key: string;
  values: Record<string, string>;
}

/**
 * Toast notification state
 */
interface Toast {
  message: string;
  type: 'success' | 'error';
}

/**
 * Languages Page Component
 */
const LanguagesPage: React.FC = () => {
  const { t } = useTranslation('languages');
  const { hasPermission } = useAuth();

  // State
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null);

  // Form states
  const [formData, setFormData] = useState<CreateLanguageDto>({
    code: '',
    name: '',
    native_name: '',
    emoji_flag: '',
  });
  const [importData, setImportData] = useState({ json: '', namespace: '', merge: true });

  // Editing cell state
  const [editingCell, setEditingCell] = useState<{ key: string; lang: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  /**
   * Show toast notification
   */
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  /**
   * Load languages
   */
  const loadLanguages = useCallback(async () => {
    try {
      const data = await languagesService.getAll(true);
      setLanguages(data);
      if (data.length > 0 && !selectedLanguage) {
        setSelectedLanguage(data[0].code);
      }
    } catch (error) {
      logger.error('Failed to load languages', error);
      showToast(t('toast.loadError'), 'error');
    }
  }, [selectedLanguage]);

  /**
   * Load namespaces
   */
  const loadNamespaces = useCallback(async () => {
    try {
      const data = await languagesService.getNamespaces();
      setNamespaces(data);
    } catch (error) {
      logger.error('Failed to load namespaces', error);
    }
  }, []);

  /**
   * Load translations for all languages
   */
  const loadTranslations = useCallback(async () => {
    if (languages.length === 0) return;

    try {
      const translationData: Record<string, Record<string, string>> = {};

      for (const lang of languages) {
        try {
          const flat = await languagesService.getFlatTranslations(lang.code);
          translationData[lang.code] = flat;
        } catch {
          translationData[lang.code] = {};
        }
      }

      setTranslations(translationData);
    } catch (error) {
      logger.error('Failed to load translations', error);
    }
  }, [languages]);

  /**
   * Initialize
   */
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadLanguages();
      await loadNamespaces();
      setIsLoading(false);
    };
    init();
  }, []);

  /**
   * Load translations when languages change
   */
  useEffect(() => {
    if (languages.length > 0) {
      loadTranslations();
    }
  }, [languages, loadTranslations]);

  /**
   * Get all unique translation keys
   */
  const translationRows = useMemo<TranslationRow[]>(() => {
    const allKeys = new Set<string>();

    Object.values(translations).forEach(langTranslations => {
      Object.keys(langTranslations).forEach(key => allKeys.add(key));
    });

    const rows: TranslationRow[] = Array.from(allKeys)
      .filter(key => {
        // Filter by namespace
        if (selectedNamespace !== 'all') {
          if (!key.startsWith(selectedNamespace + '.')) {
            return false;
          }
        }
        // Filter by search query
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          if (!key.toLowerCase().includes(query)) {
            // Check if any translation contains the query
            const hasMatch = Object.values(translations).some(
              langTrans => langTrans[key]?.toLowerCase().includes(query)
            );
            if (!hasMatch) return false;
          }
        }
        return true;
      })
      .map(key => ({
        key,
        values: Object.fromEntries(
          languages.map(lang => [lang.code, translations[lang.code]?.[key] || ''])
        ),
      }))
      .sort((a, b) => a.key.localeCompare(b.key));

    return rows;
  }, [translations, languages, selectedNamespace, searchQuery]);

  /**
   * Handle create language
   */
  const handleCreateLanguage = async () => {
    try {
      await languagesService.create(formData);
      showToast(t('toast.created'));
      setShowCreateModal(false);
      setFormData({ code: '', name: '', native_name: '', emoji_flag: '' });
      await loadLanguages();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('toast.createError'), 'error');
    }
  };

  /**
   * Handle update language
   */
  const handleUpdateLanguage = async () => {
    if (!editingLanguage) return;

    try {
      await languagesService.update(editingLanguage.code, {
        name: formData.name,
        native_name: formData.native_name,
        emoji_flag: formData.emoji_flag,
      });
      showToast(t('toast.updated'));
      setShowEditModal(false);
      setEditingLanguage(null);
      await loadLanguages();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('toast.updateError'), 'error');
    }
  };

  /**
   * Handle delete language
   */
  const handleDeleteLanguage = async (code: string) => {
    if (!confirm(t('deleteConfirm'))) {
      return;
    }

    try {
      await languagesService.delete(code);
      showToast(t('toast.deleted'));
      await loadLanguages();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('toast.deleteError'), 'error');
    }
  };

  /**
   * Handle cell edit save
   */
  const handleCellSave = async () => {
    if (!editingCell) return;

    const { key, lang } = editingCell;
    const [namespace, ...keyParts] = key.split('.');
    const translationKey = keyParts.join('.');

    // Build nested object from flat key
    const buildNestedObject = (keys: string[], value: string): Record<string, unknown> => {
      if (keys.length === 1) {
        return { [keys[0]]: value };
      }
      return { [keys[0]]: buildNestedObject(keys.slice(1), value) };
    };

    try {
      await languagesService.updateTranslations(lang, {
        namespace,
        translations: buildNestedObject(keyParts, editValue),
      });

      // Update local state
      setTranslations(prev => ({
        ...prev,
        [lang]: {
          ...prev[lang],
          [key]: editValue,
        },
      }));

      setEditingCell(null);
      setEditValue('');
    } catch (error: any) {
      showToast(error.response?.data?.message || t('toast.saveError'), 'error');
    }
  };

  /**
   * Handle import
   */
  const handleImport = async () => {
    if (!selectedLanguage) return;

    try {
      const content = JSON.parse(importData.json);
      await languagesService.importTranslations(selectedLanguage, {
        namespace: importData.namespace || undefined,
        content,
        merge: importData.merge,
      });
      showToast(t('toast.imported'));
      setShowImportModal(false);
      setImportData({ json: '', namespace: '', merge: true });
      await loadTranslations();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('toast.importError'), 'error');
    }
  };

  /**
   * Handle export
   */
  const handleExport = async () => {
    if (!selectedLanguage) return;

    try {
      const data = await languagesService.exportTranslations(
        selectedLanguage,
        selectedNamespace !== 'all' ? selectedNamespace : undefined
      );

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedLanguage}${selectedNamespace !== 'all' ? `-${selectedNamespace}` : ''}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      showToast(error.response?.data?.message || t('toast.exportError'), 'error');
    }
  };

  /**
   * Open edit modal
   */
  const openEditModal = (language: Language) => {
    setEditingLanguage(language);
    setFormData({
      code: language.code,
      name: language.name,
      native_name: language.native_name,
      emoji_flag: language.emoji_flag,
    });
    setShowEditModal(true);
  };

  if (isLoading) {
    return (
      <Container className="py-8">
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-secondary)' }}>
          {t('loading')}
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      {/* Header */}
      <div className="page-header page-header--with-actions">
        <div>
          <h1 className="page-title">{t('title')}</h1>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowImportModal(true)}
          >
            {t('importJson')}
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
          >
            {t('exportJson')}
          </Button>
        </div>
      </div>

      {/* Languages Section */}
      <div style={styles.section}>
        <h2 className="card-title mb-4">{t('availableLanguages')}</h2>
        <div style={styles.languageGrid}>
          {languages.map(lang => (
            <div
              key={lang.code}
              style={{
                ...styles.languageCard,
                ...(selectedLanguage === lang.code ? styles.languageCardActive : {}),
              }}
              onClick={() => setSelectedLanguage(lang.code)}
            >
              <div style={styles.languageFlag}>{lang.emoji_flag}</div>
              <div style={styles.languageCode}>{lang.code.toUpperCase()}</div>
              <div style={styles.languageName}>{lang.native_name}</div>
              {lang.is_default && (
                <span style={{ ...styles.badge, ...styles.defaultBadge, marginTop: '8px' }}>
                  {t('default')}
                </span>
              )}
              {!lang.is_default && hasPermission('languages.manage') && (
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); openEditModal(lang); }}
                  >
                    {t('edit')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleDeleteLanguage(lang.code); }}
                  >
                    {t('delete')}
                  </Button>
                </div>
              )}
            </div>
          ))}
          {hasPermission('languages.manage') && (
            <div
              style={{ ...styles.languageCard, ...styles.addCard }}
              onClick={() => setShowCreateModal(true)}
            >
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>+</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                {t('addLanguage')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Translations Section */}
      <div style={styles.section}>
        <h2 className="card-title mb-4">{t('translations')}</h2>

        {/* Filter Bar */}
        <div style={styles.filterBar}>
          <select
            style={styles.select}
            value={selectedNamespace}
            onChange={(e) => setSelectedNamespace(e.target.value)}
          >
            <option value="all">{t('allNamespaces')}</option>
            {namespaces.map(ns => (
              <option key={ns} value={ns}>{ns}</option>
            ))}
          </select>
          <input
            type="text"
            style={styles.searchInput}
            placeholder={t('search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Translations Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, minWidth: '200px' }}>{t('key')}</th>
                {languages.map(lang => (
                  <th key={lang.code} style={{ ...styles.th, minWidth: '200px' }}>
                    {lang.emoji_flag} {lang.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {translationRows.slice(0, 100).map(row => (
                <tr key={row.key}>
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: '12px' }}>
                    {row.key}
                  </td>
                  {languages.map(lang => {
                    const isEditing = editingCell?.key === row.key && editingCell?.lang === lang.code;
                    const value = row.values[lang.code];

                    return (
                      <td
                        key={lang.code}
                        style={{
                          ...styles.td,
                          ...styles.editableCell,
                          ...(isEditing ? { padding: '4px' } : {}),
                          ...(!value ? styles.emptyCell : {}),
                        }}
                        onClick={() => {
                          if (!hasPermission('languages.manage')) return;
                          setEditingCell({ key: row.key, lang: lang.code });
                          setEditValue(value);
                        }}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            style={styles.cellInput}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCellSave}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCellSave();
                              if (e.key === 'Escape') {
                                setEditingCell(null);
                                setEditValue('');
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          value || t('empty')
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {translationRows.length > 100 && (
          <div style={styles.pagination}>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
              {t('showingCount', { shown: 100, total: translationRows.length })}
            </span>
          </div>
        )}
      </div>

      {/* Create Language Modal */}
      {showCreateModal && (
        <div style={styles.modal} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>{t('modal.create.title')}</h3>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t('modal.create.codeLabel')}</label>
              <input
                type="text"
                style={styles.input}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="fr"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t('modal.create.nameLabel')}</label>
              <input
                type="text"
                style={styles.input}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="French"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t('modal.create.nativeNameLabel')}</label>
              <input
                type="text"
                style={styles.input}
                value={formData.native_name}
                onChange={(e) => setFormData({ ...formData, native_name: e.target.value })}
                placeholder="Francais"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t('modal.create.emojiFlagLabel')}</label>
              <input
                type="text"
                style={styles.input}
                value={formData.emoji_flag}
                onChange={(e) => setFormData({ ...formData, emoji_flag: e.target.value })}
                placeholder="🇫🇷"
              />
            </div>
            <div style={styles.modalActions}>
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
              >
                {t('cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateLanguage}
              >
                {t('create')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Language Modal */}
      {showEditModal && editingLanguage && (
        <div style={styles.modal} onClick={() => setShowEditModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>{t('modal.edit.title', { code: editingLanguage.code.toUpperCase() })}</h3>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t('modal.edit.nameLabel')}</label>
              <input
                type="text"
                style={styles.input}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t('modal.edit.nativeNameLabel')}</label>
              <input
                type="text"
                style={styles.input}
                value={formData.native_name}
                onChange={(e) => setFormData({ ...formData, native_name: e.target.value })}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t('modal.edit.emojiFlagLabel')}</label>
              <input
                type="text"
                style={styles.input}
                value={formData.emoji_flag}
                onChange={(e) => setFormData({ ...formData, emoji_flag: e.target.value })}
              />
            </div>
            <div style={styles.modalActions}>
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
              >
                {t('cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdateLanguage}
              >
                {t('save')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div style={styles.modal} onClick={() => setShowImportModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>{t('modal.import.title')}</h3>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t('modal.import.languageLabel', { code: selectedLanguage?.toUpperCase() })}</label>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t('modal.import.namespaceLabel')}</label>
              <select
                style={styles.input}
                value={importData.namespace}
                onChange={(e) => setImportData({ ...importData, namespace: e.target.value })}
              >
                <option value="">{t('modal.import.allNested')}</option>
                {namespaces.map(ns => (
                  <option key={ns} value={ns}>{ns}</option>
                ))}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t('modal.import.jsonLabel')}</label>
              <textarea
                style={{ ...styles.input, minHeight: '200px', fontFamily: 'monospace', fontSize: '12px' }}
                value={importData.json}
                onChange={(e) => setImportData({ ...importData, json: e.target.value })}
                placeholder='{"key": "value", ...}'
              />
            </div>
            <div style={styles.formGroup}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={importData.merge}
                  onChange={(e) => setImportData({ ...importData, merge: e.target.checked })}
                />
                {t('modal.import.mergeLabel')}
              </label>
            </div>
            <div style={styles.modalActions}>
              <Button
                variant="outline"
                onClick={() => setShowImportModal(false)}
              >
                {t('cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleImport}
              >
                {t('import')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ ...styles.toast, ...(toast.type === 'error' ? styles.toastError : {}) }}>
          {toast.message}
        </div>
      )}
    </Container>
  );
};

export default LanguagesPage;
