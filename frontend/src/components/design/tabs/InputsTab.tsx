/**
 * InputsTab Component
 * Input field styles preview and editing
 */

import { useState } from 'react';
import { TabProps } from '../types';
import { ColorInput } from '../ColorInput';

export function InputsTab({
  scheme,
  t,
  onColorChange,
  canEdit,
}: TabProps) {
  const [expandedInput, setExpandedInput] = useState<string | null>(null);

  const inputStates = [
    { key: 'normal' as const, labelKey: 'inputStates.normal', placeholder: t('placeholders.normalInput') },
    { key: 'error' as const, labelKey: 'inputStates.error', placeholder: t('placeholders.errorInput') },
    { key: 'disabled' as const, labelKey: 'inputStates.disabled', placeholder: t('placeholders.disabledInput') },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('sections.inputStyles')}</h3>
        {canEdit && (
          <p className="text-sm text-[var(--color-text-secondary)]">{t('hints.clickToEdit')}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {inputStates.map(({ key, labelKey, placeholder }) => {
          const style = scheme.inputs[key];
          const label = t(labelKey);
          const isExpanded = expandedInput === key;

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
                onClick={() => canEdit && setExpandedInput(isExpanded ? null : key)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-[var(--color-text-primary)]">{label}</h4>
                    <p className="text-xs text-[var(--color-text-tertiary)]">{t(`inputs.${key}.description`)}</p>
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

                {/* Input Preview - with text value to show text color */}
                <input
                  type="text"
                  value={t(`inputs.${key}.exampleText`)}
                  disabled={key === 'disabled'}
                  className="w-full px-3 py-2 rounded-lg transition-all mb-2"
                  style={{
                    backgroundColor: style.background,
                    color: style.text,
                    border: `1px solid ${style.border}`,
                  }}
                  readOnly
                />
                {/* Input Preview - empty to show placeholder color */}
                <input
                  type="text"
                  placeholder={placeholder}
                  disabled={key === 'disabled'}
                  className="w-full px-3 py-2 rounded-lg transition-all"
                  style={{
                    backgroundColor: style.background,
                    color: style.text,
                    border: `1px solid ${style.border}`,
                    '--placeholder-color': style.placeholder,
                  } as React.CSSProperties}
                  readOnly
                />
                <style>{`
                  input::placeholder {
                    color: var(--placeholder-color, ${style.placeholder}) !important;
                    opacity: 1;
                  }
                `}</style>
              </div>

              {/* Expanded Color Editor */}
              {isExpanded && canEdit && (
                <div className="px-4 pb-4 border-t border-[var(--color-border-default)] pt-4 space-y-3">
                  <ColorInput
                    label={t('inputProperties.background')}
                    path={`inputs.${key}.background`}
                    value={style.background}
                    onColorChange={onColorChange}
                    canEdit={canEdit}
                  />
                  <ColorInput
                    label={t('inputProperties.text')}
                    path={`inputs.${key}.text`}
                    value={style.text}
                    onColorChange={onColorChange}
                    canEdit={canEdit}
                  />
                  <ColorInput
                    label={t('inputProperties.border')}
                    path={`inputs.${key}.border`}
                    value={style.border}
                    onColorChange={onColorChange}
                    canEdit={canEdit}
                  />
                  <ColorInput
                    label={t('inputProperties.placeholder')}
                    path={`inputs.${key}.placeholder`}
                    value={style.placeholder}
                    onColorChange={onColorChange}
                    canEdit={canEdit}
                  />
                  {key === 'normal' && (
                    <ColorInput
                      label={t('inputProperties.focusRing')}
                      path={`inputs.${key}.focusRing`}
                      value={style.focusRing}
                      onColorChange={onColorChange}
                      canEdit={canEdit}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default InputsTab;
