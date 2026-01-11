import React from 'react';
import { Compound, InorganicReaction } from '../types';
import { InorganicReactionNew } from '../types/inorganic';
import { QuizMode } from './ModeSelector';
import { Category } from './CategorySelector';
import { ExperimentCSVRow } from '../utils/experimentParser';
import { StructureToNameQuiz } from './modes/StructureToNameQuiz';
import { NameToStructureQuiz } from './modes/NameToStructureQuiz';
import { CompoundTypeQuiz } from './modes/CompoundTypeQuiz';
import { ReactionQuiz } from './modes/ReactionQuiz';
import { SubstitutionQuiz } from './modes/SubstitutionQuiz';
import { ExperimentQuiz } from './modes/ExperimentQuiz';
import { TypeAQuiz } from './modes/inorganic/TypeAQuiz';
import { TypeBQuiz } from './modes/inorganic/TypeBQuiz';
import { TypeCQuiz } from './modes/inorganic/TypeCQuiz';
import { ModeAQuiz } from './modes/inorganic/ModeAQuiz'; // 旧モード（後で削除予定）
import { ModeBQuiz } from './modes/inorganic/ModeBQuiz'; // 旧モード（後で削除予定）
import { ModeEQuiz } from './modes/inorganic/ModeEQuiz'; // 旧モード（後で削除予定）

interface QuizProps {
  compounds: Compound[];
  allCompounds: Compound[];
  experiments: ExperimentCSVRow[];
  inorganicReactions?: InorganicReaction[];
  inorganicReactionsNew?: InorganicReactionNew[];
  mode: QuizMode;
  category: Category;
  onBack: () => void;
  quizSettings?: { orderMode?: 'sequential' | 'shuffle'; questionCountMode?: 'all' | 'batch-10' | 'batch-20' | 'batch-40'; startIndex?: number; allQuestionCount?: number | null };
  onNextRange?: () => void;
}

export const Quiz: React.FC<QuizProps> = ({ compounds, allCompounds, experiments, inorganicReactions = [], inorganicReactionsNew = [], mode, category, onBack, quizSettings, onNextRange }) => {
  switch (mode) {
    case 'structure-to-name':
      return <StructureToNameQuiz compounds={compounds} category={category} onBack={onBack} isShuffleMode={quizSettings?.orderMode === 'shuffle'} quizSettings={quizSettings} totalCount={allCompounds.length} onNextRange={onNextRange} />;
    case 'name-to-structure':
      return <NameToStructureQuiz compounds={compounds} category={category} onBack={onBack} isShuffleMode={quizSettings?.orderMode === 'shuffle'} quizSettings={quizSettings} totalCount={allCompounds.length} onNextRange={onNextRange} />;
    case 'compound-type':
      return <CompoundTypeQuiz compounds={compounds} allCompounds={allCompounds} category={category} onBack={onBack} isShuffleMode={quizSettings?.orderMode === 'shuffle'} quizSettings={quizSettings} totalCount={allCompounds.length} onNextRange={onNextRange} />;
    case 'reaction':
      return <ReactionQuiz compounds={allCompounds} category={category} onBack={onBack} isShuffleMode={quizSettings?.orderMode === 'shuffle'} quizSettings={quizSettings} totalCount={allCompounds.length} onNextRange={onNextRange} />;
    case 'substitution':
      return <SubstitutionQuiz compounds={allCompounds} category={category} onBack={onBack} isShuffleMode={quizSettings?.orderMode === 'shuffle'} quizSettings={quizSettings} totalCount={allCompounds.length} onNextRange={onNextRange} />;
    case 'experiment':
      return <ExperimentQuiz experiments={experiments} category={category} onBack={onBack} isShuffleMode={quizSettings?.orderMode === 'shuffle'} quizSettings={quizSettings} totalCount={experiments.length} onNextRange={onNextRange} />;
    // 新しい無機化学モード
    case 'inorganic-type-a':
      return <TypeAQuiz reactions={inorganicReactionsNew} category={category} onBack={onBack} isShuffleMode={quizSettings?.orderMode === 'shuffle'} quizSettings={quizSettings} totalCount={inorganicReactionsNew.length} onNextRange={onNextRange} />;
    case 'inorganic-type-b':
      return <TypeBQuiz reactions={inorganicReactionsNew} category={category} onBack={onBack} isShuffleMode={quizSettings?.orderMode === 'shuffle'} quizSettings={quizSettings} totalCount={inorganicReactionsNew.length} onNextRange={onNextRange} />;
    case 'inorganic-type-c':
      return <TypeCQuiz reactions={inorganicReactionsNew} category={category} onBack={onBack} isShuffleMode={quizSettings?.orderMode === 'shuffle'} quizSettings={quizSettings} totalCount={inorganicReactionsNew.length} onNextRange={onNextRange} />;
    // 旧無機化学モード（後で削除予定）
    case 'inorganic-mode-a':
      return <ModeAQuiz reactions={inorganicReactions} category={category} onBack={onBack} isShuffleMode={quizSettings?.orderMode === 'shuffle'} quizSettings={quizSettings} totalCount={inorganicReactions.length} onNextRange={onNextRange} />;
    case 'inorganic-mode-b':
      return <ModeBQuiz reactions={inorganicReactions} category={category} onBack={onBack} isShuffleMode={quizSettings?.orderMode === 'shuffle'} quizSettings={quizSettings} totalCount={inorganicReactions.length} onNextRange={onNextRange} />;
    case 'inorganic-mode-e':
      return <ModeEQuiz reactions={inorganicReactions} category={category} onBack={onBack} isShuffleMode={quizSettings?.orderMode === 'shuffle'} quizSettings={quizSettings} totalCount={inorganicReactions.length} onNextRange={onNextRange} />;
    case 'inorganic-mode-f':
      // ModeFQuizは削除されました
      return <div className="quiz-container"><p>このモードは利用できません</p><button className="back-button" onClick={onBack}>戻る</button></div>;
    default:
      return <StructureToNameQuiz compounds={compounds} category={category} onBack={onBack} />;
  }
};

