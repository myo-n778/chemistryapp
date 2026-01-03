import React from 'react';
import { Compound } from '../types';
import { QuizMode } from './ModeSelector';
import { Category } from './CategorySelector';
import { StructureToNameQuiz } from './modes/StructureToNameQuiz';
import { NameToStructureQuiz } from './modes/NameToStructureQuiz';
import { CompoundTypeQuiz } from './modes/CompoundTypeQuiz';
import { ReactionQuiz } from './modes/ReactionQuiz';
import { SubstitutionQuiz } from './modes/SubstitutionQuiz';

interface QuizProps {
  compounds: Compound[];
  allCompounds: Compound[];
  mode: QuizMode;
  category: Category;
  onBack: () => void;
  quizSettings?: { orderMode?: 'sequential' | 'shuffle'; questionCountMode?: 'all' | 'batch-10' | 'batch-20' | 'batch-40'; startIndex?: number; allQuestionCount?: number | null };
  onNextRange?: () => void;
}

export const Quiz: React.FC<QuizProps> = ({ compounds, allCompounds, mode, category, onBack, quizSettings, onNextRange }) => {
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
      return <SubstitutionQuiz compounds={compounds} category={category} onBack={onBack} />;
    default:
      return <StructureToNameQuiz compounds={compounds} category={category} onBack={onBack} />;
  }
};

