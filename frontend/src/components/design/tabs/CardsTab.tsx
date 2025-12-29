/**
 * CardsTab Component
 * Card/Panel styles preview and editing
 */

import { useState } from 'react';
import { TabProps } from '../types';
import { ColorInput } from '../ColorInput';

export function CardsTab({
  scheme,
  t,
  onColorChange,
  canEdit,
}: TabProps) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const cardStyles = [
    { key: 'default' as const },
    { key: 'elevated' as const },
    { key: 'flat' as const },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('sections.cardStyles')}</h3>
        {canEdit && (
          <p className="text-sm text-[var(--color-text-secondary)]">{t('hints.clickToEdit')}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {cardStyles.map(({ key }) => {
          const style = scheme.cards[key];
          const label = t(`cards.${key}`);
          const isExpanded = expandedCard === key;

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
                onClick={() => canEdit && setExpandedCard(isExpanded ? null : key)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-[var(--color-text-primary)]">{label}</h4>
                    <p className="text-xs text-[var(--color-text-tertiary)]">{t(`cardTypes.${key}.description`)}</p>
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

                {/* Card Preview */}
                <div
                  className="p-4"
                  style={{
                    backgroundColor: style.background,
                    border: style.border !== 'transparent' ? `1px solid ${style.border}` : 'none',
                    boxShadow: style.shadow,
                    borderRadius: style.borderRadius,
                  }}
                >
                  <h5 className="font-semibold text-sm mb-1" style={{ color: scheme.colors.text.primary }}>
                    {label}
                  </h5>
                  <p className="text-xs" style={{ color: scheme.colors.text.secondary }}>
                    {t(`cardTypes.${key}.description`)}
                  </p>
                </div>
              </div>

              {/* Expanded Color Editor */}
              {isExpanded && canEdit && (
                <div className="px-4 pb-4 border-t border-[var(--color-border-default)] pt-4 space-y-3">
                  <ColorInput
                    label={t('cardProperties.background')}
                    path={`cards.${key}.background`}
                    value={style.background}
                    onColorChange={onColorChange}
                    canEdit={canEdit}
                  />
                  <ColorInput
                    label={t('cardProperties.border')}
                    path={`cards.${key}.border`}
                    value={style.border}
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

export default CardsTab;
