import React, { useState, useEffect, useRef } from 'react';
import { addTournament, updateTournament } from '../services/tournamentService';
import { formatDateDisplay } from '../config/locale';
import { COUNTRIES, type CountryData } from '../data/countries';
import { convertCurrency, formatCurrency, type Currency } from '../services/currencyService';
import type { Tournament, ExpenseItem } from '../types';
import './TournamentModal.css';

interface TournamentModalProps {
    startDate: string;
    endDate: string;
    initialTournament?: Tournament;
    onClose: () => void;
    onSave: () => void;
}

const TournamentModal: React.FC<TournamentModalProps> = ({ startDate, endDate, initialTournament, onClose, onSave }) => {
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
    const [summaryCurrency, setSummaryCurrency] = useState<Currency>(initialTournament?.summaryCurrency || initialTournament?.currency || 'EUR');
    const [budgetSource, setBudgetSource] = useState<'basic' | 'detailed'>(
        initialTournament?.budgetSource || (initialTournament?.expenses && initialTournament.expenses.some(e => Number(e.amount) > 0) ? 'detailed' : 'basic')
    );

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
            // Auto-update titles for legacy data (e.g. converting Turkish labels to English)
            let hasChanges = false;
            const updatedExpenses = expenses.map(item => {
                const def = defaultCategories.find(d => d.id === item.id);
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

    const totalExpense = expenses.reduce((sum, item) => {
        return sum + convertCurrency(Number(item.amount) || 0, item.currency, summaryCurrency);
    }, 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title) return;

        setIsSubmitting(true);
        try {
            const tournamentData = {
                title,
                startDate,
                endDate,
                country: country || undefined,
                link: link || undefined,
                rounds: rounds ? Number(rounds) : undefined,
                type,
                budget: budget ? Number(budget) : undefined,
                currency,
                expenses: expenses.length > 0 ? expenses : undefined,
                budgetSource,
                summaryCurrency
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
                <div className="date-display">
                    {formatDateDisplay(startDate)} <span className="arrow">→</span> {formatDateDisplay(endDate)}
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
                            {expenses.map((expense) => (
                                <div key={expense.id} className="expense-row">
                                    <div className="expense-label">
                                        {expense.title}
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
                            ))}

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
