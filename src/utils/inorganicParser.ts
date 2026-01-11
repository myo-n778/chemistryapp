import { InorganicReaction } from '../types';

/**
 * Excel行データをInorganicReaction型に変換
 */
export const parseInorganicReactionRow = (row: any[], headers: string[]): InorganicReaction | null => {
  try {
    // ヘッダーマッピング
    const getValue = (key: string): string => {
      const index = headers.indexOf(key);
      if (index === -1) return '';
      const value = row[index];
      return value !== null && value !== undefined ? String(value).trim() : '';
    };

    // 必須フィールドのチェック
    const id = getValue('id');
    if (!id) return null; // IDがない行はスキップ

    // tags_normのパース（カンマ区切りまたは配列）
    const tagsNormStr = getValue('tags_norm');
    let tagsNorm: string[] = [];
    if (tagsNormStr) {
      try {
        // JSON配列として解釈を試みる
        tagsNorm = JSON.parse(tagsNormStr);
      } catch {
        // JSONでない場合はカンマ区切りとして処理
        tagsNorm = tagsNormStr.split(',').map(t => t.trim()).filter(t => t.length > 0);
      }
    }

    // ask_types_jsonのパース
    const askTypesStr = getValue('ask_types_json');
    let askTypes: string[] = [];
    if (askTypesStr) {
      try {
        askTypes = JSON.parse(askTypesStr);
      } catch {
        // JSONでない場合は空配列
        askTypes = [];
      }
    }

    // question_templates_jsonのパース
    const questionTemplatesStr = getValue('question_templates_json');
    let questionTemplates: Record<string, string> = {};
    if (questionTemplatesStr) {
      try {
        questionTemplates = JSON.parse(questionTemplatesStr);
      } catch {
        // JSONでない場合は空オブジェクト
        questionTemplates = {};
      }
    }

    const reaction: InorganicReaction = {
      id,
      topic: getValue('topic'),
      type: getValue('type'),
      equation_tex: getValue('equation_tex'),
      reactants_desc: getValue('reactants_desc'),
      products_desc: getValue('products_desc'),
      conditions: getValue('conditions'),
      operation: getValue('operation'),
      observations: getValue('observations'),
      notes: getValue('notes'),
      family: getValue('family'),
      variant: getValue('variant'),
      difficulty: getValue('difficulty'),
      state_tags: getValue('state_tags'),
      tags_norm: tagsNorm,
      ask_types_json: askTypes,
      question_templates_json: questionTemplates,
      answer_hint: getValue('answer_hint'),
    };

    // TEX形式モード用のequation_tex_mhchem（別シートから取得する場合は後でマージ）
    const equationTexMhchem = getValue('equation_tex_mhchem');
    if (equationTexMhchem) {
      reaction.equation_tex_mhchem = equationTexMhchem;
    }

    return reaction;
  } catch (error) {
    console.error('Error parsing inorganic reaction row:', error);
    return null;
  }
};

/**
 * ExcelシートデータをInorganicReaction配列に変換
 */
export const parseInorganicSheet = (sheetData: any[][]): InorganicReaction[] => {
  if (!sheetData || sheetData.length < 2) return [];

  const headers = sheetData[0].map((h: any) => String(h).trim().toLowerCase());
  const reactions: InorganicReaction[] = [];

  for (let i = 1; i < sheetData.length; i++) {
    const row = sheetData[i];
    const reaction = parseInorganicReactionRow(row, headers);
    if (reaction) {
      reactions.push(reaction);
    }
  }

  return reactions;
};

/**
 * 2つのシート（一覧モード、TEX形式モード）をマージ
 */
export const mergeInorganicReactions = (
  listModeReactions: InorganicReaction[],
  texModeReactions: InorganicReaction[]
): InorganicReaction[] => {
  const merged = new Map<string, InorganicReaction>();

  // 一覧モードのデータをベースにする
  listModeReactions.forEach(reaction => {
    merged.set(reaction.id, { ...reaction });
  });

  // TEX形式モードのequation_tex_mhchemをマージ
  texModeReactions.forEach(reaction => {
    const existing = merged.get(reaction.id);
    if (existing) {
      existing.equation_tex_mhchem = reaction.equation_tex || reaction.equation_tex_mhchem;
    }
  });

  return Array.from(merged.values());
};


