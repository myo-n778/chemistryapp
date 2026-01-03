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

    // 現在のスコアがランクインしたかどうかを判定
    const isRankIn = (): boolean => {
        if (pointScore === 0 || history.length === 0) return false;
        // 現在のスコアが履歴の最初の5件に含まれているか確認
        const top5 = history.slice(0, 5);
        const today = new Date().toISOString().split('T')[0];
        return top5.some(entry => {
            const entryDate = new Date(entry.date).toISOString().split('T')[0];
            return entry.score === pointScore && 
                   entry.correctCount === score && 
                   entry.totalCount === total &&
                   entryDate === today;
        });
    };

    const rankIn = isRankIn();

    // 通常メッセージを生成
    const getNormalMessage = (): string => {
        if (percentage === 100) {
            return '完璧です！すべて正解できました。';
        } else if (percentage >= 80) {
            return '素晴らしい結果です！よく頑張りました。';
        } else if (percentage >= 50) {
            return '良い調子です！続けて頑張りましょう。';
        } else {
            return 'もう少し練習が必要です。諦めずに続けましょう。';
        }
    };

    // ランクイン時の追加メッセージ
    const getRankInMessage = (): string => {
        const currentRank = history.findIndex(entry => 
            entry.score === pointScore && 
            entry.correctCount === score && 
            entry.totalCount === total
        ) + 1;
        if (currentRank === 1) {
            return '🎉 ランキング1位にランクインしました！';
        } else if (currentRank <= 3) {
            return `🎉 ランキング${currentRank}位にランクインしました！`;
        } else {
            return `🎉 ランキング${currentRank}位にランクインしました！`;
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
                        {history.slice(0, 5).map((entry, index) => {
                            const isCurrentEntry = entry.score === pointScore && 
                                                   entry.correctCount === score && 
                                                   entry.totalCount === total;
                            const entryDate = new Date(entry.date).toISOString().split('T')[0];
                            const today = new Date().toISOString().split('T')[0];
                            const isNewEntry = isCurrentEntry && entryDate === today;
                            
                            return (
                                <div 
                                    key={index} 
                                    className={`ranking-row ${isNewEntry ? 'ranking-new' : ''}`}
                                >
                                    <span className="ranking-rank">#{index + 1}</span>
                                    <span className="ranking-score">{entry.score.toLocaleString()}</span>
                                    <span className="ranking-count">({entry.correctCount}/{entry.totalCount})</span>
                                    <span className="ranking-date">{formatDate(entry.date)}</span>
                                    {isNewEntry && (
                                        <span className="ranking-new-badge">New!</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
                
                <div className="summary-message">
                    <p className="summary-message-normal">{getNormalMessage()}</p>
                    {rankIn && (
                        <p className="summary-message-rankin">{getRankInMessage()}</p>
                    )}
                </div>

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
