import * as XLSX from 'xlsx';
import { InorganicReaction } from '../types';

/**
 * 新しいExcel形式のシートを読み込む
 * シート名「問題バンク_TEX」を優先的に探す
 */
export const loadInorganicQuizQuestions = async (): Promise<InorganicReaction[]> => {
  const baseUrl = import.meta.env.BASE_URL || '';
  
  // 新しいExcelファイルを優先的に読み込む
  const newExcelUrl = `${baseUrl}data/inorganic/無機反応一覧_最新版_TEXモード_JK整形.xlsx`;
  const oldExcelUrl = `${baseUrl}data/inorganic/無機反応一覧_最新版_問題文付き_TEX整形.xlsx`;
  
  let excelUrl = newExcelUrl;
  let response: Response;
  
  try {
    console.log(`[inorganicQuizLoader] Attempting to load new Excel file from: ${excelUrl}`);
    response = await fetch(excelUrl);
    if (!response.ok) {
      throw new Error(`Failed to load Excel file: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    // 新しいファイルが見つからない場合は、旧形式のファイルを試す
    console.warn(`[inorganicQuizLoader] Failed to load new Excel file, trying old format:`, error);
    excelUrl = oldExcelUrl;
    console.log(`[inorganicQuizLoader] Attempting to load old Excel file from: ${excelUrl}`);
    response = await fetch(excelUrl);
    if (!response.ok) {
      throw new Error(`Failed to load Excel file: ${response.status} ${response.statusText}`);
    }
  }
  
  try {
    
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
        // または、データ行をチェック（J列とK列が揃っているか、またはA〜G列が揃っているか）
        if (data.length > 0) {
          const firstRow = data[0];
          // J列（インデックス9）とK列（インデックス10）が存在するかチェック
          // または、A〜G列（少なくとも7列）が存在するかチェック（旧形式との互換性）
          if (firstRow.length >= 11 || firstRow.length >= 7) {
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
      
      // 新しい形式（J列=反応物、K列=生成物）か旧形式（A列=問題文、B〜E列=選択肢）かを判定
      const hasJColumn = row[9] !== undefined && row[9] !== null && String(row[9]).trim() !== '';
      const hasKColumn = row[10] !== undefined && row[10] !== null && String(row[10]).trim() !== '';
      
      let questionText = '';
      let choice1 = '';
      let choice2 = '';
      let choice3 = '';
      let choice4 = '';
      let correctAnswerStr = '';
      let explanation = '';
      
      if (hasJColumn && hasKColumn) {
        // 新しい形式：J列=反応物、K列=生成物（選択肢はK, L, M, N列）
        questionText = String(row[9]).trim(); // J列：反応物
        choice1 = String(row[10]).trim(); // K列：選択肢1
        choice2 = row[11] ? String(row[11]).trim() : ''; // L列：選択肢2
        choice3 = row[12] ? String(row[12]).trim() : ''; // M列：選択肢3
        choice4 = row[13] ? String(row[13]).trim() : ''; // N列：選択肢4
        // 正解番号と解説の列を探す（通常はO列以降）
        correctAnswerStr = row[14] ? String(row[14]).trim() : '';
        explanation = row[15] ? String(row[15]).trim() : '';
      } else {
        // 旧形式：A列=問題文、B〜E列=選択肢、F列=正解番号、G列=解説
        if (!row[0] || !row[1] || !row[2] || !row[3] || !row[4] || !row[5]) {
          console.warn(`[inorganicQuizLoader] Skipping row ${i + 1}: missing required columns`);
          continue;
        }
        questionText = String(row[0]).trim();
        choice1 = String(row[1]).trim();
        choice2 = String(row[2]).trim();
        choice3 = String(row[3]).trim();
        choice4 = String(row[4]).trim();
        correctAnswerStr = String(row[5]).trim();
        explanation = row[6] ? String(row[6]).trim() : '';
      }
      
      // 必須フィールドのチェック
      if (!questionText || !choice1) {
        console.warn(`[inorganicQuizLoader] Skipping row ${i + 1}: missing question or first choice`);
        continue;
      }
      
      // 正解番号が指定されていない場合は、デフォルトで1とする
      if (!correctAnswerStr) {
        correctAnswerStr = '1';
      }
      
      // 正解番号が1〜4以外の場合はスキップ
      const correctAnswer = parseInt(correctAnswerStr, 10);
      if (isNaN(correctAnswer) || correctAnswer < 1 || correctAnswer > 4) {
        console.warn(`[inorganicQuizLoader] Skipping row ${i + 1}: invalid answer number ${correctAnswerStr}`);
        continue;
      }
      
      // 選択肢が不足している場合は、空文字列で埋める
      if (!choice2) choice2 = '';
      if (!choice3) choice3 = '';
      if (!choice4) choice4 = '';
      
      // 選択肢が1つしかない場合はスキップ
      if (!choice1) {
        console.warn(`[inorganicQuizLoader] Skipping row ${i + 1}: missing choices`);
        continue;
      }
      
      // InorganicReaction型にマッピング
      // IDは行番号ベースで生成（既存のID形式と競合しないように）
      const choicesJson = JSON.stringify([choice1, choice2, choice3, choice4]);
      const correctIndex = correctAnswer - 1; // 0-indexed
      
      const reaction: InorganicReaction = {
        id: `quiz-${i + 1}`,
        topic: '',
        type: '',
        equation_tex: '',
        equation_tex_mhchem: questionText, // 反応物（J列）をequation_tex_mhchemに格納
        reactants_desc: questionText, // 反応物（J列）をreactants_descに格納
        products_desc: choicesJson, // 選択肢（K列以降）をJSON形式で格納（表示時にパース）
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

