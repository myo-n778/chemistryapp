/**
 * 観察事項の視覚表現を解析する
 */

export interface ObservationVisual {
  type: 'precipitate' | 'gas' | 'solution' | 'text';
  color?: string;
  text: string;
}

/**
 * 観察事項テキストから視覚表現を抽出
 * 例：「白色沈殿↓」「赤褐色気体↑」「青色溶液」など
 */
export function parseObservation(observation: string): ObservationVisual[] {
  if (!observation || observation.trim().length === 0) {
    return [{ type: 'text', text: observation }];
  }

  const visuals: ObservationVisual[] = [];
  let remaining = observation;

  // 沈殿パターン（↓を含む）
  const precipitatePattern = /([^↓]*?)([^↓]*?)↓/g;
  let match;
  let lastIndex = 0;

  // 気体パターン（↑を含む）
  const gasPattern = /([^↑]*?)([^↑]*?)↑/g;

  // まず沈殿を検索
  const precipitateMatches: Array<{ index: number; text: string; color?: string }> = [];
  while ((match = precipitatePattern.exec(observation)) !== null) {
    const fullMatch = match[0];
    const beforeArrow = match[1] + match[2];
    const index = match.index;
    
    // 色を抽出（括弧内）
    const colorMatch = beforeArrow.match(/（([^）]+)）/);
    const color = colorMatch ? colorMatch[1] : undefined;
    const textWithoutColor = beforeArrow.replace(/（[^）]+）/g, '').trim();
    
    precipitateMatches.push({
      index,
      text: textWithoutColor || fullMatch,
      color
    });
  }

  // 気体を検索
  const gasMatches: Array<{ index: number; text: string; color?: string }> = [];
  while ((match = gasPattern.exec(observation)) !== null) {
    const fullMatch = match[0];
    const beforeArrow = match[1] + match[2];
    const index = match.index;
    
    // 色を抽出（括弧内）
    const colorMatch = beforeArrow.match(/（([^）]+)）/);
    const color = colorMatch ? colorMatch[1] : undefined;
    const textWithoutColor = beforeArrow.replace(/（[^）]+）/g, '').trim();
    
    gasMatches.push({
      index,
      text: textWithoutColor || fullMatch,
      color
    });
  }

  // 溶液パターン（■で表される色）
  const solutionPattern = /■（([^）]+)）/g;
  const solutionMatches: Array<{ index: number; color: string }> = [];
  while ((match = solutionPattern.exec(observation)) !== null) {
    solutionMatches.push({
      index: match.index,
      color: match[1]
    });
  }

  // すべてのマッチを統合してソート
  const allMatches: Array<{
    index: number;
    type: 'precipitate' | 'gas' | 'solution';
    text: string;
    color?: string;
  }> = [
    ...precipitateMatches.map(m => ({ ...m, type: 'precipitate' as const })),
    ...gasMatches.map(m => ({ ...m, type: 'gas' as const })),
    ...solutionMatches.map(m => ({ ...m, type: 'solution' as const, text: '' }))
  ];

  allMatches.sort((a, b) => a.index - b.index);

  // テキストを分割して視覚表現を挿入
  let currentIndex = 0;
  for (const m of allMatches) {
    // マッチ前のテキスト
    if (m.index > currentIndex) {
      const beforeText = observation.substring(currentIndex, m.index);
      if (beforeText.trim()) {
        visuals.push({ type: 'text', text: beforeText });
      }
    }

    // 視覚表現
    visuals.push({
      type: m.type,
      color: m.color,
      text: m.text
    });

    // マッチの終了位置を更新
    if (m.type === 'precipitate') {
      currentIndex = m.index + (observation.substring(m.index).indexOf('↓') + 1);
    } else if (m.type === 'gas') {
      currentIndex = m.index + (observation.substring(m.index).indexOf('↑') + 1);
    } else {
      currentIndex = m.index + (observation.substring(m.index).indexOf('）') + 1);
    }
  }

  // 残りのテキスト
  if (currentIndex < observation.length) {
    const remainingText = observation.substring(currentIndex);
    if (remainingText.trim()) {
      visuals.push({ type: 'text', text: remainingText });
    }
  }

  // マッチがない場合はテキストのみ
  if (visuals.length === 0) {
    visuals.push({ type: 'text', text: observation });
  }

  return visuals;
}

