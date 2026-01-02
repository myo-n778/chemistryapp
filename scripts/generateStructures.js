/**
 * スプレッドシートの化合物データから構造式（atoms/bonds）を自動生成
 * 使用方法: node scripts/generateStructures.js
 * 
 * GASからデータを取得して、構造式を生成し、スプレッドシート用のJSONを出力
 */

const GAS_URL = 'https://script.google.com/macros/s/AKfycbx3yv3iDlepCp8Ys6As-Bto80OkJzupYBT1_olY4yPhEx6EkDkZft1hpzLdH4K-TYSE0Q/exec';

// 基本的な化合物パターンの座標生成関数

/**
 * アルカン（直鎖）の構造を生成
 * @param {number} carbonCount - 炭素数
 * @param {number} startX - 開始X座標
 * @param {number} startY - 開始Y座標
 * @param {number} spacing - 炭素間の距離
 */
function generateAlkane(carbonCount, startX = 100, startY = 200, spacing = 140) {
  const atoms = [];
  const bonds = [];
  
  // 炭素原子を配置
  for (let i = 0; i < carbonCount; i++) {
    const x = startX + i * spacing;
    atoms.push({ id: `C${i + 1}`, element: 'C', x, y: startY });
    
    // 炭素間の結合
    if (i > 0) {
      bonds.push({ from: `C${i}`, to: `C${i + 1}`, type: 'single' });
    }
  }
  
  // 水素原子を配置
  let hIndex = 1;
  for (let i = 0; i < carbonCount; i++) {
    const x = startX + i * spacing;
    const isFirst = i === 0;
    const isLast = i === carbonCount - 1;
    
    if (isFirst) {
      // 最初の炭素: 左、上、下
      atoms.push({ id: `H${hIndex++}`, element: 'H', x: x - 40, y: startY });
      atoms.push({ id: `H${hIndex++}`, element: 'H', x: x, y: startY - 90 });
      atoms.push({ id: `H${hIndex++}`, element: 'H', x: x, y: startY + 90 });
      bonds.push({ from: `C${i + 1}`, to: `H${hIndex - 3}`, type: 'single' });
      bonds.push({ from: `C${i + 1}`, to: `H${hIndex - 2}`, type: 'single' });
      bonds.push({ from: `C${i + 1}`, to: `H${hIndex - 1}`, type: 'single' });
    } else if (isLast) {
      // 最後の炭素: 右、上、下
      atoms.push({ id: `H${hIndex++}`, element: 'H', x: x + 40, y: startY });
      atoms.push({ id: `H${hIndex++}`, element: 'H', x: x, y: startY - 90 });
      atoms.push({ id: `H${hIndex++}`, element: 'H', x: x, y: startY + 90 });
      bonds.push({ from: `C${i + 1}`, to: `H${hIndex - 3}`, type: 'single' });
      bonds.push({ from: `C${i + 1}`, to: `H${hIndex - 2}`, type: 'single' });
      bonds.push({ from: `C${i + 1}`, to: `H${hIndex - 1}`, type: 'single' });
    } else {
      // 中間の炭素: 上、下
      atoms.push({ id: `H${hIndex++}`, element: 'H', x: x, y: startY - 90 });
      atoms.push({ id: `H${hIndex++}`, element: 'H', x: x, y: startY + 90 });
      bonds.push({ from: `C${i + 1}`, to: `H${hIndex - 2}`, type: 'single' });
      bonds.push({ from: `C${i + 1}`, to: `H${hIndex - 1}`, type: 'single' });
    }
  }
  
  return { atoms, bonds };
}

/**
 * アルケン（二重結合）の構造を生成
 */
function generateAlkene(carbonCount, startX = 100, startY = 200, spacing = 140) {
  const atoms = [];
  const bonds = [];
  
  // 炭素原子を配置
  for (let i = 0; i < carbonCount; i++) {
    const x = startX + i * spacing;
    atoms.push({ id: `C${i + 1}`, element: 'C', x, y: startY });
    
    if (i > 0) {
      // 最初の結合は二重結合
      if (i === 1) {
        bonds.push({ from: `C${i}`, to: `C${i + 1}`, type: 'double' });
      } else {
        bonds.push({ from: `C${i}`, to: `C${i + 1}`, type: 'single' });
      }
    }
  }
  
  // 水素原子を配置（二重結合の炭素は2つのH、他は3つのH）
  let hIndex = 1;
  for (let i = 0; i < carbonCount; i++) {
    const x = startX + i * spacing;
    const isFirst = i === 0;
    const isLast = i === carbonCount - 1;
    const isDoubleBond = i === 0 || i === 1;
    
    if (isDoubleBond) {
      // 二重結合の炭素: 上下にH
      atoms.push({ id: `H${hIndex++}`, element: 'H', x: x - 34, y: startY - 86 });
      atoms.push({ id: `H${hIndex++}`, element: 'H', x: x - 34, y: startY + 86 });
      bonds.push({ from: `C${i + 1}`, to: `H${hIndex - 2}`, type: 'single' });
      bonds.push({ from: `C${i + 1}`, to: `H${hIndex - 1}`, type: 'single' });
    } else if (isFirst) {
      atoms.push({ id: `H${hIndex++}`, element: 'H', x: x - 40, y: startY });
      atoms.push({ id: `H${hIndex++}`, element: 'H', x: x, y: startY - 90 });
      atoms.push({ id: `H${hIndex++}`, element: 'H', x: x, y: startY + 90 });
      bonds.push({ from: `C${i + 1}`, to: `H${hIndex - 3}`, type: 'single' });
      bonds.push({ from: `C${i + 1}`, to: `H${hIndex - 2}`, type: 'single' });
      bonds.push({ from: `C${i + 1}`, to: `H${hIndex - 1}`, type: 'single' });
    } else if (isLast) {
      atoms.push({ id: `H${hIndex++}`, element: 'H', x: x + 40, y: startY });
      atoms.push({ id: `H${hIndex++}`, element: 'H', x: x, y: startY - 90 });
      atoms.push({ id: `H${hIndex++}`, element: 'H', x: x, y: startY + 90 });
      bonds.push({ from: `C${i + 1}`, to: `H${hIndex - 3}`, type: 'single' });
      bonds.push({ from: `C${i + 1}`, to: `H${hIndex - 2}`, type: 'single' });
      bonds.push({ from: `C${i + 1}`, to: `H${hIndex - 1}`, type: 'single' });
    } else {
      atoms.push({ id: `H${hIndex++}`, element: 'H', x: x, y: startY - 90 });
      atoms.push({ id: `H${hIndex++}`, element: 'H', x: x, y: startY + 90 });
      bonds.push({ from: `C${i + 1}`, to: `H${hIndex - 2}`, type: 'single' });
      bonds.push({ from: `C${i + 1}`, to: `H${hIndex - 1}`, type: 'single' });
    }
  }
  
  return { atoms, bonds };
}

/**
 * アルキン（三重結合）の構造を生成
 */
function generateAlkyne(carbonCount, startX = 100, startY = 200, spacing = 140) {
  const atoms = [];
  const bonds = [];
  
  // 炭素原子を配置
  for (let i = 0; i < carbonCount; i++) {
    const x = startX + i * spacing;
    atoms.push({ id: `C${i + 1}`, element: 'C', x, y: startY });
    
    if (i > 0) {
      if (i === 1) {
        bonds.push({ from: `C${i}`, to: `C${i + 1}`, type: 'triple' });
      } else {
        bonds.push({ from: `C${i}`, to: `C${i + 1}`, type: 'single' });
      }
    }
  }
  
  // 水素原子を配置
  let hIndex = 1;
  for (let i = 0; i < carbonCount; i++) {
    const x = startX + i * spacing;
    const isFirst = i === 0;
    const isLast = i === carbonCount - 1;
    const isTripleBond = i === 0 || i === 1;
    
    if (isTripleBond) {
      // 三重結合の炭素: 左右にH
      if (i === 0) {
        atoms.push({ id: `H${hIndex++}`, element: 'H', x: x - 40, y: startY });
        bonds.push({ from: `C${i + 1}`, to: `H${hIndex - 1}`, type: 'single' });
      } else {
        atoms.push({ id: `H${hIndex++}`, element: 'H', x: x + 40, y: startY });
        bonds.push({ from: `C${i + 1}`, to: `H${hIndex - 1}`, type: 'single' });
      }
    } else if (isFirst) {
      atoms.push({ id: `H${hIndex++}`, element: 'H', x: x - 40, y: startY });
      atoms.push({ id: `H${hIndex++}`, element: 'H', x: x, y: startY - 90 });
      atoms.push({ id: `H${hIndex++}`, element: 'H', x: x, y: startY + 90 });
      bonds.push({ from: `C${i + 1}`, to: `H${hIndex - 3}`, type: 'single' });
      bonds.push({ from: `C${i + 1}`, to: `H${hIndex - 2}`, type: 'single' });
      bonds.push({ from: `C${i + 1}`, to: `H${hIndex - 1}`, type: 'single' });
    } else if (isLast) {
      atoms.push({ id: `H${hIndex++}`, element: 'H', x: x + 40, y: startY });
      atoms.push({ id: `H${hIndex++}`, element: 'H', x: x, y: startY - 90 });
      atoms.push({ id: `H${hIndex++}`, element: 'H', x: x, y: startY + 90 });
      bonds.push({ from: `C${i + 1}`, to: `H${hIndex - 3}`, type: 'single' });
      bonds.push({ from: `C${i + 1}`, to: `H${hIndex - 2}`, type: 'single' });
      bonds.push({ from: `C${i + 1}`, to: `H${hIndex - 1}`, type: 'single' });
    } else {
      atoms.push({ id: `H${hIndex++}`, element: 'H', x: x, y: startY - 90 });
      atoms.push({ id: `H${hIndex++}`, element: 'H', x: x, y: startY + 90 });
      bonds.push({ from: `C${i + 1}`, to: `H${hIndex - 2}`, type: 'single' });
      bonds.push({ from: `C${i + 1}`, to: `H${hIndex - 1}`, type: 'single' });
    }
  }
  
  return { atoms, bonds };
}

/**
 * 化学式から炭素数を抽出
 */
function extractCarbonCount(formula) {
  const match = formula.match(/C(\d+)/);
  if (match) {
    return parseInt(match[1]);
  }
  // Cのみの場合は1
  if (formula.includes('C') && !formula.match(/C\d/)) {
    return 1;
  }
  return null;
}

/**
 * 化合物名とタイプから構造を生成
 */
function generateStructure(name, type, formula) {
  // 既知の化合物パターン
  const knownCompounds = {
    'メタン': () => generateAlkane(1),
    'エタン': () => generateAlkane(2),
    'プロパン': () => generateAlkane(3),
    'ブタン': () => generateAlkane(4),
    'エチレン': () => generateAlkene(2),
    'エテン': () => generateAlkene(2),
    'プロピレン': () => generateAlkene(3),
    'プロペン': () => generateAlkene(3),
    'アセチレン': () => generateAlkyne(2),
    'エチン': () => generateAlkyne(2),
  };
  
  if (knownCompounds[name]) {
    return knownCompounds[name]();
  }
  
  // タイプから推測
  if (type.includes('アルカン')) {
    const carbonCount = extractCarbonCount(formula);
    if (carbonCount) {
      return generateAlkane(carbonCount);
    }
  } else if (type.includes('アルケン')) {
    const carbonCount = extractCarbonCount(formula);
    if (carbonCount) {
      return generateAlkene(carbonCount);
    }
  } else if (type.includes('アルキン')) {
    const carbonCount = extractCarbonCount(formula);
    if (carbonCount) {
      return generateAlkyne(carbonCount);
    }
  }
  
  return null;
}

// メイン処理
async function main() {
  try {
    // GASからデータを取得
    const response = await fetch(`${GAS_URL}?type=compounds&category=organic`);
    const data = await response.json();
    
    if (!data.csv) {
      console.error('Failed to get data from GAS');
      return;
    }
    
    // CSVをパース
    const lines = data.csv.trim().split('\n');
    const headers = lines[0].split(',');
    const nameIndex = headers.indexOf('name');
    const typeIndex = headers.indexOf('type');
    const formulaIndex = headers.indexOf('formula');
    const atomsIndex = headers.indexOf('atoms');
    const bondsIndex = headers.indexOf('bonds');
    
    console.log('id,name,type,formula,atoms,bonds');
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const id = values[0];
      const name = values[nameIndex] || '';
      const type = values[typeIndex] || '';
      const formula = values[formulaIndex] || '';
      const existingAtoms = values[atomsIndex] || '';
      const existingBonds = values[bondsIndex] || '';
      
      // 既に構造式がある場合はスキップ
      if (existingAtoms && existingBonds) {
        console.log(lines[i]);
        continue;
      }
      
      // 構造式を生成
      const structure = generateStructure(name, type, formula);
      
      if (structure) {
        const atomsJson = JSON.stringify(structure.atoms);
        const bondsJson = JSON.stringify(structure.bonds);
        const atomsEscaped = atomsJson.replace(/"/g, '""');
        const bondsEscaped = bondsJson.replace(/"/g, '""');
        
        // 新しい行を生成
        const newValues = [...values];
        newValues[atomsIndex] = `"${atomsEscaped}"`;
        newValues[bondsIndex] = `"${bondsEscaped}"`;
        
        console.log(newValues.join(','));
      } else {
        // 生成できない場合は元の行をそのまま出力
        console.log(lines[i]);
        console.error(`Warning: Could not generate structure for ${name} (${type})`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Node.js環境でfetchを使用する場合
if (typeof fetch === 'undefined') {
  console.error('This script requires Node.js 18+ or a fetch polyfill');
  process.exit(1);
}

main();

