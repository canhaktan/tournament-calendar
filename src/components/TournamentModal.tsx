import React, { useState, useEffect, useRef } from 'react';
import { addTournament, updateTournament } from '../services/tournamentService';
import { formatDateDisplay } from '../config/locale';
import { COUNTRIES, type CountryData } from '../data/countries';
import { convertCurrency, formatCurrency, type Currency } from '../services/currencyService';
import type { Tournament, ExpenseItem } from '../types';
import './TournamentModal.css';

// Helper to check if a link is valid/active
const hasLink = (link?: string) => link && link.trim().length > 0;

interface TournamentModalProps {
    startDate: string;
    endDate: string;
    initialTournament?: Tournament;
    existingTournaments: Tournament[];
    onClose: () => void;
    onSave: () => void;
}

const TournamentModal: React.FC<TournamentModalProps> = ({ startDate, endDate, initialTournament, existingTournaments, onClose, onSave }) => {
    const [formStartDate, setFormStartDate] = useState(initialTournament ? initialTournament.startDate : startDate);
    const [formEndDate, setFormEndDate] = useState(initialTournament ? initialTournament.endDate : endDate);

    const [title, setTitle] = useState(initialTournament ? initialTournament.title : '');
    const [country, setCountry] = useState(initialTournament && initialTournament.country ? initialTournament.country : '');
    const [link, setLink] = useState(initialTournament && initialTournament.link ? initialTournament.link : '');
    const [rounds, setRounds] = useState<number | ''>(initialTournament && initialTournament.rounds ? initialTournament.rounds : '');
    const [type, setType] = useState<'standart' | 'rapid' | 'blitz'>(
        (initialTournament?.type as 'standart' | 'rapid' | 'blitz') || 'standart'
    );
    const [budget, setBudget] = useState<number | ''>(initialTournament?.budget || '');
    const [currency, setCurrency] = useState<Currency>(initialTournament?.currency || 'TRY');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Detailed Budget State
    const [expenses, setExpenses] = useState<ExpenseItem[]>(initialTournament?.expenses || []);
    // State to track which expense row has the link input open
    const [openLinkIndex, setOpenLinkIndex] = useState<string | null>(null);

    const [summaryCurrency, setSummaryCurrency] = useState<Currency>(initialTournament?.summaryCurrency || initialTournament?.currency || 'EUR');


    const [budgetSource, setBudgetSource] = useState<'basic' | 'detailed'>(
        initialTournament?.budgetSource || (initialTournament?.expenses && initialTournament.expenses.some(e => Number(e.amount) > 0) ? 'detailed' : 'basic')
    );

    // Participation Status
    const [isGoing, setIsGoing] = useState(initialTournament?.isGoing || false);

    // Autocomplete state
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<CountryData[]>([]);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);

    // Close suggestions on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (titleInputRef.current) {
            titleInputRef.current.focus();
        }
    }, []);

    // Default categories - Fixed list.
    // If expenses exist, merge them. If not, create defaults.
    useEffect(() => {
        const defaultCategories = [
            { id: '1', title: 'Plane tickets', currency: 'TRY' },
            { id: '2', title: 'Entry fee', currency: 'EUR' },
            { id: '3', title: 'Hotel/booking', currency: 'EUR' },
            { id: '4', title: 'Food', currency: 'TRY' },
            { id: '5', title: 'Transportation', currency: 'TRY' }
        ];

        if (expenses.length === 0) {
            setExpenses(defaultCategories.map(c => ({ ...c, amount: 0 } as ExpenseItem)));
        } else {
            // Auto-update titles for legacy data
            // We only update titles for items that MATCH the original IDs '1'..'5'.
            // Extra plane tickets won't match '1'..'5' so they are safe from rename overrides if we were doing strict by-index mapping,
            // but here we map by ID.
            let hasChanges = false;
            const updatedExpenses = expenses.map(item => {
                const def = defaultCategories.find(d => d.id === item.id);
                // Only update title if it's one of the default categories
                if (def && item.title !== def.title) {
                    hasChanges = true;
                    return { ...item, title: def.title };
                }
                return item;
            });

            if (hasChanges) {
                setExpenses(updatedExpenses);
            }
        }
    }, []);

    const handleCountryChange = (input: string) => {
        setCountry(input);
        if (input.length > 0) {
            const filtered = COUNTRIES.filter(c =>
                c.name.toLowerCase().startsWith(input.toLowerCase())
            );
            setSuggestions(filtered);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    const selectCountry = (c: CountryData) => {
        setCountry(c.name);
        setShowSuggestions(false);
    };

    const handleUpdateExpense = (id: string, field: keyof ExpenseItem, value: any) => {
        setExpenses(expenses.map(e =>
            e.id === id ? { ...e, [field]: value } : e
        ));
    };

    const handleAddExpense = (afterId: string, templateTitle: string, templateCurrency: string) => {
        const newId = `ext-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        setExpenses(prev => {
            const index = prev.findIndex(e => e.id === afterId);
            if (index === -1) return prev;

            // Calculate the next number for "Plane tickets"
            // We count how many items START with "Plane tickets" to determine the next number.
            // Or simpler: just count how many there are total.
            const planeTicketCount = prev.filter(e => e.title.startsWith('Plane tickets')).length;
            const newTitle = `Plane tickets ${planeTicketCount + 1}`;

            const newItem: ExpenseItem = {
                id: newId,
                title: newTitle,
                amount: 0,
                currency: templateCurrency as any,
                link: ''
            };

            const newExpenses = [...prev];

            // Find the last index of "Plane tickets" to insert after it
            // ensuring sequential order: PT, PT 2, PT 3...
            // We search from the end or just map and find last match.
            let insertIndex = index;
            for (let i = index + 1; i < newExpenses.length; i++) {
                if (newExpenses[i].title.startsWith('Plane tickets')) {
                    insertIndex = i;
                } else {
                    // Stop if we hit a different category
                    // Assuming Plane tickets are grouped together. 
                    // If they are not grouped, we might just want to insert after the last one found.
                    // But usually expenses are grouped by default categories order.
                    break;
                }
            }

            newExpenses.splice(insertIndex + 1, 0, newItem);
            return newExpenses;
        });
    };

    const handleRemoveExpense = (id: string) => {
        setExpenses(prev => {
            const filtered = prev.filter(e => e.id !== id);

            // Re-sequence Plane tickets titles
            let planeTicketCounter = 1;
            return filtered.map(item => {
                if (item.title.startsWith('Plane tickets')) {
                    const newTitle = planeTicketCounter === 1 ? 'Plane tickets' : `Plane tickets ${planeTicketCounter}`;
                    planeTicketCounter++;

                    if (item.title !== newTitle) {
                        return { ...item, title: newTitle };
                    }
                }
                return item;
            });
        });
    };

    const totalExpense = expenses.reduce((sum, item) => {
        return sum + convertCurrency(Number(item.amount) || 0, item.currency, summaryCurrency);
    }, 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title) return;

        // 1. Basic Validation: End Date cannot be before Start Date
        if (new Date(formEndDate) < new Date(formStartDate)) {
            alert('End Date cannot be earlier than Start Date!');
            return;
        }

        // 2. Conflict Detection (Overlap)
        const conflict = existingTournaments.find(t => {
            // Skip self check
            if (initialTournament && t.id === initialTournament.id) return false;

            const A_Start = new Date(formStartDate);
            const A_End = new Date(formEndDate);
            const B_Start = new Date(t.startDate);
            const B_End = new Date(t.endDate);

            return (A_Start <= B_End) && (A_End >= B_Start);
        });

        if (conflict) {
            alert(`Error: Cannot save. These dates overlap with existing tournament: "${conflict.title}". \n\nPlease choose different dates.`);
            return;
        }

        setIsSubmitting(true);
        try {
            const tournamentData = {
                title,
                startDate: formStartDate,
                endDate: formEndDate,
                country: country || undefined,
                link: link || undefined,
                rounds: rounds ? Number(rounds) : undefined,
                type,
                budget: budget ? Number(budget) : undefined,
                currency,
                expenses: expenses.length > 0 ? expenses : undefined,
                budgetSource,
                summaryCurrency,
                isGoing
            };

            if (initialTournament) {
                await updateTournament({
                    ...initialTournament,
                    ...tournamentData
                });
            } else {
                await addTournament(tournamentData);
            }
            onSave();
        } catch (error) {
            console.error(error);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">×</button>
                <h2 className="modal-title">{initialTournament ? 'Edit Tournament' : 'Add New Tournament'}</h2>

                <div className="date-display" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <input
                            type="date"
                            className="date-input-field"
                            value={formStartDate}
                            onChange={(e) => setFormStartDate(e.target.value)}
                            required
                        />
                        <span className="arrow">→</span>
                        <input
                            type="date"
                            className="date-input-field"
                            value={formEndDate}
                            onChange={(e) => setFormEndDate(e.target.value)}
                            required
                        />
                    </div>
                    {formStartDate && formEndDate && (
                        <div style={{ marginTop: '8px', color: '#888', fontSize: '0.95rem', fontWeight: 500 }}>
                            {formatDateDisplay(formStartDate)} - {formatDateDisplay(formEndDate)}
                        </div>
                    )}
                </div>

                <div className="participation-section">
                    <div
                        className={`participation-toggle ${isGoing ? 'going' : ''}`}
                        onClick={() => setIsGoing(!isGoing)}
                    >
                        <div className="toggle-checkbox"></div>
                        <span className="participation-label">
                            {isGoing ? 'I am planning to play! ♟️' : 'I am planning to play'}
                        </span>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Tournament Name</label>
                        <input
                            ref={titleInputRef}
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Winter Cup"
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Rounds</label>
                            <input
                                type="number"
                                value={rounds}
                                min="0"
                                onChange={(e) => setRounds(e.target.value ? Number(e.target.value) : '')}
                                placeholder="e.g. 9"
                            />
                        </div>
                        <div className="form-group">
                            <label>Type</label>
                            <div className="segmented-control">
                                <button
                                    type="button"
                                    className={`segmented-btn ${type === 'standart' ? 'active' : ''}`}
                                    onClick={() => setType('standart')}
                                >
                                    Standard
                                </button>
                                <button
                                    type="button"
                                    className={`segmented-btn ${type === 'rapid' ? 'active' : ''}`}
                                    onClick={() => setType('rapid')}
                                >
                                    Rapid
                                </button>
                                <button
                                    type="button"
                                    className={`segmented-btn ${type === 'blitz' ? 'active' : ''}`}
                                    onClick={() => setType('blitz')}
                                >
                                    Blitz
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                            <label style={{ margin: 0, fontSize: '0.9rem', color: '#aaa' }}>Which budget plan to use?</label>
                            <div className="segmented-control source-selector">
                                <button
                                    type="button"
                                    className={`segmented-btn ${budgetSource === 'basic' ? 'active' : ''}`}
                                    onClick={() => setBudgetSource('basic')}
                                >
                                    Basic Budget
                                </button>
                                <button
                                    type="button"
                                    className={`segmented-btn ${budgetSource === 'detailed' ? 'active' : ''}`}
                                    onClick={() => setBudgetSource('detailed')}
                                >
                                    Detailed Breakdown
                                </button>
                            </div>
                        </div>

                        {budgetSource === 'basic' && (
                            <div className="budget-input-row" style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="number"
                                    value={budget}
                                    min="0"
                                    onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : '')}
                                    placeholder="Total estimated budget"
                                    style={{ flex: 1 }}
                                />
                                <div className="segmented-control" style={{ width: 'auto', minWidth: '140px' }}>
                                    {(['TRY', 'USD', 'EUR'] as const).map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            className={`segmented-btn ${currency === c ? 'active' : ''}`}
                                            onClick={() => setCurrency(c)}
                                        >
                                            {c === 'TRY' ? '₺' : c === 'USD' ? '$' : '€'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {budgetSource === 'detailed' && (
                        <div className="detailed-budget-section">
                            {expenses.map((expense) => {
                                // Logic to identify if this is a "Plane tickets" row (original or extra)
                                // We rely on the ID '1' or the title 'Plane tickets'. 
                                // Since users can have multiple 'Plane tickets', checking title is safer for the ADD button condition,
                                // BUT the ADD button should only appear on the logic context.
                                // Actually, let's just make ID '1' the "Primary" one that has the (+).
                                // And any ID starting with 'ext-' or simply NOT '1'...'5' is removable.
                                const isPrimaryPlaneTicket = expense.id === '1';
                                // Check if it starts with 'Plane tickets' effectively, but purely relying on ID != '1' 
                                // and title check is safer to strictly target plane tickets rows we added.
                                const isExtraPlaneTicket = expense.title.startsWith('Plane tickets') && expense.id !== '1';

                                return (
                                    <div key={expense.id} className="expense-container">
                                        <div className="expense-row">
                                            <div className="expense-label" style={{ display: 'flex', alignItems: 'center' }}>
                                                {expense.title}
                                                {/* Add Button for Plane Tickets */}
                                                {isPrimaryPlaneTicket && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddExpense(expense.id, expense.title, expense.currency)}
                                                        className="expense-add-btn"
                                                        title="Add another ticket"
                                                        style={{
                                                            marginLeft: '6px',
                                                            border: 'none',
                                                            background: 'rgba(255,255,255,0.1)',
                                                            color: '#4ade80',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            padding: '0 4px',
                                                            fontSize: '1rem',
                                                            lineHeight: '1.2'
                                                        }}
                                                    >
                                                        +
                                                    </button>
                                                )}

                                                <div style={{ flex: 1 }}></div>

                                                {/* Link Toggle Button */}
                                                <button
                                                    type="button"
                                                    className={`expense-link-btn ${hasLink(expense.link) ? 'active' : ''}`}
                                                    onClick={() => setOpenLinkIndex(openLinkIndex === expense.id ? null : expense.id)}
                                                    title={hasLink(expense.link) ? "Edit Link" : "Add Link"}
                                                    style={{ marginRight: '4px' }}
                                                >
                                                    🔗
                                                </button>
                                                {hasLink(expense.link) && (
                                                    <a
                                                        href={expense.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="expense-link-visit-small"
                                                        title="Visit Link"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        ↗
                                                    </a>
                                                )}

                                                {/* Remove Button for Extra Plane Tickets */}
                                                {isExtraPlaneTicket && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveExpense(expense.id)}
                                                        className="expense-remove-btn"
                                                        title="Remove ticket"
                                                        style={{
                                                            marginLeft: '4px',
                                                            border: 'none',
                                                            background: 'transparent',
                                                            color: '#ef4444',
                                                            cursor: 'pointer',
                                                            fontSize: '1rem',
                                                        }}
                                                    >
                                                        🗑️
                                                    </button>
                                                )}
                                            </div>
                                            <input
                                                type="number"
                                                className="expense-amount-input"
                                                value={expense.amount === 0 ? '' : expense.amount}
                                                onChange={(e) => handleUpdateExpense(expense.id, 'amount', Number(e.target.value))}
                                                placeholder="0"
                                                onFocus={e => e.target.select()}
                                            />
                                            <div className="expense-segmented-control">
                                                {(['TRY', 'USD', 'EUR'] as const).map(c => (
                                                    <button
                                                        key={c}
                                                        type="button"
                                                        className={`expense-segmented-btn ${expense.currency === c ? 'active' : ''}`}
                                                        onClick={() => handleUpdateExpense(expense.id, 'currency', c)}
                                                    >
                                                        {c}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Link Input Section */}
                                        {openLinkIndex === expense.id && (
                                            <div className="expense-link-input-row">
                                                <input
                                                    type="url"
                                                    className="expense-link-input"
                                                    value={expense.link || ''}
                                                    onChange={(e) => handleUpdateExpense(expense.id, 'link', e.target.value)}
                                                    placeholder="Paste URL here (e.g. https://booking.com/...)"
                                                    autoFocus
                                                />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}

                            <div className="budget-summary">
                                <div className="summary-currency-toggles">
                                    {(['TRY', 'USD', 'EUR'] as const).map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            className={`summary-currency-btn ${summaryCurrency === c ? 'active' : ''}`}
                                            onClick={() => setSummaryCurrency(c)}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                                <div className="summary-total-display">
                                    <div className="summary-total-value">
                                        {formatCurrency(totalExpense, summaryCurrency)}
                                    </div>
                                    <div className="summary-total-label">TOTAL (CALCULATED)</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="form-row">
                        <div className="form-group" ref={wrapperRef} style={{ flex: 1 }}>
                            <label>Country (Optional)</label>
                            <div className="autocomplete-wrapper">
                                <input
                                    type="text"
                                    value={country}
                                    onChange={(e) => handleCountryChange(e.target.value)}
                                    onFocus={() => country && handleCountryChange(country)}
                                    placeholder="Search country..."
                                />
                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="suggestions-list">
                                        {suggestions.map(s => (
                                            <div
                                                key={s.code}
                                                className="suggestion-item"
                                                onClick={() => selectCountry(s)}
                                            >
                                                {s.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Link (Optional)</label>
                            <input
                                type="url"
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                                placeholder="https://..."
                            />
                        </div>
                    </div>



                    <div className="modal-actions">
                        {budget && (
                            <div className="modal-footer-budget">
                                <div className="budget-total-card">
                                    <span className="budget-value">
                                        {formatCurrency(
                                            budgetSource === 'basic'
                                                ? convertCurrency(Number(budget) || 0, currency, summaryCurrency)
                                                : totalExpense,
                                            summaryCurrency
                                        )}
                                    </span>
                                    <span className="budget-label">
                                        OFFICIAL BUDGET ({budgetSource.toUpperCase()})
                                    </span>
                                </div>
                                <div className="summary-currency-toggles" style={{ marginTop: '8px', justifyContent: 'center' }}>
                                    {(['TRY', 'USD', 'EUR'] as const).map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            className={`summary-currency-btn ${summaryCurrency === c ? 'active' : ''}`}
                                            onClick={() => setSummaryCurrency(c)}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="action-buttons">
                            <button type="button" className="btn-cancel" onClick={onClose} disabled={isSubmitting}>Cancel</button>
                            <button type="submit" className="btn-save" disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : (initialTournament ? 'Update' : 'Save')}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TournamentModal;
