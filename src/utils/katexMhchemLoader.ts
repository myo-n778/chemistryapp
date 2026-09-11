/** mhchemを同じKaTeXパッケージから読み込み、外部CDNへ依存しない。 */
import 'katex/contrib/mhchem';

export const loadKatexMhchem = (): Promise<void> => Promise.resolve();
export const isKatexMhchemLoaded = (): boolean => true;
