import api from "./AxiosConfig";

export type Role = "employee" | "partner" | "admin";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  role: Role;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/api/v1/auth/login", payload);
  return data;
}

export async function logout(): Promise<void> {
  await api.post("/api/v1/auth/logout");
}

export interface EmployeeMe {
  role: "employee";
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    status: "active" | "inactive";
  };
}

export interface PartnerMe {
  role: "partner";
  partner: {
    id: string;
    name: string;
    siren: string;
    objetSocial: string;
    address: string;
    email: string;
    status: "pending" | "validated" | "rejected";
  };
}

export interface AdminMe {
  role: "admin";
  admin: { id: string; email: string };
}

export type MeResponse = EmployeeMe | PartnerMe | AdminMe;

export async function getMe(): Promise<MeResponse> {
  const { data } = await api.get<MeResponse>("/api/v1/auth/me");
  return data;
}
