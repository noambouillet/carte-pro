export type AccountType = 'employee' | 'partner'
export type AccountStatus = 'active' | 'suspended' | 'closed'

export type Account = {
  name: string
  type: AccountType
  attachment: string
  status: AccountStatus
}
