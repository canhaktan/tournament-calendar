export const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export const DAYS_SHORT = [
    'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
];

export const QUARTERS = [
    { id: 'Q1', months: [0, 1, 2] },
    { id: 'Q2', months: [3, 4, 5] },
    { id: 'Q3', months: [6, 7, 8] },
    { id: 'Q4', months: [9, 10, 11] }
];

// Helper to format date for display
export const formatDateDisplay = (dateStr: string): string => {
    const date = new Date(dateStr);
    return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
};
