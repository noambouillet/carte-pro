import api from "./AxiosConfig";

export type PartnerStatus = "pending" | "validated" | "rejected" | "archived" ;

export interface PartnerDirectoryEntry {
  id: string;
  name: string;
  region: string;
  status: PartnerStatus;
}

export interface PartnerTransaction {
  id: string;
  employeeId: string;
  qrCodeId: string | null;
  amountCents: number;
  idempotencyKey: string;
  createdAt: string;
}

export async function registerPartner(firstName: string, lastName: string, email: string, password: string, siren: string,
  socialPurpose: string, establishmentName: string, establishmentRegion: string, establishmentPhone: string) {
  try {
    const response = await api.post("/partners/register", {
      firstName,
      lastName,
      email,
      password,
      siren,
      socialPurpose,
      establishmentName,
      establishmentRegion,
      establishmentPhone,
    });

    return response.data;
  } catch (error) {
    console.error("Erreur lors de l'inscription :", error);
    throw error;
  }
}

export async function searchPartners(q?: string): Promise<{ partners: PartnerDirectoryEntry[] }> {
  const { data } = await api.get("/partners/search", { params: q ? { q } : {} });
  return data;
}

export async function getPartnerTransactions(since?: Date): Promise<{ transactions: PartnerTransaction[] }> {
  const { data } = await api.get("/partners/transactions", {
    params: since ? { since: since.toISOString() } : {},
  });
  return data;
}

export interface RedeemQrPayload {
  qrToken: string;
  amountCents: number;
  idempotencyKey: string;
}

export async function redeemQrCode(payload: RedeemQrPayload): Promise<{ transaction: PartnerTransaction }> {
  const { data } = await api.post("/partners/transactions", payload);
  return data;
}
