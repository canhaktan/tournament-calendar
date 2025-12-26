import React from 'react';
import type { Tournament } from '../types';

interface DayCellProps {
    day: number;
    date: string; // YYYY-MM-DD
    tournaments: Tournament[];
    isCurrentMonth: boolean;
    isInSelectionRange?: boolean;
    isSelectedStart?: boolean;
    isSelectedEnd?: boolean;
    onClick?: (date: string) => void;
    countryColors?: Record<string, string>;
    className?: string;
}

const DayCell: React.FC<DayCellProps> = ({
    day,
    date,
    tournaments,
    isCurrentMonth,
    isInSelectionRange,
    isSelectedStart,
    isSelectedEnd,
    onClick,
    countryColors,
    className
}) => {
    if (!isCurrentMonth) {
        return <div className="day-cell empty"></div>;
    }

    const hasTournament = tournaments.length > 0;
    const tournament = tournaments[0]; // Basic visualization

    const handleDateClick = () => {
        if (onClick) onClick(date);
    };

    let selectionClass = '';
    if (isSelectedStart) selectionClass = 'selected-start';
    if (isSelectedEnd) selectionClass = 'selected-end';
    if (isInSelectionRange) selectionClass += ' selected-range';

    // Determine color
    let customStyle: React.CSSProperties = {};
    if (hasTournament && tournament && countryColors && tournament.country) {
        const countryColor = countryColors[tournament.country];
        if (countryColor) {
            customStyle = {
                '--event-color': countryColor,
                borderColor: countryColor,
                backgroundColor: `${countryColor}26` // 15% opacity hex
            } as React.CSSProperties;
        }
    }

    return (
        <div
            className={`day-cell ${hasTournament ? 'has-event' : ''} ${selectionClass} ${className || ''}`}
            title={tournament ? `${tournament.title} (${tournament.country || 'Global'})` : ''}
            onClick={handleDateClick}
            style={customStyle}
        >
            <span className="day-number">{day}</span>
            {hasTournament && (
                <div
                    className="event-indicator"
                    style={{
                        backgroundColor: (customStyle as any)['--event-color'] || '#646cff',
                        boxShadow: `0 0 4px ${(customStyle as any)['--event-color'] || '#646cff'}`
                    }}
                />
            )}
        </div>
    );
};

export default DayCell;
