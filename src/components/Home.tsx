import {
  Crown,
  HelpCircle,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Fruit, Seed } from "./Symbols";

export function GameLogo({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`game-logo ${small ? "small" : ""}`}
      aria-label="시퀀스팡3"
    >
      <span>시퀀스</span>
      <span className="logo-pang">
        <Crown aria-hidden="true" />팡
      </span>
      <b>3</b>
    </span>
  );
}

export function WorldDecor() {
  return (
    <div className="world-decor" aria-hidden="true">
      <div className="world-glow" />
      {Array.from({ length: 16 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37 + 7) % 100}%`,
            top: `${(i * 23 + 9) % 100}%`,
            animationDelay: `${i % 5}s`,
          }}
        />
      ))}
      <Fruit className="edge-fruit fruit-left" />
      <Fruit className="edge-fruit fruit-right" />
      <Fruit className="edge-fruit fruit-bottom" />
    </div>
  );
}

export default function Home({
  onPlay,
  onHelp,
  onSound,
  audio,
}: {
  onPlay: () => void;
  onHelp: () => void;
  onSound: () => void;
  audio: boolean;
}) {
  return (
    <main className="home-poster">
      <div className="poster-title">
        <span className="edition-pill"><Seed /> 용과 에디션</span>
        <h1>
          <GameLogo />
        </h1>
        <p className="logo-english">SEQUENCE PANG 3</p>
      </div>
      <div className="mascot-stage">
        <div className="mascot-halo" />
        <img
          className="mascot-art"
          src="/art/dragon-mascot.webp"
          alt="용과 위에서 신나게 뛰는 분홍 용과 캐릭터"
          fetchPriority="high"
          width="1024"
          height="1024"
        />
        <span className="poster-tile poster-one">
          2<Seed />
        </span>
        <span className="poster-tile poster-two">
          4<Seed />
        </span>
        <span className="poster-tile poster-three">
          6<Seed />
        </span>
        <span className="poster-sparkle sparkle-a">✦</span>
        <span className="poster-sparkle sparkle-b">✧</span>
      </div>
      <div className="poster-controls">
        <button className="candy-play" onClick={onPlay}>
          <Play fill="currentColor" />
          <span>시작하기</span>
        </button>
        <div className="poster-secondary">
          <button onClick={onHelp}>
            <HelpCircle size={19} />
            도움말
          </button>
          <button onClick={onSound}>
            {audio ? <Volume2 size={19} /> : <VolumeX size={19} />}
            소리 {audio ? "켜짐" : "꺼짐"}
          </button>
        </div>
      </div>
    </main>
  );
}
