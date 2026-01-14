import React from 'react';
import './ComingSoon.css';

interface ComingSoonProps {
    title?: string;
    description?: string;
    badgeText?: string;
}

const ComingSoon: React.FC<ComingSoonProps> = ({
    title = "Coming Soon",
    description = "We are working hard to bring you this feature.",
    badgeText
}) => {
    return (
        <div className="coming-soon-container">
            <div className="coming-soon-content">
                <h2>{title}</h2>
                <p>{description}</p>
                {badgeText && <div className="coming-soon-badge">{badgeText}</div>}
            </div>
        </div>
    );
};

export default ComingSoon;
