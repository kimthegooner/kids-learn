export type EnsembleTrack = { id: string; url: string };
export type EnsembleState = {
  status: "idle" | "loading" | "playing" | "paused" | "ended" | "error";
  position: number;
  duration: number;
  activeTracks: number;
  error: string;
};
export const INITIAL_ENSEMBLE: EnsembleState = { status: "idle", position: 0, duration: 0, activeTracks: 0, error: "" };

// Decode the existing performances, then start every part on one audio clock.
// Separate HTML audio elements can drift and cannot share a scheduled start.
export class EnsemblePlayer {
  private context?: AudioContext;
  private master?: GainNode;
  private tracks: EnsembleTrack[] = [];
  private buffers = new Map<string, AudioBuffer>();
  private sources: AudioBufferSourceNode[] = [];
  private gains = new Map<string, GainNode>();
  private volumes: Record<string, number> = {};
  private state: EnsembleState = { ...INITIAL_ENSEMBLE };
  private offset = 0;
  private startedAt = 0;
  private repeat = false;
  private request = 0;
  private pending?: AbortController;
  private ticker?: ReturnType<typeof setInterval>;
  private disposed = false;

  constructor(private changed: (state: EnsembleState) => void) {}

  private position() {
    if (this.state.status !== "playing" || !this.context) return this.offset;
    const elapsed = this.offset + Math.max(0, this.context.currentTime - this.startedAt);
    return this.repeat && this.state.duration > 0 ? elapsed % this.state.duration : Math.min(elapsed, this.state.duration);
  }

  private emit(patch: Partial<EnsembleState> = {}) {
    this.state = { ...this.state, position: this.position(), ...patch };
    if (!this.disposed) this.changed({ ...this.state });
  }

  private halt() {
    this.request++;
    this.pending?.abort();
    this.pending = undefined;
    clearInterval(this.ticker);
    this.ticker = undefined;
    for (const source of this.sources) {
      source.onended = null;
      try { source.stop(); } catch { /* Already ended. */ }
      source.disconnect();
    }
    this.sources = [];
    this.gains.forEach(gain => gain.disconnect());
    this.gains.clear();
  }

  configure(tracks: EnsembleTrack[], duration: number) {
    this.halt();
    this.tracks = tracks;
    this.offset = 0;
    // Keep at most one song's seven performances in memory across selections.
    for (const url of this.buffers.keys()) if (!tracks.some(t => t.url === url)) this.buffers.delete(url);
    this.emit({ status: "idle", position: 0, duration, activeTracks: 0, error: "" });
  }

  setVolumes(volumes: Record<string, number>) {
    this.volumes = volumes;
    this.gains.forEach((gain, id) => gain.gain.setTargetAtTime(this.volume(id), this.context!.currentTime, .02));
  }

  private volume(id: string) { return Math.max(0, Math.min(1, this.volumes[id] ?? .8)); }

  setRepeat(repeat: boolean) {
    this.offset = this.position();
    if (this.context) this.startedAt = this.context.currentTime;
    this.repeat = repeat;
    this.sources.forEach(source => { source.loop = repeat; });
    this.emit();
  }

  async play() {
    if (this.disposed || this.state.status === "playing" || this.state.status === "loading") return;
    if (!this.tracks.length) { this.emit({ status: "error", error: "함께 연주할 악기를 한 가지 이상 골라 주세요." }); return; }
    this.halt();
    const request = this.request;
    const controller = new AbortController();
    this.pending = controller;
    const timeout = setTimeout(() => controller.abort(), 30000);
    this.emit({ status: "loading", error: "" });
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) throw new Error("unsupported");
      if (!this.context) {
        this.context = new AudioContextClass();
        this.master = this.context.createGain();
        this.master.connect(this.context.destination);
      }
      // Called directly by the tap, before fetching or decoding any audio.
      await this.context.resume();
      if (this.disposed || request !== this.request) return;
      if (this.context.state !== "running") throw new Error("blocked");
      const context = this.context;
      const loaded = await Promise.all(this.tracks.map(async track => {
        const cached = this.buffers.get(track.url);
        if (cached) return cached;
        const response = await fetch(track.url, { signal: controller.signal });
        if (!response.ok) throw new Error("file");
        return context.decodeAudioData(await response.arrayBuffer());
      }));
      if (this.disposed || request !== this.request) return;
      if (controller.signal.aborted) throw new Error("timeout");
      loaded.forEach((buffer, i) => this.buffers.set(this.tracks[i].url, buffer));
      this.state.duration = Math.min(...loaded.map(buffer => buffer.duration));
      if (!Number.isFinite(this.state.duration) || this.state.duration <= 0) throw new Error("file");
      if (this.offset >= this.state.duration) this.offset = 0;
      this.start();
    } catch (error) {
      if (this.disposed || request !== this.request) return;
      this.halt();
      const reason = error instanceof Error ? (error.name === "NotAllowedError" ? "blocked" : error.message) : "";
      this.emit({ status: "error", activeTracks: 0, error: reason === "unsupported"
        ? "이 브라우저에서는 합주를 지원하지 않아요. Safari나 Chrome에서 열어 주세요."
        : reason === "blocked" ? "재생 버튼을 한 번 더 눌러 합주를 시작해 주세요."
        : "악기 소리를 모두 불러오지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요." });
    } finally {
      clearTimeout(timeout);
      if (this.pending === controller) this.pending = undefined;
    }
  }

  private start() {
    const context = this.context!;
    const when = context.currentTime + .035;
    this.startedAt = when;
    // Even seven loud parts together retain headroom. Individual sliders remain independent.
    this.master!.gain.setValueAtTime(.85 / this.tracks.length, context.currentTime);
    for (const track of this.tracks) {
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = this.buffers.get(track.url)!;
      source.loop = this.repeat;
      source.loopStart = 0;
      source.loopEnd = this.state.duration;
      gain.gain.setValueAtTime(this.volume(track.id), context.currentTime);
      source.connect(gain);
      gain.connect(this.master!);
      source.onended = () => {
        if (this.repeat || this.state.status !== "playing") return;
        this.halt();
        this.offset = this.state.duration;
        this.emit({ status: "ended", position: this.offset, activeTracks: 0 });
      };
      this.sources.push(source);
      this.gains.set(track.id, gain);
    }
    // Build every part first. No part starts before the complete ensemble is ready.
    this.sources.forEach(source => source.start(when, this.offset));
    this.emit({ status: "playing", activeTracks: this.sources.length });
    this.ticker = setInterval(() => this.emit(), 100);
  }

  pause() {
    if (this.disposed) return;
    this.offset = this.position();
    this.halt();
    this.emit({ status: "paused", position: this.offset, activeTracks: 0 });
  }

  seek(seconds: number) {
    if (this.disposed || this.state.status === "loading") return;
    const wasPlaying = this.state.status === "playing";
    this.halt();
    this.offset = Math.max(0, Math.min(seconds, this.state.duration));
    if (wasPlaying && this.offset < this.state.duration) this.start();
    else this.emit({ status: this.offset >= this.state.duration ? "ended" : "paused", position: this.offset, activeTracks: 0 });
  }

  restart() {
    this.halt();
    this.offset = 0;
    this.emit({ status: "idle", position: 0, activeTracks: 0, error: "" });
  }

  dispose() {
    this.disposed = true;
    this.halt();
    this.buffers.clear();
    this.master?.disconnect();
    void this.context?.close().catch(() => {});
  }
}
