/**
 * BaseTab Component
 * Global/Theme colors with expandable sections
 */

import { useState } from 'react';
import { TabProps } from '../types';
import { ColorInput } from '../ColorInput';

export function BaseTab({
  scheme,
  t,
  onColorChange,
  canEdit,
}: TabProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const sections = [
    {
      key: 'primary',
      label: t('base.primaryColors'),
      description: t('base.primaryColorsDesc'),
      preview: (
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded" style={{ backgroundColor: scheme.colors.primary }} />
          <div className="w-8 h-8 rounded" style={{ backgroundColor: scheme.colors.secondary }} />
          <div className="w-8 h-8 rounded" style={{ backgroundColor: scheme.colors.accent }} />
        </div>
      ),
      colors: [
        { label: t('colors.primary'), path: 'colors.primary', value: scheme.colors.primary },
        { label: t('colors.primaryHover'), path: 'colors.primaryHover', value: scheme.colors.primaryHover },
        { label: t('colors.primaryLight'), path: 'colors.primaryLight', value: scheme.colors.primaryLight },
        { label: t('colors.secondary'), path: 'colors.secondary', value: scheme.colors.secondary },
        { label: t('colors.accent'), path: 'colors.accent', value: scheme.colors.accent },
      ],
    },
    {
      key: 'background',
      label: t('base.backgroundColors'),
      description: t('base.backgroundColorsDesc'),
      preview: (
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded border" style={{ backgroundColor: scheme.colors.background.page }} />
          <div className="w-8 h-8 rounded border" style={{ backgroundColor: scheme.colors.background.card }} />
          <div className="w-8 h-8 rounded border" style={{ backgroundColor: scheme.colors.background.sidebar }} />
        </div>
      ),
      colors: [
        { label: t('colors.pageBackground'), path: 'colors.background.page', value: scheme.colors.background.page },
        { label: t('colors.cardBackground'), path: 'colors.background.card', value: scheme.colors.background.card },
        { label: t('colors.sidebarBackground'), path: 'colors.background.sidebar', value: scheme.colors.background.sidebar },
        { label: t('colors.modalBackground'), path: 'colors.background.modal', value: scheme.colors.background.modal },
        { label: t('colors.inputBackground'), path: 'colors.background.input', value: scheme.colors.background.input },
      ],
    },
    {
      key: 'text',
      label: t('base.textColors'),
      description: t('base.textColorsDesc'),
      preview: (
        <div className="flex gap-2 items-center">
          <span className="text-sm font-medium" style={{ color: scheme.colors.text.primary }}>Aa</span>
          <span className="text-sm" style={{ color: scheme.colors.text.secondary }}>Aa</span>
          <span className="text-sm" style={{ color: scheme.colors.text.muted }}>Aa</span>
        </div>
      ),
      colors: [
        { label: t('colors.primaryText'), path: 'colors.text.primary', value: scheme.colors.text.primary },
        { label: t('colors.secondaryText'), path: 'colors.text.secondary', value: scheme.colors.text.secondary },
        { label: t('colors.mutedText'), path: 'colors.text.muted', value: scheme.colors.text.muted },
        { label: t('colors.inverseText'), path: 'colors.text.inverse', value: scheme.colors.text.inverse },
        { label: t('colors.linkText'), path: 'colors.text.link', value: scheme.colors.text.link },
      ],
    },
    {
      key: 'status',
      label: t('base.statusColors'),
      description: t('base.statusColorsDesc'),
      preview: (
        <div className="flex gap-2">
          <div className="w-6 h-6 rounded-full" style={{ backgroundColor: scheme.colors.status.success }} />
          <div className="w-6 h-6 rounded-full" style={{ backgroundColor: scheme.colors.status.warning }} />
          <div className="w-6 h-6 rounded-full" style={{ backgroundColor: scheme.colors.status.error }} />
          <div className="w-6 h-6 rounded-full" style={{ backgroundColor: scheme.colors.status.info }} />
        </div>
      ),
      colors: [
        { label: t('colors.success'), path: 'colors.status.success', value: scheme.colors.status.success },
        { label: t('colors.successLight'), path: 'colors.status.successLight', value: scheme.colors.status.successLight },
        { label: t('colors.warning'), path: 'colors.status.warning', value: scheme.colors.status.warning },
        { label: t('colors.warningLight'), path: 'colors.status.warningLight', value: scheme.colors.status.warningLight },
        { label: t('colors.error'), path: 'colors.status.error', value: scheme.colors.status.error },
        { label: t('colors.errorLight'), path: 'colors.status.errorLight', value: scheme.colors.status.errorLight },
        { label: t('colors.info'), path: 'colors.status.info', value: scheme.colors.status.info },
        { label: t('colors.infoLight'), path: 'colors.status.infoLight', value: scheme.colors.status.infoLight },
      ],
    },
    {
      key: 'border',
      label: t('base.borderColors'),
      description: t('base.borderColorsDesc'),
      preview: (
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded border-2" style={{ borderColor: scheme.colors.border.light }} />
          <div className="w-8 h-8 rounded border-2" style={{ borderColor: scheme.colors.border.default }} />
          <div className="w-8 h-8 rounded border-2" style={{ borderColor: scheme.colors.border.dark }} />
        </div>
      ),
      colors: [
        { label: t('colors.borderLight'), path: 'colors.border.light', value: scheme.colors.border.light },
        { label: t('colors.borderDefault'), path: 'colors.border.default', value: scheme.colors.border.default },
        { label: t('colors.borderDark'), path: 'colors.border.dark', value: scheme.colors.border.dark },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('sections.baseColors')}</h3>
        {canEdit && (
          <p className="text-sm text-[var(--color-text-secondary)]">{t('hints.clickToEdit')}</p>
        )}
      </div>

      <div className="space-y-4">
        {sections.map(section => {
          const isExpanded = expandedSection === section.key;
          return (
            <div
              key={section.key}
              className={`rounded-lg border transition-all ${
                isExpanded
                  ? 'bg-[var(--color-background-card)] border-primary-300 shadow-lg'
                  : 'bg-[var(--color-background-surface)] border-transparent hover:border-[var(--color-border-default)]'
              }`}
            >
              <div
                className={`p-4 ${canEdit ? 'cursor-pointer' : ''}`}
                onClick={() => canEdit && setExpandedSection(isExpanded ? null : section.key)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {section.preview}
                    <div>
                      <h4 className="font-medium text-[var(--color-text-primary)]">{section.label}</h4>
                      <p className="text-xs text-[var(--color-text-tertiary)]">{section.description}</p>
                    </div>
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
              </div>

              {isExpanded && canEdit && (
                <div className="px-4 pb-4 border-t border-[var(--color-border-default)] pt-4">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {section.colors.map(color => (
                      <ColorInput
                        key={color.path}
                        label={color.label}
                        path={color.path}
                        value={color.value}
                        onColorChange={onColorChange}
                        canEdit={canEdit}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BaseTab;
