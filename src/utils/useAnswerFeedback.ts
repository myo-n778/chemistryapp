import { useCallback, useEffect, useRef } from 'react';
import { clear } from './quizFeedback';

// A synchronous latch protects scores, logs and audio even before React renders.
export function useAnswerFeedback() {
  const answered = useRef(false);
  const acceptAnswer = useCallback(() => {
    if (answered.current) return false;
    answered.current = true;
    return true;
  }, []);
  const resetAnswerFeedback = useCallback(() => {
    answered.current = false;
    clear();
  }, []);
  useEffect(() => () => clear(), []);
  return { acceptAnswer, resetAnswerFeedback };
}
