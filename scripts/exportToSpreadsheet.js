/**
 * 既存の化合物データをスプレッドシート用のJSON形式にエクスポート
 * 使用方法: node scripts/exportToSpreadsheet.js
 */

const compounds = [
  {
    id: '1',
    name: 'メタン',
    structure: {
      atoms: [
        { id: 'C1', element: 'C', x: 200, y: 200 },
        { id: 'H1', element: 'H', x: 110, y: 110 },
        { id: 'H2', element: 'H', x: 290, y: 110 },
        { id: 'H3', element: 'H', x: 110, y: 290 },
        { id: 'H4', element: 'H', x: 290, y: 290 },
      ],
      bonds: [
        { from: 'C1', to: 'H1', type: 'single' },
        { from: 'C1', to: 'H2', type: 'single' },
        { from: 'C1', to: 'H3', type: 'single' },
        { from: 'C1', to: 'H4', type: 'single' },
      ],
    },
  },
  {
    id: '2',
    name: 'エタン',
    structure: {
      atoms: [
        { id: 'C1', element: 'C', x: 130, y: 200 },
        { id: 'C2', element: 'C', x: 270, y: 200 },
        { id: 'H1', element: 'H', x: 50, y: 200 },
        { id: 'H2', element: 'H', x: 130, y: 110 },
        { id: 'H3', element: 'H', x: 130, y: 290 },
        { id: 'H4', element: 'H', x: 270, y: 110 },
        { id: 'H5', element: 'H', x: 270, y: 290 },
        { id: 'H6', element: 'H', x: 350, y: 200 },
      ],
      bonds: [
        { from: 'C1', to: 'C2', type: 'single' },
        { from: 'C1', to: 'H1', type: 'single' },
        { from: 'C1', to: 'H2', type: 'single' },
        { from: 'C1', to: 'H3', type: 'single' },
        { from: 'C2', to: 'H4', type: 'single' },
        { from: 'C2', to: 'H5', type: 'single' },
        { from: 'C2', to: 'H6', type: 'single' },
      ],
    },
  },
  {
    id: '3',
    name: 'エチレン',
    structure: {
      atoms: [
        { id: 'C1', element: 'C', x: 130, y: 200 },
        { id: 'C2', element: 'C', x: 270, y: 200 },
        { id: 'H1', element: 'H', x: 84, y: 110 },
        { id: 'H2', element: 'H', x: 84, y: 290 },
        { id: 'H3', element: 'H', x: 316, y: 110 },
        { id: 'H4', element: 'H', x: 316, y: 290 },
      ],
      bonds: [
        { from: 'C1', to: 'C2', type: 'double' },
        { from: 'C1', to: 'H1', type: 'single' },
        { from: 'C1', to: 'H2', type: 'single' },
        { from: 'C2', to: 'H3', type: 'single' },
        { from: 'C2', to: 'H4', type: 'single' },
      ],
    },
  },
  {
    id: '4',
    name: 'アセチレン',
    structure: {
      atoms: [
        { id: 'C1', element: 'C', x: 130, y: 200 },
        { id: 'C2', element: 'C', x: 270, y: 200 },
        { id: 'H1', element: 'H', x: 50, y: 200 },
        { id: 'H2', element: 'H', x: 350, y: 200 },
      ],
      bonds: [
        { from: 'C1', to: 'C2', type: 'triple' },
        { from: 'C1', to: 'H1', type: 'single' },
        { from: 'C2', to: 'H2', type: 'single' },
      ],
    },
  },
  {
    id: '5',
    name: 'ベンゼン',
    structure: {
      atoms: [
        { id: 'C1', element: 'C', x: 200, y: 80 },
        { id: 'C2', element: 'C', x: 304, y: 140 },
        { id: 'C3', element: 'C', x: 304, y: 260 },
        { id: 'C4', element: 'C', x: 200, y: 320 },
        { id: 'C5', element: 'C', x: 96, y: 260 },
        { id: 'C6', element: 'C', x: 96, y: 140 },
        { id: 'H1', element: 'H', x: 200, y: 20 },
        { id: 'H2', element: 'H', x: 370, y: 100 },
        { id: 'H3', element: 'H', x: 370, y: 300 },
        { id: 'H4', element: 'H', x: 200, y: 380 },
        { id: 'H5', element: 'H', x: 30, y: 300 },
        { id: 'H6', element: 'H', x: 30, y: 100 },
      ],
      bonds: [
        { from: 'C1', to: 'C2', type: 'double' },
        { from: 'C2', to: 'C3', type: 'single' },
        { from: 'C3', to: 'C4', type: 'double' },
        { from: 'C4', to: 'C5', type: 'single' },
        { from: 'C5', to: 'C6', type: 'double' },
        { from: 'C6', to: 'C1', type: 'single' },
        { from: 'C1', to: 'H1', type: 'single' },
        { from: 'C2', to: 'H2', type: 'single' },
        { from: 'C3', to: 'H3', type: 'single' },
        { from: 'C4', to: 'H4', type: 'single' },
        { from: 'C5', to: 'H5', type: 'single' },
        { from: 'C6', to: 'H6', type: 'single' },
      ],
    },
  },
  {
    id: '6',
    name: 'メタノール',
    structure: {
      atoms: [
        { id: 'C1', element: 'C', x: 130, y: 200 },
        { id: 'O1', element: 'O', x: 270, y: 200 },
        { id: 'H1', element: 'H', x: 50, y: 200 },
        { id: 'H2', element: 'H', x: 130, y: 110 },
        { id: 'H3', element: 'H', x: 130, y: 290 },
        { id: 'H4', element: 'H', x: 350, y: 200 },
      ],
      bonds: [
        { from: 'C1', to: 'O1', type: 'single' },
        { from: 'C1', to: 'H1', type: 'single' },
        { from: 'C1', to: 'H2', type: 'single' },
        { from: 'C1', to: 'H3', type: 'single' },
        { from: 'O1', to: 'H4', type: 'single' },
      ],
    },
  },
  {
    id: '7',
    name: 'エタノール',
    structure: {
      atoms: [
        { id: 'C1', element: 'C', x: 80, y: 200 },
        { id: 'C2', element: 'C', x: 200, y: 200 },
        { id: 'O1', element: 'O', x: 320, y: 200 },
        { id: 'H1', element: 'H', x: 20, y: 200 },
        { id: 'H2', element: 'H', x: 80, y: 110 },
        { id: 'H3', element: 'H', x: 80, y: 290 },
        { id: 'H4', element: 'H', x: 200, y: 110 },
        { id: 'H5', element: 'H', x: 200, y: 290 },
        { id: 'H6', element: 'H', x: 380, y: 200 },
      ],
      bonds: [
        { from: 'C1', to: 'C2', type: 'single' },
        { from: 'C2', to: 'O1', type: 'single' },
        { from: 'C1', to: 'H1', type: 'single' },
        { from: 'C1', to: 'H2', type: 'single' },
        { from: 'C1', to: 'H3', type: 'single' },
        { from: 'C2', to: 'H4', type: 'single' },
        { from: 'C2', to: 'H5', type: 'single' },
        { from: 'O1', to: 'H6', type: 'single' },
      ],
    },
  },
  {
    id: '8',
    name: 'ホルムアルデヒド',
    structure: {
      atoms: [
        { id: 'C1', element: 'C', x: 130, y: 200 },
        { id: 'O1', element: 'O', x: 270, y: 200 },
        { id: 'H1', element: 'H', x: 50, y: 200 },
        { id: 'H2', element: 'H', x: 130, y: 110 },
      ],
      bonds: [
        { from: 'C1', to: 'O1', type: 'double' },
        { from: 'C1', to: 'H1', type: 'single' },
        { from: 'C1', to: 'H2', type: 'single' },
      ],
    },
  },
];

// CSV形式で出力
console.log('id,name,type,formula,atoms,bonds');
compounds.forEach(compound => {
  const atomsJson = JSON.stringify(compound.structure.atoms);
  const bondsJson = JSON.stringify(compound.structure.bonds);
  // CSV内のダブルクォートをエスケープ
  const atomsEscaped = atomsJson.replace(/"/g, '""');
  const bondsEscaped = bondsJson.replace(/"/g, '""');
  
  // 型と化学式は空（手動で入力）
  console.log(`${compound.id},"${compound.name}",,"${atomsEscaped}","${bondsEscaped}"`);
});

