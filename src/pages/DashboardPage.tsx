import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { HiCalendar, HiArrowRight } from 'react-icons/hi'

export default function DashboardPage() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          {t('nav.dashboard')}
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Welcome back!</p>
      </div>


    </div>
  )
}
