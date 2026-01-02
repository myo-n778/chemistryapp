import React from 'react';
import { ScoreDisplay } from './ScoreDisplay';
import './QuizSummary.css';

interface QuizSummaryProps {
    score: number;
    total: number;
    onRestart: () => void;
    onBack: () => void;
}

export const QuizSummary: React.FC<QuizSummaryProps> = ({ score, total, onRestart, onBack }) => {
    const percentage = Math.round((score / total) * 100);

    let message = 'お疲れ様でした！';
    if (percentage === 100) message = '全問正解！素晴らしい！';
    else if (percentage >= 80) message = '高得点です！その調子！';
    else if (percentage >= 50) message = 'まずまずの成績です。';

    return (
        <div className="quiz-summary-overlay">
            <div className="quiz-summary-card">
                <h2>クイズ結果</h2>
                <div className="summary-score-large">
                    <ScoreDisplay score={score} totalAnswered={total} />
                </div>
                <div className="summary-percentage">{percentage}% 正解</div>
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
