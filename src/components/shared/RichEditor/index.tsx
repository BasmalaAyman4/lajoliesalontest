// ─── RichEditor (shared) ──────────────────────────────────────────────────────
//
//  Jodit WYSIWYG editor wrapped to match the project's design system.
//  Works as a controlled component — integrates cleanly with react-hook-form
//  via Controller.
//
//  Usage:
//    <Controller
//      control={control}
//      name="aboutSalonEn"
//      render={({ field }) => (
//        <RichEditor
//          label="About Salon (EN)"
//          value={field.value ?? ''}
//          onChange={field.onChange}
//          error={errors.aboutSalonEn?.message}
//        />
//      )}
//    />

import { useRef, useMemo } from 'react'
import JoditEditor from 'jodit-react'

interface RichEditorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  error?: string
  hint?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  /** Editor height in px — default 250 */
  height?: number
  /** 'ltr' | 'rtl' — default 'ltr' */
  direction?: 'ltr' | 'rtl'
}

export default function RichEditor({
  value,
  onChange,
  label,
  error,
  hint,
  required = false,
  disabled = false,
  placeholder = 'Write something…',
  height = 250,
  direction = 'ltr',
}: RichEditorProps) {
  const editorRef = useRef(null)

  // Jodit config — memoised so it doesn't re-create the editor on every render
  const config = useMemo(
    () => ({
      readonly: disabled,
      placeholder,
      height,
      direction,
      toolbarAdaptive: false,
      statusbar: false,
      allowResizeX: false,
      allowResizeY: false,
      // Minimal but useful toolbar
      buttons: [
        'bold', 'italic', 'underline', 'strikethrough', '|',
        'ul', 'ol', '|',
        'outdent', 'indent', '|',
        'font', 'fontsize', '|',
        'paragraph', '|',
        'align', '|',
        'undo', 'redo', '|',
        'eraser', 'copyformat', '|',
        'hr', 'table', 'link', '|',
        'fullsize',
      ],
      style: {
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-main)',
      },
      editorCssClass: 'jodit-custom',
      // Match project border/radius tokens via CSS vars
      theme: 'default',
    }),
    [disabled, placeholder, height, direction],
  )

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-sm font-medium text-[var(--text-secondary)]">
          {label}
          {required && <span className="text-[var(--danger)] ms-1">*</span>}
        </label>
      )}

      {/* Border wrapper so we can apply error state */}
      <div
        className={
          error
            ? 'rounded-[var(--radius)] ring-1 ring-[var(--danger)]'
            : 'rounded-[var(--radius)]'
        }
      >
        <JoditEditor
          ref={editorRef}
          value={value}
          config={config}
          onBlur={onChange}   // fire on blur — avoids cursor jumping while typing
        />
      </div>

      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
      {hint && !error && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  )
}