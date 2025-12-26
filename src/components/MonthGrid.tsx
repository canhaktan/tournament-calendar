import React from 'react';
import { MONTHS, DAYS_SHORT } from '../config/locale';
import type { Tournament } from '../types';
import DayCell from './DayCell';

interface MonthGridProps {
    year: number;
    monthIndex: number; // 0-11
    tournaments: Tournament[]; // Tournaments filtered for this month (roughly)
    onDateClick?: (date: string) => void;
    selectionStart?: string | null;
    selectionEnd?: string | null;
    countryColors?: Record<string, string>;
    highlightedTournamentId?: string | null;
}

const MonthGrid: React.FC<MonthGridProps> = ({
    year,
    monthIndex,
    tournaments,
    onDateClick,
    selectionStart,
    selectionEnd,
    countryColors,
    highlightedTournamentId
}) => {
    // Helper to check if a specific date has a tournament
    const getTournamentsForDate = (dateStr: string) => {
        return tournaments.filter(t =>
            dateStr >= t.startDate && dateStr <= t.endDate
        );
    };

    // Helper to check if date belongs to highlighted tournament
    const isHighlighted = (dateStr: string) => {
        if (!highlightedTournamentId) return false;
        return tournaments.some(t =>
            t.id === highlightedTournamentId &&
            dateStr >= t.startDate &&
            dateStr <= t.endDate
        );
    };

    // Check selection
    const isSelectedStart = (d: string) => selectionStart === d;
    const isSelectedEnd = (d: string) => selectionEnd === d;
    const isInRange = (d: string) => {
        if (!selectionStart || !selectionEnd) return false;
        return d > selectionStart && d < selectionEnd;
    };

    // Calendar logic
    const firstDayOfMonth = new Date(year, monthIndex, 1);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    // Adjust starting day to Monday (0=Sunday in JS, but 6 in our 0-6 range if 0 is Mon)
    // JS: Sun=0, Mon=1...Sat=6
    // Target: Mon=0...Sun=6
    let startDay = firstDayOfMonth.getDay() - 1;
    if (startDay === -1) startDay = 6; // Sunday

    const days = [];

    // Empty slots for previous month
    for (let i = 0; i < startDay; i++) {
        days.push(<div key={`empty-${i}`} className="day-cell-placeholder" />);
    }

    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
        // Construct YYYY-MM-DD manually to avoid timezone issues
        const m = (monthIndex + 1).toString().padStart(2, '0');
        const dayStr = d.toString().padStart(2, '0');
        const dateStr = `${year}-${m}-${dayStr}`;

        days.push(
            <DayCell
                key={d}
                day={d}
                date={dateStr}
                isCurrentMonth={true}
                tournaments={getTournamentsForDate(dateStr)}
                onClick={onDateClick}
                isSelectedStart={isSelectedStart(dateStr)}
                isSelectedEnd={isSelectedEnd(dateStr)}
                isInSelectionRange={isInRange(dateStr)}
                countryColors={countryColors}
                className={isHighlighted(dateStr) ? 'siren-effect' : ''}
            />
        );
    }

    return (
        <div className="month-grid-container">
            <h3 className="month-title">{MONTHS[monthIndex]}</h3>
            <div className="days-header">
                {DAYS_SHORT.map(d => (
                    <div key={d} className="day-name">{d}</div>
                ))}
            </div>
            <div className="days-grid">
                {days}
            </div>
        </div>
    );
};

export default MonthGrid;
