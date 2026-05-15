// ─── ReelPreviewModal ─────────────────────────────────────────────────────────
//
//  HLS-aware video player modal.
//  .m3u8 streams are played via hls.js; direct mp4/webm fall back to native.

import { useEffect, useRef } from 'react'
import Hls from 'hls.js'
import { useTranslation } from 'react-i18next'
import { Modal, Button } from '@/components/shared'

interface ReelPreviewModalProps {
  open: boolean
  onClose: () => void
  videoUrl: string
  reelTitle: string
  thumbnailUrl?: string
}

export default function ReelPreviewModal({
  open,
  onClose,
  videoUrl,
  reelTitle,
  thumbnailUrl,
}: ReelPreviewModalProps) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)

  useEffect(() => {
    if (!open || !videoRef.current) return

    const video = videoRef.current
    const isHls = videoUrl.includes('.m3u8')

    // Destroy any previous instance
    hlsRef.current?.destroy()
    hlsRef.current = null

    if (isHls && Hls.isSupported()) {
      const hls = new Hls()
      hlsRef.current = hls
      hls.loadSource(videoUrl)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {}) // user gesture may block autoplay — ignore
      })
    } else {
      // Native HLS (Safari) or plain video
      video.src = videoUrl
      video.play().catch(() => {})
    }

    return () => {
      hlsRef.current?.destroy()
      hlsRef.current = null
    }
  }, [open, videoUrl])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={reelTitle}
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t('common.close', 'Close')}
        </Button>
      }
    >
      <div className="w-full aspect-video rounded-[var(--radius-lg)] overflow-hidden bg-black">
        <video
          ref={videoRef}
          className="w-full h-full"
          controls
          poster={thumbnailUrl}
          playsInline
        />
      </div>
    </Modal>
  )
}