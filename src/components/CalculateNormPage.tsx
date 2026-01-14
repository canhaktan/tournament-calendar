import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NORM_TABLES, type NormRange } from '../data/normTables';
import ComingSoon from './ComingSoon';
import NormTableDisplay from './NormTableDisplay';
import './CalculateNormPage.css';

const CalculateNormPage: React.FC = () => {
    const navigate = useNavigate();

    // Navigation State
    const [activeTab, setActiveTab] = useState<'score-needed' | 'norm-calculator'>('score-needed');

    // Score Needed State
    const [rounds, setRounds] = useState<number>(9);
    const [avgRating, setAvgRating] = useState<string>('');
    const [result, setResult] = useState<{ gm: NormRange | null, im: NormRange | null } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleCalculate = () => {
        setError(null);
        setResult(null);

        const rating = Number(avgRating);
        if (!avgRating || isNaN(rating) || rating < 1000 || rating > 3000) {
            setError('Please enter a valid average rating between 1000 and 3000.');
            return;
        }

        const table = NORM_TABLES[rounds];
        if (!table) {
            setError('Data for this number of rounds is not available.');
            return;
        }

        let gmMatch: NormRange | null = null;
        let imMatch: NormRange | null = null;

        // Check GM & IM
        for (const row of table) {
            if (rating >= row.gm.min && (!row.gm.max || rating <= row.gm.max)) {
                gmMatch = row;
            }
            if (rating >= row.im.min && (!row.im.max || rating <= row.im.max)) {
                imMatch = row;
            }
        }

        if (!gmMatch && !imMatch) {
            setError('No norm requirements found for this rating.');
        } else {
            setResult({ gm: gmMatch, im: imMatch });
        }
    };

    return (
        <div className="calculate-norm-page">
            <header className="page-main-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/')}>
                        ← Back
                    </button>
                    <h1>Norms & Titles</h1>
                </div>
            </header>

            <div className="page-body">
                {/* Sidebar */}
                <aside className="sidebar">
                    <nav className="sidebar-nav">
                        <button
                            className={`nav-item ${activeTab === 'score-needed' ? 'active' : ''}`}
                            onClick={() => setActiveTab('score-needed')}
                        >
                            Score Needed
                        </button>
                        <button
                            className={`nav-item ${activeTab === 'norm-calculator' ? 'active' : ''}`}
                            onClick={() => setActiveTab('norm-calculator')}
                        >
                            Norm Calculator
                        </button>
                    </nav>
                </aside>

                {/* Main Content Area */}
                <main className="content-area">
                    {activeTab === 'score-needed' && (
                        <section className="feature-section">
                            <div className="feature-header">
                                <h2>Score Needed for Norm</h2>
                                <p>Calculate the required score based on opponent average rating.</p>
                            </div>

                            <div className="input-card">
                                <div className="input-group">
                                    <label>Number of Rounds</label>
                                    <div className="segmented-control">
                                        {[9, 10, 11].map(r => (
                                            <button
                                                key={r}
                                                className={`segmented-btn ${rounds === r ? 'active' : ''}`}
                                                onClick={() => setRounds(r)}
                                            >
                                                {r} Rounds
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label>Average Opponent Rating</label>
                                    <input
                                        type="number"
                                        value={avgRating}
                                        onChange={(e) => setAvgRating(e.target.value)}
                                        placeholder="e.g. 2450"
                                        min="1000"
                                        max="3000"
                                        onKeyDown={(e) => e.key === 'Enter' && handleCalculate()}
                                    />
                                </div>

                                {error && <div className="error-msg">{error}</div>}

                                <button className="reveal-btn" onClick={handleCalculate}>
                                    Reveal Score Needed
                                </button>
                            </div>

                            {result && (
                                <div className="result-container">
                                    <div className={`result-card gm ${result.gm ? 'active' : 'inactive'}`}>
                                        <h3>GM Norm</h3>
                                        {result.gm ? (
                                            <div className="score-display">
                                                <span className="score-value">{result.gm.points}</span>
                                                <span className="score-label">Points Needed</span>
                                            </div>
                                        ) : (
                                            <div className="no-norm">N/A</div>
                                        )}
                                    </div>

                                    <div className={`result-card im ${result.im ? 'active' : 'inactive'}`}>
                                        <h3>IM Norm</h3>
                                        {result.im ? (
                                            <div className="score-display">
                                                <span className="score-value">{result.im.points}</span>
                                                <span className="score-label">Points Needed</span>
                                            </div>
                                        ) : (
                                            <div className="no-norm">N/A</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <NormTableDisplay
                                rounds={rounds}
                                avgRating={avgRating ? Number(avgRating) : null}
                            />
                        </section>
                    )}

                    {activeTab === 'norm-calculator' && (
                        <section className="feature-section coming-soon-section">
                            <ComingSoon
                                title="The Norm Journey Begins"
                                description="Hold tight as we calculate your path to the title."
                                badgeText="COMING SOON"
                            />
                        </section>
                    )}
                </main>
            </div>
        </div>
    );
};

export default CalculateNormPage;
