interface OctoDefenderLogoProps {
  className?: string;
  showText?: boolean;
  animated?: boolean;
}

export const OctoDefenderLogo = ({ 
  className = "w-10 h-10", 
  showText = false,
  animated = true 
}: OctoDefenderLogoProps) => {
  return (
    <div className="flex items-center gap-3">
      <div className={`relative ${className}`}>
        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={animated ? "group-hover:scale-105 transition-transform duration-500" : ""}
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="octopusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="50%" stopColor="#1e3a8a" />
              <stop offset="100%" stopColor="#065f46" />
            </linearGradient>
            
            <linearGradient id="tentacleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#065f46" stopOpacity="0.4" />
            </linearGradient>

            <radialGradient id="glowGradient">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
            </radialGradient>

            {/* Filters */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Background glow */}
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="url(#glowGradient)"
            opacity="0.3"
            className={animated ? "animate-pulse" : ""}
          />

          {/* 8 Tentacles radiating from center */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, index) => {
            const rad = (angle * Math.PI) / 180;
            const startX = 60 + Math.cos(rad) * 20;
            const startY = 60 + Math.sin(rad) * 20;
            const controlX = 60 + Math.cos(rad) * 35;
            const controlY = 60 + Math.sin(rad) * 35;
            const endX = 60 + Math.cos(rad) * 48;
            const endY = 60 + Math.sin(rad) * 48;
            
            return (
              <g key={index}>
                {/* Tentacle path */}
                <path
                  d={`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`}
                  stroke="url(#tentacleGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.8"
                  className={animated ? "animate-pulse" : ""}
                  style={{ animationDelay: `${index * 0.1}s` }}
                />
                {/* Tentacle tip */}
                <circle
                  cx={endX}
                  cy={endY}
                  r="2.5"
                  fill="#10b981"
                  opacity="0.9"
                  className={animated ? "animate-pulse" : ""}
                  style={{ animationDelay: `${index * 0.1}s` }}
                />
              </g>
            );
          })}

          {/* Central octopus body */}
          <circle
            cx="60"
            cy="60"
            r="22"
            fill="url(#octopusGradient)"
            filter="url(#glow)"
            opacity="0.95"
          />

          {/* Inner ring detail */}
          <circle
            cx="60"
            cy="60"
            r="18"
            fill="none"
            stroke="#2563eb"
            strokeWidth="1"
            opacity="0.3"
          />

          {/* Octopus eyes */}
          <g opacity="0.9">
            <circle cx="53" cy="56" r="3.5" fill="#000" />
            <circle cx="67" cy="56" r="3.5" fill="#000" />
            <circle cx="53.5" cy="55.5" r="1.5" fill="#60a5fa" />
            <circle cx="67.5" cy="55.5" r="1.5" fill="#60a5fa" />
          </g>

          {/* Shield symbol overlay */}
          <path
            d="M 60 48 L 68 52 L 68 62 Q 68 68 60 72 Q 52 68 52 62 L 52 52 Z"
            fill="none"
            stroke="#10b981"
            strokeWidth="1.5"
            opacity="0.5"
          />

          {/* "8" badge for 8 agents */}
          <circle cx="75" cy="45" r="8" fill="#065f46" stroke="#10b981" strokeWidth="1.5" />
          <text
            x="75"
            y="49"
            textAnchor="middle"
            fill="#f9fafb"
            fontSize="10"
            fontWeight="bold"
            fontFamily="Space Grotesk, sans-serif"
          >
            8
          </text>
        </svg>
      </div>
      
      {showText && (
        <span className="text-xl tracking-tight text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          OctoDefender
        </span>
      )}
    </div>
  );
};
