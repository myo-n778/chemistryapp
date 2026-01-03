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

    let message = 'お疲れ様でした！';
    if (percentage === 100) message = '全問正解！素晴らしい！';
    else if (percentage >= 80) message = '高得点です！その調子！';
    else if (percentage >= 50) message = 'まずまずの成績です。';

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
                <div className="summary-percentage">{percentage}% 正解</div>
                
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
                
                <p className="summary-message">{message}</p>

                <div className="summary-buttons">
                    <button className="summary-button restart" onClick={onRestart}>
                        もう一度解く
                    </button>
                    <button className="summary-button back" onClick={onBack}>
                        範囲選択に戻る
                    </button>
                </div>
            </div>
        </div>
    );
};
