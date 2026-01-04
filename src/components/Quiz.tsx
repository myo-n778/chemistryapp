import React from 'react';
import { Compound, InorganicReaction } from '../types';
import { QuizMode } from './ModeSelector';
import { Category } from './CategorySelector';
import { ExperimentCSVRow } from '../utils/experimentParser';
import { StructureToNameQuiz } from './modes/StructureToNameQuiz';
import { NameToStructureQuiz } from './modes/NameToStructureQuiz';
import { CompoundTypeQuiz } from './modes/CompoundTypeQuiz';
import { ReactionQuiz } from './modes/ReactionQuiz';
import { SubstitutionQuiz } from './modes/SubstitutionQuiz';
import { ExperimentQuiz } from './modes/ExperimentQuiz';
import { ModeAQuiz } from './modes/inorganic/ModeAQuiz';
import { ModeBQuiz } from './modes/inorganic/ModeBQuiz';
import { ModeEQuiz } from './modes/inorganic/ModeEQuiz';
import { ModeFQuiz } from './modes/inorganic/ModeFQuiz';
import { ModeGQuiz } from './modes/inorganic/ModeGQuiz';

interface QuizProps {
  compounds: Compound[];
  allCompounds: Compound[];
  experiments: ExperimentCSVRow[];
  inorganicReactions?: InorganicReaction[];
  mode: QuizMode;
  category: Category;
  onBack: () => void;
  quizSettings?: { orderMode?: 'sequential' | 'shuffle'; questionCountMode?: 'all' | 'batch-10' | 'batch-20' | 'batch-40'; startIndex?: number; allQuestionCount?: number | null };
  onNextRange?: () => void;
}

export const Quiz: React.FC<QuizProps> = ({ compounds, allCompounds, experiments, inorganicReactions = [], mode, category, onBack, quizSettings, onNextRange }) => {
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
    case 'inorganic-mode-a':
      return <ModeAQuiz reactions={inorganicReactions} category={category} onBack={onBack} isShuffleMode={quizSettings?.orderMode === 'shuffle'} quizSettings={quizSettings} totalCount={inorganicReactions.length} onNextRange={onNextRange} />;
    case 'inorganic-mode-b':
      return <ModeBQuiz reactions={inorganicReactions} category={category} onBack={onBack} isShuffleMode={quizSettings?.orderMode === 'shuffle'} quizSettings={quizSettings} totalCount={inorganicReactions.length} onNextRange={onNextRange} />;
    case 'inorganic-mode-e':
      return <ModeEQuiz reactions={inorganicReactions} category={category} onBack={onBack} isShuffleMode={quizSettings?.orderMode === 'shuffle'} quizSettings={quizSettings} totalCount={inorganicReactions.length} onNextRange={onNextRange} />;
    case 'inorganic-mode-f':
      return <ModeFQuiz reactions={inorganicReactions} category={category} onBack={onBack} isShuffleMode={quizSettings?.orderMode === 'shuffle'} quizSettings={quizSettings} totalCount={inorganicReactions.length} onNextRange={onNextRange} />;
    case 'inorganic-mode-g':
      return <ModeGQuiz reactions={inorganicReactions} category={category} onBack={onBack} isShuffleMode={quizSettings?.orderMode === 'shuffle'} quizSettings={quizSettings} totalCount={inorganicReactions.length} onNextRange={onNextRange} />;
    default:
      return <StructureToNameQuiz compounds={compounds} category={category} onBack={onBack} />;
  }
};

