// ─── How To Use Page ──────────────────────────────────────────────────────────
//
//  GET /api/salon/HowToUse/getByPurposeId/:purposeId?pageNo=1&pageSize=20
//
//  howToUseMediaTypeId === 1  → Image  (thumbnail only)
//  howToUseMediaTypeId === 2  → Video  (thumbnail + play → modal)

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HiPlay, HiCalendar, HiViewList } from 'react-icons/hi'
import { Modal } from '@/components/shared'
import type { HowToUseItem } from '../types'
import { useGetHowToUseByPurposeQuery } from '../services/howToUseApi'

// ── Constants ─────────────────────────────────────────────────────────────────

const MEDIA = { IMAGE: 1, VIDEO: 2 } as const

// ── Video Modal ───────────────────────────────────────────────────────────────

interface VideoModalProps {
  url: string
  title: string
  onClose: () => void
}

function VideoModal({ url, title, onClose }: VideoModalProps) {
  return (
    <Modal open onClose={onClose} title={title} size="lg">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        src={url}
        controls
        autoPlay
        className="w-full rounded-lg"
        aria-label={title}
      />
    </Modal>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────

interface HowToUseCardProps {
  item: HowToUseItem
  onPlay: (url: string, title: string) => void
}

function HowToUseCard({ item, onPlay }: HowToUseCardProps) {
  const isVideo = item.howToUseMediaTypeId === MEDIA.VIDEO

  const handlePlay = () => {
    if (isVideo && item.videoUrl) onPlay(item.videoUrl, item.title)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') handlePlay()
  }

  return (
    <article
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)]
        bg-[var(--surface)] transition-[border-color] hover:border-[var(--border-focus)]"
    >
      {/* ── Media ─────────────────────────────────────────────────────────── */}
      <div
        className={`relative w-full overflow-hidden bg-[var(--surface-raised)]
          ${isVideo && item.videoUrl ? 'cursor-pointer' : ''}`}
        style={{ aspectRatio: '16 / 9' }}
        role={isVideo && item.videoUrl ? 'button' : undefined}
        tabIndex={isVideo && item.videoUrl ? 0 : undefined}
        onClick={handlePlay}
        onKeyDown={handleKeyDown}
        aria-label={isVideo ? `Play: ${item.title}` : undefined}
      >
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300
              group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <HiViewList size={32} className="opacity-20 text-[var(--text-muted)]" />
          </div>
        )}

        {/* Hover play overlay */}
        {isVideo && item.videoUrl && (
          <div
            className="absolute inset-0 flex items-center justify-center
              bg-black/25 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full
                bg-white/90 shadow-lg transition-transform duration-150 hover:scale-110"
            >
              <HiPlay className="ml-0.5 text-gray-900" size={22} />
            </div>
          </div>
        )}

        {/* Always-visible small play badge */}
        {isVideo && item.videoUrl && (
          <div
            className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center
              rounded-full bg-white/85 shadow opacity-100 transition-opacity group-hover:opacity-0"
          >
            <HiPlay className="ml-0.5 text-gray-900" size={17} />
          </div>
        )}

        {/* Media type badge */}
        <span
          className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-0.5
            text-[11px] font-medium tracking-wide
            ${isVideo
              ? 'bg-blue-900/80 text-blue-200'
              : 'bg-emerald-900/80 text-emerald-200'
            }`}
        >
          {item.howToUseMediaTypeName}
        </span>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        {/* Purpose chip */}
        <span
          className="inline-flex w-fit items-center gap-1 rounded-full border
            border-[var(--border)] px-2.5 py-0.5 text-[11px] text-[var(--text-muted)]"
        >
          {item.howToUsePurposeName}
        </span>

        {/* Title */}
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-[var(--text-primary)]">
          {item.title}
        </h3>

        {/* Description */}
        <p className="line-clamp-3 flex-1 text-[13px] leading-relaxed text-[var(--text-secondary)]">
          {item.description}
        </p>

        {/* Footer */}
        <div
          className="mt-auto flex items-center justify-between border-t
            border-[var(--border)] pt-3"
        >
          <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <HiCalendar size={13} />
            {item.createdDate}
          </span>
          <span className="text-xs text-[var(--text-muted)]">#{item.sortOrder}</span>
        </div>
      </div>
    </article>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <div
        className="w-full animate-pulse bg-[var(--surface-raised)]"
        style={{ aspectRatio: '16 / 9' }}
      />
      <div className="flex flex-col gap-3 p-4">
        <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--surface-raised)]" />
        <div className="h-4 w-3/4 animate-pulse rounded-lg bg-[var(--surface-raised)]" />
        <div className="h-3 w-full animate-pulse rounded-lg bg-[var(--surface-raised)]" />
        <div className="h-3 w-5/6 animate-pulse rounded-lg bg-[var(--surface-raised)]" />
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface HowToUsePageProps {
  purposeId: number
  pageSize?: number
}

export default function HowToUsePage({ purposeId, pageSize = 20 }: HowToUsePageProps) {
  const { t } = useTranslation()

  const [pageNo, setPageNo] = useState(1)
  const [video, setVideo]   = useState<{ url: string; title: string } | null>(null)

  const { data, isLoading, isError, isFetching } = useGetHowToUseByPurposeQuery(
    { purposeId, pageNo, pageSize },
    { refetchOnMountOrArgChange: true },
  )

  const items      = data?.data      ?? []
  const totalCount = data?.totalCount ?? 0
  const lastPage   = data?.lastPageNo ?? 1

  // ── Error state ────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center text-[var(--text-muted)]">
        <HiViewList size={36} className="opacity-30" />
        <p className="text-sm">
          {t('common.error', 'Something went wrong. Please try again.')}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm
            transition-colors hover:bg-[var(--surface-raised)]"
        >
          {t('common.retry', 'Retry')}
        </button>
      </div>
    )
  }

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-5 flex items-center gap-3">
        <h2 className="text-base font-medium text-[var(--text-primary)]">
          {t('howToUse.title', 'How to Use')}
        </h2>

        {totalCount > 0 && (
          <span
            className="rounded-full border border-[var(--border)] px-2.5 py-0.5
              text-xs text-[var(--text-muted)]"
          >
            {totalCount} {t('common.items', 'items')}
          </span>
        )}

        {isFetching && !isLoading && (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2
              border-[var(--border)] border-t-[var(--accent)]"
          />
        )}
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 rounded-2xl border border-dashed
            border-[var(--border)] py-20 text-center"
        >
          <HiViewList size={32} className="text-[var(--text-muted)] opacity-30" />
          <p className="text-sm text-[var(--text-muted)]">
            {t('howToUse.empty', 'No items found')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <HowToUseCard
              key={item.id}
              item={item}
              onPlay={(url, title) => setVideo({ url, title })}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {lastPage > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            disabled={pageNo <= 1}
            onClick={() => setPageNo((p) => p - 1)}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm
              transition-colors hover:bg-[var(--surface-raised)]
              disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('common.previous', 'Previous')}
          </button>

          <span className="text-sm text-[var(--text-muted)]">
            {pageNo} / {lastPage}
          </span>

          <button
            disabled={pageNo >= lastPage}
            onClick={() => setPageNo((p) => p + 1)}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm
              transition-colors hover:bg-[var(--surface-raised)]
              disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('common.next', 'Next')}
          </button>
        </div>
      )}

      {/* ── Video Modal ──────────────────────────────────────────────────── */}
      {video && (
        <VideoModal
          url={video.url}
          title={video.title}
          onClose={() => setVideo(null)}
        />
      )}
    </>
  )
}