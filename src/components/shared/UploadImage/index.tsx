import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { cn } from '@/lib/cn'
import { HiUpload, HiX, HiPhotograph, HiFilm } from 'react-icons/hi'
import { useTranslation } from 'react-i18next'

export interface UploadedFile {
  file: File
  preview: string
}

interface UploadImageProps {
  label?: string
  error?: string
  mode?: 'image' | 'video'
  /** Allow multiple images */
  multiple?: boolean
  /** Max file size in bytes (default 5MB) */
  maxSize?: number
  value?: UploadedFile[]
  onChange?: (files: UploadedFile[]) => void
  disabled?: boolean
  required?: boolean
}

/**
 * UploadImage – drag-and-drop image uploader.
 *
 * Works with react-hook-form via Controller:
 *   <Controller name="images" control={control}
 *     render={({ field }) => <UploadImage {...field} multiple />}
 *   />
 */
export default function UploadImage({
  label,
  error,
  mode = 'image',
  multiple = false,
  maxSize = 5 * 1024 * 1024,
  value = [],
  onChange,
  disabled,
  required,
}: UploadImageProps) {
  const { t } = useTranslation()
  const [fileError, setFileError] = useState('')


  const isVideo = mode === 'video'
  const resolvedMaxSize = maxSize ?? (isVideo ? 100 * 1024 * 1024 : 5 * 1024 * 1024)
  const accept = isVideo ? { 'video/*': [] } : { 'image/*': [] }


const onDrop = useCallback(
    (accepted: File[], rejected: { errors: { message: string }[] }[]) => {
      setFileError('')
      if (rejected.length > 0) {
        setFileError(rejected[0].errors[0].message)
        return
      }
      const newFiles: UploadedFile[] = accepted.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }))
      onChange?.(multiple ? [...value, ...newFiles] : newFiles)
    },
    [multiple, value, onChange],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple: isVideo ? false : multiple, // video is always single
    maxSize: resolvedMaxSize,
    disabled,
  })

  const remove = (index: number) => {
    const next = [...value]
    URL.revokeObjectURL(next[index].preview)
    next.splice(index, 1)
    onChange?.(next)
  }
  
  const Icon = isVideo ? HiFilm : HiUpload

 return (
    <div className="flex flex-col gap-2 w-full">
      {label && (
        <label className="text-sm font-medium text-[var(--text-secondary)]">
          {label}
          {required && <span className="text-[var(--danger)] ms-1">*</span>}
        </label>
      )}

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'relative flex flex-col items-center justify-center gap-2',
          'rounded-[var(--radius-lg)] border-2 border-dashed p-6 cursor-pointer',
          'transition-all duration-150 text-center',
          isDragActive
            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
            : 'border-[var(--border)] hover:border-[var(--border-focus)] hover:bg-[var(--bg-hover)]',
          disabled && 'opacity-50 cursor-not-allowed',
          (error || fileError) && 'border-[var(--danger)]',
        )}
      >
        <input {...getInputProps()} />
        <Icon className="text-[var(--text-muted)]" size={24} />
        <p className="text-sm text-[var(--text-secondary)]">
          {isDragActive
            ? t('upload.dropHere', 'Drop here…')
            : t('upload.dragOrClick', 'Drag & drop or click to upload')}
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {isVideo
            ? t('upload.singleVideo', 'Single video')
            : multiple
              ? t('upload.multipleImages', 'Multiple images')
              : t('upload.singleImage', 'Single image')}{' '}
          · Max {Math.round(resolvedMaxSize / 1024 / 1024)} MB
        </p>
      </div>

      {/* Previews */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-1">
          {value.map((f, i) => (
            <div
              key={i}
              className={cn(
                'relative overflow-hidden rounded-[var(--radius)] border border-[var(--border)] group',
                isVideo ? 'w-full aspect-video' : 'w-20 h-20',
              )}
            >
              {isVideo ? (
                <video
                  src={f.preview}
                  className="w-full h-full object-cover"
                  controls
                  muted
                />
              ) : (
                <>
                  <img src={f.preview} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100
                    transition-opacity flex items-center justify-center">
                    <HiPhotograph className="text-white/70" size={18} />
                  </div>
                </>
              )}

              {/* Remove */}
              <button
                type="button"
                onClick={() => remove(i)}
                className={cn(
                  'absolute w-6 h-6 rounded-full bg-[var(--danger)]',
                  'flex items-center justify-center hover:scale-110 transition-all',
                  isVideo
                    ? 'top-2 end-2 opacity-100'
                    : 'top-1 end-1 opacity-0 group-hover:opacity-100',
                )}
              >
                <HiX size={11} className="text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {(error || fileError) && (
        <p className="text-xs text-[var(--danger)]">{error || fileError}</p>
      )}
    </div>
  )
}
