import React from 'react';
import { Compound } from '../types';
import { QuizMode } from './ModeSelector';
import { Category } from './CategorySelector';
import { StructureToNameQuiz } from './modes/StructureToNameQuiz';
import { NameToStructureQuiz } from './modes/NameToStructureQuiz';
import { CompoundTypeQuiz } from './modes/CompoundTypeQuiz';
import { ReactionQuiz } from './modes/ReactionQuiz';
import { SubstitutionQuiz } from './modes/SubstitutionQuiz';
import { SynthesisQuiz } from './modes/SynthesisQuiz';

interface QuizProps {
  compounds: Compound[];
  allCompounds: Compound[];
  mode: QuizMode;
  category: Category;
  onBack: () => void;
}

export const Quiz: React.FC<QuizProps> = ({ compounds, allCompounds, mode, category, onBack }) => {
  switch (mode) {
    case 'structure-to-name':
      return <StructureToNameQuiz compounds={compounds} category={category} onBack={onBack} />;
    case 'name-to-structure':
      return <NameToStructureQuiz compounds={compounds} category={category} onBack={onBack} />;
    case 'compound-type':
      return <CompoundTypeQuiz compounds={compounds} allCompounds={allCompounds} onBack={onBack} />;
    case 'reaction':
      return <ReactionQuiz compounds={allCompounds} category={category} onBack={onBack} />;
    case 'substitution':
      return <SubstitutionQuiz compounds={compounds} category={category} onBack={onBack} />;
    case 'synthesis':
      return <SynthesisQuiz compounds={compounds} category={category} onBack={onBack} />;
    default:
      return <StructureToNameQuiz compounds={compounds} category={category} onBack={onBack} />;
  }
};

