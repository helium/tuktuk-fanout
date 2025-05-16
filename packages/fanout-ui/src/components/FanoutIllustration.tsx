export function FanoutIllustration() {
  return (
    <div className="w-full flex justify-center">
      <svg
        width="600"
        height="300"
        viewBox="0 0 600 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="max-w-full"
      >
        {/* Background Glow */}
        <defs>
          <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
          </radialGradient>
          {/* Flow Marker */}
          <marker
            id="flowArrow"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#4F46E5" />
          </marker>
        </defs>
        <circle cx="300" cy="150" r="140" fill="url(#glow)" />

        {/* Input Token Animation */}
        <g className="animate-pulse">
          <circle cx="300" cy="60" r="16" fill="#4F46E5" fillOpacity="0.2" />
          <circle cx="300" cy="60" r="12" fill="#4F46E5" />
        </g>
        <text
          x="300"
          y="30"
          textAnchor="middle"
          fill="#9CA3AF"
          className="text-sm"
          style={{ fontSize: "14px" }}
        >
          SPL Tokens
        </text>

        {/* Flow Line from Token to Wallet */}
        <path
          d="M300 76 L300 100"
          stroke="#4F46E5"
          strokeWidth="2"
          strokeDasharray="4 4"
          className="animate-dash"
          markerEnd="url(#flowArrow)"
        />

        {/* Fanout Wallet */}
        <rect
          x="250"
          y="100"
          width="100"
          height="50"
          rx="6"
          fill="#1F2937"
          stroke="#4F46E5"
          strokeWidth="2"
        />
        <text
          x="300"
          y="130"
          textAnchor="middle"
          fill="#9CA3AF"
          style={{ fontSize: "14px" }}
        >
          Fanout Wallet
        </text>

        {/* Output Lines with Percentages */}
        <g className="animate-dash">
          <path
            d="M260 150 L180 220"
            stroke="#4F46E5"
            strokeWidth="2"
            strokeDasharray="4 4"
            markerEnd="url(#flowArrow)"
          />
          <text
            x="210"
            y="175"
            textAnchor="middle"
            fill="#9CA3AF"
            style={{ fontSize: "14px" }}
            transform="rotate(-30 210 175)"
          >
            25%
          </text>
        </g>

        <g className="animate-dash">
          <path
            d="M300 150 L300 220"
            stroke="#4F46E5"
            strokeWidth="2"
            strokeDasharray="4 4"
            markerEnd="url(#flowArrow)"
          />
          <text
            x="315"
            y="185"
            textAnchor="start"
            fill="#9CA3AF"
            style={{ fontSize: "14px" }}
          >
            50%
          </text>
        </g>

        <g className="animate-dash">
          <path
            d="M340 150 L420 220"
            stroke="#4F46E5"
            strokeWidth="2"
            strokeDasharray="4 4"
            markerEnd="url(#flowArrow)"
          />
          <text
            x="390"
            y="175"
            textAnchor="middle"
            fill="#9CA3AF"
            style={{ fontSize: "14px" }}
            transform="rotate(30 390 175)"
          >
            25%
          </text>
        </g>

        {/* Output Wallets */}
        <g>
          <rect
            x="150"
            y="220"
            width="80"
            height="40"
            rx="6"
            fill="#1F2937"
            stroke="#4F46E5"
            strokeWidth="2"
          />
          <text
            x="190"
            y="243"
            textAnchor="middle"
            fill="#9CA3AF"
            style={{ fontSize: "14px" }}
          >
            Wallet 1
          </text>
        </g>

        <g>
          <rect
            x="260"
            y="220"
            width="80"
            height="40"
            rx="6"
            fill="#1F2937"
            stroke="#4F46E5"
            strokeWidth="2"
          />
          <text
            x="300"
            y="243"
            textAnchor="middle"
            fill="#9CA3AF"
            style={{ fontSize: "14px" }}
          >
            Wallet 2
          </text>
        </g>

        <g>
          <rect
            x="370"
            y="220"
            width="80"
            height="40"
            rx="6"
            fill="#1F2937"
            stroke="#4F46E5"
            strokeWidth="2"
          />
          <text
            x="410"
            y="243"
            textAnchor="middle"
            fill="#9CA3AF"
            style={{ fontSize: "14px" }}
          >
            Wallet 3
          </text>
        </g>
      </svg>
    </div>
  )
} 