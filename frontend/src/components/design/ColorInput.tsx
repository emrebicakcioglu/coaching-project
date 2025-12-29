/**
 * ColorInput Component
 * Shared color picker input for all design system tabs
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { ColorInputProps } from './types';

export function ColorInput({
  label,
  path,
  value,
  onColorChange,
  canEdit,
}: ColorInputProps) {
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
  }, [canEdit, path, value, onColorChange]);

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
          style={{ padding: '1px', backgroundColor: 'white' }}
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
}

export default ColorInput;
