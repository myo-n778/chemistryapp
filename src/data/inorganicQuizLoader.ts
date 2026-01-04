import * as XLSX from 'xlsx';
import { InorganicReaction } from '../types';

/**
 * 新しいExcel形式のシートを読み込む
 * シート名「問題バンク_TEX」を優先的に探す
 */
export const loadInorganicQuizQuestions = async (): Promise<InorganicReaction[]> => {
  try {
    const baseUrl = import.meta.env.BASE_URL || '';
    const excelUrl = `${baseUrl}data/inorganic/無機反応一覧_最新版_問題文付き_TEX整形.xlsx`;
    
    console.log(`[inorganicQuizLoader] Loading Excel file from: ${excelUrl}`);
    
    const response = await fetch(excelUrl);
    if (!response.ok) {
      throw new Error(`Failed to load Excel file: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    const sheetNames = workbook.SheetNames;
    console.log(`[inorganicQuizLoader] Found sheets: ${sheetNames.join(', ')}`);
    
    // 「問題バンク_TEX」シートを探す
    let targetSheet: XLSX.WorkSheet | null = null;
    let targetSheetName = '';
    
    for (const sheetName of sheetNames) {
      if (sheetName === '問題バンク_TEX') {
        targetSheet = workbook.Sheets[sheetName];
        targetSheetName = sheetName;
        break;
      }
    }
    
    // 見つからない場合は、同等列を持つシートを検出
    if (!targetSheet) {
      for (const sheetName of sheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
        
        // 最初の行をチェック（ヘッダーがある場合）
        // または、データ行をチェック（A〜G列が揃っているか）
        if (data.length > 0) {
          const firstRow = data[0];
          // A〜G列が存在するかチェック（少なくとも7列以上）
          if (firstRow.length >= 7) {
            targetSheet = sheet;
            targetSheetName = sheetName;
            console.log(`[inorganicQuizLoader] Using sheet: ${sheetName} (fallback)`);
            break;
          }
        }
      }
    }
    
    if (!targetSheet) {
      throw new Error('Sheet "問題バンク_TEX" or compatible sheet not found');
    }
    
    console.log(`[inorganicQuizLoader] Using sheet: ${targetSheetName}`);
    
    // シートデータを配列に変換（ヘッダー行なし、1行目からデータ）
    const sheetData = XLSX.utils.sheet_to_json(targetSheet, { header: 1, defval: '' }) as any[][];
    
    const reactions: InorganicReaction[] = [];
    
    // 各行を処理（1行目から開始、ヘッダー行は無視）
    for (let i = 0; i < sheetData.length; i++) {
      const row = sheetData[i];
      
      // A〜F列が揃っているかチェック
      if (!row[0] || !row[1] || !row[2] || !row[3] || !row[4] || !row[5]) {
        console.warn(`[inorganicQuizLoader] Skipping row ${i + 1}: missing required columns`);
        continue;
      }
      
      const questionText = String(row[0]).trim();
      const choice1 = String(row[1]).trim();
      const choice2 = String(row[2]).trim();
      const choice3 = String(row[3]).trim();
      const choice4 = String(row[4]).trim();
      const correctAnswerStr = String(row[5]).trim();
      const explanation = row[6] ? String(row[6]).trim() : '';
      
      // F列が1〜4以外の場合はスキップ
      const correctAnswer = parseInt(correctAnswerStr, 10);
      if (isNaN(correctAnswer) || correctAnswer < 1 || correctAnswer > 4) {
        console.warn(`[inorganicQuizLoader] Skipping row ${i + 1}: invalid answer number ${correctAnswerStr}`);
        continue;
      }
      
      // 選択肢が空でないかチェック
      if (!choice1 || !choice2 || !choice3 || !choice4) {
        console.warn(`[inorganicQuizLoader] Skipping row ${i + 1}: missing choices`);
        continue;
      }
      
      // InorganicReaction型にマッピング
      // IDは行番号ベースで生成（既存のID形式と競合しないように）
      // 選択肢はJSON形式でanswer_hintに格納（区切り文字: |||）
      const choicesJson = JSON.stringify([choice1, choice2, choice3, choice4]);
      const correctIndex = correctAnswer - 1; // 0-indexed
      
      const reaction: InorganicReaction = {
        id: `quiz-${i + 1}`,
        topic: '',
        type: '',
        equation_tex: '',
        equation_tex_mhchem: questionText, // 問題文をequation_tex_mhchemに格納
        reactants_desc: questionText, // 問題文（反応物）をreactants_descに格納
        products_desc: choicesJson, // 選択肢をJSON形式で格納（表示時にパース）
        conditions: String(correctIndex), // 正解インデックスをconditionsに格納（一時的）
        operation: '',
        observations: '',
        notes: explanation, // 解説をnotesに格納
        family: '',
        variant: '',
        difficulty: '',
        state_tags: '',
        tags_norm: [],
        ask_types_json: ['A'], // モードAとして扱う
        question_templates_json: {
          'A': questionText, // 問題文テンプレート
        },
        answer_hint: String(correctIndex), // 正解インデックスをanswer_hintにも格納
      };
      
      reactions.push(reaction);
    }
    
    console.log(`[inorganicQuizLoader] Successfully loaded ${reactions.length} quiz questions`);
    return reactions;
  } catch (error) {
    console.error('[inorganicQuizLoader] Failed to load quiz questions:', error);
    throw error;
  }
};

