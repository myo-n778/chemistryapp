export type CompoundType = 
  | 'アルカン'
  | 'アルケン'
  | 'アルキン'
  | 'アルコール'
  | 'アルデヒド'
  | 'ケトン'
  | 'カルボン酸'
  | 'エーテル'
  | '芳香族';

export const getCompoundType = (name: string): CompoundType => {
  // アルカン
  if (name === 'メタン' || name === 'エタン') {
    return 'アルカン';
  }
  
  // アルケン
  if (name === 'エチレン') {
    return 'アルケン';
  }
  
  // アルキン
  if (name === 'アセチレン') {
    return 'アルキン';
  }
  
  // アルコール
  if (name === 'メタノール' || name === 'エタノール') {
    return 'アルコール';
  }
  
  // アルデヒド
  if (name === 'ホルムアルデヒド') {
    return 'アルデヒド';
  }
  
  // 芳香族
  if (name === 'ベンゼン') {
    return '芳香族';
  }
  
  // デフォルト
  return 'アルカン';
};

