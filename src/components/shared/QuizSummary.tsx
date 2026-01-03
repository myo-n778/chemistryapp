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
    onNext?: () => void; // 次の範囲へ進む
    mode?: string;
    rangeKey?: string;
}

export const QuizSummary: React.FC<QuizSummaryProps> = ({ score, total, pointScore = 0, onRestart, onBack, onNext, mode, rangeKey }) => {
    const percentage = Math.round((score / total) * 100);
    // モード×範囲ごとに分離されたランキングを取得
    const history = mode && rangeKey ? getScoreHistory(mode, rangeKey) : getScoreHistory();

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

    // 通常メッセージを生成（7段階、各段階5種類からランダム選択）
    const getNormalMessage = (): { jp: string; en: string } => {
        const messages: Record<string, { jp: string[]; en: string[] }> = {
            '0-19': {
                jp: [
                    'まだ足りません！ここから積み上げましょう！',
                    '今は結果より、向き合ったことが大事です！',
                    'このままでは届きません！続けましょう！',
                    '今日のままでは終われませんね！',
                    'まずは基礎からです！'
                ],
                en: ['Not yet!', 'Start again!', 'Keep trying!', 'From here!', 'Go on!']
            },
            '20-39': {
                jp: [
                    '少し前進しましたが、まだ足りません！',
                    'この点数で止まる段階ではありません！',
                    '手応えは出始めています！',
                    '次で大きく変わります！',
                    'ここからが勝負です！'
                ],
                en: ['Still low!', 'Not enough!', 'Go further!', 'Next step!', 'Try again!']
            },
            '40-59': {
                jp: [
                    '基礎は見えていますが、まだ不安定です！',
                    'ここで満足するには早いです！',
                    '正解が増える余地があります！',
                    'もう一段、上げましょう！',
                    'このままでは届きません！'
                ],
                en: ['Improve!', 'Not stable!', 'More work!', 'Push on!', 'Again!']
            },
            '60-79': {
                jp: [
                    '悪くありませんが、合格点ではありません！',
                    '実力はあります！詰めが必要です！',
                    'ミスを減らせば一気に伸びます！',
                    '次は80%を超えましょう！',
                    'まだ上があります！'
                ],
                en: ['Not enough!', 'Push more!', 'Close!', 'Try harder!', 'Next!']
            },
            '80-89': {
                jp: [
                    '高いですが、まだ完成ではありません！',
                    'このあたりで止まる人は多いです！',
                    'あと一段、意識を上げましょう！',
                    '90%を超える力はあります！',
                    '満点を目指しましょう！'
                ],
                en: ['High, but!', 'Not perfect!', 'One more!', 'Aim higher!', 'Keep going!']
            },
            '90-99': {
                jp: [
                    'ここまで来たなら、満点を狙えます！',
                    'ミスはわずか！詰め切りましょう！',
                    'この差は意識の差です！',
                    '次は100%です！',
                    'もう一回、行けます！'
                ],
                en: ['Almost!', 'One step!', 'So close!', 'Again!', 'Finish it!']
            },
            '100': {
                jp: [
                    '到達しました！',
                    '今回は完璧です！',
                    'ここまでやり切りました！',
                    '実力として成立しています！',
                    '次に進めます！'
                ],
                en: ['Perfect!', 'Complete!', 'Achieved!', 'Done!', 'Clear!']
            }
        };

        let key: string;
        if (percentage === 100) {
            key = '100';
        } else if (percentage >= 90) {
            key = '90-99';
        } else if (percentage >= 80) {
            key = '80-89';
        } else if (percentage >= 60) {
            key = '60-79';
        } else if (percentage >= 40) {
            key = '40-59';
        } else if (percentage >= 20) {
            key = '20-39';
        } else {
            key = '0-19';
        }

        const messageSet = messages[key];
        const randomIndex = Math.floor(Math.random() * 5);
        return {
            jp: messageSet.jp[randomIndex],
            en: messageSet.en[randomIndex]
        };
    };

    // ランクイン時の追加メッセージ（5種類からランダム選択）
    const getRankInMessage = (): { jp: string; en: string } => {
        const messages = {
            jp: [
                'ランクイン！',
                '記録更新！',
                'トップ入り！',
                '順位入り達成！',
                '結果が残りました！'
            ],
            en: [
                'Ranked!',
                'New Record!',
                'Top Score!',
                'On the Board!',
                'You\'re In!'
            ]
        };
        const randomIndex = Math.floor(Math.random() * 5);
        return {
            jp: messages.jp[randomIndex],
            en: messages.en[randomIndex]
        };
    };

    return (
        <div className="quiz-summary-overlay">
            <div className="quiz-summary-card">
                <h2>Result</h2>
                <div className="summary-score-large">
                    {pointScore > 0 ? (
                        <ScoreDisplay score={score} totalAnswered={total} pointScore={pointScore} showPoints={true} mode={mode} rangeKey={rangeKey} />
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
                    {(() => {
                        const normalMsg = getNormalMessage();
                        return (
                            <>
                                <p className="summary-message-normal">
                                    {normalMsg.jp}
                                    <span className="summary-message-en">{normalMsg.en}</span>
                                </p>
                                {rankIn && (() => {
                                    const rankInMsg = getRankInMessage();
                                    return (
                                        <p className="summary-message-rankin">
                                            {rankInMsg.jp}
                                            <span className="summary-message-en">{rankInMsg.en}</span>
                                        </p>
                                    );
                                })()}
                            </>
                        );
                    })()}
                </div>

                <div className="summary-buttons">
                    <button className="summary-button restart" onClick={onRestart}>
                        Retry
                    </button>
                    {onNext && (
                        <button className="summary-button next" onClick={onNext}>
                            Next
                        </button>
                    )}
                    <button className="summary-button back" onClick={onBack}>
                        Return
                    </button>
                </div>
            </div>
        </div>
    );
};
