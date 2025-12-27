import React, { useMemo } from 'react';
import type { Tournament } from '../types';
import { COUNTRIES } from '../data/countries';
import { formatDateDisplay } from '../config/locale';
import './StatsPanel.css';
import { deleteTournament } from '../services/tournamentService';
import { convertCurrency, formatCurrency, type Currency, fetchExchangeRates, getRateInfo } from '../services/currencyService';

interface StatsPanelProps {
    tournaments: Tournament[];
    onColorChange: (country: string, color: string) => void;
    countryColors: Record<string, string>;
    activeCountry: string | null;
    onCountryClick: (country: string) => void;
    selectedYear: number;
    onTournamentChange: () => void;
    onTournamentClick: (id: string | null) => void;
}

const DEFAULT_COLOR = '#646cff';

// Helper for date range display: "11 Mart - 19 Mart 2025"
const formatDateRange = (start: string, end: string) => {
    const sDate = new Date(start);
    const sStr = formatDateDisplay(start);
    const eStr = formatDateDisplay(end);
    const year = sDate.getFullYear();
    if (sStr === eStr) {
        return `${sStr} ${year}`;
    }
    return `${sStr} - ${eStr} ${year}`;
};

const StatsPanel: React.FC<StatsPanelProps> = ({
    tournaments,
    onColorChange,
    countryColors,
    activeCountry,
    onCountryClick,
    selectedYear,
    onTournamentChange,
    onTournamentClick
}) => {
    const [displayCurrency, setDisplayCurrency] = React.useState<Currency>('TRY');
    const [countryCurrencies, setCountryCurrencies] = React.useState<Record<string, Currency>>({});
    const [refreshKey, setRefreshKey] = React.useState(0); // For forcing re-render after currency update

    const handleCountryCurrencyChange = (country: string, currency: Currency) => {
        setCountryCurrencies(prev => ({
            ...prev,
            [country]: currency
        }));
    };

    const handleRefreshRates = async () => {
        if (window.confirm('Update currency rates from live API?')) {
            const success = await fetchExchangeRates();
            if (success) {
                alert('Currency rates updated successfully!');
                setRefreshKey(prev => prev + 1); // Force re-calculation
            } else {
                alert('Failed to update rates. Check console / API Key.');
            }
        }
    };

    const stats = useMemo(() => {
        const totalTournaments = tournaments.length;
        const totalRounds = tournaments.reduce((acc, t) => acc + (t.rounds || 0), 0);

        // Financial Stats
        let totalBudget = 0;
        const quarterlyBudgets = { 1: 0, 2: 0, 3: 0, 4: 0 };

        // Group by Country
        const countryStats: Record<string, { count: number, rounds: number, totalBudget: number, list: Tournament[] }> = {};

        tournaments.forEach(t => {
            // Determine effective budget and currency based on source
            const isDetailed = t.budgetSource === 'detailed';
            let effectiveBudget = 0;
            let effectiveCurrency: Currency = 'TRY';

            if (isDetailed && t.expenses) {
                const sumCurrency = t.summaryCurrency || 'EUR';
                effectiveBudget = t.expenses.reduce((sum, e) =>
                    sum + convertCurrency(Number(e.amount) || 0, e.currency, sumCurrency), 0);
                effectiveCurrency = sumCurrency;
            } else if (t.budget) {
                effectiveBudget = t.budget;
                effectiveCurrency = t.currency || 'TRY';
            }

            // Financial Calculation
            let amountForGlobal = 0;
            let amountForCountry = 0;

            if (effectiveBudget > 0) {
                // Global stats depend on displayCurrency
                amountForGlobal = convertCurrency(effectiveBudget, effectiveCurrency, displayCurrency);
                totalBudget += amountForGlobal;

                // Country stats always stored in TRY (Base) to allow independent conversion later
                amountForCountry = convertCurrency(effectiveBudget, effectiveCurrency, 'TRY');

                const month = new Date(t.startDate).getMonth(); // 0-11
                const quarter = Math.floor(month / 3) + 1; // 1-4
                if (quarter >= 1 && quarter <= 4) {
                    quarterlyBudgets[quarter as 1 | 2 | 3 | 4] += amountForGlobal;
                }
            }

            if (!t.country) return;
            if (!countryStats[t.country]) {
                countryStats[t.country] = { count: 0, rounds: 0, totalBudget: 0, list: [] };
            }
            countryStats[t.country].count++;
            countryStats[t.country].rounds += (t.rounds || 0);
            countryStats[t.country].totalBudget += amountForCountry;
            countryStats[t.country].list.push(t);
        });

        // Sort lists by date
        Object.values(countryStats).forEach(stat => {
            stat.list.sort((a, b) => a.startDate.localeCompare(b.startDate));
        });

        const countries = Object.keys(countryStats).sort();

        return {
            totalTournaments,
            totalRounds,
            totalBudget,
            quarterlyBudgets,
            countries,
            countryStats
        };
    }, [tournaments, displayCurrency, refreshKey]);

    const getFlagUrl = (countryName: string) => {
        const c = COUNTRIES.find(c => c.name.toLowerCase() === countryName.toLowerCase());
        if (c) {
            return `https://flagcdn.com/24x18/${c.code.toLowerCase()}.png`;
        }
        return null;
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this tournament?')) {
            await deleteTournament(id);
            onTournamentChange();
        }
    };

    return (
        <div className="stats-panel-container">
            {/* Details Panel - Slides in or appears to the left of the main panel */}
            {activeCountry && stats.countryStats[activeCountry] && (
                <div className="details-panel">
                    <div className="details-header">
                        <h3>{activeCountry} Tournaments</h3>
                        <button className="close-details-btn" onClick={() => onCountryClick('')}>×</button>
                    </div>
                    <div className="details-content">
                        {stats.countryStats[activeCountry].list.map(t => (
                            <div
                                key={t.id}
                                className="detail-card"
                                onClick={() => onTournamentClick(t.id)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="detail-header-row">
                                    <span className="detail-date">{formatDateRange(t.startDate, t.endDate)}</span>
                                    <div className="detail-actions">
                                        <span className={`type-badge ${t.type}`}>{t.type}</span>
                                        <button
                                            className="trash-btn"
                                            onClick={(e) => handleDelete(e, t.id)}
                                            title="Delete"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                                <div className="detail-title">{t.title}</div>
                                <div className="detail-info-row">
                                    <div className="detail-box">
                                        <span className="box-val">{t.rounds}</span>
                                        <span className="box-lbl">Rounds</span>
                                    </div>
                                    {(() => {
                                        const isDetailed = t.budgetSource === 'detailed';
                                        let displayBudget = 0;
                                        let displayCurrency: Currency = 'TRY';

                                        if (isDetailed && t.expenses) {
                                            displayCurrency = t.summaryCurrency || 'EUR';
                                            displayBudget = t.expenses.reduce((sum, e) =>
                                                sum + convertCurrency(Number(e.amount) || 0, e.currency, displayCurrency), 0);
                                        } else if (t.budget) {
                                            displayBudget = t.budget;
                                            displayCurrency = t.currency || 'TRY';
                                        }

                                        if (displayBudget > 0) {
                                            return (
                                                <div className="detail-box budget-box">
                                                    <span className="box-val">
                                                        {formatCurrency(displayBudget, displayCurrency)}
                                                    </span>
                                                    <span className="box-lbl">Budget ({isDetailed ? 'Det' : 'Bas'})</span>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                    {t.link && (
                                        <a href={t.link} target="_blank" rel="noreferrer" className="link-text">
                                            Visit ↗
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Stats Panel */}
            <div className="stats-panel">
                <h2 className="panel-title">TOURNAMENT SCHEDULE FOR YEAR {selectedYear}</h2>

                <div className="stats-grid">
                    <div className="stat-card">
                        <span className="stat-value">{stats.totalTournaments}</span>
                        <span className="stat-label">Tournaments</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{stats.totalRounds}</span>
                        <span className="stat-label">Rounds</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{stats.countries.length}</span>
                        <span className="stat-label">Countries</span>
                    </div>
                </div>

                {/* Financial Overview */}
                <div className="financial-overview">
                    <div className="financial-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3>Financial Overview</h3>
                            <button
                                onClick={handleRefreshRates}
                                style={{
                                    background: 'none',
                                    border: '1px solid #444',
                                    color: '#888',
                                    cursor: 'pointer',
                                    padding: '2px 6px',
                                    fontSize: '0.8rem',
                                    borderRadius: '4px'
                                }}
                                title="Update Live Rates"
                            >
                                ↻
                            </button>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '4px', textAlign: 'right' }}>
                            {(() => {
                                const info = getRateInfo();
                                if (info.source === 'Default') return 'Using Default Rates';
                                const date = new Date(info.lastUpdated);
                                return `Live: ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                            })()}
                        </div>
                    </div>

                    <div className="budget-total-card">
                        <span className="budget-value">{formatCurrency(stats.totalBudget, displayCurrency)}</span>
                        <span className="budget-label">Total Estimated Budget</span>
                    </div>

                    <div className="currency-toggles" style={{ marginBottom: '16px' }}>
                        {(['TRY', 'USD', 'EUR'] as Currency[]).map(c => (
                            <button
                                key={c}
                                className={`currency-toggle ${displayCurrency === c ? 'active' : ''}`}
                                onClick={() => setDisplayCurrency(c)}
                            >
                                {c}
                            </button>
                        ))}
                    </div>

                    <div className="quarterly-grid">
                        {[1, 2, 3, 4].map(q => (
                            <div key={q} className="quarter-card">
                                <span className="q-label">Q{q}</span>
                                <span className="q-value">
                                    {formatCurrency(stats.quarterlyBudgets[q as 1 | 2 | 3 | 4], displayCurrency)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="country-settings">
                    <h3>Country Colors</h3>
                    {stats.countries.length === 0 && <p className="empty-msg">No countries yet.</p>}

                    <div className="country-list">
                        {stats.countries.map(country => {
                            const data = stats.countryStats[country];
                            const flag = getFlagUrl(country);
                            const isActive = activeCountry === country;
                            const targetCurrency = countryCurrencies[country] || displayCurrency;
                            const displayAmount = convertCurrency(data.totalBudget, 'TRY', targetCurrency);

                            return (
                                <div key={country} className={`country-item ${isActive ? 'active' : ''}`}>
                                    <div className="country-header" onClick={() => onCountryClick(country)}>
                                        <div className="country-left-section">
                                            <input
                                                type="color"
                                                value={countryColors[country] || DEFAULT_COLOR}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    onColorChange(country, e.target.value);
                                                }}
                                                className="color-picker"
                                            />

                                            {flag && <img src={flag} alt={country} className="flag-icon" />}
                                            <span className="country-name">{country}</span>
                                        </div>

                                        <div className="mini-stats-row">
                                            <div
                                                className="mini-stat-card clickable-stat"
                                                style={{ minWidth: '80px', cursor: 'pointer' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const current = countryCurrencies[country] || displayCurrency;
                                                    const next = current === 'TRY' ? 'USD' : current === 'USD' ? 'EUR' : 'TRY';
                                                    handleCountryCurrencyChange(country, next);
                                                }}
                                                title="Click to toggle currency (TRY/USD/EUR)"
                                            >
                                                <span className="mini-val" style={{ fontSize: '0.9rem' }}>
                                                    {formatCurrency(displayAmount, targetCurrency)}
                                                </span>
                                                <span className="mini-lbl">Cost ↻</span>
                                            </div>
                                            <div className="mini-stat-card">
                                                <span className="mini-val">{data.count}</span>
                                                <span className="mini-lbl">Trn</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatsPanel;
