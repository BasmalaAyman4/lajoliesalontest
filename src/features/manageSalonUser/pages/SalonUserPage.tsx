// ─── Salon User Page ──────────────────────────────────────────────────────────
//
//  Lists all salon users in a table.
//  Add / Edit → UserFormModal
//  Delete     → ConfirmModal

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { HiPlus, HiPencil, HiTrash, HiKey } from 'react-icons/hi'
import {
  Button,
  ConfirmModal,
  DataTable,
  StatusBadge,
  type Column,
  type FilterConfig,
} from '@/components/shared'
import type { SalonUser } from '../types'
import {
  useGetSalonUsersQuery,
  useDeleteSalonUserMutation,
  useGetUserTypeDropdownQuery,
} from '../services/salonUserApi'
import UserFormModal from '../components/UserFormModal'
import ResetPasswordModal from '../components/ResetPasswordModal'

export default function SalonUserPage() {
  const { t } = useTranslation()

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data: users = [], isLoading, isError } = useGetSalonUsersQuery()
  const { data: userTypes = [] } = useGetUserTypeDropdownQuery()
  const [deleteUser, { isLoading: isDeleting }] = useDeleteSalonUserMutation()
console.log(users)
  // ── Modal state ─────────────────────────────────────────────────────────────
  const [formModal, setFormModal] = useState<{ open: boolean; user?: SalonUser }>({
    open: false,
  })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  })
  const [resetModal, setResetModal] = useState<{ open: boolean; user?: SalonUser }>({ open: false })  // ← add

  // ── Handlers ────────────────────────────────────────────────────────────────
  const openAdd = () => setFormModal({ open: true })
  const openEdit = (user: SalonUser) => setFormModal({ open: true, user })
  const closeForm = () => setFormModal({ open: false })

  const confirmDelete = (id: number) => setDeleteModal({ open: true, id })
 const openReset = (user: SalonUser) => setResetModal({ open: true, user })
  const handleDelete = async () => {
    if (!deleteModal.id) return
    try {
      await deleteUser(deleteModal.id).unwrap()
      toast.success(t('user.deleteSuccess', 'User deleted'))
    } catch {
      toast.error(t('common.error'))
    } finally {
      setDeleteModal({ open: false, id: null })
    }
  }

  // ── Filters ──────────────────────────────────────────────────────────────────
  const userTypeFilterOptions = userTypes.map((ut) => ({ label: ut.name, value: ut.name }))

  const tableFilters: FilterConfig[] = [
    {
      key: 'typeName',
      label: t('user.userType', 'User Type'),
      options: userTypeFilterOptions,
    },
    {
      key: 'isPhoneVerified',
      label: t('user.phoneVerified', 'Phone Verified'),
      options: [
        { label: t('common.yes', 'Yes'), value: 'true' },
        { label: t('common.no', 'No'), value: 'false' },
      ],
    },
    {
      key: 'isDeleted',
      label: t('user.status', 'Status'),
      options: [
        { label: t('common.active', 'Active'), value: 'false' },
        { label: t('common.deleted', 'Deleted'), value: 'true' },
      ],
    },
  ]

  // ── Columns ──────────────────────────────────────────────────────────────────
  const columns: Column<SalonUser>[] = [
    {
      key: 'name',
      label: t('user.name', 'Name'),
    },
    {
      key: 'username',
      label: t('user.username', 'Username'),
      render: (row) => (
        <code className="px-1.5 py-0.5 rounded text-xs font-mono bg-[var(--bg-hover)] text-[var(--text-secondary)]">
          {row.username}
        </code>
      ),
    },
    {
      key: 'mobile',
      label: t('user.mobile', 'Mobile'),
      render: (row) => (
        <span className="text-sm text-[var(--text-secondary)] tabular-nums">{row.mobile}</span>
      ),
    },
    {
      key: 'nationalId',
      label: t('user.nationalId', 'National ID'),
      render: (row) => (
        <span className="text-sm text-[var(--text-secondary)] tabular-nums">{row.nationalId}</span>
      ),
    },
    {
      key: 'typeName',
      label: t('user.userType', 'User Type'),
      render: (row) => (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-soft)] text-[var(--accent)]">
          {row.typeName}
        </span>
      ),
    },
    {
      key: 'isPhoneVerified',
      label: t('user.phoneVerified', 'Phone'),
      render: (row) => (
        <StatusBadge
          approved={row.isPhoneVerified}
          approvedLabel={t('common.verified', 'Verified')}
          pendingLabel={t('common.unverified', 'Unverified')}
        />
      ),
    },
    {
      key: 'isDeleted',
      label: t('user.status', 'Status'),
      render: (row) => (
        <StatusBadge
          approved={!row.isDeleted}
          approvedLabel={t('common.active', 'Active')}
          pendingLabel={t('common.deleted', 'Deleted')}
        />
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      width: '88px',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            title={t('common.edit', 'Edit')}
            onClick={() => openEdit(row)}
            className="w-8 h-8 rounded-lg flex items-center justify-center
              text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]
              transition-colors"
          >
            <HiPencil size={15} />
          </button>
          <button
            type="button"
            title={t('user.resetPassword', 'Reset Password')}
            onClick={() => openReset(row)}
            className="w-8 h-8 rounded-lg flex items-center justify-center
              text-[var(--text-muted)] hover:text-amber-500 hover:bg-amber-50
              transition-colors"
          >
            <HiKey size={15} />
          </button>
          <button
            type="button"
            title={t('common.delete')}
            onClick={() => confirmDelete(row.id)}
            className="w-8 h-8 rounded-lg flex items-center justify-center
              text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-red-50
              transition-colors"
          >
            <HiTrash size={15} />
          </button>
        </div>
      ),
    },
  ]

  // ── Error ────────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-[var(--danger)]">Failed to load users.</p>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            {t('user.title', 'Salon Users')}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {t('user.description', 'Manage salon staff accounts')}
          </p>
        </div>
        <Button onClick={openAdd} leftIcon={<HiPlus size={15} />}>
          {t('user.addUser', 'Add User')}
        </Button>
      </div>

      {/* DataTable */}
      <DataTable<SalonUser>
        columns={columns}
        data={users}
        rowKey="id"
        loading={isLoading}
        searchKeys={['name', 'username', 'mobile', 'nationalId', 'typeName']}
        searchPlaceholder={t('user.searchPlaceholder', 'Search by name, username, mobile…')}
        filters={tableFilters}
        emptyMessage={t('user.noUsers', 'No users found. Add your first one!')}
      />

      {/* Add / Edit modal */}
      <UserFormModal
        open={formModal.open}
        onClose={closeForm}
        user={formModal.user}
        userTypes={userTypes}
      />

      {/* Delete confirm */}
      <ConfirmModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null })}
        onConfirm={handleDelete}
        loading={isDeleting}
        title={t('user.deleteTitle', 'Delete User')}
        message={t(
          'user.deleteMessage',
          'Are you sure you want to delete this user? This action cannot be undone.',
        )}
      />
      <ResetPasswordModal
        open={resetModal.open}
        onClose={() => setResetModal({ open: false })}
        user={resetModal.user}
      />
    </div>
  )
}