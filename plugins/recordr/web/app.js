// Page of the Recordr plugin.
//
// Three threads share the work, so that listening never depends on this page
// being in front:
//   · worklet.js (audio thread) turns the microphone into 16-bit PCM;
//   · stream.js (worker) sends it to the audio service chosen in the plugin's
//     settings, keeps the connection alive, reconnects, and hands back words;
//   · this file draws them, one block per turn, and saves the transcript.
// A browser slows down the timers of a page in the background; the two others
// are not slowed, and nothing they do waits on this one.
// Links are relative: the page lives under /plugins/<id>/web/.
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  // ---- Language, theme and result bubble: those of the Allkin page around ----

  /** Reads something from the Allkin page, same origin; undefined outside it. */
  function fromHost(read) {
    try {
      return window.parent !== window ? read(window.parent) : undefined;
    } catch {
      return undefined;
    }
  }

  const LOCALES = window.RECORDR_LOCALES;
  const language = (() => {
    const wanted = fromHost((host) => host.I18n?.language) || String(navigator.language || "en").slice(0, 2).toLowerCase();
    return LOCALES[wanted] ? wanted : "en";
  })();
  const locale = fromHost((host) => host.I18n?.locale) || navigator.language || "en";
  const theme = fromHost((host) => host.document.documentElement.dataset.theme);
  if (theme) document.documentElement.dataset.theme = theme;
  document.documentElement.lang = language;

  function t(key, vars = {}) {
    const text = LOCALES[language][key] ?? LOCALES.en[key] ?? key;
    return text.replace(/\{(\w+)\}/g, (whole, name) => (name in vars ? String(vars[name]) : whole));
  }
  const tn = (key, count) => t(`${key}.${count === 1 ? "one" : "other"}`, { count: count.toLocaleString(locale) });

  for (const node of document.querySelectorAll("[data-i18n]")) node.textContent = t(node.dataset.i18n);
  for (const node of document.querySelectorAll("[data-i18n-placeholder]")) node.placeholder = t(node.dataset.i18nPlaceholder);
  for (const node of document.querySelectorAll("[data-i18n-aria-label]")) node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel));
  for (const node of document.querySelectorAll("[data-i18n-title]")) node.title = t(node.dataset.i18nTitle);
  document.title = t("app.title");

  /** The result of an action: Allkin's own bubble when the page is in Allkin. */
  let toastTimer = null;
  function toast(message, ok = true) {
    const hostToast = fromHost((host) => host.Allkin?.core?.toast);
    if (typeof hostToast === "function") {
      hostToast(message, ok ? "ok" : "ko");
      return;
    }
    const node = $("toast");
    node.textContent = message;
    node.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove("visible"), 2500);
  }

  // ---- What the browser remembers of the page: panels, timestamps ----

  const PREFS_KEY = "allkin.plugin.recordr";
  const prefs = (() => {
    try {
      return { history: true, speakers: true, times: true, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") };
    } catch {
      return { history: true, speakers: true, times: true };
    }
  })();
  function savePrefs() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // No storage: the page opens with its defaults next time.
    }
  }

  // ---- State ----

  const emptyTranscript = () => ({ id: null, title: "", startedAt: null, durationMs: 0, language: "", speakers: {}, segments: [] });

  const state = {
    transcript: emptyTranscript(),
    /** Words the provider has not settled on yet: replaced at every message. */
    interim: [],
    /** idle → starting → live ⇄ paused / reconnecting → finishing → idle */
    phase: "idle",
    /** Everything a listening holds: microphone, audio graph, worker, timers. */
    session: null,
    /** The view sticks to the last words until the reader scrolls back. */
    following: true,
    /** The listening was cut and resumed: the next turn starts after a divider. */
    breakNext: false,
    dirty: false,
    saving: false,
  };

  const LISTENING = new Set(["starting", "live", "paused", "reconnecting"]);

  async function api(method, path, body) {
    let response;
    try {
      response = await fetch(path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw { code: "server" };
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw { code: data.code || "server", status: data.status ?? response.status };
    return data;
  }

  // ---- Speakers ----

  /** The voices in order of first appearance: it gives each its number and
   *  its colour, whatever label the provider uses. */
  let order = [];

  function noteSpeaker(key) {
    if (!order.includes(key)) order.push(key);
  }

  function speakerNumber(key) {
    const index = order.indexOf(key);
    return index === -1 ? order.length + 1 : index + 1;
  }

  /** "Speaker 2" until the user gives the real name. */
  const speakerName = (key) => state.transcript.speakers[key] || t("speaker.default", { n: speakerNumber(key) });
  const speakerColor = (key) => `var(--speaker-${((speakerNumber(key) - 1) % 8) + 1})`;

  /** Initials of a given name, the number otherwise. */
  function speakerBadge(key) {
    const name = state.transcript.speakers[key];
    if (!name) return String(speakerNumber(key));
    const words = name.split(/\s+/).filter(Boolean);
    return (words.length > 1 ? words[0][0] + words[1][0] : name[0]).toUpperCase();
  }

  const lastSpeaker = () => state.transcript.segments[state.transcript.segments.length - 1]?.speaker ?? "1";

  function speakerButton(key) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "rc-speaker";
    button.title = t("speaker.rename");
    button.textContent = speakerName(key);
    button.addEventListener("click", () => renameSpeaker(key, button));
    return button;
  }

  function avatar(key) {
    const badge = document.createElement("span");
    badge.className = "rc-avatar";
    badge.textContent = speakerBadge(key);
    return badge;
  }

  function renameSpeaker(key, button) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "rc-speaker-input";
    input.maxLength = 60;
    input.value = state.transcript.speakers[key] ?? "";
    input.placeholder = t("speaker.default", { n: speakerNumber(key) });
    input.setAttribute("aria-label", t("speaker.rename"));
    let done = false;
    const finish = (keep) => {
      if (done) return;
      done = true;
      if (keep) {
        const name = input.value.trim();
        if (name) state.transcript.speakers[key] = name;
        else delete state.transcript.speakers[key];
        markDirty();
      }
      // Taken out first: the panel is not redrawn under a field being typed in.
      input.remove();
      renderAll();
    };
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") finish(true);
      else if (event.key === "Escape") finish(false);
    });
    input.addEventListener("blur", () => finish(true));
    button.replaceWith(input);
    input.focus();
    input.select();
  }

  // ---- Formatting ----

  function clock(ms) {
    const total = Math.max(0, Math.round(ms / 1000));
    const pad = (n) => String(n).padStart(2, "0");
    const hours = Math.floor(total / 3600);
    const rest = `${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
    return hours ? `${hours}:${rest}` : rest;
  }

  const countWords = (text) => (text.trim() ? text.trim().split(/\s+/).length : 0);

  // ---- Transcript: one block per turn ----

  const transcriptEl = $("transcript");
  /** The blocks of the settled segments, in the same order as the segments. */
  let blocks = [];

  function buildTurn(speaker, startMs) {
    const turn = document.createElement("article");
    turn.className = "rc-turn";
    turn.style.setProperty("--speaker", speakerColor(speaker));

    const head = document.createElement("header");
    head.className = "rc-turn-head";
    const time = document.createElement("time");
    time.className = "rc-time";
    time.textContent = clock(startMs);
    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "rc-tool rc-turn-copy";
    copy.title = t("turn.copy");
    copy.setAttribute("aria-label", t("turn.copy"));
    copy.innerHTML = '<svg><use href="#i-copy"/></svg>';
    copy.addEventListener("click", () => void copyText(turn.querySelector(".rc-text").textContent.trim(), "turn.copied"));
    head.append(speakerButton(speaker), time, copy);

    const text = document.createElement("p");
    text.className = "rc-text";
    bindTurnEditing(turn, text);
    const body = document.createElement("div");
    body.className = "rc-turn-body";
    body.append(head, text);
    turn.append(avatar(speaker), body);
    return turn;
  }

  function setTurnText(turn, settled, pending = "") {
    const text = turn.querySelector(".rc-text");
    text.textContent = settled.trimStart();
    if (pending) {
      const tail = document.createElement("span");
      tail.className = "rc-interim";
      tail.textContent = settled ? pending : pending.trimStart();
      text.appendChild(tail);
    }
  }

  /**
   * A settled turn can be corrected once the listening is over: a click in its
   * text, Enter or a click elsewhere keeps the change, Escape drops it. A turn
   * emptied is removed.
   */
  function bindTurnEditing(turn, text) {
    const segmentOf = () => state.transcript.segments[blocks.indexOf(turn)];
    text.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        text.blur();
      } else if (event.key === "Escape") {
        const segment = segmentOf();
        if (segment) text.textContent = segment.text.trimStart();
        text.blur();
      }
    });
    text.addEventListener("blur", () => {
      const segment = segmentOf();
      if (!segment || !text.isContentEditable) return;
      const next = text.textContent.replace(/\s+/g, " ").trim();
      if (next === segment.text.trim()) return;
      if (next) segment.text = ` ${next}`;
      else state.transcript.segments.splice(blocks.indexOf(turn), 1);
      markDirty();
      order = [];
      for (const kept of state.transcript.segments) noteSpeaker(kept.speaker);
      renderAll();
    });
  }

  /** Turns are editable while nothing is being listened to. */
  function refreshEditable() {
    const editable = state.phase === "idle";
    for (const block of blocks) {
      const text = block.querySelector(".rc-text");
      if (editable) text.setAttribute("contenteditable", "plaintext-only");
      else text.removeAttribute("contenteditable");
      text.spellcheck = false;
    }
  }

  /** Words not settled yet, grouped by speaker like the settled ones. */
  function interimTurns() {
    const turns = [];
    for (const token of state.interim) {
      const last = turns[turns.length - 1];
      const speaker = token.speaker ?? last?.speaker ?? lastSpeaker();
      if (last && last.speaker === speaker) last.text += token.text;
      else turns.push({ speaker, startMs: token.startMs, text: token.text });
    }
    return turns;
  }

  const nearBottom = () => transcriptEl.scrollHeight - transcriptEl.scrollTop - transcriptEl.clientHeight < 80;

  function scrollToLatest() {
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
  }

  /**
   * Brings the transcript in line with the state. `from` is the first settled
   * segment whose text may have changed: everything before it is left alone,
   * so that a long transcript is not rebuilt at every word.
   */
  function renderTranscript(from = 0) {
    const { segments } = state.transcript;

    for (const node of transcriptEl.querySelectorAll(".pending")) node.remove();
    if (from === 0) {
      transcriptEl.replaceChildren();
      blocks = [];
    }
    for (let i = blocks.length; i < segments.length; i++) {
      if (segments[i].gap) {
        const gap = document.createElement("div");
        gap.className = "rc-gap";
        gap.textContent = t("gap.label");
        transcriptEl.appendChild(gap);
      }
      blocks.push(buildTurn(segments[i].speaker, segments[i].startMs));
      transcriptEl.appendChild(blocks[i]);
    }

    const turns = interimTurns();
    const last = segments.length - 1;
    // The first pending turn continues the last block when the speaker is the
    // same and no cut stands between them.
    const continued = turns.length && last >= 0 && !state.breakNext && turns[0].speaker === segments[last].speaker ? turns.shift() : null;
    for (let i = Math.max(0, Math.min(from, last)); i <= last; i++) {
      setTurnText(blocks[i], segments[i].text, i === last && continued ? continued.text : "");
    }
    for (const turn of turns) {
      const block = buildTurn(turn.speaker, turn.startMs);
      block.classList.add("pending");
      setTurnText(block, "", turn.text);
      transcriptEl.appendChild(block);
    }

    $("empty").classList.toggle("hidden", segments.length > 0 || state.interim.length > 0);
    if (state.following) scrollToLatest();
    refreshLatestButton();
    refreshButtons();
    refreshEditable();
    if (find.open) runFind(false);
  }

  transcriptEl.addEventListener("scroll", () => {
    state.following = nearBottom();
    refreshLatestButton();
  });

  // The frame comes back from being hidden (another Allkin tab), or the window
  // is resized: the last words must be on screen again.
  new ResizeObserver(() => {
    if (state.following) scrollToLatest();
  }).observe(transcriptEl);

  function refreshLatestButton() {
    $("latest").classList.toggle("hidden", state.following || state.transcript.segments.length === 0);
  }

  $("latest").addEventListener("click", () => {
    state.following = true;
    scrollToLatest();
    refreshLatestButton();
  });

  // ---- Side panel: who spoke, and for how long ----

  let statsDirty = false;

  function renderSpeakers() {
    const list = $("speakers");
    // Not while a name is being typed there: the field would vanish under the cursor.
    if (list.contains(document.activeElement) && document.activeElement.classList.contains("rc-speaker-input")) return;

    const totals = new Map(order.map((key) => [key, { spokenMs: 0, words: 0 }]));
    for (const segment of state.transcript.segments) {
      const total = totals.get(segment.speaker);
      if (!total) continue;
      total.spokenMs += segment.spokenMs ?? 0;
      total.words += countWords(segment.text);
    }
    // A transcript saved before speaking times were kept: words stand in.
    const timed = [...totals.values()].some((total) => total.spokenMs > 0);
    const weight = (total) => (timed ? total.spokenMs : total.words);
    const sum = [...totals.values()].reduce((all, total) => all + weight(total), 0);

    list.replaceChildren();
    const shares = $("share");
    shares.replaceChildren();
    shares.classList.toggle("hidden", sum === 0);
    for (const key of order) {
      const total = totals.get(key);
      const percent = sum ? Math.round((weight(total) / sum) * 100) : 0;
      const row = document.createElement("li");
      row.className = "rc-speaker-row";
      row.style.setProperty("--speaker", speakerColor(key));
      const share = document.createElement("span");
      share.className = "rc-speaker-percent";
      share.textContent = t("speakers.percent", { percent });
      const detail = document.createElement("span");
      detail.className = "rc-speaker-time";
      detail.textContent = [timed ? clock(total.spokenMs) : "", tn("meta.words", total.words)].filter(Boolean).join(" · ");
      row.append(avatar(key), speakerButton(key), share, detail);
      list.appendChild(row);
      if (weight(total) > 0) {
        const part = document.createElement("i");
        part.style.setProperty("--speaker", speakerColor(key));
        part.style.flexGrow = String(weight(total));
        shares.appendChild(part);
      }
    }
    $("speakers-empty").classList.toggle("hidden", order.length > 0);
  }

  const LANGUAGE_NAMES = (() => {
    try {
      return new Intl.DisplayNames([locale], { type: "language" });
    } catch {
      return null;
    }
  })();

  /** The facts of the transcript shown, under the speakers. */
  function renderDetails(words) {
    const transcript = state.transcript;
    const rows = [];
    if (transcript.startedAt) rows.push(["details.date", new Date(transcript.startedAt).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })]);
    if (transcript.durationMs > 0) rows.push(["details.duration", clock(transcript.durationMs)]);
    if (words) rows.push(["details.words", words.toLocaleString(locale)]);
    if (transcript.language && transcript.language !== "auto") {
      let name = transcript.language;
      try {
        name = LANGUAGE_NAMES?.of(transcript.language) ?? name;
      } catch {
        // A code the browser has no name for: shown as it is.
      }
      rows.push(["details.language", name]);
    }
    const list = $("details");
    list.replaceChildren();
    for (const [key, value] of rows) {
      const term = document.createElement("dt");
      term.textContent = t(key);
      const data = document.createElement("dd");
      data.textContent = value;
      list.append(term, data);
    }
  }

  function renderMeta() {
    const transcript = state.transcript;
    const parts = [];
    if (transcript.startedAt) parts.push(new Date(transcript.startedAt).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }));
    if (transcript.durationMs > 0) parts.push(clock(transcript.durationMs));
    if (order.length) parts.push(tn("meta.speakers", order.length));
    const words = transcript.segments.reduce((all, segment) => all + countWords(segment.text), 0);
    if (words) parts.push(tn("meta.words", words));
    $("meta").textContent = parts.join(" · ");
    renderDetails(words);
    // Idle, the clock of the recorder shows how long the transcript shown lasts.
    if (!state.session) $("clock").textContent = clock(transcript.durationMs);
  }

  function renderAll() {
    renderTranscript(0);
    renderSpeakers();
    renderMeta();
    statsDirty = false;
  }

  // ---- What the worker sends back ----

  function onTokens(final, interim) {
    const { segments } = state.transcript;
    let changedFrom = segments.length;
    for (const token of final) {
      const speaker = token.speaker ?? lastSpeaker();
      noteSpeaker(speaker);
      const spoken = Math.max(0, token.endMs - token.startMs);
      const last = segments[segments.length - 1];
      if (last && last.speaker === speaker && !state.breakNext) {
        last.text += token.text;
        last.endMs = Math.max(last.endMs ?? 0, token.endMs);
        last.spokenMs = (last.spokenMs ?? 0) + spoken;
        changedFrom = Math.min(changedFrom, segments.length - 1);
      } else {
        segments.push({ speaker, startMs: token.startMs, endMs: token.endMs, spokenMs: spoken, text: token.text, ...(state.breakNext ? { gap: true } : {}) });
        state.breakNext = false;
      }
    }
    state.interim = interim;
    if (final.length) {
      statsDirty = true;
      markDirty();
    }
    // from > 0 keeps the blocks already drawn; 0 would rebuild them all.
    renderTranscript(Math.max(1, changedFrom));
  }

  function onWorkerMessage(session, message) {
    if (state.session !== session) return;
    if (message.type === "tokens") {
      onTokens(message.final, message.interim);
    } else if (message.type === "error") {
      notify(message.code, { status: message.status ?? "", message: message.message ?? "" });
    } else if (message.type === "state") {
      if (message.state === "stopped") {
        void finish(session);
        return;
      }
      // Still finishing: the worker's late news must not bring the buttons back.
      if (state.phase === "finishing") return;
      if (message.state === "live") {
        // A session after the first numbers the voices afresh: what follows is
        // set apart from what came before.
        if (message.generation > session.generation && message.generation > 1 && state.transcript.segments.length) state.breakNext = true;
        session.generation = message.generation;
        if (message.language) state.transcript.language = message.language;
      }
      setPhase({ connecting: "starting", live: "live", paused: "paused", reconnecting: "reconnecting" }[message.state] ?? state.phase);
    }
  }

  // ---- Listening ----

  const recordBtn = $("record");
  const pauseBtn = $("pause");
  const dock = $("dock");

  /** An icon, and a label: written in the button when it has room for one, said by it otherwise. */
  function setButton(button, icon, label) {
    button.querySelector("use").setAttribute("href", `#i-${icon}`);
    const text = button.querySelector("span");
    if (text) text.textContent = label;
    else {
      button.title = label;
      button.setAttribute("aria-label", label);
    }
  }

  function setPhase(phase) {
    state.phase = phase;
    const listening = LISTENING.has(phase);
    const active = listening && phase !== "starting";

    setButton(
      recordBtn,
      active ? "stop" : "microphone",
      t({ idle: "record.start", starting: "record.starting", finishing: "record.finishing" }[phase] ?? "record.stop")
    );
    recordBtn.classList.toggle("live", active);
    recordBtn.disabled = phase === "starting" || phase === "finishing";

    pauseBtn.classList.toggle("hidden", !active);
    setButton(pauseBtn, phase === "paused" ? "play" : "pause", t(phase === "paused" ? "pause.resume" : "pause.pause"));
    pauseBtn.disabled = phase === "reconnecting";

    refreshDock();
    refreshButtons();
    refreshEditable();
    renderHistory();
  }

  /** The recorder: its state in a few words, and the time the listening has run. */
  function refreshDock() {
    const session = state.session;
    const phase = state.phase;
    const interrupted = phase === "live" && session && (session.track?.muted || session.context.state !== "running");
    const key = phase === "idle" ? "status.idle" : phase === "starting" ? "status.connecting" : phase === "finishing" ? "status.finishing" : interrupted ? "status.muted" : `status.${phase}`;
    $("status-text").textContent = t(key);
    dock.dataset.phase = phase;
    dock.dataset.tone = phase === "idle" ? "idle" : phase === "live" && !interrupted ? "live" : "wait";
    if (session) $("clock").textContent = clock(session.activeMs);
  }

  function notify(code, vars) {
    const notice = $("notice");
    // A code this page has no sentence for is the service's own failure.
    notice.textContent = t(LOCALES.en[`error.${code}`] ? `error.${code}` : "error.server", vars);
    notice.classList.remove("hidden");
  }

  function clearNotice() {
    $("notice").classList.add("hidden");
  }

  /** The class of a refused microphone, never its message. */
  function microphoneError(error) {
    if (error?.name === "NotAllowedError" || error?.name === "SecurityError") return "mic_denied";
    if (error?.name === "NotFoundError" || error?.name === "OverconstrainedError") return "mic_missing";
    return "mic_failed";
  }

  async function start() {
    if (state.phase !== "idle") return;
    clearNotice();
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      notify("insecure");
      return;
    }
    setPhase("starting");

    // Created inside the click, before any await: iOS leaves an audio context
    // born later suspended. It runs at the device's own rate — Firefox refuses
    // to plug a microphone into a context of another rate — and the worklet
    // brings the samples down.
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const session = { context, stream: null, track: null, worker: null, analyser: null, wakeLock: null, ticker: null, frame: 0, activeMs: 0, lastTick: 0, generation: 0, finishTimer: null };
    state.session = session;

    try {
      session.stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      await context.audioWorklet.addModule("worklet.js");
      await context.resume();
    } catch (error) {
      release(session);
      state.session = null;
      setPhase("idle");
      notify(microphoneError(error));
      return;
    }

    // A transcript already on screen is left as it is: listening starts a new one.
    if (state.transcript.segments.length) {
      await save();
      openTranscript(emptyTranscript());
    }
    state.transcript.startedAt = new Date().toISOString();
    state.following = true;
    state.breakNext = false;
    renderAll();

    // 16 kHz is plenty for speech: 48 kHz is divided by 3, 44.1 kHz by 2. A
    // rate that does not divide evenly is sent as it is.
    const wanted = Math.max(1, Math.floor(context.sampleRate / 16000));
    const factor = Number.isInteger(context.sampleRate / wanted) ? wanted : 1;
    const sampleRate = context.sampleRate / factor;

    const source = context.createMediaStreamSource(session.stream);
    const capture = new AudioWorkletNode(context, "recordr-capture", {
      processorOptions: { factor, chunkSize: Math.round(sampleRate / 10) },
    });
    // A node nobody listens to may not be pulled: it goes to the output through
    // a silent gain.
    const silence = context.createGain();
    silence.gain.value = 0;
    source.connect(capture).connect(silence).connect(context.destination);
    session.analyser = context.createAnalyser();
    session.analyser.fftSize = 512;
    source.connect(session.analyser);

    // The audio goes from the audio thread to the worker over its own channel:
    // this page is not on the way, and may be slowed down without harm.
    const channel = new MessageChannel();
    session.worker = new Worker("stream.js");
    session.worker.onmessage = (event) => onWorkerMessage(session, event.data);
    session.worker.onerror = () => {
      notify("server");
      void finish(session);
    };
    // The language and the model set on the plugin's page: the service knows
    // them, Allkin is told when the session is asked for.
    const asked = await api("GET", "api/status").catch(() => ({}));
    session.worker.postMessage({ type: "start", port: channel.port2, sampleRate, language: asked.language, model: asked.model }, [channel.port2]);
    capture.port.postMessage({ port: channel.port1 }, [channel.port1]);

    session.track = session.stream.getAudioTracks()[0];
    // Unplugged, or the permission taken back: nothing more will come.
    session.track.addEventListener("ended", () => {
      if (state.session !== session || !LISTENING.has(state.phase)) return;
      notify("mic_lost");
      stop();
    });
    session.track.addEventListener("mute", refreshDock);
    session.track.addEventListener("unmute", refreshDock);
    // A phone call, another app taking the audio: the system suspends the
    // context and gives it back later. It is asked to resume as soon as it may.
    context.addEventListener("statechange", () => {
      if (state.session !== session) return;
      if (context.state !== "running" && LISTENING.has(state.phase)) void context.resume().catch(() => {});
      refreshDock();
    });

    levels = [];
    session.lastTick = Date.now();
    session.ticker = setInterval(() => tick(session), 500);
    session.frame = requestAnimationFrame(() => drawMeter(session));
    void keepAwake(session);
  }

  /** Twice a second: the clock, and the figures that follow the words. */
  function tick(session) {
    const now = Date.now();
    // Counted from the wall clock, not from the number of ticks: a page in the
    // background ticks once a second at best.
    if (state.phase === "live" || state.phase === "reconnecting") session.activeMs += now - session.lastTick;
    session.lastTick = now;
    state.transcript.durationMs = Math.round(session.activeMs);
    refreshDock();
    if (statsDirty) {
      statsDirty = false;
      renderSpeakers();
    }
    renderMeta();
  }

  /** The level of the microphone over the last seconds, one bar every 60 ms. */
  const WAVE_STEP_MS = 60;
  const WAVE_BAR = 3;
  const WAVE_GAP = 2;
  const wave = $("wave");
  let levels = [];
  let lastLevelAt = 0;

  function drawWave() {
    const ratio = window.devicePixelRatio || 1;
    const width = wave.clientWidth;
    const height = wave.clientHeight;
    if (!width || !height) return;
    if (wave.width !== Math.round(width * ratio) || wave.height !== Math.round(height * ratio)) {
      wave.width = Math.round(width * ratio);
      wave.height = Math.round(height * ratio);
    }
    const ctx = wave.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = getComputedStyle(wave).color;
    const count = Math.floor(width / (WAVE_BAR + WAVE_GAP));
    if (levels.length > count) levels = levels.slice(-count);
    // The newest bar on the right; what was not heard yet is a row of dots.
    for (let i = 0; i < count; i++) {
      const level = levels[levels.length - count + i] ?? 0;
      const bar = Math.max(2, level * height);
      ctx.globalAlpha = level ? 1 : 0.35;
      ctx.beginPath();
      ctx.roundRect(i * (WAVE_BAR + WAVE_GAP), (height - bar) / 2, WAVE_BAR, bar, 1.5);
      ctx.fill();
    }
  }

  function drawMeter(session) {
    if (state.session !== session) return;
    const now = performance.now();
    if (now - lastLevelAt >= WAVE_STEP_MS && (state.phase === "live" || state.phase === "reconnecting") && session.analyser) {
      lastLevelAt = now;
      const samples = new Uint8Array(session.analyser.fftSize);
      session.analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const sample of samples) sum += ((sample - 128) / 128) ** 2;
      levels.push(Math.min(1, Math.sqrt(sum / samples.length) * 6));
    }
    drawWave();
    session.frame = requestAnimationFrame(() => drawMeter(session));
  }

  /** A phone that locks its screen cuts the microphone. */
  async function keepAwake(session) {
    try {
      session.wakeLock = await navigator.wakeLock?.request("screen");
    } catch {
      // refused (battery saver, old browser): listening goes on, the screen may lock
    }
  }

  // Back in front: the system let go of the wake lock, and may have suspended
  // the audio.
  document.addEventListener("visibilitychange", () => {
    const session = state.session;
    if (document.visibilityState !== "visible" || !session || !LISTENING.has(state.phase)) return;
    void keepAwake(session);
    if (session.context.state !== "running") void session.context.resume().catch(() => {});
    if (state.following) scrollToLatest();
  });

  /** Lets go of the microphone and of everything that keeps the device busy. */
  function release(session) {
    clearInterval(session.ticker);
    clearTimeout(session.finishTimer);
    cancelAnimationFrame(session.frame);
    for (const track of session.stream?.getTracks() ?? []) track.stop();
    void session.context.close().catch(() => {});
    void session.wakeLock?.release().catch(() => {});
  }

  function togglePause() {
    const session = state.session;
    if (!session) return;
    if (state.phase === "live") session.worker.postMessage({ type: "pause" });
    else if (state.phase === "paused") session.worker.postMessage({ type: "resume" });
  }

  /** Asks the worker to end: it settles the last words, then says "stopped". */
  function stop() {
    const session = state.session;
    if (!session || !LISTENING.has(state.phase)) return;
    tick(session);
    setPhase("finishing");
    for (const track of session.stream?.getTracks() ?? []) track.stop();
    session.worker.postMessage({ type: "stop" });
    // The worker waits 8 s for the provider; a worker that says nothing at all
    // is not waited for.
    session.finishTimer = setTimeout(() => void finish(session), 12000);
  }

  async function finish(session) {
    if (state.session !== session) return;
    state.session = null;
    release(session);
    session.worker?.terminate();
    state.transcript.durationMs = Math.round(session.activeMs);
    state.interim = [];
    state.breakNext = false;
    setPhase("idle");
    renderAll();
    if (state.transcript.segments.length) state.dirty = true;
    await save();
  }

  recordBtn.addEventListener("click", () => (LISTENING.has(state.phase) ? stop() : void start()));
  pauseBtn.addEventListener("click", togglePause);

  // Closing or reloading the browser tab would end the listening: the browser
  // asks first.
  window.addEventListener("beforeunload", (event) => {
    if (!state.session) return;
    event.preventDefault();
    event.returnValue = "";
  });

  // ---- Saving ----

  let saveTimer = null;

  function markDirty() {
    state.dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void save(), 3000);
  }

  async function save() {
    clearTimeout(saveTimer);
    const transcript = state.transcript;
    if (!state.dirty || state.saving) return;
    // Nothing said yet: no empty file is left behind.
    if (!transcript.id && transcript.segments.length === 0) return;
    state.saving = true;
    state.dirty = false;
    const saved = $("saved");
    try {
      if (transcript.id) await api("PUT", `api/transcripts/${transcript.id}`, transcript);
      else transcript.id = (await api("POST", "api/transcripts", transcript)).id;
      saved.textContent = t("saved.done", { time: new Date().toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) });
      saved.classList.remove("failed");
      void loadHistory();
    } catch {
      state.dirty = true;
      saved.textContent = t("saved.failed");
      saved.classList.add("failed");
    } finally {
      state.saving = false;
    }
    // Words that arrived while the request was on its way.
    if (state.dirty && state.transcript === transcript) markDirty();
  }

  // The tab is closing or going to the background: what is not saved yet goes
  // out with a request the browser finishes on its own.
  window.addEventListener("pagehide", () => {
    const transcript = state.transcript;
    if (!state.dirty || !transcript.id) return;
    void fetch(`api/transcripts/${transcript.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transcript),
      keepalive: true,
    });
  });

  $("title").addEventListener("input", (event) => {
    state.transcript.title = event.target.value;
    markDirty();
  });

  // ---- Copy, export, new, delete ----

  function refreshButtons() {
    const hasText = state.transcript.segments.length > 0;
    $("copy").disabled = !hasText;
    $("export").disabled = !hasText;
    $("find-toggle").disabled = !hasText;
    $("new").disabled = state.phase !== "idle" || (!hasText && !state.transcript.id);
  }

  const turnsOf = (transcript) => transcript.segments.map((segment) => ({ ...segment, name: speakerName(segment.speaker), text: segment.text.trim() }));
  const titleOf = (transcript) => transcript.title.trim() || t("title.placeholder");
  const exportHead = (transcript) =>
    t("export.meta", {
      date: new Date(transcript.startedAt ?? Date.now()).toLocaleString(locale, { dateStyle: "long", timeStyle: "short" }),
      duration: clock(transcript.durationMs),
    });

  function asMarkdown() {
    const transcript = state.transcript;
    const lines = [`# ${titleOf(transcript)}`, "", `_${exportHead(transcript)}_`, ""];
    for (const turn of turnsOf(transcript)) {
      if (turn.gap) lines.push("---", "", `_${t("gap.label")}_`, "");
      lines.push(prefs.times ? `**${turn.name}** · ${clock(turn.startMs)}` : `**${turn.name}**`, "", turn.text, "");
    }
    return lines.join("\n");
  }

  function asText() {
    const transcript = state.transcript;
    const lines = [titleOf(transcript), exportHead(transcript), ""];
    for (const turn of turnsOf(transcript)) lines.push(prefs.times ? `[${clock(turn.startMs)}] ${turn.name}: ${turn.text}` : `${turn.name}: ${turn.text}`, "");
    return lines.join("\n");
  }

  /** Subtitles: one cue per turn, on the clock of the recording. */
  function asSubtitles() {
    const stamp = (ms) => {
      const pad = (n, size = 2) => String(n).padStart(size, "0");
      const total = Math.max(0, Math.round(ms));
      return `${pad(Math.floor(total / 3600000))}:${pad(Math.floor((total % 3600000) / 60000))}:${pad(Math.floor((total % 60000) / 1000))},${pad(total % 1000, 3)}`;
    };
    return turnsOf(state.transcript)
      .map((turn, index) => `${index + 1}\n${stamp(turn.startMs)} --> ${stamp(Math.max(turn.endMs ?? 0, turn.startMs + 1000))}\n${turn.name}: ${turn.text}\n`)
      .join("\n");
  }

  async function copyText(text, doneKey) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard refused (frame without the permission, old browser): the
      // selection-based way still works.
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    toast(t(doneKey));
  }

  const copyTranscript = () =>
    copyText(
      turnsOf(state.transcript)
        .map((turn) => `${turn.name}: ${turn.text}`)
        .join("\n\n"),
      "action.copied"
    );

  function download(content, extension, type) {
    const transcript = state.transcript;
    const slug = (transcript.title || "")
      .normalize("NFD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }));
    link.download = `${slug || "transcript"}-${transcript.id ?? "draft"}.${extension}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  async function newTranscript() {
    if (state.phase !== "idle") return;
    await save();
    openTranscript(emptyTranscript());
    closePanels();
  }

  async function deleteTranscript(id) {
    try {
      await api("DELETE", `api/transcripts/${id}`);
    } catch (error) {
      notify(error.code, { status: error.status ?? "" });
      return;
    }
    toast(t("history.deleted"));
    if (id === state.transcript.id) openTranscript(emptyTranscript());
    void loadHistory();
  }

  $("copy").addEventListener("click", () => void copyTranscript());
  $("new").addEventListener("click", () => void newTranscript());

  // ---- Menus: the export formats, and the rest of the actions ----

  const menu = $("menu");
  let menuAnchor = null;

  function closeMenu() {
    menu.classList.add("hidden");
    menuAnchor?.classList.remove("active");
    menuAnchor = null;
  }

  /** items: { icon, label, hint, danger, disabled, keep, run } or "-" for a line.
   *  `keep` leaves the menu open after the click: the item changes instead. */
  function openMenu(anchor, items) {
    if (menuAnchor === anchor) return closeMenu();
    closeMenu();
    menuAnchor = anchor;
    anchor.classList.add("active");
    menu.replaceChildren();
    for (const item of items) {
      if (item === "-") {
        const line = document.createElement("div");
        line.className = "rc-menu-sep";
        menu.appendChild(line);
        continue;
      }
      const button = document.createElement("button");
      button.type = "button";
      button.className = `rc-menu-item${item.danger ? " danger" : ""}`;
      button.setAttribute("role", "menuitem");
      button.disabled = Boolean(item.disabled);
      const label = document.createElement("span");
      label.textContent = item.label;
      button.innerHTML = `<svg><use href="#i-${item.icon}"/></svg>`;
      button.appendChild(label);
      if (item.hint) {
        const hint = document.createElement("small");
        hint.textContent = item.hint;
        button.appendChild(hint);
      }
      button.addEventListener("click", () => {
        if (!item.keep?.(button, label)) closeMenu();
        void item.run?.();
      });
      menu.appendChild(button);
    }
    menu.classList.remove("hidden");
    const box = menu.getBoundingClientRect();
    const at = anchor.getBoundingClientRect();
    menu.style.left = `${Math.max(8, Math.min(at.right - box.width, window.innerWidth - box.width - 8))}px`;
    menu.style.top = `${Math.max(8, Math.min(at.bottom + 4, window.innerHeight - box.height - 8))}px`;
  }

  $("export").addEventListener("click", (event) =>
    openMenu(event.currentTarget, [
      { icon: "markdown-logo", label: t("export.markdown"), hint: ".md", run: () => download(asMarkdown(), "md", "text/markdown") },
      { icon: "file-text", label: t("export.text"), hint: ".txt", run: () => download(asText(), "txt", "text/plain") },
      { icon: "closed-captioning", label: t("export.subtitles"), hint: ".srt", run: () => download(asSubtitles(), "srt", "application/x-subrip") },
    ])
  );

  $("more").addEventListener("click", (event) => {
    const transcript = state.transcript;
    const hasText = transcript.segments.length > 0;
    const idle = state.phase === "idle";
    let asked = false;
    openMenu(event.currentTarget, [
      { icon: "plus", label: t("action.new"), disabled: !idle || (!hasText && !transcript.id), run: newTranscript },
      "-",
      { icon: "copy", label: t("action.copyAll"), disabled: !hasText, run: copyTranscript },
      { icon: "clock", label: t(prefs.times ? "times.hide" : "times.show"), run: toggleTimes },
      "-",
      {
        icon: "trash",
        label: t("action.delete"),
        danger: true,
        disabled: !idle || !transcript.id,
        // Two clicks to delete: the first one asks, and the item says so.
        keep: (button, label) => {
          if (asked) return false;
          label.textContent = t("action.deleteConfirm");
          return true;
        },
        run: () => {
          if (asked) return deleteTranscript(transcript.id);
          asked = true;
          return undefined;
        },
      },
    ]);
  });

  document.addEventListener("mousedown", (event) => {
    if (!event.target.closest?.("#menu") && event.target.closest?.("button") !== menuAnchor) closeMenu();
  });
  window.addEventListener("blur", closeMenu);
  window.addEventListener("resize", closeMenu);

  // ---- Timestamps ----

  function applyTimes() {
    $("app").classList.toggle("no-times", !prefs.times);
    $("times-toggle").setAttribute("aria-pressed", String(prefs.times));
  }

  function toggleTimes() {
    prefs.times = !prefs.times;
    savePrefs();
    applyTimes();
  }

  $("times-toggle").addEventListener("click", toggleTimes);

  // ---- Search in the transcript ----

  /** Matches are painted with the browser's highlights: the text of the turns
   *  is not touched, so words still arriving do not undo them. */
  const find = { open: false, ranges: [], index: 0 };
  const canHighlight = typeof Highlight === "function" && Boolean(CSS.highlights);

  function paintFind() {
    if (canHighlight) {
      CSS.highlights.delete("rc-find");
      CSS.highlights.delete("rc-find-current");
      if (find.ranges.length) {
        CSS.highlights.set("rc-find", new Highlight(...find.ranges.filter((range, index) => index !== find.index)));
        CSS.highlights.set("rc-find-current", new Highlight(find.ranges[find.index]));
      }
    }
    const query = $("find-input").value.trim();
    $("find-count").textContent = !query ? "" : find.ranges.length ? t("find.count", { index: find.index + 1, total: find.ranges.length }) : t("find.none");
    $("find-prev").disabled = $("find-next").disabled = find.ranges.length < 2;
  }

  /** Finds again; `reveal` brings the current match on screen. */
  function runFind(reveal = true) {
    const needle = $("find-input").value.trim().toLowerCase();
    const ranges = [];
    if (find.open && needle) {
      const walker = document.createTreeWalker(transcriptEl, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => (node.parentElement?.closest(".rc-text") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
      });
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.data.toLowerCase();
        for (let at = text.indexOf(needle); at !== -1; at = text.indexOf(needle, at + needle.length)) {
          const range = document.createRange();
          range.setStart(node, at);
          range.setEnd(node, at + needle.length);
          ranges.push(range);
        }
      }
    }
    find.ranges = ranges;
    find.index = Math.min(find.index, Math.max(0, ranges.length - 1));
    paintFind();
    if (reveal) revealMatch();
  }

  function revealMatch() {
    const range = find.ranges[find.index];
    if (!range) return;
    state.following = false;
    range.startContainer.parentElement?.closest(".rc-turn")?.scrollIntoView({ block: "center" });
    refreshLatestButton();
  }

  function stepFind(step) {
    if (!find.ranges.length) return;
    find.index = (find.index + step + find.ranges.length) % find.ranges.length;
    paintFind();
    revealMatch();
  }

  function setFind(open) {
    find.open = open;
    $("find").classList.toggle("hidden", !open);
    $("find-toggle").classList.toggle("active", open);
    if (open) {
      $("find-input").focus();
      $("find-input").select();
    } else find.index = 0;
    runFind(open);
  }

  $("find-toggle").addEventListener("click", () => setFind(!find.open));
  $("find-close").addEventListener("click", () => setFind(false));
  $("find-prev").addEventListener("click", () => stepFind(-1));
  $("find-next").addEventListener("click", () => stepFind(1));
  $("find-input").addEventListener("input", () => {
    find.index = 0;
    runFind();
  });
  $("find-input").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      stepFind(event.shiftKey ? -1 : 1);
    }
  });

  // ---- History ----

  let history = [];

  function openTranscript(transcript) {
    state.transcript = transcript;
    state.interim = [];
    state.dirty = false;
    state.following = true;
    state.breakNext = false;
    order = [];
    for (const segment of transcript.segments) noteSpeaker(segment.speaker);
    $("title").value = transcript.title ?? "";
    $("saved").textContent = "";
    renderAll();
    renderHistory();
  }

  async function loadHistory() {
    try {
      history = (await api("GET", "api/transcripts")).transcripts;
    } catch {
      return;
    }
    renderHistory();
  }

  /** "Today", "Yesterday", then the day itself. */
  function dayLabel(iso) {
    const date = new Date(iso);
    const start = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const days = Math.round((start(new Date()) - start(date)) / 86400000);
    if (days === 0) return t("history.today");
    if (days === 1) return t("history.yesterday");
    return date.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", ...(date.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}) });
  }

  function renderHistory() {
    const list = $("history");
    const query = $("history-search").value.trim().toLowerCase();
    const shown = history.filter((entry) => !query || (entry.title || t("title.placeholder")).toLowerCase().includes(query));
    const busy = state.phase !== "idle";

    list.replaceChildren();
    const empty = $("history-empty");
    empty.classList.toggle("hidden", shown.length > 0);
    empty.textContent = t(history.length ? "history.noMatch" : "history.empty");

    let day = "";
    for (const entry of shown) {
      const label = dayLabel(entry.startedAt);
      if (label !== day) {
        day = label;
        const heading = document.createElement("h3");
        heading.className = "rc-history-day";
        heading.textContent = label;
        list.appendChild(heading);
      }
      const item = document.createElement("div");
      item.className = "rc-history-row";
      item.classList.toggle("current", entry.id === state.transcript.id);

      const open = document.createElement("button");
      open.type = "button";
      open.className = "rc-history-open";
      open.disabled = busy;
      const name = document.createElement("span");
      name.className = "rc-history-name";
      // The one being listened to carries the red dot of the recorder.
      if (busy && entry.id === state.transcript.id) {
        const live = document.createElement("i");
        live.className = "rc-history-live";
        name.appendChild(live);
      }
      const title = document.createElement("span");
      title.textContent = entry.title || t("title.placeholder");
      name.appendChild(title);
      const meta = document.createElement("span");
      meta.className = "rc-history-meta";
      meta.textContent = [
        new Date(entry.startedAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
        clock(entry.durationMs),
        tn("meta.speakers", entry.speakers),
      ].join(" · ");
      open.append(name, meta);
      open.addEventListener("click", async () => {
        if (state.phase !== "idle") return;
        await save();
        try {
          const transcript = await api("GET", `api/transcripts/${entry.id}`);
          openTranscript({ ...emptyTranscript(), ...transcript });
          closePanels();
        } catch (error) {
          notify(error.code, { status: error.status ?? "" });
        }
      });

      // Two clicks to delete: the first one asks, and forgets after a moment.
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "rc-history-delete";
      remove.title = t("history.delete");
      remove.setAttribute("aria-label", t("history.delete"));
      remove.disabled = busy;
      const bin = () => (remove.innerHTML = '<svg><use href="#i-trash"/></svg>');
      bin();
      remove.addEventListener("click", async () => {
        if (!remove.classList.contains("confirm")) {
          remove.classList.add("confirm");
          remove.textContent = t("history.confirm");
          setTimeout(() => {
            remove.classList.remove("confirm");
            bin();
          }, 4000);
          return;
        }
        await deleteTranscript(entry.id);
      });

      item.append(open, remove);
      list.appendChild(item);
    }
  }

  $("history-search").addEventListener("input", renderHistory);

  // ---- Panels: beside the page when it has room, over it otherwise ----

  const app = $("app");
  const OVERLAY = { history: "(max-width: 720px)", speakers: "(max-width: 1100px)" };

  function closePanels() {
    app.classList.remove("history-open", "speakers-open");
  }

  function applyPanels() {
    app.classList.toggle("history-off", !prefs.history);
    app.classList.toggle("speakers-off", !prefs.speakers);
  }

  function togglePanel(name) {
    const other = name === "history" ? "speakers" : "history";
    if (window.matchMedia(OVERLAY[name]).matches) {
      app.classList.remove(`${other}-open`);
      app.classList.toggle(`${name}-open`);
      return;
    }
    prefs[name] = !prefs[name];
    savePrefs();
    applyPanels();
  }

  $("history-toggle").addEventListener("click", () => togglePanel("history"));
  $("speakers-toggle").addEventListener("click", () => togglePanel("speakers"));
  $("scrim").addEventListener("click", closePanels);
  for (const button of document.querySelectorAll("[data-close]")) button.addEventListener("click", closePanels);

  // ---- Keyboard ----

  document.addEventListener("keydown", (event) => {
    const typing = event.target.closest?.("input, textarea, [contenteditable]");
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "f" && state.transcript.segments.length) {
      event.preventDefault();
      setFind(true);
    } else if (event.key === "Escape") {
      if (!menu.classList.contains("hidden")) closeMenu();
      else if (find.open) setFind(false);
      else closePanels();
    } else if (event.key === " " && !typing && !event.target.closest?.("button") && (state.phase === "live" || state.phase === "paused")) {
      // Space pauses and resumes, as on any recorder.
      event.preventDefault();
      togglePause();
    }
  });

  // ---- Start-up ----

  applyPanels();
  applyTimes();
  setPhase("idle");
  renderAll();
  void loadHistory();
  api("GET", "api/status")
    .then(() => {
      if (!window.isSecureContext) notify("insecure");
    })
    .catch(() => notify("server"));
})();
