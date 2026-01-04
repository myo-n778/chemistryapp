import React from 'react';
import { InorganicReaction } from '../types';
import './InorganicVisualViewer.css';

interface InorganicVisualViewerProps {
  reaction: InorganicReaction;
  width?: number;
  height?: number;
}

export const InorganicVisualViewer: React.FC<InorganicVisualViewerProps> = ({
  reaction,
  width = 400,
  height = 300,
}) => {
  const tags = reaction.tags_norm || [];
  const observations = reaction.observations || '';

  // 色タグを抽出
  const colorTags = tags.filter(tag => tag.startsWith('color:'));
  const colors = colorTags.map(tag => tag.replace('color:', ''));

  // 沈殿タグ
  const hasPrecipitate = tags.includes('precip');

  // 気体タグ
  const hasGas = tags.includes('gas');

  // 電気分解タグ
  const hasElectrochem = tags.includes('electrochem');

  // 平衡反応タグ
  const hasEquilibrium = tags.includes('equilibrium');

  // 錯体タグ
  const hasComplex = tags.includes('complex');

  // 臭いタグ
  const smellTags = tags.filter(tag => tag.startsWith('smell:'));
  const smells = smellTags.map(tag => tag.replace('smell:', ''));

  // ALTテキストを生成
  const altText = [
    observations,
    hasPrecipitate ? '沈殿が生成' : '',
    hasGas ? '気体が発生' : '',
    colors.length > 0 ? `色: ${colors.join(', ')}` : '',
    smells.length > 0 ? `臭い: ${smells.join(', ')}` : '',
    hasElectrochem ? '電気分解' : '',
    hasEquilibrium ? '平衡反応' : '',
    hasComplex ? '錯体生成' : '',
  ].filter(Boolean).join('、') || '反応の観察';

  return (
    <div className="inorganic-visual-viewer" style={{ width, height }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={altText}
      >
        {/* 背景（溶液色） */}
        {colors.length > 0 && (
          <rect
            x="0"
            y="0"
            width={width}
            height={height}
            fill={getColorValue(colors[0])}
            opacity={0.2}
          />
        )}

        {/* 電気分解の電極 */}
        {hasElectrochem && (
          <>
            {/* 陽極（左） */}
            <line
              x1={width * 0.2}
              y1={height * 0.1}
              x2={width * 0.2}
              y2={height * 0.9}
              stroke="#333"
              strokeWidth="3"
            />
            <text
              x={width * 0.2}
              y={height * 0.05}
              textAnchor="middle"
              fontSize="12"
              fill="#333"
            >
              陽極
            </text>

            {/* 陰極（右） */}
            <line
              x1={width * 0.8}
              y1={height * 0.1}
              x2={width * 0.8}
              y2={height * 0.9}
              stroke="#333"
              strokeWidth="3"
            />
            <text
              x={width * 0.8}
              y={height * 0.05}
              textAnchor="middle"
              fontSize="12"
              fill="#333"
            >
              陰極
            </text>
          </>
        )}

        {/* 沈殿（下向き矢印） */}
        {hasPrecipitate && (
          <g>
            <line
              x1={width * 0.5}
              y1={height * 0.3}
              x2={width * 0.5}
              y2={height * 0.7}
              stroke="#666"
              strokeWidth="3"
              markerEnd="url(#arrowhead-down)"
            />
            <text
              x={width * 0.5}
              y={height * 0.75}
              textAnchor="middle"
              fontSize="14"
              fill="#333"
              fontWeight="bold"
            >
              ↓ 沈殿
            </text>
            {colors.length > 0 && (
              <text
                x={width * 0.5}
                y={height * 0.85}
                textAnchor="middle"
                fontSize="12"
                fill="#666"
              >
                {colors[0]}
              </text>
            )}
          </g>
        )}

        {/* 気体（上向き矢印） */}
        {hasGas && (
          <g>
            <line
              x1={width * 0.5}
              y1={height * 0.7}
              x2={width * 0.5}
              y2={height * 0.3}
              stroke="#666"
              strokeWidth="3"
              markerEnd="url(#arrowhead-up)"
            />
            <text
              x={width * 0.5}
              y={height * 0.25}
              textAnchor="middle"
              fontSize="14"
              fill="#333"
              fontWeight="bold"
            >
              ↑ 気体
            </text>
            {colors.length > 0 && (
              <text
                x={width * 0.5}
                y={height * 0.15}
                textAnchor="middle"
                fontSize="12"
                fill="#666"
              >
                {colors[0]}
              </text>
            )}
            {smells.length > 0 && (
              <text
                x={width * 0.5}
                y={height * 0.1}
                textAnchor="middle"
                fontSize="11"
                fill="#666"
              >
                {smells[0]}
              </text>
            )}
          </g>
        )}

        {/* 電気分解の気体発生 */}
        {hasElectrochem && hasGas && (
          <>
            {/* 陽極側の気体 */}
            <line
              x1={width * 0.2}
              y1={height * 0.5}
              x2={width * 0.1}
              y2={height * 0.2}
              stroke="#666"
              strokeWidth="2"
              markerEnd="url(#arrowhead-up)"
            />
            {/* 陰極側の気体 */}
            <line
              x1={width * 0.8}
              y1={height * 0.5}
              x2={width * 0.9}
              y2={height * 0.2}
              stroke="#666"
              strokeWidth="2"
              markerEnd="url(#arrowhead-up)"
            />
          </>
        )}

        {/* 平衡反応の矢印 */}
        {hasEquilibrium && (
          <path
            d={`M ${width * 0.2} ${height * 0.5} L ${width * 0.8} ${height * 0.5}`}
            stroke="#666"
            strokeWidth="2"
            fill="none"
            markerStart="url(#arrowhead-right)"
            markerEnd="url(#arrowhead-left)"
          />
        )}

        {/* 錯体の表示 */}
        {hasComplex && (
          <g>
            <circle
              cx={width * 0.5}
              cy={height * 0.5}
              r={width * 0.15}
              fill="none"
              stroke="#9b59b6"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
            <text
              x={width * 0.5}
              y={height * 0.5}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="12"
              fill="#9b59b6"
            >
              錯体
            </text>
          </g>
        )}

        {/* 矢印マーカー定義 */}
        <defs>
          <marker
            id="arrowhead-up"
            markerWidth="10"
            markerHeight="10"
            refX="5"
            refY="5"
            orient="auto"
          >
            <polygon points="5,0 0,10 10,10" fill="#666" />
          </marker>
          <marker
            id="arrowhead-down"
            markerWidth="10"
            markerHeight="10"
            refX="5"
            refY="5"
            orient="auto"
          >
            <polygon points="5,10 0,0 10,0" fill="#666" />
          </marker>
          <marker
            id="arrowhead-right"
            markerWidth="10"
            markerHeight="10"
            refX="5"
            refY="5"
            orient="auto"
          >
            <polygon points="10,5 0,0 0,10" fill="#666" />
          </marker>
          <marker
            id="arrowhead-left"
            markerWidth="10"
            markerHeight="10"
            refX="5"
            refY="5"
            orient="auto"
          >
            <polygon points="0,5 10,0 10,10" fill="#666" />
          </marker>
        </defs>
      </svg>
      {/* テキスト説明（色覚配慮） */}
      <div className="visual-description">
        {altText}
      </div>
    </div>
  );
};

/**
 * 色名をCSS色値に変換
 */
const getColorValue = (colorName: string): string => {
  const colorMap: Record<string, string> = {
    'yellow': '#ffff00',
    'yellow_green': '#adff2f',
    'green': '#00ff00',
    'blue': '#0000ff',
    'red': '#ff0000',
    'orange': '#ffa500',
    'purple': '#800080',
    'brown': '#a52a2a',
    'white': '#ffffff',
    'black': '#000000',
    'pink': '#ffc0cb',
    'colorless': '#f0f0f0',
  };
  
  return colorMap[colorName.toLowerCase()] || '#cccccc';
};

