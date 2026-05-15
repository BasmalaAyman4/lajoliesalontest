// ─── Header ───────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from '@/hooks/useAppStore'
import { toggleSidebar, setLang } from '@/store/slices/uiSlice'
import { HiMenu, HiTranslate, HiLogout, HiLockClosed, HiChevronDown } from 'react-icons/hi'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/hooks/useAuth'
import ChangePasswordModal from '@/features/auth/components/ChangePasswordModal'

export default function Header() {
  const { t, i18n } = useTranslation()
  const dispatch = useAppDispatch()
  const lang = useAppSelector((s) => s.ui.lang)
  const { logout, user } = useAuth()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const switchLang = () => {
    const next = lang === 'en' ? 'ar' : 'en'
    i18n.changeLanguage(next)
    dispatch(setLang(next))
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = next
  }

  const handleLogout = () => {
    setDropdownOpen(false)
    logout()
    toast.success('Logged out successfully')
  }

  const handleChangePassword = () => {
    setDropdownOpen(false)
    setShowChangePassword(true)
  }

  // Get initials from user name, fallback to 'AD'
  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('')
    : 'AD'

  return (
    <>
      <header
        className="h-16 shrink-0 flex items-center justify-between px-5
          bg-[var(--bg-card)] border-b border-[var(--border)]"
      >
        {/* Left */}
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="p-2 rounded-[var(--radius)] text-[var(--text-muted)]
            hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Toggle sidebar"
        >
          <HiMenu size={20} />
        </button>

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* Language toggle */}
          <button
            onClick={switchLang}
            className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius)]
              border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)]
              hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
          >
            <HiTranslate size={14} />
            {lang === 'en' ? 'العربية' : 'English'}
          </button>

          {/* Avatar dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-2 rounded-[var(--radius)] px-1.5 py-1
                hover:bg-[var(--bg-hover)] transition-colors"
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
            >
              {/* Avatar circle */}
              <div
                className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center
                  text-white text-xs font-bold shrink-0"
                title={user?.name ?? ''}
              >
                {initials}
              </div>

              {/* Name + chevron */}
              <span className="hidden sm:block text-sm font-medium text-[var(--text-primary)] max-w-[120px] truncate">
                {user?.name ?? 'Admin'}
              </span>
              <HiChevronDown
                size={14}
                className={`text-[var(--text-muted)] transition-transform duration-200 ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown panel */}
            {dropdownOpen && (
              <div
                className="
                  absolute right-0 top-full mt-2 w-52
                  bg-[var(--bg-card)] border border-[var(--border)]
                  rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)]
                  py-1.5 z-40
                  animate-fade-in
                "
              >
                {/* User info header */}
                <div className="px-4 py-2.5 border-b border-[var(--border)]">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {user?.name ?? 'Admin'}
                  </p>
                  {user?.salonName && (
                    <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                      {user.salonName}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="py-1">
                  <button
                    onClick={handleChangePassword}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm
                      text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]
                      hover:text-[var(--text-primary)] transition-colors text-left"
                  >
                    <HiLockClosed size={15} className="shrink-0" />
                    Change Password
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm
                      text-[var(--danger)] hover:bg-red-50
                      transition-colors text-left"
                  >
                    <HiLogout size={15} className="shrink-0" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </>
  )
}