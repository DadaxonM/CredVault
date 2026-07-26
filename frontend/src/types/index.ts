export type RoleName = 'superadmin' | 'admin' | 'user'

export interface Role {
  id: number
  name: RoleName
}

export interface UserOut {
  id: number
  username: string
  first_name: string
  last_name: string
  father_name: string
  email: string
  phone: string
  role: Role
  is_active: boolean
  must_change_password: boolean
  telegram_chat_id?: string | null
  telegram_username?: string | null
  created_at: string
}

export interface AccessGrant {
  id: number
  role_name?: RoleName | null
  user_id?: number | null
  user_full_name?: string | null
}

export interface ServiceOut {
  id: number
  project_name: string
  login: string
  password: string | null
  created_by_id: number
  created_by_name?: string | null
  created_at: string
  access_grants: AccessGrant[]
}

export interface LoginResponse {
  access_token: string
  token_type: string
  must_change_password: boolean
  role: RoleName
  user_id: number
  full_name: string
}

export interface ApiError {
  detail?: string | { msg: string }[]
}
