import React from 'react';
import { NORM_TABLES } from '../data/normTables';
import './NormTableDisplay.css';

interface NormTableDisplayProps {
    rounds: number;
    avgRating: number | null;
}

const NormTableDisplay: React.FC<NormTableDisplayProps> = ({ rounds, avgRating }) => {
    const tableData = NORM_TABLES[rounds];

    if (!tableData) return null;

    const isMatch = (min: number, max: number | undefined, rating: number | null) => {
        if (rating === null) return false;
        if (max) {
            return rating >= min && rating <= max;
        }
        return rating >= min;
    };

    return (
        <div className="norm-table-container">
            <h3 className="table-title">FIDE Norm Requirements ({rounds} Rounds)</h3>
            <div className="table-responsive">
                <table className="norm-ref-table">
                    <thead>
                        <tr>
                            <th>Points</th>
                            <th>GM Rating Range</th>
                            <th>IM Rating Range</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.map((row, index) => {
                            const isGmMatch = isMatch(row.gm.min, row.gm.max, avgRating);
                            const isImMatch = isMatch(row.im.min, row.im.max, avgRating);

                            return (
                                <tr key={index}>
                                    <td className="points-cell">{row.points}</td>
                                    <td className={`range-cell ${isGmMatch ? 'gm-highlight' : ''}`}>
                                        {row.gm.min} {row.gm.max ? `- ${row.gm.max}` : '+'}
                                    </td>
                                    <td className={`range-cell ${isImMatch ? 'im-highlight' : ''}`}>
                                        {row.im.min} {row.im.max ? `- ${row.im.max}` : '+'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <p className="table-note">* Based on FIDE Tables. Official regulations apply.</p>
        </div>
    );
};

export default NormTableDisplay;
