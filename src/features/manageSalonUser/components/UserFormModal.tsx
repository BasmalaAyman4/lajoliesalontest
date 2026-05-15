// ─── UserFormModal ────────────────────────────────────────────────────────────
//
//  Handles both Create and Edit in one modal.
//  Password field is shown only in create mode.
//  Pass `user` to enter edit mode; omit it for create mode.

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Modal, Input, Select, Button } from '@/components/shared'
import type { DropdownOption } from '@/types'
import type { SalonUser, UserTypeOption } from '../types'
import {
  useCreateSalonUserMutation,
  useUpdateSalonUserMutation,
} from '../services/salonUserApi'

// ── Schema ────────────────────────────────────────────────────────────────────
const baseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(1, 'Username is required'),
  mobile: z.string().min(1, 'Mobile is required'),
  userType: z.coerce.number().min(1, 'User type is required'),
  nationalId: z.string().min(1, 'National ID is required'),
})

const createSchema = baseSchema.extend({
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const editSchema = baseSchema.extend({
  password: z.string().optional(),
})

type CreateFormValues = z.infer<typeof createSchema>
type EditFormValues = z.infer<typeof editSchema>
type FormValues = CreateFormValues // superset — edit just ignores password

// ── Default values ────────────────────────────────────────────────────────────
const DEFAULT_VALUES: FormValues = {
  name: '',
  username: '',
  password: '',
  mobile: '',
  userType: 0,
  nationalId: '',
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface UserFormModalProps {
  open: boolean
  onClose: () => void
  /** Pass to enter edit mode */
  user?: SalonUser
  userTypes: UserTypeOption[]
  /** Called after successful create with the new user id */
  onCreated?: (id: number) => void
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function UserFormModal({
  open,
  onClose,
  user,
  userTypes,
  onCreated,
}: UserFormModalProps) {
  const { t } = useTranslation()
  const isEdit = Boolean(user)

  const [createUser, { isLoading: isCreating }] = useCreateSalonUserMutation()
  const [updateUser, { isLoading: isUpdating }] = useUpdateSalonUserMutation()
  const isLoading = isCreating || isUpdating

  const userTypeOptions: DropdownOption[] = userTypes.map((ut) => ({
    value: ut.id,
    label: ut.name,
  }))

  // ── Form ────────────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: DEFAULT_VALUES,
  })

  // Populate form when opening
  useEffect(() => {
    if (open) {
      reset(
        user
          ? {
              name: user.name,
              username: user.username,
              password: '',
              mobile: user.mobile,
              userType: user.userType,
              nationalId: user.nationalId,
            }
          : DEFAULT_VALUES,
      )
    }
  }, [open, user, reset])

  // ── Submit ──────────────────────────────────────────────────────────────────
  const onSubmit = async (values: FormValues) => {
    try {
      if (isEdit && user) {
        const { password: _pw, ...rest } = values
        await updateUser({ id: user.id, ...rest, password: '' }).unwrap()
        toast.success(t('common.success'))
        onClose()
      } else {
        const newId = await createUser(values).unwrap()
        toast.success(t('common.success'))
        onClose()
        onCreated?.(newId)
      }
    } catch {
      toast.error(t('common.error'))
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isEdit
          ? t('user.editUser', 'Edit User')
          : t('user.addUser', 'Add User')
      }
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isLoading}>
            {isEdit ? t('common.save') : t('common.add', 'Add')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">

        {/* Name */}
        <Input
          {...register('name')}
          label={t('user.name', 'Full Name')}
          placeholder="e.g. Sarah Ahmed"
          error={errors.name?.message}
          required
        />

        {/* Username & Mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            {...register('username')}
            label={t('user.username', 'Username')}
            placeholder="e.g. sarah.ahmed"
            error={errors.username?.message}
            required
          />
          <Input
            {...register('mobile')}
            label={t('user.mobile', 'Mobile')}
            placeholder="e.g. 05xxxxxxxx"
            error={errors.mobile?.message}
            required
          />
        </div>

        {/* Password — create mode only */}
        {!isEdit && (
          <Input
            {...register('password')}
            type="password"
            label={t('user.password', 'Password')}
            placeholder="Min. 6 characters"
            error={errors.password?.message}
            required
          />
        )}

        {/* National ID & User Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            {...register('nationalId')}
            label={t('user.nationalId', 'National ID')}
            placeholder="e.g. 1xxxxxxxxx"
            error={errors.nationalId?.message}
            required
          />
          <Select
            {...register('userType')}
            label={t('user.userType', 'User Type')}
            options={userTypeOptions}
            placeholder={t('user.selectUserType', 'Select a type')}
            error={errors.userType?.message}
            required
          />
        </div>

      </div>
    </Modal>
  )
}