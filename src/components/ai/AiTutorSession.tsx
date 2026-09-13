import { createContext, useContext, useRef, type ReactNode } from 'react';
import type { TutorSession } from '../../utils/aiTutorClient';
interface Budget { total: number; questions: Map<string, number>; liveSession?: TutorSession }
const Context = createContext<Budget | null>(null);
export function AiTutorSession({ children }: { children: ReactNode }) {
  const budget = useRef<Budget>({ total: 0, questions: new Map() });
  return <Context.Provider value={budget.current}>{children}</Context.Provider>;
}
export function useTutorBudget() { return useContext(Context); }
