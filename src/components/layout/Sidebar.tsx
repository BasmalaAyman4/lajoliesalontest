import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '@/hooks/useAppStore'
import { cn } from '@/lib/cn'
import { HiViewGrid, HiCalendar, HiOfficeBuilding, HiUsers } from 'react-icons/hi'
import { motion, AnimatePresence } from 'framer-motion'
import { IoImagesSharp } from "react-icons/io5";
import { FaCodeBranch, FaCalendar } from "react-icons/fa";
import { useAuth } from '@/features/auth/hooks/useAuth'
import { MdOutlineDesignServices } from "react-icons/md";
import { IoMdSettings } from "react-icons/io";
import { RiDiscountPercentFill } from "react-icons/ri";
import { FcFilmReel } from "react-icons/fc";
import { MdOutlineAppRegistration } from "react-icons/md";
import { FiMousePointer } from "react-icons/fi";

const NAV_ITEMS = [
  { to: '/', label: 'nav.dashboard', Icon: HiViewGrid, end: true },
  { to: '/salon-data', label: 'nav.salon', Icon: HiOfficeBuilding },
  { to: '/salon-images', label: 'nav.images', Icon: IoImagesSharp },
  { to: '/salon-branches', label: 'nav.branches', Icon: FaCodeBranch },

  { to: '/salon-specialists', label: 'nav.specialists', Icon: HiUsers },
  { to: '/salon-services', label: 'nav.services', Icon: MdOutlineDesignServices },
  { to: '/service-discount', label: 'nav.discount', Icon: RiDiscountPercentFill },
  { to: '/salon-schedule', label: 'nav.schedule', Icon: FaCalendar },
  { to: '/manage-salon-user', label: 'nav.manageUser', Icon: IoMdSettings },
  { to: '/salon-reels', label: 'nav.salonReels', Icon: FcFilmReel },
  { to: '/salon-appointments', label: 'nav.salonAppointments', Icon: MdOutlineAppRegistration },
  { to: '/salon-how-to-use', label: 'nav.howToUse', Icon: FiMousePointer },

]

export default function Sidebar() {
  const { t } = useTranslation()
  const open = useAppSelector((s) => s.ui.sidebarOpen)
  const { user } = useAuth()

  return (
    <AnimatePresence initial={false}>
      <motion.aside
        animate={{ width: open ? 220 : 64 }}
        transition={{ type: 'spring', duration: 0.3, bounce: 0.1 }}
        className="shrink-0 h-full bg-[var(--bg-card)] border-e border-[var(--border)]
          flex flex-col overflow-hidden"
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-[var(--border)] shrink-0 mb-2">
          <div className="w-10 h-10 rounded-lg bg-[var(--accent)] flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt="Logo"
                className="w-full h-full object-cover"
               onError={(e) => {
  (e.target as HTMLImageElement).style.display = 'none'
    (e.target as HTMLImageElement).nextElementSibling!.style.display = 'flex'
}}
              />
            ) : (
              <span className="text-white font-bold text-sm">B</span>
            )}
          </div>

          <AnimatePresence>
            {open && (

              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="ms-3 font-semibold text-[var(--text-primary)] whitespace-nowrap"
              >
                Dashboard
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="h-3" /> {/* المسافة */}

        {/* Nav */}
        <nav className="flex-1  flex flex-col gap-2 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 ps-2  min-h-[44px] ',
                  'text-sm font-medium transition-all duration-150 group',
                  isActive
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                )
              }
            >
              <Icon size={18} className="shrink-0" />
              <AnimatePresence>
                {open && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="whitespace-nowrap"
                  >
                    {t(label)}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          ))}
        </nav>
      </motion.aside>
    </AnimatePresence>
  )
}
