import { relations } from "drizzle-orm/relations";
import { partners, partnerValidationDecisions, adminAgents, employees, qrCodes, creditGrants, transactions, transactionAttempts, transactionReversals } from "./schema";

export const partnerValidationDecisionsRelations = relations(partnerValidationDecisions, ({one}) => ({
	partner: one(partners, {
		fields: [partnerValidationDecisions.partnerId],
		references: [partners.id]
	}),
	adminAgent: one(adminAgents, {
		fields: [partnerValidationDecisions.agentId],
		references: [adminAgents.id]
	}),
}));

export const partnersRelations = relations(partners, ({many}) => ({
	partnerValidationDecisions: many(partnerValidationDecisions),
	transactions: many(transactions),
	transactionAttempts: many(transactionAttempts),
}));

export const adminAgentsRelations = relations(adminAgents, ({many}) => ({
	partnerValidationDecisions: many(partnerValidationDecisions),
	transactionReversals: many(transactionReversals),
}));

export const qrCodesRelations = relations(qrCodes, ({one, many}) => ({
	employee: one(employees, {
		fields: [qrCodes.employeeId],
		references: [employees.id]
	}),
	transactions: many(transactions),
	transactionAttempts: many(transactionAttempts),
}));

export const employeesRelations = relations(employees, ({many}) => ({
	qrCodes: many(qrCodes),
	creditGrants: many(creditGrants),
	transactions: many(transactions),
	transactionAttempts: many(transactionAttempts),
}));

export const creditGrantsRelations = relations(creditGrants, ({one}) => ({
	employee: one(employees, {
		fields: [creditGrants.employeeId],
		references: [employees.id]
	}),
}));

export const transactionsRelations = relations(transactions, ({one, many}) => ({
	employee: one(employees, {
		fields: [transactions.employeeId],
		references: [employees.id]
	}),
	partner: one(partners, {
		fields: [transactions.partnerId],
		references: [partners.id]
	}),
	qrCode: one(qrCodes, {
		fields: [transactions.qrCodeId],
		references: [qrCodes.id]
	}),
	transactionReversals: many(transactionReversals),
}));

export const transactionAttemptsRelations = relations(transactionAttempts, ({one}) => ({
	employee: one(employees, {
		fields: [transactionAttempts.employeeId],
		references: [employees.id]
	}),
	partner: one(partners, {
		fields: [transactionAttempts.partnerId],
		references: [partners.id]
	}),
	qrCode: one(qrCodes, {
		fields: [transactionAttempts.qrCodeId],
		references: [qrCodes.id]
	}),
}));

export const transactionReversalsRelations = relations(transactionReversals, ({one}) => ({
	transaction: one(transactions, {
		fields: [transactionReversals.transactionId],
		references: [transactions.id]
	}),
	adminAgent: one(adminAgents, {
		fields: [transactionReversals.agentId],
		references: [adminAgents.id]
	}),
}));