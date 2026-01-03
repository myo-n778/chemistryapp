import React from 'react';
import { ScoreDisplay } from './ScoreDisplay';
import { getScoreHistory } from '../../utils/scoreCalculator';
import './QuizSummary.css';

interface QuizSummaryProps {
    score: number;
    total: number;
    pointScore?: number;
    onRestart: () => void;
    onBack: () => void;
}

export const QuizSummary: React.FC<QuizSummaryProps> = ({ score, total, pointScore = 0, onRestart, onBack }) => {
    const percentage = Math.round((score / total) * 100);
    const history = getScoreHistory();

    const formatDate = (isoString: string): string => {
        try {
            const date = new Date(isoString);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            return `${year}/${month}/${day}`;
        } catch {
            return '';
        }
    };

    // 成績に応じたメッセージ生成
    const getPerformanceMessage = (): string => {
        if (pointScore > 0 && history.length > 0) {
            // ランキングがある場合、現在のスコアの順位を確認
            const currentRank = history.findIndex(entry => entry.score === pointScore && entry.correctCount === score && entry.totalCount === total) + 1;
            if (currentRank === 1) {
                return 'Top Score!';
            } else if (currentRank <= 3) {
                return 'Great!';
            } else if (percentage === 100) {
                return 'Perfect!';
            } else if (percentage >= 80) {
                return 'Excellent!';
            } else if (percentage >= 50) {
                return 'Good Job!';
            } else {
                return 'Keep Going!';
            }
        } else {
            // ランキングがない場合
            if (percentage === 100) {
                return 'Perfect!';
            } else if (percentage >= 80) {
                return 'Excellent!';
            } else if (percentage >= 50) {
                return 'Good Job!';
            } else {
                return 'Keep Going!';
            }
        }
    };

    return (
        <div className="quiz-summary-overlay">
            <div className="quiz-summary-card">
                <h2>Result</h2>
                <div className="summary-score-large">
                    {pointScore > 0 ? (
                        <ScoreDisplay score={score} totalAnswered={total} pointScore={pointScore} showPoints={true} />
                    ) : (
                        <ScoreDisplay score={score} totalAnswered={total} />
                    )}
                </div>
                
                {/* ランキング表示（pointScoreがある場合のみ） */}
                {pointScore > 0 && history.length > 0 && (
                    <div className="summary-ranking">
                        <div className="ranking-title">RANKING</div>
                        {history.slice(0, 5).map((entry, index) => (
                            <div key={index} className="ranking-row">
                                <span className="ranking-rank">#{index + 1}</span>
                                <span className="ranking-score">{entry.score.toLocaleString()}</span>
                                <span className="ranking-count">({entry.correctCount}/{entry.totalCount})</span>
                                <span className="ranking-date">{formatDate(entry.date)}</span>
                            </div>
                        ))}
                    </div>
                )}
                
                <p className="summary-message">{getPerformanceMessage()}</p>

                <div className="summary-buttons">
                    <button className="summary-button restart" onClick={onRestart}>
                        Retry
                    </button>
                    <button className="summary-button back" onClick={onBack}>
                        Return
                    </button>
                </div>
            </div>
        </div>
    );
};
