import { asc } from "drizzle-orm";
import { database } from "../config/database";
import { transactionHistory } from "../../db/drizzle/schema";
type Db = typeof database;

export interface TransactionHistoryRow {
  id: number;
  occurredAt: string | Date;
  employeeId: number;
  partnerId: number;
  amountCents: number;
  status: string;
}

export async function fetchTransactionHistory(db: Db): Promise<TransactionHistoryRow[]> {
  return db
    .select({
      id: transactionHistory.id,
      occurredAt: transactionHistory.occurredAt,
      employeeId: transactionHistory.employeeId,
      partnerId: transactionHistory.partnerId,
      amountCents: transactionHistory.amountCents,
      status: transactionHistory.status,
    })
    .from(transactionHistory)
    .orderBy(
      asc(transactionHistory.occurredAt),
      asc(transactionHistory.id),
    );
}

const CSV_HEADER = "id;date_iso8601;employee_id;partner_id;amount_cents;status";

export function toCsv(rows: TransactionHistoryRow[]): string {
  const lines = [CSV_HEADER];

  for (const row of rows) {
    const occurredAt = row.occurredAt instanceof Date ? row.occurredAt : new Date(row.occurredAt);

    lines.push([row.id, occurredAt.toISOString(), row.employeeId, row.partnerId, row.amountCents, row.status].join(";"));
  }

  return (
    lines.join("\n") + "\n"
  );
}

export async function fetchTransactionHistoryCsv(db: Db): Promise<string> {
  const rows =
    await fetchTransactionHistory(db);

  return toCsv(rows);
}
