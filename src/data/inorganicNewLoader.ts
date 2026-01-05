import { InorganicReactionNew } from '../types/inorganic';
import { loadInorganicReactionsNewFromGAS } from './gasLoader';

/**
 * GAS経由で無機化学反応データを読み込む
 */
export const loadInorganicReactionsNew = async (): Promise<InorganicReactionNew[]> => {
  try {
    console.log('[inorganicNewLoader] Loading data from GAS...');
    const reactions = await loadInorganicReactionsNewFromGAS();
    console.log(`[inorganicNewLoader] Successfully loaded ${reactions.length} reactions from GAS`, {
      firstReaction: reactions[0],
      lastReaction: reactions[reactions.length - 1]
    });
    return reactions;
  } catch (error) {
    console.error('[inorganicNewLoader] Failed to load reactions from GAS:', error);
    if (error instanceof Error) {
      console.error('[inorganicNewLoader] Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
};


