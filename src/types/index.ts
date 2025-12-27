export type ExpenseItem = {
    id: string;
    title: string;
    amount: number;
    currency: 'TRY' | 'USD' | 'EUR';
};

export type Tournament = {
    id: string; // Made 'id' required for internal handling, even if optional in initial prompt, convenient to always have one.
    title: string;
    startDate: string; // ISO 8601: "YYYY-MM-DD"
    endDate: string;   // ISO 8601: "YYYY-MM-DD"
    link?: string;
    country?: string;
    type?: 'standart' | 'rapid' | 'blitz'; // categorization
    rounds?: number;
    budget?: number;
    currency?: 'TRY' | 'USD' | 'EUR';
    expenses?: ExpenseItem[];
    budgetSource?: 'basic' | 'detailed';
    summaryCurrency?: 'TRY' | 'USD' | 'EUR';
};

export type CalendarDay = {
    date: Date;
    dayOfMonth: number;
    monthIndex: number; // 0-11
    isCurrentMonth: boolean;
};
