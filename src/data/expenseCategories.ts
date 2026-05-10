import type { ExpenseItem } from '../types';

export const DEFAULT_EXPENSE_CATEGORIES = [
    { id: '1', title: 'Plane tickets', currency: 'TRY' },
    { id: '2', title: 'Entry fee', currency: 'EUR' },
    { id: '3', title: 'Hotel/booking', currency: 'TRY' },
    { id: '4', title: 'Food', currency: 'TRY' },
    { id: '5', title: 'Transportation', currency: 'EUR' },
    { id: '6', title: 'Other', currency: 'TRY' }
] as const;

export const createDefaultExpenses = (): ExpenseItem[] =>
    DEFAULT_EXPENSE_CATEGORIES.map(category => ({
        ...category,
        amount: 0
    }));

export const normalizeExpenses = (expenses: ExpenseItem[]): ExpenseItem[] => {
    const expensesById = new Map(expenses.map(expense => [expense.id, expense]));
    const defaultIds = new Set<string>(DEFAULT_EXPENSE_CATEGORIES.map(category => category.id));

    const normalized: ExpenseItem[] = DEFAULT_EXPENSE_CATEGORIES.map(category => {
        const existing = expensesById.get(category.id);
        if (existing) {
            return existing;
        }

        return {
            ...category,
            amount: 0
        };
    });

    for (const expense of expenses) {
        if (!defaultIds.has(expense.id)) {
            normalized.push(expense);
        }
    }

    return normalized;
};