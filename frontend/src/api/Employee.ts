import api from "./AxiosConfig";

const EMPLOYEE_BALANCE_CACHE_KEY = 'employee-balance'

export interface RegisterEmployeePayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

export interface EmployeeSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: "active" | "inactive";
  createdAt: string;
}

interface EmployeeBalanceCache {
  balanceCents: number
  cachedAt: string
}

export function saveEmployeeBalance(balanceCents: number) {
  localStorage.setItem(
    EMPLOYEE_BALANCE_CACHE_KEY,
    JSON.stringify({
      balanceCents,
      cachedAt: new Date().toISOString(),
    })
  )
}

export function getCachedEmployeeBalance(): EmployeeBalanceCache | null {
  try {
    const raw = localStorage.getItem(EMPLOYEE_BALANCE_CACHE_KEY)
    if (!raw)
      return null

    const cache = JSON.parse(raw)

    if (typeof cache.balanceCents !== 'number' || typeof cache.cachedAt !== 'string') {
      return null
    }
    return cache
  } catch {
    return null
  }
}

export async function registerEmployee(
  payload: RegisterEmployeePayload
): Promise<{ employee: EmployeeSummary }> {
  const { data } = await api.post<{ employee: EmployeeSummary }>(
    "/employees/register",
    payload
  );
  return data;
}

export async function getEmployeeBalance(): Promise<{ balanceCents: number }> {
  const { data } = await api.get<{ balanceCents: number }>("/employees/balance");
  return data;
}

export type EmployeeTransactionStatus = "credit_granted" | "approved" | "refused_insufficient_balance";

export interface EmployeeTransaction {
  id: string;
  occurredAt: string;
  partnerId: string | null;
  partnerName: string | null;
  partnerRegion: string | null;
  qrCodeId: string | null;
  amountCents: number;
  status: EmployeeTransactionStatus;
}

export async function getEmployeeTransactions(): Promise<{ transactions: EmployeeTransaction[] }> {
  const { data } = await api.get<{ transactions: EmployeeTransaction[] }>(
    "/employees/transactions"
  );
  return data;
}

export async function generateEmployeeQrCode(): Promise<{ token: string; expiresAt: string }> {
  const { data } = await api.post<{ token: string; expiresAt: string }>(
    "/employees/qrcode"
  );
  return data;
}
