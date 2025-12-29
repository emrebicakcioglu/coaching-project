/**
 * TypographyTab Component
 * Typography settings and preview
 */

import { TypographyTabProps } from '../types';

export function TypographyTab({
  scheme,
  onTypographyChange,
  canEdit,
}: TypographyTabProps) {
  // Common input styles
  const inputClassName = `text-xs font-mono bg-[var(--color-background-surface)] px-2 py-1 rounded
    border border-[var(--color-border-default)] disabled:opacity-50
    text-[var(--color-text-primary)]`;

  return (
    <div className="space-y-8">
      {/* Font Families */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Font Families</h3>
        <div className="grid grid-cols-2 gap-6 p-6 bg-[var(--color-background-surface)] rounded-lg">
          <div>
            <label className="text-sm font-medium text-[var(--color-text-secondary)] block mb-2">
              Primary Font
            </label>
            <input
              type="text"
              value={scheme.typography.fontFamily.primary}
              onChange={(e) => canEdit && onTypographyChange('typography.fontFamily.primary', e.target.value)}
              disabled={!canEdit}
              className={`${inputClassName} w-full`}
              placeholder="Inter, system-ui, sans-serif"
            />
            <p
              className="mt-2 text-sm"
              style={{ fontFamily: scheme.typography.fontFamily.primary }}
            >
              The quick brown fox jumps over the lazy dog.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--color-text-secondary)] block mb-2">
              Monospace Font
            </label>
            <input
              type="text"
              value={scheme.typography.fontFamily.mono}
              onChange={(e) => canEdit && onTypographyChange('typography.fontFamily.mono', e.target.value)}
              disabled={!canEdit}
              className={`${inputClassName} w-full`}
              placeholder="ui-monospace, monospace"
            />
            <code
              className="mt-2 text-sm block"
              style={{ fontFamily: scheme.typography.fontFamily.mono }}
            >
              const code = "example";
            </code>
          </div>
        </div>
      </div>

      {/* Headings */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Headings</h3>
        <div className="space-y-4 p-6 bg-[var(--color-background-surface)] rounded-lg">
          {(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const).map(tag => {
            const style = scheme.typography.heading[tag];
            return (
              <div key={tag} className="flex items-center gap-4">
                <div className="w-12 text-sm font-medium text-[var(--color-text-secondary)]">
                  {tag.toUpperCase()}
                </div>
                {canEdit ? (
                  <>
                    <input
                      type="text"
                      value={style.fontSize}
                      onChange={(e) => onTypographyChange(`typography.heading.${tag}.fontSize`, e.target.value)}
                      className={`${inputClassName} w-20`}
                      placeholder="2rem"
                    />
                    <input
                      type="text"
                      value={style.fontWeight}
                      onChange={(e) => onTypographyChange(`typography.heading.${tag}.fontWeight`, e.target.value)}
                      className={`${inputClassName} w-16`}
                      placeholder="700"
                    />
                  </>
                ) : (
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {style.fontSize} / {style.fontWeight}
                  </span>
                )}
                <div
                  className="flex-1"
                  style={{
                    fontSize: style.fontSize,
                    fontWeight: style.fontWeight,
                    lineHeight: style.lineHeight,
                    fontFamily: scheme.typography.fontFamily.primary,
                    color: scheme.colors.text.primary,
                  }}
                >
                  Heading {tag.slice(1)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Body Text */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Body Text</h3>
        <div className="space-y-4 p-6 bg-[var(--color-background-surface)] rounded-lg">
          {(['large', 'normal', 'small'] as const).map(size => {
            const style = scheme.typography.body[size];
            return (
              <div key={size} className="flex items-center gap-4">
                <div className="w-16 text-sm font-medium text-[var(--color-text-secondary)] capitalize">
                  {size}
                </div>
                {canEdit ? (
                  <>
                    <input
                      type="text"
                      value={style.fontSize}
                      onChange={(e) => onTypographyChange(`typography.body.${size}.fontSize`, e.target.value)}
                      className={`${inputClassName} w-20`}
                      placeholder="1rem"
                    />
                    <input
                      type="text"
                      value={style.fontWeight}
                      onChange={(e) => onTypographyChange(`typography.body.${size}.fontWeight`, e.target.value)}
                      className={`${inputClassName} w-16`}
                      placeholder="400"
                    />
                  </>
                ) : (
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {style.fontSize} / {style.fontWeight}
                  </span>
                )}
                <p
                  className="flex-1"
                  style={{
                    fontSize: style.fontSize,
                    fontWeight: style.fontWeight,
                    lineHeight: style.lineHeight,
                    fontFamily: scheme.typography.fontFamily.primary,
                    color: size === 'small' ? scheme.colors.text.secondary : scheme.colors.text.primary,
                  }}
                >
                  The quick brown fox jumps over the lazy dog.
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Labels */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Labels</h3>
        <div className="space-y-4 p-6 bg-[var(--color-background-surface)] rounded-lg">
          {(['large', 'normal', 'small'] as const).map(size => {
            const style = scheme.typography.label[size];
            return (
              <div key={size} className="flex items-center gap-4">
                <div className="w-16 text-sm font-medium text-[var(--color-text-secondary)] capitalize">
                  {size}
                </div>
                {canEdit ? (
                  <>
                    <input
                      type="text"
                      value={style.fontSize}
                      onChange={(e) => onTypographyChange(`typography.label.${size}.fontSize`, e.target.value)}
                      className={`${inputClassName} w-20`}
                      placeholder="0.875rem"
                    />
                    <input
                      type="text"
                      value={style.fontWeight}
                      onChange={(e) => onTypographyChange(`typography.label.${size}.fontWeight`, e.target.value)}
                      className={`${inputClassName} w-16`}
                      placeholder="500"
                    />
                  </>
                ) : (
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {style.fontSize} / {style.fontWeight}
                  </span>
                )}
                <span
                  style={{
                    fontSize: style.fontSize,
                    fontWeight: style.fontWeight,
                    lineHeight: style.lineHeight,
                    textTransform: style.textTransform as React.CSSProperties['textTransform'],
                    letterSpacing: style.letterSpacing,
                    color: scheme.colors.text.secondary,
                  }}
                >
                  Label {size}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Code */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Code</h3>
        <div className="p-6 bg-[var(--color-background-surface)] rounded-lg">
          <div className="flex items-center gap-4 mb-4">
            {canEdit ? (
              <input
                type="text"
                value={scheme.typography.code.fontSize}
                onChange={(e) => onTypographyChange('typography.code.fontSize', e.target.value)}
                className={`${inputClassName} w-20`}
                placeholder="0.875rem"
              />
            ) : (
              <span className="text-xs text-[var(--color-text-muted)]">
                {scheme.typography.code.fontSize}
              </span>
            )}
          </div>
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

export default TypographyTab;
