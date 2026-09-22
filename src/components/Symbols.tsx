export function Seed({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.7 3.4C11.1 3.8 4.5 10 5.1 16.2c.5 4.4 5.8 5.6 9.2 2.2 3.7-3.7 4.8-10 3.4-15Z" />
    </svg>
  );
}
export function Fruit({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 430"
      fill="none"
      aria-label="용과 단면 심볼"
      role="img"
    >
      <defs>
        <linearGradient
          id="rind"
          x1="58"
          y1="95"
          x2="331"
          y2="373"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#ff8abe" />
          <stop offset=".45" stopColor="#ee448c" />
          <stop offset="1" stopColor="#962561" />
        </linearGradient>
        <linearGradient
          id="flesh"
          x1="96"
          y1="83"
          x2="292"
          y2="344"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fffaf0" />
          <stop offset="1" stopColor="#e9dace" />
        </linearGradient>
        <filter id="fruitShadow">
          <feDropShadow
            dx="0"
            dy="16"
            stdDeviation="14"
            floodColor="#000"
            floodOpacity=".22"
          />
        </filter>
      </defs>
      <g filter="url(#fruitShadow)" transform="rotate(-19 200 230)">
        <path
          d="m153 109-4-62 40 35 45-51 9 62 59-16-24 49 71 13-39 42 48 45-48 15 27 69-61-5-8 66-43-29-38 38-16-57-62 21 10-58-60-17 46-42-44-48 55-9-13-62Z"
          fill="#a43473"
        />
        <path
          d="M191 74C275 74 324 143 322 236c-1 92-61 157-133 157-79 0-135-69-129-159 7-96 56-160 131-160Z"
          fill="url(#rind)"
        />
        <path
          d="M190 94c69 0 115 61 115 141-1 80-53 141-116 141-69 0-118-63-112-141 6-82 49-141 113-141Z"
          fill="url(#flesh)"
        />
        <path
          d="M185 106c-56 3-93 64-97 126"
          stroke="white"
          strokeOpacity=".8"
          strokeWidth="5"
          strokeLinecap="round"
        />
        {Array.from({ length: 41 }, (_, i) => {
          const angle = i * 2.4;
          const r = 22 + Math.sqrt(i) * 12;
          const x = 190 + Math.cos(angle) * r * 0.82,
            y = 236 + Math.sin(angle) * r * 1.2;
          return (
            <ellipse
              key={i}
              cx={x}
              cy={y}
              rx={2.8 + (i % 2) * 0.5}
              ry={5}
              transform={`rotate(${i * 37} ${x} ${y})`}
              fill="#241a28"
            />
          );
        })}
      </g>
    </svg>
  );
}
export function EnemySymbol({ kind }: { kind: string }) {
  return (
    <div
      className={`enemy-symbol enemy-${kind.toLowerCase().replaceAll(" ", "-")} ${kind === "THE SPLITTER" ? "splitter" : ""}`}
      aria-hidden="true"
    >
      <div className="orbit" />
      <img
        className="enemy-art"
        src="/art/black-seed.webp"
        alt=""
        width="512"
        height="512"
      />
      {kind === "THE SPLITTER" && <i />}
    </div>
  );
}
