let context: AudioContext | undefined;
export function sound(
  kind: "tile" | "attack" | "ripe" | "win",
  enabled: boolean,
) {
  if (!enabled) return;
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    const start = context.currentTime;
    const notes =
      kind === "tile"
        ? [440]
        : kind === "ripe"
          ? [660, 880, 1100]
          : kind === "win"
            ? [440, 550, 660, 880]
            : [220, 440];
    notes.forEach((frequency, i) => {
      const osc = context!.createOscillator(),
        gain = context!.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.06, start + i * 0.06 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + i * 0.06 + 0.14);
      osc.connect(gain);
      gain.connect(context!.destination);
      osc.start(start + i * 0.06);
      osc.stop(start + i * 0.06 + 0.15);
    });
  } catch {
    /* Optional audio must never stop play. */
  }
}
