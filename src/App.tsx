import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  AudioLines,
  Bug,
  Check,
  ChevronLeft,
  Code2,
  GitBranch,
  HelpCircle,
  Leaf,
  Maximize2,
  Pause,
  RotateCcw,
  Scissors,
  Shuffle,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import Board from "./components/Board";
import Modal from "./components/Modal";
import Home, { GameLogo, WorldDecor } from "./components/Home";
import { EnemySymbol, Seed } from "./components/Symbols";
import {
  AbilityCard,
  mutationDescriptions,
  RipeGuide,
  roman,
  Seeds,
} from "./components/Cards";
import {
  ABILITIES,
  ABILITY_IDS,
  acquire,
  bonus,
  pruneDraft,
  isPattern,
} from "./game/abilities";
import { generateBoard } from "./game/board";
import { rerollBoard, swapTiles } from "./game/battle";
import { bestSequence } from "./game/damage";
import { ENEMIES } from "./game/enemies";
import { extendPath } from "./game/path";
import {
  chooseMutation,
  chooseReward,
  fillRipe,
  jumpBoss,
  newRun,
  playAttack,
  rest,
  STAGES,
  victory,
} from "./game/run";
import { sound } from "./game/sound";
import type { AbilityId, Damage, Mutation, Run } from "./game/types";

export default function App() {
  const [run, setRun] = useState<Run>(() => newRun("home"));
  const [path, setPath] = useState<number[]>([]),
    pathRef = useRef<number[]>([]);
  const [busy, setBusy] = useState(false),
    busyRef = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [popping, setPopping] = useState<number[]>([]),
    [invalid, setInvalid] = useState<number | null>(null);
  const [toast, setToast] = useState(""),
    [hit, setHit] = useState<Damage | null>(null),
    [phaseFlash, setPhaseFlash] = useState(false),
    [ripeFlash, setRipeFlash] = useState(false);
  const [help, setHelp] = useState(false),
    [paused, setPaused] = useState(false),
    [audio, setAudio] = useState(false),
    [debug, setDebug] = useState(false);
  const [debugId, setDebugId] = useState<AbilityId>("EVEN"),
    [debugHp, setDebugHp] = useState("180");
  const [swapMode, setSwapMode] = useState(false),
    [swapFirst, setSwapFirst] = useState<number | null>(null);
  const [restMode, setRestMode] = useState<"GROW" | "PRUNE" | "JUICE" | null>(
      null,
    ),
    [pruneId, setPruneId] = useState<AbilityId | null>(null),
    [pruneChoices, setPruneChoices] = useState<AbilityId[]>([]);
  const [expandedBuild, setExpandedBuild] = useState(false);
  const b = run.battle,
    enemy = ENEMIES[b.enemy],
    inBattle = run.screen === "battle";
  const preview = bestSequence(
    b.board,
    path,
    run.abilities,
    run.mutation,
    b.lastDifference,
    b.echo,
  );
  const ripePreview = preview?.damage.lines.some((l) => l.ripe) ?? false;
  const mutation = run.mutation;
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    if (invalid === null) return;
    const id = setTimeout(() => setInvalid(null), 220);
    return () => clearTimeout(id);
  }, [invalid]);
  useEffect(() => {
    if (!hit) return;
    const id = setTimeout(() => setHit(null), 1000);
    return () => clearTimeout(id);
  }, [hit]);
  useEffect(() => {
    if (!phaseFlash) return;
    const id = setTimeout(() => setPhaseFlash(false), 850);
    return () => clearTimeout(id);
  }, [phaseFlash]);
  useEffect(() => {
    if (!ripeFlash) return;
    const id = setTimeout(() => setRipeFlash(false), 300);
    return () => clearTimeout(id);
  }, [ripeFlash]);
  const clearPath = () => {
    pathRef.current = [];
    setPath([]);
  };
  const restart = () => {
    if (timer.current) clearTimeout(timer.current);
    busyRef.current = false;
    setBusy(false);
    clearPath();
    setPopping([]);
    setRun(newRun());
    setPaused(false);
    setToast("");
    setHit(null);
    setSwapMode(false);
    setSwapFirst(null);
    setRestMode(null);
    setPruneId(null);
    setExpandedBuild(false);
  };
  const add = (i: number) => {
    if (!inBattle || busyRef.current || swapMode) return;
    const old = pathRef.current,
      next = extendPath(b.board, old, i, b.crack);
    if (next === old) {
      if (i !== old.at(-1) && !old.includes(i)) {
        setInvalid(i);
        navigator.vibrate?.(8);
      }
      return;
    }
    pathRef.current = next;
    setPath(next);
    if (next.length > old.length) sound("tile", audio);
  };
  const start = (i: number) => {
    if (busyRef.current || !inBattle) return;
    if (swapMode) {
      if (b.board[i].locked) return;
      if (swapFirst === null) {
        setSwapFirst(i);
        return;
      }
      if (swapFirst === i) {
        setSwapFirst(null);
        return;
      }
      setRun((r) => ({ ...r, battle: swapTiles(r.battle, swapFirst, i) }));
      setSwapFirst(null);
      setSwapMode(false);
      setToast("SWAP · 두 숫자를 교환했습니다");
      return;
    }
    clearPath();
    add(i);
  };
  const commit = () => {
    if (busyRef.current || swapMode || !inBattle) return;
    const result = playAttack(run, pathRef.current);
    if (!result) {
      clearPath();
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setPopping(result.removed);
    setHit(result.damage);
    if (result.damage.lines.some((l) => l.ripe)) setRipeFlash(true);
    sound(result.damage.ripeIds.length ? "ripe" : "attack", audio);
    navigator.vibrate?.(result.damage.ripeIds.length ? [15, 20, 30] : 12);
    timer.current = setTimeout(() => {
      setRun(result.run);
      clearPath();
      setPopping([]);
      busyRef.current = false;
      setBusy(false);
      if (result.battle.phase !== b.phase) setPhaseFlash(true);
      if (result.ready.length) setToast(`RIPE! · ${result.ready.join(" + ")}`);
      else if (result.battle.notice) setToast(result.battle.notice);
      if (result.won) sound("win", audio);
    }, 260);
  };
  const choose = (id: AbilityId) => {
    clearPath();
    setRun((r) => chooseReward(r, id));
    setToast(
      `${id} ${run.abilities.some((a) => a.id === id) ? "LEVEL UP" : "획득"}`,
    );
  };
  const finishRest = (
    kind: "GROW" | "PRUNE" | "JUICE",
    id: AbilityId,
    replacement?: AbilityId,
  ) => {
    setRun((r) => rest(r, kind, id, replacement));
    setRestMode(null);
    setPruneId(null);
  };
  const debugChange = (fn: (r: Run) => Run) => {
    if (busyRef.current) return;
    clearPath();
    setSwapMode(false);
    setSwapFirst(null);
    setRun(fn);
  };
  const home = run.screen === "home";
  const showProgressModal = [
    "reward",
    "mutation",
    "rest",
    "over",
    "clear",
  ].includes(run.screen);
  return (
    <div
      className={`app ${home ? "home-view" : "game-view"} ${phaseFlash ? "phase-flash" : ""} ${toast.startsWith("RIPE") ? "ripe-ready" : ""} ${ripeFlash ? "ripe-flash" : ""}`}
    >
      <WorldDecor />
      <header className="app-header">
        <button
          className="wordmark"
          aria-label="시퀀스팡3 메인"
          onClick={() => (home ? undefined : setPaused(true))}
        >
          <GameLogo small />
          <span className="brand-mark">
            <Seed />
            <Seed />
            <Seed />
          </span>
          <span>
            SEQUENCE
            <span className="brand-pang">
              PANG<span className="brand-three">3</span>
            </span>
          </span>
        </button>
        <span className="edition">
          DRAGON FRUIT EDITION <i /> VOL. 03
        </span>
        <div className="header-actions">
          <button
            className="icon-button"
            aria-label={audio ? "사운드 끄기" : "사운드 켜기"}
            onClick={() => {
              setAudio(!audio);
              sound("tile", !audio);
            }}
          >
            {audio ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            className="icon-button"
            aria-label="플레이 방법"
            onClick={() => setHelp(true)}
          >
            <HelpCircle size={19} />
          </button>
          {!home && (
            <button
              className="icon-button"
              aria-label="일시 정지"
              onClick={() => setPaused(true)}
            >
              <Pause size={18} />
            </button>
          )}
        </div>
      </header>
      {home ? (
        <Home
          onPlay={restart}
          onHelp={() => setHelp(true)}
          audio={audio}
          onSound={() => {
            setAudio(!audio);
            sound("tile", !audio);
          }}
        />
      ) : (
        <main className="game-layout">
          <aside className="journey-panel">
            <div className="section-label">
              <span>YOUR RUN</span>
              <span>0{run.stage} / 07</span>
            </div>
            <h2>
              작은 씨앗에서
              <br />
              강력한 한 수로.
            </h2>
            <nav className="stage-list" aria-label="런 진행">
              {STAGES.map((name, i) => (
                <div
                  key={name}
                  className={`stage-item ${i + 1 === run.stage ? "current" : ""} ${i + 1 < run.stage ? "complete" : ""}`}
                >
                  <span className="stage-dot">
                    {i + 1 < run.stage ? (
                      <Check size={12} />
                    ) : i + 1 === run.stage ? (
                      <Seed />
                    ) : (
                      String(i + 1).padStart(2, "0")
                    )}
                  </span>
                  <span>
                    {name}
                    <small>
                      {i === 2
                        ? "새로운 가능성"
                        : i === 5
                          ? "보스 전 마지막 준비"
                          : i === 6
                            ? "최종 보스"
                            : i === 3
                              ? "엘리트 전투"
                              : "일반 전투"}
                    </small>
                  </span>
                  {i + 1 === run.stage && <span className="current-dot" />}
                </div>
              ))}
            </nav>
            <div className="journey-note">
              <Seed />
              <p>
                같은 숫자도,
                <br />
                다른 빌드에서는 새로운 기회.
              </p>
            </div>
          </aside>
          <section className="play-area" aria-label="전투">
            <div className="battle-heading">
              <span className="eyebrow">
                STAGE {String(run.stage).padStart(2, "0")}{" "}
                <span className="stage-slash">/ 07</span>
              </span>
              <span className="battle-kind">
                {run.stage === 4
                  ? "ELITE"
                  : run.stage === 7
                    ? `BOSS · PHASE ${b.phase === 1 ? "I" : "II"}`
                    : "ENCOUNTER"}
              </span>
            </div>
            <div className="enemy-row">
              <EnemySymbol kind={b.enemy} />
              <div className="enemy-info">
                <span className="mini-label">{enemy.subtitle}</span>
                <h1>{b.enemy}</h1>
                <div className="hp-heading">
                  <span>ENEMY HP</span>
                  <span>
                    <strong>{b.hp}</strong> / {enemy.hp}
                  </span>
                </div>
                <div className="hp-bar">
                  <div
                    style={{
                      width: `${Math.min(100, (b.hp / enemy.hp) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div
                className={`turn-display ${enemy.turns - b.turn <= 2 ? "last-turns" : ""}`}
              >
                <span>TURN</span>
                <strong>{String(enemy.turns - b.turn).padStart(2, "0")}</strong>
                <span>LEFT / {enemy.turns}</span>
              </div>
            </div>
            <div className="battle-description">
              {b.enemy === "SEED" ? (
                <>
                  <span className="small-dot" /> 숫자 3개 이상을 같은 간격으로
                  연결하세요
                </>
              ) : (
                enemy.description
              )}
            </div>
            <div
              className={`sequence-preview ${preview ? "has-preview" : ""}`}
              aria-live="polite"
            >
              <div>
                {swapMode ? (
                  <>
                    <Shuffle size={17} />
                    <span>
                      {swapFirst === null
                        ? "바꿀 첫 번째 타일을 선택하세요"
                        : "두 번째 타일을 선택하세요"}
                    </span>
                  </>
                ) : path.length ? (
                  <>
                    <span className="sequence-values">
                      {preview
                        ? preview.sequence.values.join(" → ")
                        : path
                            .map((i) =>
                              b.board[i].wild ? "?" : b.board[i].value,
                            )
                            .join(" → ")}
                    </span>
                    <span className="difference">
                      {preview
                        ? `D = ${preview.sequence.difference > 0 ? "+" : ""}${preview.sequence.difference}`
                        : "KEEP CONNECTING"}
                    </span>
                  </>
                ) : (
                  <>
                    <GitBranch size={17} />
                    <span>어떤 수열을 터뜨릴까요?</span>
                  </>
                )}
              </div>
              <span className="preview-total">
                {preview ? (
                  <>
                    <strong>{preview.damage.total}</strong> DMG
                  </>
                ) : (
                  <span>DRAG TO CONNECT</span>
                )}
              </span>
            </div>
            <div className="board-area">
              <Board
                board={b.board}
                path={path}
                crack={b.crack}
                disabled={!inBattle || busy || paused || help}
                popping={popping}
                ripe={ripePreview}
                invalid={invalid}
                swap={swapFirst}
                onStart={start}
                onAdd={add}
                onEnd={commit}
                onCancel={clearPath}
                onKeyboard={(i) => (swapMode ? start(i) : add(i))}
              />
              {hit && (
                <div
                  className={`damage-float ${hit.lines.some((l) => l.ripe) ? "ripe-hit" : ""}`}
                  key={run.stats.attacks}
                >
                  <span>
                    {hit.lines
                      .filter((l) => l.name !== "DOUBLE CORE")
                      .map((l) => l.name + (l.ripe ? " RIPE!" : "!"))
                      .join(" · ") || "NICE SEQUENCE"}
                  </span>
                  <strong>{hit.total}</strong>
                </div>
              )}
            </div>
            <div className="damage-breakdown">
              {preview ? (
                <>
                  <span>
                    BASE <b>{preview.damage.base}</b>
                  </span>
                  {preview.damage.lines.map((l) => (
                    <span className={l.ripe ? "pink" : ""} key={l.name}>
                      {l.name} <b>+{l.amount}</b>
                    </span>
                  ))}
                </>
              ) : (
                <>
                  <span>↗ 대각선 연결 가능</span>
                  <span>3개부터 공격 · 같은 숫자 제외</span>
                </>
              )}
            </div>
            <div className="board-footer">
              <span>
                <span className="small-dot" />
                {busy
                  ? "POPPING…"
                  : swapMode
                    ? "SWAP MODE"
                    : "FIND YOUR SEQUENCE"}
              </span>
              <div className="utility-actions">
                {run.abilities.some((a) => a.id === "SWAP") && (
                  <button
                    disabled={!inBattle || busy || b.usedSwap}
                    className={swapMode ? "active" : ""}
                    onClick={() => {
                      clearPath();
                      setSwapMode(!swapMode);
                      setSwapFirst(null);
                    }}
                    aria-label="SWAP 두 타일 교환"
                    title="두 타일 교환"
                  >
                    <Shuffle size={16} />
                    <span>SWAP</span>
                    <small>{b.usedSwap ? "0" : "1"}/1</small>
                  </button>
                )}
                {run.abilities.some((a) => a.id === "REROLL") && (
                  <button
                    disabled={!inBattle || busy || b.usedReroll}
                    onClick={() => {
                      clearPath();
                      setSwapMode(false);
                      setSwapFirst(null);
                      setRun((r) => ({ ...r, battle: rerollBoard(r.battle) }));
                    }}
                    aria-label="REROLL 보드 새로고침"
                    title="새 보드"
                  >
                    <RotateCcw size={16} />
                    <span>REROLL</span>
                    <small>{b.usedReroll ? "0" : "1"}/1</small>
                  </button>
                )}
              </div>
            </div>
            {path.length >= 3 && !busy && (
              <button className="keyboard-commit" onClick={commit}>
                선택 확정 <ArrowRight size={14} />
              </button>
            )}
          </section>
          <aside className={`build-panel ${expandedBuild ? "expanded" : ""}`}>
            <div className="section-label">
              <span>
                YOUR BUILD{" "}
                <span className="count">
                  {run.abilities.length.toString().padStart(2, "0")}
                </span>
              </span>
              <button
                className="icon-button expand-build"
                aria-label={expandedBuild ? "빌드 접기" : "빌드 펼치기"}
                onClick={() => setExpandedBuild(!expandedBuild)}
              >
                <Maximize2 size={15} />
              </button>
              <Seed />
            </div>
            <div className="build-list">
              {run.abilities.length ? (
                run.abilities.map((a) => (
                  <div
                    key={a.id}
                    className={`build-item ${preview?.damage.matched.includes(a.id) ? "matching" : ""} ${a.ripe === 3 || a.lingering ? "is-ripe" : ""}`}
                    title={`${ABILITIES[a.id].detail}${isPattern(a.id) ? ` · +${Math.round(bonus(a) * 100)}%` : ""}`}
                  >
                    <span className="ability-glyph">
                      {a.id === "ECHO" ? (
                        <AudioLines size={21} />
                      ) : a.id === "BURST" ? (
                        <Sparkles size={21} />
                      ) : a.id === "SWAP" ? (
                        <Shuffle size={21} />
                      ) : a.id === "REROLL" ? (
                        <RotateCcw size={21} />
                      ) : (
                        <Seed />
                      )}
                    </span>
                    <div>
                      <strong>
                        {a.id}{" "}
                        <small>{isPattern(a.id) ? roman[a.level] : ""}</small>
                      </strong>
                      <span className="ability-description">
                        {isPattern(a.id)
                          ? `${ABILITIES[a.id].description.split(" · ")[0]} · +${Math.round(bonus(a) * 100)}%`
                          : ABILITIES[a.id].description}
                      </span>
                    </div>
                    {isPattern(a.id) ? (
                      <div className="build-ripe">
                        <Seeds value={a.ripe} />
                        <small>
                          {a.ripe === 3
                            ? "RIPE!"
                            : a.lingering
                              ? "JUICY"
                              : `${a.ripe} / 3`}
                        </small>
                      </div>
                    ) : (
                      <span className="effect-badge">
                        {ABILITIES[a.id].category === "Utility"
                          ? (a.id === "SWAP" ? b.usedSwap : b.usedReroll)
                            ? "0/1"
                            : "1/1"
                          : "ON"}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty-build">
                  <div className="empty-seeds">
                    <Seed />
                    <Seed />
                    <Seed />
                  </div>
                  <strong>가능성의 씨앗</strong>
                  <p>
                    첫 전투를 이기고
                    <br />
                    나만의 능력을 선택하세요.
                  </p>
                  <span>YOUR FIRST SEED AWAITS</span>
                </div>
              )}
            </div>
            {mutation && (
              <div className="mutation-badge">
                <GitBranch size={19} />
                <div>
                  <span>MUTATION</span>
                  <strong>{mutation}</strong>
                  <p>{mutationDescriptions[mutation]}</p>
                </div>
              </div>
            )}
            <RipeGuide />
          </aside>
        </main>
      )}
      <footer className="app-footer">
        <span>
          SEQUENCE PANG <span className="muted">/</span> 03
        </span>
        <span>
          {home ? "CONNECT. GROW. POP." : "EVERY SEQUENCE IS A POSSIBILITY."}
        </span>
        {import.meta.env.DEV && (
          <button className="debug-toggle" onClick={() => setDebug(!debug)}>
            <Bug size={13} /> DEBUG
          </button>
        )}
      </footer>
      {toast && (
        <div
          className={`toast ${toast.startsWith("RIPE") ? "ripe-toast" : ""}`}
          role="status"
        >
          <Sparkles size={17} />
          {toast}
        </div>
      )}
      {phaseFlash && (
        <div className="phase-banner">
          PHASE II <span>보드가 다시 갈라집니다</span>
        </div>
      )}
      {help && (
        <Modal label="플레이 방법" onClose={() => setHelp(false)}>
          <button
            className="modal-close icon-button"
            aria-label="닫기"
            onClick={() => setHelp(false)}
          >
            <X />
          </button>
          <span className="eyebrow">HOW TO PLAY</span>
          <h2>잇고. 키우고. 터뜨리세요.</h2>
          <div className="help-example">
            <span>2</span>
            <ArrowRight />
            <span>4</span>
            <ArrowRight />
            <span>6</span>
          </div>
          <div className="help-steps">
            <p>
              <b>01 · CONNECT</b>인접한 숫자를 3개 이상, 같은 간격으로
              연결하세요. 대각선과 꺾인 경로도 가능해요.
            </p>
            <p>
              <b>02 · BUILD</b>손을 떼면 공격! 적을 이기고 능력을 얻으세요. 여러
              능력의 조건을 함께 맞출수록 강해집니다.
            </p>
            <p>
              <b>03 · RIPE</b>Pattern 조건을 3번 채우면 RIPE. 다음에 조건을 맞출
              때 보너스가 2배로 터집니다.
            </p>
          </div>
          <p className="help-note">
            되돌리기: 직전 타일로 이동 · 키보드: 방향키 이동, Space 선택, 선택
            확정 버튼으로 공격 · 취소: Esc
          </p>
          <button className="primary-button" onClick={() => setHelp(false)}>
            알겠어요 <ArrowRight size={18} />
          </button>
        </Modal>
      )}
      {paused && !help && (
        <Modal label="일시 정지" onClose={() => setPaused(false)}>
          <span className="eyebrow">TAKE YOUR TIME</span>
          <h2>다음 한 수를 생각할 시간.</h2>
          <p className="modal-subtitle">
            제한 시간은 없어요. 천천히 찾아보세요.
          </p>
          <button className="primary-button" onClick={() => setPaused(false)}>
            계속 플레이 <ArrowRight size={18} />
          </button>
          <button
            className="text-button"
            onClick={() => {
              setPaused(false);
              setRun((r) => ({ ...r, screen: "home" }));
            }}
          >
            런을 종료하고 메인으로
          </button>
        </Modal>
      )}
      {showProgressModal && !paused && !help && (
        <Modal
          label={
            run.screen === "reward"
              ? "능력 선택"
              : run.screen === "mutation"
                ? "Mutation 선택"
                : run.screen === "rest"
                  ? "휴식"
                  : run.screen === "clear"
                    ? "런 클리어"
                    : "런 종료"
          }
        >
          {run.screen === "reward" && (
            <>
              <span className="eyebrow">
                <Check size={15} /> STAGE {String(run.stage).padStart(2, "0")}{" "}
                CLEAR
              </span>
              <h2>
                CHOOSE A SEED<span className="pink">.</span>
              </h2>
              <p className="modal-subtitle">다음 수열의 가능성을 키워보세요.</p>
              <div className="choice-grid">
                {run.rewards.map((id) => (
                  <AbilityCard
                    key={id}
                    id={id}
                    owned={run.abilities.find((a) => a.id === id)}
                    rare={run.stage === 4}
                    onClick={() => choose(id)}
                  />
                ))}
              </div>
              <div className="modal-footnote">
                하나를 선택하세요 <span>다음 · {STAGES[run.stage]}</span>
              </div>
            </>
          )}
          {run.screen === "mutation" && (
            <>
              <span className="eyebrow">
                <GitBranch size={16} /> STAGE 03 · MUTATION
              </span>
              <h2>
                A DIFFERENT KIND
                <br />
                OF GROWTH<span className="pink">.</span>
              </h2>
              <p className="modal-subtitle">런 전체를 바꿀, 하나의 변이.</p>
              <div className="choice-grid mutation-choices">
                {(["JUICY", "DOUBLE CORE", "WILD"] as Mutation[]).map(
                  (id, i) => (
                    <button
                      className="choice-card"
                      key={id}
                      onClick={() => setRun((r) => chooseMutation(r, id))}
                    >
                      <span className="mutation-icon">
                        {i === 0 ? (
                          <Leaf />
                        ) : i === 1 ? (
                          <GitBranch />
                        ) : (
                          <span>?</span>
                        )}
                      </span>
                      <strong>{id}</strong>
                      <span className="card-description">
                        {mutationDescriptions[id]}
                      </span>
                      <span className="card-bottom">
                        PERMANENT <ArrowRight size={16} />
                      </span>
                    </button>
                  ),
                )}
              </div>
            </>
          )}
          {run.screen === "rest" && (
            <>
              <span className="eyebrow">
                <Leaf size={16} /> STAGE 06 · A MOMENT TO GROW
              </span>
              <h2>준비됐나요, 마지막 한 수.</h2>
              <p className="modal-subtitle">
                보스전에 가져갈 작은 차이를 선택하세요.
              </p>
              {!restMode ? (
                <div className="choice-grid">
                  {(["GROW", "PRUNE", "JUICE"] as const).map((id, i) => (
                    <button
                      className="choice-card"
                      key={id}
                      disabled={
                        id === "GROW"
                          ? !run.abilities.some(
                              (a) => isPattern(a.id) && a.level < 3,
                            )
                          : id === "JUICE"
                            ? !run.abilities.some((a) => isPattern(a.id))
                            : false
                      }
                      onClick={() => setRestMode(id)}
                    >
                      <span className="mutation-icon">
                        {i === 0 ? (
                          <Leaf />
                        ) : i === 1 ? (
                          <Scissors />
                        ) : (
                          <Sparkles />
                        )}
                      </span>
                      <strong>{id}</strong>
                      <span className="card-description">
                        {i === 0
                          ? "Pattern 하나의 레벨 +1"
                          : i === 1
                            ? "능력 하나를 제거하고 새 능력 2택1"
                            : "Pattern 하나를 RIPE 2/3로 준비"}
                      </span>
                      <span className="card-bottom">
                        SELECT <ArrowRight size={16} />
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <button
                    className="text-button back-button"
                    onClick={() => {
                      setRestMode(null);
                      setPruneId(null);
                    }}
                  >
                    <ChevronLeft size={16} /> 다시 선택
                  </button>
                  {restMode === "PRUNE" && pruneId ? (
                    <>
                      <p className="modal-subtitle">{pruneId} 대신 받을 능력</p>
                      <div className="choice-grid two">
                        {pruneChoices.map((id) => (
                          <AbilityCard
                            key={id}
                            id={id}
                            owned={run.abilities.find((a) => a.id === id)}
                            onClick={() => finishRest("PRUNE", pruneId, id)}
                          />
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="rest-targets">
                      {run.abilities
                        .filter(
                          (a) =>
                            restMode === "PRUNE" ||
                            (isPattern(a.id) &&
                              (restMode !== "GROW" || a.level < 3)),
                        )
                        .map((a) => (
                          <button
                            key={a.id}
                            className="rest-target"
                            onClick={() => {
                              if (restMode === "PRUNE") {
                                setPruneId(a.id);
                                setPruneChoices(
                                  pruneDraft(run.abilities, a.id),
                                );
                              } else finishRest(restMode, a.id);
                            }}
                          >
                            <Seed />
                            <strong>
                              {a.id} {roman[a.level]}
                            </strong>
                            <span>
                              {restMode === "GROW"
                                ? `→ ${roman[a.level + 1]}`
                                : restMode === "JUICE"
                                  ? "→ ● ● ○"
                                  : "교체하기"}
                            </span>
                            <ArrowRight size={17} />
                          </button>
                        ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
          {(run.screen === "clear" || run.screen === "over") && (
            <>
              <span className="result-icon">
                {run.screen === "clear" ? <Sparkles /> : <Seed />}
              </span>
              <span className="eyebrow">
                {run.screen === "clear"
                  ? "THE FINAL SEED HAS FALLEN"
                  : `STAGE ${run.stage} / 7`}
              </span>
              <h2 className="result-title">
                RUN {run.screen === "clear" ? "CLEAR" : "OVER"}
                <span className="pink">.</span>
              </h2>
              <p className="modal-subtitle">
                {run.screen === "clear"
                  ? "당신만의 수열로, 끝까지."
                  : "다음 씨앗에는 다른 가능성이 있어요."}
              </p>
              <div className="stats-grid">
                <div>
                  <strong>{run.stats.highestDamage}</strong>
                  <span>최고 데미지</span>
                </div>
                <div>
                  <strong>{run.stats.longest}</strong>
                  <span>가장 긴 수열</span>
                </div>
                <div>
                  <strong>{run.stats.ripeCount}</strong>
                  <span>RIPE 발동</span>
                </div>
              </div>
              <span className="section-label">FINAL BUILD</span>
              <div className="final-build">
                {run.abilities.length ? (
                  run.abilities.map((a) => (
                    <span key={a.id}>
                      <Seed />
                      {a.id} {roman[a.level]}
                    </span>
                  ))
                ) : (
                  <span>아직 획득한 능력이 없어요</span>
                )}
                {mutation && <span className="pink">{mutation}</span>}
              </div>
              <button className="primary-button" onClick={restart}>
                {run.screen === "clear" ? "PLAY AGAIN" : "RETRY"}
                <RotateCcw size={19} />
              </button>
            </>
          )}
        </Modal>
      )}
      {debug && import.meta.env.DEV && (
        <section className="debug-panel" aria-label="Debug">
          <div>
            <strong>
              <Code2 size={16} /> PLAYTEST TOOLS
            </strong>
            <button
              className="icon-button"
              aria-label="Debug 닫기"
              onClick={() => setDebug(false)}
            >
              <X size={16} />
            </button>
          </div>
          <div className="debug-buttons">
            <button
              disabled={busy || !inBattle}
              onClick={() => debugChange(victory)}
            >
              전투 즉시 승리
            </button>
            <button disabled={busy} onClick={() => debugChange(fillRipe)}>
              RIPE 채우기
            </button>
            <button disabled={busy} onClick={() => debugChange(jumpBoss)}>
              보스전
            </button>
            <button
              disabled={busy}
              onClick={() =>
                debugChange((r) => ({
                  ...r,
                  battle: {
                    ...r.battle,
                    board: generateBoard(
                      Math.random,
                      r.mutation === "WILD",
                      r.battle.crack,
                    ),
                  },
                }))
              }
            >
              보드 재생성
            </button>
          </div>
          <div className="debug-input">
            <select
              aria-label="추가할 능력"
              value={debugId}
              onChange={(e) => setDebugId(e.target.value as AbilityId)}
            >
              {ABILITY_IDS.map((id) => (
                <option key={id}>{id}</option>
              ))}
            </select>
            <button
              disabled={busy}
              onClick={() =>
                debugChange((r) => ({
                  ...r,
                  abilities: acquire(r.abilities, debugId),
                }))
              }
            >
              능력 추가
            </button>
          </div>
          <div className="debug-input">
            <input
              type="number"
              aria-label="적 HP"
              min="1"
              value={debugHp}
              onChange={(e) => setDebugHp(e.target.value)}
            />
            <button
              disabled={busy || !inBattle}
              onClick={() =>
                debugChange((r) => ({
                  ...r,
                  battle: {
                    ...r.battle,
                    hp: Math.max(1, Math.min(9999, Number(debugHp) || 1)),
                  },
                }))
              }
            >
              HP 설정
            </button>
          </div>
          <output>
            {JSON.stringify(
              {
                path,
                values: preview?.sequence.values,
                d: preview?.sequence.difference,
                damage: preview?.damage.total,
                matched: preview?.damage.matched,
                ripe: preview?.damage.ripeIds,
              },
              null,
              2,
            )}
          </output>
        </section>
      )}
    </div>
  );
}
