// ─── AuthLayout ───────────────────────────────────────────────────────────────
//
//  Centered card layout shared by LoginPage and OtpPage.

import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle: string
  children: ReactNode
}

export default function AuthLayout({ title, subtitle, children }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4">
      <div
        className="
          w-full max-w-sm
          bg-[var(--bg-card)] border border-[var(--border)]
          rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)]
          p-8 flex flex-col gap-6
          animate-fade-in
        "
      >
        {/* Logo mark */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--accent)] flex items-center justify-center shadow-[var(--shadow)]">
            <span className="text-white font-bold text-xl">D</span>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">{title}</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">{subtitle}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-[var(--border)]" />

        {/* Slot */}
        {children}
      </div>
    </div>
  )
}