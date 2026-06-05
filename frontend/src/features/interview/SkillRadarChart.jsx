import React from "react";

/**
 * Pure SVG Radar/Spider Chart for displaying skill match scores
 * @param {Object} skillScores - Map of skills with score field (e.g. { React: { score: 8 }, Node: { score: 9 } })
 */
export default function SkillRadarChart({ skillScores = {} }) {
  const skills = Object.keys(skillScores);
  const data = Object.values(skillScores).map((s) => s.score || 0);

  if (skills.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-slate-500 italic">
        No skill score metrics to plot.
      </div>
    );
  }

  // Radar chart constants
  const size = 300;
  const center = size / 2;
  const radius = size * 0.35;
  const totalAxes = skills.length;

  // Generate radar coordinate helper
  const getCoordinates = (index, value) => {
    const angle = (Math.PI * 2 / totalAxes) * index - Math.PI / 2;
    const distance = (value / 10) * radius;
    return {
      x: center + distance * Math.cos(angle),
      y: center + distance * Math.sin(angle),
    };
  };

  // Generate grid circles
  const gridLevels = [2, 4, 6, 8, 10];
  const gridCircles = gridLevels.map((level) => {
    const points = Array.from({ length: totalAxes }).map((_, i) => {
      const coord = getCoordinates(i, level);
      return `${coord.x},${coord.y}`;
    }).join(" ");
    return <polygon key={level} points={points} className="fill-none stroke-slate-800 stroke-[0.7] stroke-dasharray-[2,2]" />;
  });

  // Generate axes lines
  const axes = skills.map((skill, i) => {
    const outerCoord = getCoordinates(i, 10);
    const labelCoord = getCoordinates(i, 11.5);
    
    // Align label anchoring based on horizontal alignment
    let textAnchor = "middle";
    if (labelCoord.x > center + 10) textAnchor = "start";
    if (labelCoord.x < center - 10) textAnchor = "end";

    return (
      <g key={skill}>
        <line
          x1={center}
          y1={center}
          x2={outerCoord.x}
          y2={outerCoord.y}
          className="stroke-slate-800 stroke-[0.8]"
        />
        <text
          x={labelCoord.x}
          y={labelCoord.y + 4}
          textAnchor={textAnchor}
          className="fill-slate-400 font-bold text-[9px] uppercase tracking-wide"
        >
          {skill}
        </text>
      </g>
    );
  });

  // Generate candidate score polygon
  const scorePoints = skills.map((_, i) => {
    const coord = getCoordinates(i, data[i]);
    return `${coord.x},${coord.y}`;
  }).join(" ");

  // Generate glowing dots at vertices
  const vertices = skills.map((skill, i) => {
    const coord = getCoordinates(i, data[i]);
    return (
      <g key={skill}>
        <circle
          cx={coord.x}
          cy={coord.y}
          r="4.5"
          className="fill-indigo-500 stroke-slate-950 stroke-[1.5] shadow-lg"
        />
        <text
          x={coord.x}
          y={coord.y - 8}
          textAnchor="middle"
          className="fill-indigo-400 font-extrabold text-[8px]"
        >
          {data[i]}/10
        </text>
      </g>
    );
  });

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-950/40 rounded-3xl border border-slate-900 shadow-inner">
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="max-w-[280px]">
        <defs>
          <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.0" />
          </radialGradient>
        </defs>

        {/* Radar grid backgrounds */}
        {gridCircles}

        {/* Grid labels / Axes */}
        {axes}

        {/* Filled polygon for candidate skill values */}
        {skills.length > 2 && (
          <polygon
            points={scorePoints}
            fill="url(#radarGlow)"
            className="stroke-indigo-500 stroke-[2] linejoin-round filter drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]"
          />
        )}

        {/* Vertices dot plots */}
        {vertices}
      </svg>
    </div>
  );
}
