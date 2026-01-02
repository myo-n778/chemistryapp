import React from 'react';
import { StructureData } from '../types';
import './StructureViewer.css';

interface StructureViewerProps {
  structure: StructureData;
  width?: number;
  height?: number;
  size?: number;
  compoundName?: string;
}

export const StructureViewer: React.FC<StructureViewerProps> = ({
  structure,
  width,
  height,
  size,
  compoundName,
}) => {
  // ベンゼン環かどうかを判定（ベンゼン、トルエン、クロロベンゼンなど）
  const isBenzeneRing = compoundName && (
    compoundName === 'ベンゼン' ||
    compoundName.includes('ベンゼン') ||
    compoundName.includes('トルエン') ||
    compoundName.includes('クロロベンゼン') ||
    compoundName.includes('ブロモベンゼン') ||
    compoundName.includes('フェノール') ||
    compoundName.includes('ベンズアルデヒド') ||
    compoundName.includes('安息香酸') ||
    compoundName.includes('アニリン')
  );
  // 原子の半径を取得する関数
  const getAtomRadius = (element: string) => {
    if (element === 'C') return isBenzeneRing ? 18 : 22;
    if (element === 'O') return 20;
    if (element === 'N') return 20;
    if (element === 'Cl') return 24;
    if (element === 'Br') return 26;
    if (element === 'F') return 18;
    if (element === 'I') return 28;
    if (element === 'Na') return 24;
    return 18; // H
  };

  // 分子の座標範囲（原子の半径を含む）を計算して見切れを防止
  const minX = Math.min(...structure.atoms.map(a => a.x - getAtomRadius(a.element)));
  const maxX = Math.max(...structure.atoms.map(a => a.x + getAtomRadius(a.element)));
  const minY = Math.min(...structure.atoms.map(a => a.y - getAtomRadius(a.element)));
  const maxY = Math.max(...structure.atoms.map(a => a.y + getAtomRadius(a.element)));

  // 図を最大化するためマージンを極限（2）に設定
  const padding = 2;
  const viewBoxX = minX - padding;
  const viewBoxY = minY - padding;
  const viewBoxWidth = (maxX - minX) + padding * 2;
  const viewBoxHeight = (maxY - minY) + padding * 2;
  const getBondStrokeWidth = (type: 'single' | 'double' | 'triple') => {
    switch (type) {
      case 'single':
        return 4;
      case 'double':
        return 4;
      case 'triple':
        return 4;
      default:
        return 4;
    }
  };

  const getBondOffset = (type: 'single' | 'double' | 'triple', index: number) => {
    if (type === 'double') {
      return index === 0 ? -5 : 5;
    }
    if (type === 'triple') {
      if (index === 0) return -6;
      if (index === 1) return 0;
      return 6;
    }
    return 0;
  };

  const renderBond = (bond: typeof structure.bonds[0], index: number) => {
    const fromAtom = structure.atoms.find(a => a.id === bond.from);
    const toAtom = structure.atoms.find(a => a.id === bond.to);

    if (!fromAtom || !toAtom) return null;

    const offset = getBondOffset(bond.type, index);
    const strokeWidth = getBondStrokeWidth(bond.type);

    const dx = toAtom.x - fromAtom.x;
    const dy = toAtom.y - fromAtom.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const perpX = -dy / length;
    const perpY = dx / length;

    // 原子の半径を考慮して結合線の開始点と終了点を調整
    const getAtomRadius = (element: string) => {
      if (element === 'C') {
        // ベンゼン環の炭素は水素と同じサイズ
        return isBenzeneRing ? 18 : 22;
      }
      if (element === 'O') return 20;
      if (element === 'N') return 20;
      if (element === 'Cl') return 24;
      if (element === 'Br') return 26;
      if (element === 'F') return 18;
      if (element === 'I') return 28;
      if (element === 'Na') return 24;
      return 18; // H
    };
    const fromRadius = getAtomRadius(fromAtom.element);
    const toRadius = getAtomRadius(toAtom.element);

    // 原子の中心から端までのベクトル
    const fromOffsetX = (dx / length) * fromRadius;
    const fromOffsetY = (dy / length) * fromRadius;
    const toOffsetX = (-dx / length) * toRadius;
    const toOffsetY = (-dy / length) * toRadius;

    const x1 = fromAtom.x + fromOffsetX + perpX * offset;
    const y1 = fromAtom.y + fromOffsetY + perpY * offset;
    const x2 = toAtom.x + toOffsetX + perpX * offset;
    const y2 = toAtom.y + toOffsetY + perpY * offset;

    return (
      <line
        key={`${bond.from}-${bond.to}-${index}`}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#ffffff"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeOpacity={1}
      />
    );
  };

  const bondsToRender = structure.bonds.flatMap((bond, idx) => {
    if (bond.type === 'single') {
      return [renderBond(bond, 0)];
    } else if (bond.type === 'double') {
      return [renderBond(bond, 0), renderBond(bond, 1)];
    } else if (bond.type === 'triple') {
      return [renderBond(bond, 0), renderBond(bond, 1), renderBond(bond, 2)];
    }
    return [];
  });

  return (
    <div
      className="structure-viewer"
      style={{
        width: width || size || undefined,
        height: height || size || undefined,
        maxWidth: width || size ? 'none' : undefined,
      }}
    >
      <svg
        viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          maxHeight: height || size ? 'none' : undefined
        }}
      >
        {structure.atoms
          .filter(atom => {
            // 水素原子の表示ルール:
            // 1. スプレッドシートのデータにある場合は表示する
            // (以前のベンゼン環で一律非表示にするロジックを削除)
            return true;
          })
          .map(atom => (
            <g key={atom.id}>
              <circle
                cx={atom.x}
                cy={atom.y}
                r={
                  atom.element === 'C' ? (isBenzeneRing ? 18 : 22) :
                    atom.element === 'O' ? 20 :
                      atom.element === 'N' ? 20 :
                        atom.element === 'Cl' ? 24 :
                          atom.element === 'Br' ? 26 :
                            atom.element === 'F' ? 18 :
                              atom.element === 'I' ? 28 :
                                atom.element === 'Na' ? 24 :
                                  18 // H
                }
                fill={
                  atom.element === 'C' ? '#ffa500' :
                    atom.element === 'O' ? '#ffffff' :
                      atom.element === 'H' ? '#87CEEB' :
                        atom.element === 'N' ? '#0000ff' :
                          atom.element === 'Cl' ? '#00ff00' :
                            atom.element === 'Br' ? '#8b4513' :
                              atom.element === 'F' ? '#90ee90' :
                                atom.element === 'I' ? '#9400d3' :
                                  atom.element === 'Na' ? '#c0c0c0' :
                                    '#87CEEB' // デフォルトは水色
                }
                stroke={
                  atom.element === 'C' ? '#ffa500' :
                    atom.element === 'O' ? '#ffffff' :
                      atom.element === 'H' ? '#87CEEB' :
                        atom.element === 'N' ? '#0000ff' :
                          atom.element === 'Cl' ? '#00ff00' :
                            atom.element === 'Br' ? '#8b4513' :
                              atom.element === 'F' ? '#90ee90' :
                                atom.element === 'I' ? '#9400d3' :
                                  atom.element === 'Na' ? '#c0c0c0' :
                                    '#87CEEB' // デフォルトは水色
                }
                strokeWidth={2}
                filter={
                  atom.element === 'C' ? "drop-shadow(0 0 6px rgba(255, 165, 0, 0.9)) drop-shadow(0 0 12px rgba(255, 165, 0, 0.6))" :
                    atom.element === 'O' ? "drop-shadow(0 0 4px rgba(255, 255, 255, 0.5))" :
                      atom.element === 'H' ? "drop-shadow(0 0 4px rgba(135, 206, 235, 0.6))" :
                        atom.element === 'N' ? "drop-shadow(0 0 4px rgba(0, 0, 255, 0.6))" :
                          atom.element === 'Cl' ? "drop-shadow(0 0 4px rgba(0, 255, 0, 0.6))" :
                            atom.element === 'Br' ? "drop-shadow(0 0 4px rgba(139, 69, 19, 0.6))" :
                              atom.element === 'F' ? "drop-shadow(0 0 4px rgba(144, 238, 144, 0.6))" :
                                atom.element === 'I' ? "drop-shadow(0 0 4px rgba(148, 0, 211, 0.6))" :
                                  atom.element === 'Na' ? "drop-shadow(0 0 4px rgba(192, 192, 192, 0.6))" :
                                    "drop-shadow(0 0 4px rgba(135, 206, 235, 0.6))" // デフォルト
                }
              />
              {/* 常に文字を表示するように変更（以前の非表示ロジックを削除） */}
              {true && (
                <text
                  x={atom.x}
                  y={atom.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={
                    atom.element === 'C' ? 24 :
                      atom.element === 'O' ? 22 :
                        atom.element === 'N' ? 22 :
                          atom.element === 'Cl' ? 20 :
                            atom.element === 'Br' ? 20 :
                              atom.element === 'F' ? 20 :
                                atom.element === 'I' ? 20 :
                                  atom.element === 'Na' ? 20 :
                                    20 // H
                  }
                  fill={
                    atom.element === 'C' ? '#2a1f1a' :
                      atom.element === 'O' ? '#2a1f1a' :
                        atom.element === 'H' ? '#2a1f1a' :
                          atom.element === 'N' ? '#ffffff' :
                            atom.element === 'Cl' ? '#2a1f1a' :
                              atom.element === 'Br' ? '#ffffff' :
                                atom.element === 'F' ? '#2a1f1a' :
                                  atom.element === 'I' ? '#ffffff' :
                                    atom.element === 'Na' ? '#2a1f1a' :
                                      '#2a1f1a' // デフォルトは黒
                  }
                  fontWeight="bold"
                  fontFamily="'Noto Serif', serif"
                >
                  {atom.element}
                </text>
              )}
            </g>
          ))}
        {bondsToRender}
      </svg>
    </div>
  );
};

