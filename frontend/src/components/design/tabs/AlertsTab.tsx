/**
 * AlertsTab Component
 * Alert styles preview and editing
 */

import { useState } from 'react';
import { TabProps } from '../types';
import { ColorInput } from '../ColorInput';

// SVG icon paths for each alert type
const iconPaths: Record<string, string> = {
  success: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z',
  warning: 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z',
  error: 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z',
  info: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z',
};

export function AlertsTab({
  scheme,
  t,
  onColorChange,
  canEdit,
}: TabProps) {
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  const alertTypes = [
    { key: 'success' as const },
    { key: 'warning' as const },
    { key: 'error' as const },
    { key: 'info' as const },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('sections.alertStyles')}</h3>
        {canEdit && (
          <p className="text-sm text-[var(--color-text-secondary)]">{t('hints.clickToEdit')}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {alertTypes.map(({ key }) => {
          const style = scheme.alerts[key];
          const label = t(`alerts.${key}.title`);
          const message = t(`alerts.${key}.message`);
          const isExpanded = expandedAlert === key;

          return (
            <div
              key={key}
              className={`rounded-lg border transition-all ${
                isExpanded
                  ? 'bg-[var(--color-background-card)] border-primary-300 shadow-lg'
                  : 'bg-[var(--color-background-surface)] border-transparent hover:border-[var(--color-border-default)]'
              }`}
            >
              <div
                className={`p-4 ${canEdit ? 'cursor-pointer' : ''}`}
                onClick={() => canEdit && setExpandedAlert(isExpanded ? null : key)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-[var(--color-text-primary)]">{label}</h4>
                    <p className="text-xs text-[var(--color-text-tertiary)]">{t(`alertTypes.${key}.description`)}</p>
                  </div>
                  {canEdit && (
                    <svg
                      className={`w-5 h-5 text-[var(--color-text-tertiary)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>

                {/* Alert Preview */}
                <div
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
                    <path fillRule="evenodd" d={iconPaths[key]} clipRule="evenodd" />
                  </svg>
                  <div>
                    <h5 className="font-medium" style={{ color: style.text }}>
                      {label}
                    </h5>
                    <p className="text-sm mt-1" style={{ color: style.text }}>
                      {message}
                    </p>
                  </div>
                </div>
              </div>

              {/* Expanded Color Editor */}
              {isExpanded && canEdit && (
                <div className="px-4 pb-4 border-t border-[var(--color-border-default)] pt-4 space-y-3">
                  <ColorInput
                    label={t('alertProperties.background')}
                    path={`alerts.${key}.background`}
                    value={style.background}
                    onColorChange={onColorChange}
                    canEdit={canEdit}
                  />
                  <ColorInput
                    label={t('alertProperties.border')}
                    path={`alerts.${key}.border`}
                    value={style.border}
                    onColorChange={onColorChange}
                    canEdit={canEdit}
                  />
                  <ColorInput
                    label={t('alertProperties.text')}
                    path={`alerts.${key}.text`}
                    value={style.text}
                    onColorChange={onColorChange}
                    canEdit={canEdit}
                  />
                  <ColorInput
                    label={t('alertProperties.icon')}
                    path={`alerts.${key}.icon`}
                    value={style.icon}
                    onColorChange={onColorChange}
                    canEdit={canEdit}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AlertsTab;
