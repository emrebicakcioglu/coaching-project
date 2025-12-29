/**
 * BadgesTab Component
 * Badge styles preview and editing
 */

import { useState } from 'react';
import { TabProps } from '../types';
import { ColorInput } from '../ColorInput';

export function BadgesTab({
  scheme,
  t,
  onColorChange,
  canEdit,
}: TabProps) {
  const [expandedBadge, setExpandedBadge] = useState<string | null>(null);

  const badgeTypes = [
    { key: 'default' as const },
    { key: 'primary' as const },
    { key: 'secondary' as const },
    { key: 'success' as const },
    { key: 'warning' as const },
    { key: 'error' as const },
    { key: 'info' as const },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('sections.badgeStyles')}</h3>
        {canEdit && (
          <p className="text-sm text-[var(--color-text-secondary)]">{t('hints.clickToEdit')}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {badgeTypes.map(({ key }) => {
          const style = scheme.badges[key];
          const label = t(`badgeTypes.${key}.label`);
          const isExpanded = expandedBadge === key;

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
                onClick={() => canEdit && setExpandedBadge(isExpanded ? null : key)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-[var(--color-text-primary)]">{label}</h4>
                    <p className="text-xs text-[var(--color-text-tertiary)]">{t(`badgeTypes.${key}.description`)}</p>
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

                {/* Badge Preview */}
                <div className="flex items-center justify-center py-3">
                  <span
                    className="px-3 py-1 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: style.background,
                      color: style.text,
                    }}
                  >
                    {label}
                  </span>
                </div>
              </div>

              {/* Expanded Color Editor */}
              {isExpanded && canEdit && (
                <div className="px-4 pb-4 border-t border-[var(--color-border-default)] pt-4 space-y-3">
                  <ColorInput
                    label={t('badgeProperties.background')}
                    path={`badges.${key}.background`}
                    value={style.background}
                    onColorChange={onColorChange}
                    canEdit={canEdit}
                  />
                  <ColorInput
                    label={t('badgeProperties.text')}
                    path={`badges.${key}.text`}
                    value={style.text}
                    onColorChange={onColorChange}
                    canEdit={canEdit}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Badge sizes preview */}
      <div className="pt-4 border-t border-[var(--color-border-default)]">
        <h4 className="font-medium text-[var(--color-text-primary)] mb-3">{t('sections.badgeSizes')}</h4>
        <div className="flex items-center gap-4">
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: scheme.badges.primary.background,
              color: scheme.badges.primary.text,
            }}
          >
            {t('sizes.small')}
          </span>
          <span
            className="px-3 py-1 rounded-full text-sm font-medium"
            style={{
              backgroundColor: scheme.badges.primary.background,
              color: scheme.badges.primary.text,
            }}
          >
            {t('sizes.medium')}
          </span>
          <span
            className="px-4 py-1.5 rounded-full text-base font-medium"
            style={{
              backgroundColor: scheme.badges.primary.background,
              color: scheme.badges.primary.text,
            }}
          >
            {t('sizes.large')}
          </span>
        </div>
      </div>
    </div>
  );
}

export default BadgesTab;
