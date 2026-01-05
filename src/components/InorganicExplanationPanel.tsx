import React from 'react';
import { InorganicReactionNew } from '../types/inorganic';
import { TeXRenderer } from './TeXRenderer';
import { InorganicObservationDisplay } from './InorganicObservationDisplay';
import { RenderMaybeTeX } from './RenderMaybeTeX';
import './InorganicExplanationPanel.css';

interface InorganicExplanationPanelProps {
  reaction: InorganicReactionNew;
  correctAnswer?: string; // 未使用だが将来の拡張のため残す
  className?: string;
}

/**
 * 無機化学の解説表示パネル（共通コンポーネント）
 * 1. 反応式（A列）
 * 2. 要点カード（G列：反応前要約、H列：生成要約）
 * 3. 観察事項（E列）を視覚表現付きで表示
 * 4. 解説本文（F列）
 */
export const InorganicExplanationPanel: React.FC<InorganicExplanationPanelProps> = ({
  reaction,
  correctAnswer: _correctAnswer,
  className = '',
}) => {
  const [showEquationTeX, setShowEquationTeX] = React.useState(false);

  return (
    <div className={`inorganic-explanation-panel ${className}`}>
      {/* 1. 反応式と要点を横並び */}
      <div className="explanation-row">
        {/* 反応式（A列） */}
        <div className="explanation-section explanation-equation">
          <div className="explanation-section-header-inline">
            <h3 className="explanation-section-title">反応式</h3>
            {reaction.equation_tex && (
              <button
                className="tex-toggle-button"
                onClick={() => setShowEquationTeX(!showEquationTeX)}
              >
                {showEquationTeX ? '通常表示' : 'TeX表示'}
              </button>
            )}
            <div className="explanation-content-inline">
              {showEquationTeX && reaction.equation_tex ? (
                <TeXRenderer
                  equation={reaction.equation_tex}
                  displayMode={true}
                />
              ) : (
                <RenderMaybeTeX value={reaction.equation} displayMode={true} />
              )}
            </div>
          </div>
        </div>

        {/* 2. 要点カード（G列：反応前要約、H列：生成要約） */}
        {(reaction.reactants_summary || reaction.products_summary) && (
          <div className="explanation-section explanation-summary">
            <h3 className="explanation-section-title">要点</h3>
            <div className="explanation-summary-cards">
              {reaction.reactants_summary && (
                <div className="summary-card summary-reactants">
                  <div className="summary-card-label">反応前</div>
                  <div className="summary-card-content">
                    <RenderMaybeTeX value={reaction.reactants_summary} />
                  </div>
                </div>
              )}
              {reaction.products_summary && (
                <div className="summary-card summary-products">
                  <div className="summary-card-label">生成</div>
                  <div className="summary-card-content">
                    <RenderMaybeTeX value={reaction.products_summary} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. 観察事項（E列）を視覚表現付きで表示 */}
      {reaction.observations && (
        <div className="explanation-section explanation-observations">
          <div className="explanation-section-header">
            <h3 className="explanation-section-title">観察事項</h3>
          </div>
          <div className="explanation-content">
            <InorganicObservationDisplay observation={reaction.observations} />
          </div>
        </div>
      )}

      {/* 4. 解説本文（F列） */}
      {reaction.explanation && (
        <div className="explanation-section explanation-text">
          <div className="explanation-section-header">
            <h3 className="explanation-section-title">解説</h3>
          </div>
          <div className="explanation-content">
            <RenderMaybeTeX value={reaction.explanation} />
          </div>
        </div>
      )}
    </div>
  );
};
