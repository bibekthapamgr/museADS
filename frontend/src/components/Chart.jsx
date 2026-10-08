import React from 'react';

/**
 * Tiny reusable SVG bar chart. `values` = numbers, `labels` = short x labels.
 * No chart library — hand-rolled SVG.
 */
export default function Chart({ values = [], labels = [], height = 160, color = '#1877f2' }) {
  const w = 560;
  const max = Math.max(1, ...values);
  const bw = values.length ? w / values.length : w;
  return (
    <svg viewBox={`0 0 ${w} ${height + 24}`} style={{ width: '100%', height: 'auto' }}>
      {values.map((v, i) => {
        const h = (v / max) * height;
        const x = i * bw + bw * 0.2;
        return (
          <g key={i}>
            <title>{labels[i]}: {v}</title>
            <rect x={x} y={height - h} width={bw * 0.6} height={h} rx="3" fill={color} />
            {labels[i] && (
              <text x={x + bw * 0.3} y={height + 16} fontSize="10" fill="#65676b" textAnchor="middle">
                {labels[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
