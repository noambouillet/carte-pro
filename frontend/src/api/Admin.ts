import api from './AxiosConfig'

export interface AdminAccountsResponse {
  employees: Array<{
    id: string
    firstName: string
    lastName: string
    email: string
    status: 'active' | 'inactive'
    createdAt: string
  }>
  partners: Array<{
    id: string
    name: string | null
    email: string | null
    status: 'pending' | 'validated' | 'rejected'
    createdAt: string
  }>
}

export interface ScoreboardResponse {
  employees: { total: number; active: number }
  partners: {
    total: number
    validated: number
    pending: number
    rejected: number
  }
  transactions: { totalTransactions: number; totalAmountCents: number }
  creditGrants: { totalGrantedCents: number }
}

export async function getAdminAccounts(): Promise<AdminAccountsResponse> {
  const { data } = await api.get('/admin/accounts')
  return data
}

export async function getScoreboard(): Promise<ScoreboardResponse> {
  const { data } = await api.get('/admin/scoreboard')
  return data
}

export async function validatePartner(
  id: string,
  decision: 'approved' | 'rejected',
  reason: string,
): Promise<{ partner: { id: string; status: string } }> {
  const { data } = await api.post(`/admin/partners/${id}/validate`, {
    decision,
    reason,
  })
  return data
}

export async function grantCredit(
  employeeId: number,
  amountCents: number,
): Promise<{ grant: { id: string; employeeId: string; amountCents: number; grantedAt: string } }> {
  const { data } = await api.post('/admin/credit-grants', {
    employeeId,
    amountCents,
  })
  return data
}

export async function downloadTransactionsCsv(): Promise<void> {
  const response = await api.get('/admin/transactions.csv', {
    responseType: 'blob',
  })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', 'transactions.csv')
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}