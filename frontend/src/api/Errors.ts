import axios from "axios";

export interface ApiErrorBody {
  error: string;
  message?: string;
  status?: string;
}

export function getApiError(err: unknown): ApiErrorBody {
  if (axios.isAxiosError(err) && err.response?.data) {
    return err.response.data as ApiErrorBody;
  }
  return { error: "network_error", message: "Unable to reach the server." };
}
