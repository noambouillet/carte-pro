import api from "./AxiosConfig";

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

export async function registerEmployee(
  payload: RegisterEmployeePayload
): Promise<{ employee: EmployeeSummary }> {
  const { data } = await api.post<{ employee: EmployeeSummary }>(
    "/api/v1/employee/register",
    payload
  );
  return data;
}

export async function getEmployeeBalance(): Promise<{ balanceCents: number }> {
  const { data } = await api.get<{ balanceCents: number }>("/api/v1/employee/balance");
  return data;
}

export interface EmployeeTransaction {
  id: string;
  partnerId: string;
  qrCodeId: string | null;
  amountCents: number;
  idempotencyKey: string;
  createdAt: string;
}

export async function getEmployeeTransactions(): Promise<{ transactions: EmployeeTransaction[] }> {
  const { data } = await api.get<{ transactions: EmployeeTransaction[] }>(
    "/api/v1/employee/transactions"
  );
  return data;
}

export async function generateEmployeeQrCode(): Promise<{ token: string; expiresAt: string }> {
  const { data } = await api.post<{ token: string; expiresAt: string }>(
    "/api/v1/employee/qrcode"
  );
  return data;
}
