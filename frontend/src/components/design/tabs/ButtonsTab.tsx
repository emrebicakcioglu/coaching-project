/**
 * ButtonsTab Component
 * Button styles preview and editing
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { TabProps } from '../types';

export function ButtonsTab({
  scheme,
  t,
  onColorChange,
  canEdit,
}: TabProps) {
  const [expandedButton, setExpandedButton] = useState<string | null>(null);

  const buttonTypes = [
    { key: 'normal' as const },
    { key: 'inactive' as const },
    { key: 'abort' as const },
    { key: 'special' as const },
    { key: 'danger' as const },
    { key: 'success' as const },
  ];

  // Button color property labels
  const propertyLabels = {
    background: t('buttonProperties.background'),
    text: t('buttonProperties.text'),
    border: t('buttonProperties.border'),
    hoverBackground: t('buttonProperties.hoverBackground'),
    hoverText: t('buttonProperties.hoverText'),
    hoverBorder: t('buttonProperties.hoverBorder'),
  };

  // Color input component for button properties
  const ButtonColorInput = ({
    label,
    path,
    value,
  }: {
    label: string;
    path: string;
    value: string;
  }) => {
    const [localColor, setLocalColor] = useState(value);
    const [isEditing, setIsEditing] = useState(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
      // Only sync from props when not actively editing
      if (!isEditing) {
        setLocalColor(value);
      }
    }, [value, isEditing]);

    useEffect(() => {
      return () => {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
      };
    }, []);

    const debouncedSave = useCallback((color: string) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        if (canEdit && color !== value) {
          onColorChange(path, color);
        }
        // Don't set isEditing to false here - let blur handle it
      }, 300);
    }, [path, value]);

    const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newColor = e.target.value;
      setLocalColor(newColor);
      setIsEditing(true);
      debouncedSave(newColor);
    };

    const handleColorPickerBlur = () => {
      // User finished picking - allow syncing from props again
      setIsEditing(false);
    };

    const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newColor = e.target.value;
      setLocalColor(newColor);
      if (/^#[0-9A-Fa-f]{6}$/.test(newColor) && canEdit) {
        onColorChange(path, newColor);
      }
    };

    return (
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="color"
            value={localColor || '#000000'}
            onChange={handleColorPickerChange}
            onBlur={handleColorPickerBlur}
            disabled={!canEdit}
            className="w-8 h-8 rounded cursor-pointer disabled:cursor-not-allowed border border-neutral-300 hover:border-primary-500 transition-colors"
            style={{
              padding: '1px',
              backgroundColor: 'white',
            }}
          />
          <div
            className="absolute inset-0.5 rounded pointer-events-none"
            style={{ backgroundColor: localColor }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <label className="text-xs text-[var(--color-text-secondary)] block truncate">{label}</label>
          <input
            type="text"
            value={localColor}
            onChange={handleTextInputChange}
            disabled={!canEdit}
            className="text-xs font-mono bg-[var(--color-background-surface)] px-1.5 py-0.5 rounded border border-[var(--color-border-default)] w-20 disabled:opacity-50 text-[var(--color-text-primary)]"
            placeholder="#000000"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('sections.buttonStyles')}</h3>
        {canEdit && (
          <p className="text-sm text-[var(--color-text-secondary)]">
            {t('hints.clickToEdit')}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        {buttonTypes.map(({ key }) => {
          const style = scheme.buttons[key];
          const label = t(`buttonTypes.${key}.label`);
          const description = t(`buttonTypes.${key}.description`);
          const isExpanded = expandedButton === key;

          return (
            <div
              key={key}
              className={`rounded-lg border transition-all ${
                isExpanded
                  ? 'bg-[var(--color-background-card)] border-primary-300 shadow-lg'
                  : 'bg-[var(--color-background-surface)] border-transparent hover:border-[var(--color-border-default)]'
              }`}
            >
              {/* Button Header & Preview */}
              <div
                className={`p-4 ${canEdit ? 'cursor-pointer' : ''}`}
                onClick={() => canEdit && setExpandedButton(isExpanded ? null : key)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-[var(--color-text-primary)]">{label}</h4>
                    <p className="text-xs text-[var(--color-text-tertiary)]">{description}</p>
                  </div>
                  {canEdit && (
                    <svg
                      className={`w-5 h-5 text-[var(--color-text-tertiary)] transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>

                {/* Button Preview */}
                <div className="space-y-2">
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
                    {t('states.hover')}
                  </button>
                </div>
              </div>

              {/* Expanded Color Editor */}
              {isExpanded && canEdit && (
                <div className="px-4 pb-4 border-t border-[var(--color-border-default)] pt-4 space-y-4">
                  {/* Normal State */}
                  <div>
                    <h5 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">
                      {t('states.normal')}
                    </h5>
                    <div className="grid grid-cols-1 gap-3">
                      <ButtonColorInput
                        label={propertyLabels.background}
                        path={`buttons.${key}.background`}
                        value={style.background}
                      />
                      <ButtonColorInput
                        label={propertyLabels.text}
                        path={`buttons.${key}.text`}
                        value={style.text}
                      />
                      <ButtonColorInput
                        label={propertyLabels.border}
                        path={`buttons.${key}.border`}
                        value={style.border}
                      />
                    </div>
                  </div>

                  {/* Hover State */}
                  <div>
                    <h5 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">
                      {t('states.hover')}
                    </h5>
                    <div className="grid grid-cols-1 gap-3">
                      <ButtonColorInput
                        label={propertyLabels.hoverBackground}
                        path={`buttons.${key}.hoverBackground`}
                        value={style.hoverBackground}
                      />
                      <ButtonColorInput
                        label={propertyLabels.hoverText}
                        path={`buttons.${key}.hoverText`}
                        value={style.hoverText}
                      />
                      <ButtonColorInput
                        label={propertyLabels.hoverBorder}
                        path={`buttons.${key}.hoverBorder`}
                        value={style.hoverBorder}
                      />
                    </div>
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

export default ButtonsTab;
