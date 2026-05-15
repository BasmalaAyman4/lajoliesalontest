

import { HiLocationMarker, HiStar, HiUser, HiShieldCheck, HiSparkles } from 'react-icons/hi'
import { MdChildCare, MdPerson } from 'react-icons/md'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface MobileSalonPreviewProps {
  nameEn?: string
  nameAr?: string
  address?: string
  logoSrc?: string
  bannerSrc?: string
  rating?: number
  reviewCount?: number
  hijabSection?: boolean
  childrenNotAllowed?: boolean
  menWorker?: boolean
}

// ── Sub-components ────────────────────────────────────────────────────────────
function PhoneShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: 320,
        height: 640,
        borderRadius: 40,
        border: '6px solid var(--border)',
        background: 'var(--bg-base)',
        boxShadow: '0 32px 64px -12px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.08)',
      }}
    >
      {/* Side buttons */}
      <div
        className="absolute -right-2 top-24 w-1.5 h-10 rounded-r-full"
        style={{ background: 'var(--border)' }}
      />
      <div
        className="absolute -left-2 top-20 w-1.5 h-7 rounded-l-full"
        style={{ background: 'var(--border)' }}
      />
      <div
        className="absolute -left-2 top-32 w-1.5 h-7 rounded-l-full"
        style={{ background: 'var(--border)' }}
      />

      {children}
    </div>
  )
}

function StatusBar() {
  return (
    <div
      className="relative flex items-center justify-between px-5 pt-3 pb-1"
      style={{ background: 'var(--bg-base)', zIndex: 10 }}
    >
      <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
        9:41
      </span>
      {/* Dynamic island */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-2 rounded-full bg-black"
        style={{ width: 80, height: 22 }}
      />
      {/* Status icons */}
      <div className="flex items-center gap-1">
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <rect x="0" y="3" width="3" height="9" rx="1" fill="currentColor" opacity="0.4" />
          <rect x="4.5" y="2" width="3" height="10" rx="1" fill="currentColor" opacity="0.6" />
          <rect x="9" y="0" width="3" height="12" rx="1" fill="currentColor" />
          <rect x="14" y="4" width="2" height="6" rx="1" fill="currentColor" opacity="0.3" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 24 12" fill="currentColor">
          <rect x="0" y="3" width="20" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4" />
          <rect x="20" y="5" width="2" height="5" rx="1" opacity="0.4" />
          <rect x="1.5" y="4.5" width="14" height="6" rx="1" />
        </svg>
      </div>
    </div>
  )
}

function NavBar() {
  const tabs = [
    { icon: '🏠', label: 'Home' },
    { icon: '🔍', label: 'Explore' },
    { icon: '📅', label: 'Bookings' },
    { icon: '👤', label: 'Profile' },
  ]
  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex items-center justify-around pb-2 pt-2"
      style={{
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {tabs.map(({ icon, label }, i) => (
        <div key={label} className="flex flex-col items-center gap-0.5">
          <span className="text-base leading-none">{icon}</span>
          <span
            className="text-[8px] font-medium"
            style={{ color: i === 2 ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MobileSalonPreview({
  nameEn,
  nameAr,
  address,
  logoSrc,
  bannerSrc,
  rating = 4.8,
  reviewCount = 231,
  hijabSection = false,
  childrenNotAllowed = false,
  menWorker = false,
}: MobileSalonPreviewProps) {
  const displayName = nameEn || 'Salon Name'
  const displayAddress = address || 'Salon Address'

  const settingPills = [
    hijabSection    && { label: 'Hijab Section',  color: '#d946ef' },
    childrenNotAllowed && { label: 'Adults Only',  color: '#f59e0b' },
    menWorker       && { label: 'Male Workers',    color: '#3b82f6' },
  ].filter(Boolean) as { label: string; color: string }[]

  const badges = [
    { label: '10K+ Happy Clients', Icon: HiUser },
    { label: '5+ Years Experience', Icon: HiStar },
    { label: 'Premium Products', Icon: HiSparkles },
    { label: 'Clean & Safe', Icon: HiShieldCheck },
  ]

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Label */}
      <div className="flex items-center gap-2">
        <div
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: 'var(--accent)' }}
        />
        <span
          className="text-[11px] font-semibold tracking-widest uppercase"
          style={{ color: 'var(--text-muted)' }}
        >
          Live Preview
        </span>
        <div
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: 'var(--accent)' }}
        />
      </div>

      <PhoneShell>
        <StatusBar />

        {/* Scrollable body */}
        <div
          className="overflow-y-auto"
          style={{ height: 'calc(100% - 44px)', paddingBottom: 60, scrollbarWidth: 'none' }}
        >
          {/* ── Banner ────────────────────────────────────────────────────── */}
          <div
            className="relative w-full overflow-hidden"
            style={{
              height: 176,
              background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 50%, #f9a8d4 100%)',
            }}
          >
            {bannerSrc ? (
              <img src={bannerSrc} alt="banner" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 opacity-40">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Banner preview
                </span>
              </div>
            )}

            {/* Overlay gradient for readability */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.15) 100%)' }}
            />

            {/* Back */}
            <button
              className="absolute top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)' }}
            >
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>‹</span>
            </button>

            {/* Actions */}
            <div className="absolute top-3 right-3 flex gap-1.5">
              {['↗', '♡'].map((icon) => (
                <button
                  key={icon}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                  style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)' }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* ── Info card ─────────────────────────────────────────────────── */}
          <div
            className="mx-3 -mt-6 rounded-2xl p-3 relative"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 24px -4px rgba(0,0,0,0.12)',
              zIndex: 2,
            }}
          >
            {/* Logo + name row */}
            <div className="flex items-start gap-3">
              <div
                className="w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
                style={{
                  border: '2px solid white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  background: 'linear-gradient(135deg, #fce7f3, #fbcfe8)',
                }}
              >
                {logoSrc ? (
                  <img src={logoSrc} alt="logo" className="w-full h-full object-cover" />
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="1.5" opacity="0.7">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                )}
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <h3
                  className="font-bold text-sm leading-tight truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {displayName}
                </h3>
                {nameAr && (
                  <p
                    className="text-[11px] truncate mt-0.5"
                    style={{ color: 'var(--text-muted)' }}
                    dir="rtl"
                  >
                    {nameAr}
                  </p>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="my-2.5" style={{ height: 1, background: 'var(--border)' }} />

            {/* Address */}
            <div className="flex items-center gap-1.5">
              <HiLocationMarker size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span
                className="text-[10px] flex-1 truncate"
                style={{ color: 'var(--text-muted)' }}
              >
                {displayAddress}
              </span>
              <span
                className="text-[9px] rounded-full px-2 py-0.5 shrink-0 font-medium"
                style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}
              >
                View map
              </span>
            </div>

       



      

       
        </div>
     
          </div>
      </PhoneShell>
    </div>
  )
}