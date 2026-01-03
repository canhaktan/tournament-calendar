import React, { useEffect, useState } from 'react';
import { fetchTournaments } from '../services/tournamentService';
import type { Tournament } from '../types';
import MonthGrid from './MonthGrid';
import TournamentModal from './TournamentModal';
import StatsPanel from './StatsPanel';
import './YearView.css';

const YearView: React.FC = () => {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Stats & Color State
    const [countryColors, setCountryColors] = useState<Record<string, string>>({});
    const [activeCountry, setActiveCountry] = useState<string | null>(null);

    // Selection Mode State (view | add | delete)
    const [mode, setMode] = useState<'view' | 'add' | 'delete'>('view');
    const [selectionStart, setSelectionStart] = useState<string | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<string | null>(null);
    // For delete mode confirmation
    const [selectedDeleteId, setSelectedDeleteId] = useState<string | null>(null);
    // For siren blink effect
    const [highlightedTournamentId, setHighlightedTournamentId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const AVAILABLE_YEARS = [2025, 2026, 2027];

    const loadData = async () => {
        try {
            const data = await fetchTournaments();
            setTournaments(data);
        } catch (error) {
            console.error("Failed to load tournaments", error);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadData();
        // Load Settings
        const savedColors = localStorage.getItem('country_colors');
        if (savedColors) {
            setCountryColors(JSON.parse(savedColors));
        }
    }, []);

    const handleColorChange = (country: string, color: string) => {
        const newColors = {
            ...countryColors,
            [country]: color
        };
        setCountryColors(newColors);
        localStorage.setItem('country_colors', JSON.stringify(newColors));
    };

    const handleCountryClick = (country: string) => {
        setActiveCountry(country === activeCountry ? null : country);
    };

    const handleTournamentChange = () => {
        loadData();
    };

    const handleDateClick = (date: string) => {
        // Find if a tournament exists on this date
        const existingTournament = tournaments.find(t =>
            date >= t.startDate && date <= t.endDate
        );

        // If clicking existing tournament
        if (existingTournament) {
            if (mode === 'delete') {
                // Select for deletion
                setSelectionStart(existingTournament.startDate);
                setSelectionEnd(existingTournament.endDate);
                setSelectedDeleteId(existingTournament.id);
                return;
            } else if (mode === 'view') {
                // Open modal in edit mode with this tournament selected
                setSelectionStart(existingTournament.startDate);
                setSelectionEnd(existingTournament.endDate);
                setIsModalOpen(true);
                return;
            }
            // If in 'add' mode, we might want to prevent selection or allow partial. 
            // Current logic prevents overwriting unless explicit logic added.
            // For now, let's just return to avoid confusion.
            return;
        }

        if (mode === 'add') {
            if (!selectionStart || (selectionStart && selectionEnd)) {
                // New selection
                setSelectionStart(date);
                setSelectionEnd(null);
            } else {
                // End date
                if (date < selectionStart) {
                    setSelectionEnd(selectionStart);
                    setSelectionStart(date);
                } else {
                    setSelectionEnd(date);
                }
            }
        }
    };

    const handleConfirmAction = async () => {
        if (mode === 'add') {
            setIsModalOpen(true);
        } else if (mode === 'delete' && selectedDeleteId) {
            if (window.confirm('DO YOU WANT TO DELETE THE SELECTED TOURNAMENT?')) {
                await import('../services/tournamentService').then(m => m.deleteTournament(selectedDeleteId));
                handleModalSave(); // Refresh data and reset
            }
        }
    };

    const handleSirenToggle = (id: string | null) => {
        setHighlightedTournamentId(prevId => prevId === id ? null : id);
    };

    const handleModalSave = () => {
        setIsModalOpen(false);
        setMode('view');
        setSelectionStart(null);
        setSelectionEnd(null);
        setSelectedDeleteId(null);
        loadData(); // Reload to show new tournament
    };

    const handleCancelSelection = () => {
        setMode('view');
        setSelectionStart(null);
        setSelectionEnd(null);
        setSelectedDeleteId(null);
    };

    if (loading) {
        return <div className="loading-state">Loading calendar...</div>;
    }

    // Generate array of 0..11 for months
    const months = Array.from({ length: 12 }, (_, i) => i);

    // No filtering for calendar, always show all
    const visibleTournaments = tournaments;

    return (
        <div className="app-layout">
            <div className="year-view-container">
                <header className="calendar-header">
                    <div className="header-left">
                        <h1>Tournament Calendar {selectedYear}</h1>
                    </div>

                    <div className="header-year-selector">
                        {AVAILABLE_YEARS.map(year => (
                            <button
                                key={year}
                                className={`year-btn ${selectedYear === year ? 'active' : ''}`}
                                onClick={() => setSelectedYear(year)}
                            >
                                {year}
                            </button>
                        ))}
                    </div>

                    <div className="header-right">
                        {mode === 'view' ? (
                            <div className="action-buttons">
                                <button className="add-btn" onClick={() => setMode('add')}>
                                    + Add Tournament
                                </button>
                                <button className="delete-mode-btn" onClick={() => setMode('delete')}>
                                    - Delete Tournament
                                </button>
                            </div>
                        ) : (
                            <div className="selection-controls">
                                <span className={`selection-hint ${mode === 'delete' ? 'delete-hint' : ''}`}>
                                    {mode === 'add'
                                        ? (!selectionStart ? "Select start date" : !selectionEnd ? "Select end date" : "Confirm")
                                        : (!selectedDeleteId ? "Click tournament to delete" : "Press DELETE button")
                                    }
                                </span>
                                <button className="cancel-btn" onClick={handleCancelSelection}>Cancel</button>
                            </div>
                        )}
                    </div>
                </header>

                <div className={`year-grid-flat ${mode !== 'view' ? 'selection-mode' : ''}`}>
                    {months.map(monthIndex => (
                        <MonthGrid
                            key={`${selectedYear}-${monthIndex}`}
                            year={selectedYear}
                            monthIndex={monthIndex}
                            tournaments={visibleTournaments}
                            onDateClick={handleDateClick}
                            selectionStart={selectionStart}
                            selectionEnd={selectionEnd}
                            countryColors={countryColors}
                            highlightedTournamentId={highlightedTournamentId}
                        />
                    ))}
                </div>

                {/* Floating Confirm Button */}
                {mode !== 'view' && selectionStart && selectionEnd && (
                    <div className="floating-confirm-container">
                        <button
                            className={`confirm-btn ${mode === 'delete' ? 'delete-confirm' : ''}`}
                            onClick={handleConfirmAction}
                        >
                            {mode === 'delete' ? 'DELETE 🗑️' : 'CONFIRM ✓'}
                        </button>
                    </div>
                )}

                {isModalOpen && selectionStart && selectionEnd && (
                    <TournamentModal
                        startDate={selectionStart}
                        endDate={selectionEnd}
                        initialTournament={tournaments.find(
                            t => t.startDate === selectionStart && t.endDate === selectionEnd
                        )}
                        existingTournaments={tournaments}
                        onClose={() => setIsModalOpen(false)}
                        onSave={handleModalSave}
                    />
                )}
            </div>

            <StatsPanel
                tournaments={tournaments.filter(t => t.startDate.startsWith(selectedYear.toString()))}
                onColorChange={handleColorChange}
                countryColors={countryColors}
                activeCountry={activeCountry}
                onCountryClick={handleCountryClick}
                selectedYear={selectedYear}
                onTournamentChange={handleTournamentChange}
                onTournamentClick={handleSirenToggle}
            />
        </div>
    );
};

export default YearView;
