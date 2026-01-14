import React, { useMemo } from 'react';
import type { Tournament } from '../types';
import { COUNTRIES } from '../data/countries';
import { formatDateDisplay } from '../config/locale';
import './StatsPanel.css';
import { deleteTournament } from '../services/tournamentService';
import { convertCurrency, formatCurrency, type Currency, fetchExchangeRates } from '../services/currencyService';
import { exportTournamentsToExcel } from '../services/excelService';

interface StatsPanelProps {
    tournaments: Tournament[];
    onColorChange: (country: string, color: string) => void;
    countryColors: Record<string, string>;
    activeCountry: string | null;
    onCountryClick: (country: string) => void;
    selectedYear: number;
    onTournamentChange: () => void;
    onTournamentClick: (id: string | null) => void;
    filterMode: 'all' | 'confirmed';
    onFilterChange: (mode: 'all' | 'confirmed') => void;
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
    onTournamentClick,
    filterMode,
    onFilterChange
}) => {
    // console.log('StatsPanel Props:', { filterMode });
    const [displayCurrency, setDisplayCurrency] = React.useState<Currency>('TRY');
    const [countryCurrencies, setCountryCurrencies] = React.useState<Record<string, Currency>>({});
    const [refreshKey, setRefreshKey] = React.useState(0);
    // Local filter state removed

    React.useEffect(() => {
        // Auto-fetch rates if older than 24h
        fetchExchangeRates(true).then((updated) => {
            if (updated) {
                setRefreshKey(prev => prev + 1);
            }
        });
    }, []);

    const handleCountryCurrencyChange = (country: string, currency: Currency) => {
        setCountryCurrencies(prev => ({
            ...prev,
            [country]: currency
        }));
    };

    // Removed handleRefreshRates as manual update is disabled


    // User Stats (Norms & Rating)
    const [userStats, setUserStats] = React.useState<{
        gmNorms: number | string;
        imNorms: number | string;
        fideRating: number | string;
    }>({
        gmNorms: 0,
        imNorms: 0,
        fideRating: 0 // Default, will be updated from conditional logic or localStorage
    });

    const prevValueRef = React.useRef<number | string>(0);

    React.useEffect(() => {
        const saved = localStorage.getItem('userChessStats');
        if (saved) {
            try {
                setUserStats(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse user stats', e);
            }
        }
    }, []);

    const handleFocus = (val: number | string) => {
        prevValueRef.current = val;
    };

    const handleStatChange = (key: keyof typeof userStats, value: string) => {
        // Allow empty string for better editing experience
        if (value === '') {
            setUserStats(prev => ({ ...prev, [key]: '' }));
            return;
        }

        const numVal = parseInt(value);
        if (!isNaN(numVal)) {
            setUserStats(prev => ({ ...prev, [key]: numVal }));
        }
    };

    const handleBlur = (key: keyof typeof userStats) => {
        let current = userStats[key];

        // If empty, revert to previous valid value
        if (current === '') {
            setUserStats(prev => ({ ...prev, [key]: prevValueRef.current }));
            return;
        }

        if (typeof current === 'string') {
            current = parseInt(current) || 0;
        }

        // FIDE Rating Logic
        if (key === 'fideRating') {
            // Clamp between 1000 and 3000
            if (current < 1000) current = 1000;
            if (current > 3000) current = 3000;
        } else {
            // Norms shouldn't be negative just in case
            if (current < 0) current = 0;
        }

        const newStats = { ...userStats, [key]: current };
        setUserStats(newStats);
        localStorage.setItem('userChessStats', JSON.stringify(newStats));
    };


    const stats = useMemo(() => {
        // Apply Filter
        const filteredTournaments = filterMode === 'confirmed'
            ? tournaments.filter(t => t.isGoing)
            : tournaments;

        const totalTournaments = filteredTournaments.length;
        const totalRounds = filteredTournaments.reduce((acc, t) => acc + (t.rounds || 0), 0);

        // Financial Stats
        let totalBudget = 0;
        const quarterlyBudgets = { 1: 0, 2: 0, 3: 0, 4: 0 };

        // Group by Country
        const countryStats: Record<string, { count: number, rounds: number, totalBudget: number, list: Tournament[] }> = {};

        filteredTournaments.forEach(t => {
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
    }, [tournaments, displayCurrency, refreshKey, filterMode]);

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

                <div className="filter-toggle-container">
                    <div className="filter-segmented-control">
                        <button
                            className={`filter-btn ${filterMode === 'all' ? 'active' : ''}`}
                            onClick={() => onFilterChange('all')}
                        >
                            ALL
                        </button>
                        <button
                            className={`filter-btn ${filterMode === 'confirmed' ? 'active' : ''}`}
                            onClick={() => onFilterChange('confirmed')}
                        >
                            CONFIRMED
                        </button>
                    </div>
                    <button
                        className="export-excel-btn"
                        onClick={() => {
                            const listToExport = filterMode === 'confirmed'
                                ? tournaments.filter(t => t.isGoing)
                                : tournaments;
                            // @ts-ignore - Ignoring implicit any for rates if types mismatch, but rates are available in scope? No.
                            // Rates are inside convertCurrency logic or need to be fetched?
                            // StatsPanel doesn't hold 'rates' state directly exposed? 
                            // Ah, fetchExchangeRates returns them but doesn't expose 'rates' object easily here?
                            // Actually, let's check imports. `convertCurrency` uses internal cache? 
                            // Wait, `fetchExchangeRates` updates local storage. 
                            // We need to pass rates. 
                            // Let's grab them from localStorage or modify currencyService to export them?
                            // Quick fix: user wants it now. I'll read from localStorage or just pass an empty object if handled inside.
                            // Actually, let's just use the helper in `excelService`? 
                            // No, I defined `rates` as arg.
                            // Let's use `exchangeRates` from context if available? 
                            // `StatsPanel` doesn't have `rates`. 
                            // Let's retrieve them.
                            const storedInfo = localStorage.getItem('exchangeRatesInfo');
                            const rates = storedInfo ? JSON.parse(storedInfo).rates : {};
                            exportTournamentsToExcel(listToExport, displayCurrency, rates, userStats);
                        }}
                        title="Export to Excel"
                    >
                        📥 Excel
                    </button>
                </div>

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

                {/* User Stats Grid (Norms & Rating) */}
                <div className="stats-grid norms-grid" style={{ marginTop: '-1rem' }}>
                    <div className="stat-card norm-card gm-norm">
                        <input
                            className="stat-value-input"
                            value={userStats.gmNorms}
                            onChange={(e) => handleStatChange('gmNorms', e.target.value)}
                            onFocus={() => handleFocus(userStats.gmNorms)}
                            onBlur={() => handleBlur('gmNorms')}
                            type="number"
                        />
                        <span className="stat-label">GM Norms</span>
                    </div>
                    <div className="stat-card norm-card im-norm">
                        <input
                            className="stat-value-input"
                            value={userStats.imNorms}
                            onChange={(e) => handleStatChange('imNorms', e.target.value)}
                            onFocus={() => handleFocus(userStats.imNorms)}
                            onBlur={() => handleBlur('imNorms')}
                            type="number"
                        />
                        <span className="stat-label">IM Norms</span>
                    </div>
                    <div className="stat-card norm-card fide-rating">
                        <input
                            className="stat-value-input"
                            value={userStats.fideRating}
                            onChange={(e) => handleStatChange('fideRating', e.target.value)}
                            onFocus={() => handleFocus(userStats.fideRating)}
                            onBlur={() => handleBlur('fideRating')}
                            type="number"
                        />
                        <span className="stat-label">FIDE Rating</span>
                    </div>
                </div>

                {/* Financial Overview */}
                <div className="financial-overview">
                    <div className="financial-header">
                        <h3>Financial Overview</h3>
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
                    <h3>Countries</h3>
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
                                                <span className="mini-lbl">Tournaments</span>
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
