(function () {
  "use strict";

  const WORDS = window.PINYIN_WORDS || [];

  // Tone mark maps for optional reveal / acceptance
  const TONE_MARKS = {
    a: ["a", "ā", "á", "ǎ", "à"],
    e: ["e", "ē", "é", "ě", "è"],
    i: ["i", "ī", "í", "ǐ", "ì"],
    o: ["o", "ō", "ó", "ǒ", "ò"],
    u: ["u", "ū", "ú", "ǔ", "ù"],
    v: ["ü", "ǖ", "ǘ", "ǚ", "ǜ"],
    ü: ["ü", "ǖ", "ǘ", "ǚ", "ǜ"],
  };

  const MARK_TO_PLAIN = {};
  Object.keys(TONE_MARKS).forEach(function (base) {
    TONE_MARKS[base].forEach(function (ch, i) {
      if (i > 0) MARK_TO_PLAIN[ch] = { base: base === "v" ? "ü" : base, tone: i };
    });
  });

  // --- State ---
  const AUTO_SPEAK_KEY = "pinyinPractice.autoSpeak";

  const state = {
    mode: null, // "type" | "choice"
    filter: "all", // "all" | "char" | "word"
    deck: [],
    index: 0,
    current: null,
    choices: [],
    answered: false,
    correct: 0,
    total: 0,
    streak: 0,
    bestStreak: 0,
    autoSpeak: true,
    speechReady: false,
  };

  // --- DOM ---
  const $ = function (id) {
    return document.getElementById(id);
  };

  const screens = {
    home: $("screen-home"),
    play: $("screen-play"),
  };

  const els = {
    hanzi: $("hanzi"),
    meaning: $("meaning"),
    typeArea: $("type-area"),
    choiceArea: $("choice-area"),
    typeForm: $("type-form"),
    pinyinInput: $("pinyin-input"),
    submitBtn: $("submit-btn"),
    choices: $("choices"),
    feedback: $("feedback"),
    reveal: $("reveal"),
    nextBtn: $("next-btn"),
    scoreCorrect: $("score-correct"),
    scoreTotal: $("score-total"),
    scoreAccuracy: $("score-accuracy"),
    scoreStreak: $("score-streak"),
    modeBadge: $("mode-badge"),
    progress: $("progress"),
    filterSelect: $("filter-select"),
    speakRow: $("speak-row"),
    btnSpeak: $("btn-speak"),
    autoSpeak: $("auto-speak"),
    speakNote: $("speak-note"),
  };

  // --- Helpers ---
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function showScreen(name) {
    Object.keys(screens).forEach(function (k) {
      screens[k].classList.toggle("active", k === name);
    });
  }

  function filteredWords() {
    return WORDS.filter(function (w) {
      const isChar = w.hanzi.length === 1;
      if (state.filter === "char") return isChar;
      if (state.filter === "word") return !isChar;
      return true;
    });
  }

  function normalizePinyin(s) {
    if (!s) return "";
    let t = String(s).trim().toLowerCase();
    // normalize ü variants
    t = t.replace(/v/g, "ü").replace(/u:/g, "ü");
    // collapse whitespace
    t = t.replace(/\s+/g, " ");
    // convert tone marks → base + tone number
    let out = "";
    let pendingTone = 0;
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (MARK_TO_PLAIN[ch]) {
        const m = MARK_TO_PLAIN[ch];
        out += m.base === "ü" ? "ü" : m.base;
        pendingTone = m.tone;
      } else if (/[1-5]/.test(ch)) {
        out += ch;
        pendingTone = 0;
      } else if (ch === " " || ch === "'") {
        if (pendingTone) {
          out += String(pendingTone);
          pendingTone = 0;
        }
        if (ch === " ") out += " ";
      } else if (/[a-zü]/.test(ch)) {
        out += ch;
      }
      // ignore other punctuation
    }
    if (pendingTone) out += String(pendingTone);
    // ensure each syllable has a tone digit; treat missing as 5 (neutral) only when comparing? No — require tones.
    // Split into syllables loosely and compare digit-stripped spaces later in checkAnswer.
    return out.replace(/\s+/g, " ").trim();
  }

  function syllables(norm) {
    // Split on spaces; also try to attach trailing digits
    return norm.split(" ").filter(Boolean);
  }

  function answersMatch(userRaw, correctPinyin) {
    const user = normalizePinyin(userRaw);
    const correct = normalizePinyin(correctPinyin);
    if (!user) return false;

    // Exact after normalize (spaces flexible: remove all spaces and compare)
    const uFlat = user.replace(/ /g, "");
    const cFlat = correct.replace(/ /g, "");
    if (uFlat === cFlat) return true;

    // Also allow without spaces between syllables in either
    if (user.replace(/\s/g, "") === correct.replace(/\s/g, "")) return true;

    // Syllable-by-syllable: same count, each matches
    const us = syllables(user);
    const cs = syllables(correct);
    if (us.length === cs.length && us.every(function (s, i) { return s === cs[i]; })) {
      return true;
    }

    // If user typed without spaces but correct has them
    if (us.length === 1 && cs.length > 1) {
      // greedy match: concatenate correct syllables
      if (us[0] === cs.join("")) return true;
    }

    return false;
  }

  function changeTone(syllable, newTone) {
    // syllable like "hao3" or "ni3"
    const m = syllable.match(/^([a-zü]+)([1-5])$/i);
    if (!m) return syllable;
    return m[1] + String(newTone);
  }

  function nearMissSyllable(syl) {
    const m = syl.match(/^([a-zü]+)([1-5])$/i);
    if (!m) return syl + "1";
    const base = m[1].toLowerCase();
    const tone = parseInt(m[2], 10);
    const kind = Math.random();

    // Wrong tone
    if (kind < 0.45) {
      let t;
      do {
        t = 1 + Math.floor(Math.random() * 4);
      } while (t === tone || (tone === 5 && t === 5));
      if (tone === 5) t = 1 + Math.floor(Math.random() * 4);
      return base + t;
    }

    // Similar initial swaps
    const swaps = [
      ["zh", "z"], ["ch", "c"], ["sh", "s"],
      ["z", "zh"], ["c", "ch"], ["s", "sh"],
      ["n", "l"], ["l", "n"],
      ["f", "h"], ["h", "f"],
      ["b", "p"], ["p", "b"],
      ["d", "t"], ["t", "d"],
      ["g", "k"], ["k", "g"],
      ["j", "q"], ["q", "j"],
      ["x", "sh"], ["r", "l"],
    ];
    for (let i = 0; i < swaps.length; i++) {
      const a = swaps[i][0];
      const b = swaps[i][1];
      if (base.startsWith(a) && (a.length > 1 || !base.startsWith(a + "h"))) {
        // avoid zh matching z
        if (a.length === 1 && (base.startsWith("zh") || base.startsWith("ch") || base.startsWith("sh"))) {
          continue;
        }
        return base.replace(a, b) + m[2];
      }
    }

    // Similar final tweaks
    const finals = [
      ["an", "ang"], ["ang", "an"],
      ["en", "eng"], ["eng", "en"],
      ["in", "ing"], ["ing", "in"],
      ["ian", "iang"], ["iang", "ian"],
      ["uan", "uang"], ["uang", "uan"],
      ["ao", "ou"], ["ou", "ao"],
      ["ei", "ui"], ["ie", "üe"],
    ];
    for (let i = 0; i < finals.length; i++) {
      const a = finals[i][0];
      const b = finals[i][1];
      if (base.endsWith(a)) {
        return base.slice(0, -a.length) + b + m[2];
      }
    }

    // fallback: wrong tone
    let t2 = ((tone % 4) + 1);
    if (t2 === tone) t2 = tone === 1 ? 2 : 1;
    return base + t2;
  }

  function makeDistractors(word, count) {
    const correct = normalizePinyin(word.pinyin);
    const correctSyls = syllables(correct);
    const set = new Set([correct.replace(/ /g, "")]);
    const out = [];

    // Generate near-miss variants of this word
    let attempts = 0;
    while (out.length < count && attempts < 80) {
      attempts++;
      let variant;
      if (correctSyls.length === 1) {
        variant = nearMissSyllable(correctSyls[0]);
      } else {
        const idx = Math.floor(Math.random() * correctSyls.length);
        const copy = correctSyls.slice();
        copy[idx] = nearMissSyllable(copy[idx]);
        // sometimes change another syllable's tone
        if (Math.random() < 0.35 && correctSyls.length > 1) {
          const j = (idx + 1) % correctSyls.length;
          copy[j] = nearMissSyllable(copy[j]);
        }
        variant = copy.join(" ");
      }
      const key = variant.replace(/ /g, "");
      if (!set.has(key)) {
        set.add(key);
        out.push(variant);
      }
    }

    // Fill from other words if needed
    const pool = shuffle(WORDS);
    for (let i = 0; i < pool.length && out.length < count; i++) {
      if (pool[i].hanzi === word.hanzi) continue;
      const p = normalizePinyin(pool[i].pinyin);
      const key = p.replace(/ /g, "");
      if (!set.has(key)) {
        set.add(key);
        out.push(p);
      }
    }

    return out.slice(0, count);
  }

  function updateStats() {
    els.scoreCorrect.textContent = String(state.correct);
    els.scoreTotal.textContent = String(state.total);
    const acc = state.total === 0 ? 0 : Math.round((state.correct / state.total) * 100);
    els.scoreAccuracy.textContent = acc + "%";
    els.scoreStreak.textContent = String(state.streak);
    els.progress.textContent = state.deck.length
      ? state.index + 1 + " / " + state.deck.length
      : "—";
  }

  function clearFeedback() {
    els.feedback.textContent = "";
    els.feedback.className = "feedback";
    els.reveal.hidden = true;
    els.reveal.innerHTML = "";
    els.nextBtn.hidden = true;
  }

  function showReveal(word, usedNumbers) {
    els.reveal.hidden = false;
    const marks = word.pinyinMarks || word.pinyin;
    const nums = word.pinyin;
    let html = '<div class="reveal-row"><span class="label">拼音</span> <strong class="marks">' +
      escapeHtml(marks) + "</strong></div>";
    if (usedNumbers) {
      html += '<div class="reveal-row hint"><span class="label">聲調提示</span> ' +
        escapeHtml(nums) + " → " + escapeHtml(marks) + "</div>";
    } else {
      html += '<div class="reveal-row hint"><span class="label">數字聲調</span> ' +
        escapeHtml(nums) + "</div>";
    }
    if (word.meaning) {
      html += '<div class="reveal-row"><span class="label">意思</span> ' +
        escapeHtml(word.meaning) + "</div>";
    }
    els.reveal.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }


  // --- Speech: bundled Mandarin MP3s (offline; avoids HK Web Speech Cantonese) ---
  const AUDIO_MAP = window.PINYIN_AUDIO || {};
  let ttsAudio = null;

  function speechSupported() {
    return typeof Audio !== "undefined";
  }

  function setSpeaking(on) {
    if (els.btnSpeak) {
      if (on) els.btnSpeak.classList.add("speaking");
      else els.btnSpeak.classList.remove("speaking");
    }
  }

  function showSpeakNote(msg) {
    if (!els.speakNote) return;
    els.speakNote.hidden = false;
    els.speakNote.textContent = msg;
  }

  function hideSpeakNote() {
    if (els.speakNote) els.speakNote.hidden = true;
  }

  function cancelSpeech() {
    if (ttsAudio) {
      try {
        ttsAudio.onended = null;
        ttsAudio.onerror = null;
        ttsAudio.pause();
        ttsAudio.removeAttribute("src");
        ttsAudio.load();
      } catch (e) { /* ignore */ }
      ttsAudio = null;
    }
    setSpeaking(false);
  }

  function playLocalAudio(path) {
    return new Promise(function (resolve, reject) {
      const audio = new Audio();
      ttsAudio = audio;
      audio.preload = "auto";
      let settled = false;
      function done(ok, err) {
        if (settled) return;
        settled = true;
        if (ttsAudio === audio) ttsAudio = null;
        setSpeaking(false);
        if (ok) resolve();
        else reject(err || new Error("audio error"));
      }
      audio.onended = function () { done(true); };
      audio.onerror = function () { done(false, new Error("audio error")); };
      audio.onplaying = function () { setSpeaking(true); };
      audio.src = path;
      const p = audio.play();
      if (p && typeof p.then === "function") {
        p.catch(function (err) { done(false, err); });
      }
    });
  }

  function speakHanzi(text, opts) {
    opts = opts || {};
    if (!text) return;
    cancelSpeech();

    function run() {
      const path = AUDIO_MAP[text];
      if (!path) {
        setSpeaking(false);
        showSpeakNote("此詞未有預錄普通話音檔 · No bundled Mandarin audio for this word");
        return;
      }
      playLocalAudio(path).then(function () {
        hideSpeakNote();
      }).catch(function (err) {
        setSpeaking(false);
        // Autoplay block is common on first load; ask user to tap 發音
        const name = err && err.name ? err.name : "";
        if (name === "NotAllowedError") {
          showSpeakNote("請先撳「🔊 發音」解鎖聲音（瀏覽器限制）· Tap Speak once to unlock audio");
        } else {
          showSpeakNote("音檔播放失敗 · Could not play bundled Mandarin audio");
        }
      });
    }

    if (opts.immediate) run();
    else setTimeout(run, 40);
  }

  function scheduleAutoSpeak(word) {
    if (!word || !word.hanzi) return;
    if (!state.speechReady || !state.autoSpeak) return;
    cancelSpeech();
    setTimeout(function () {
      if (!state.current || state.current.hanzi !== word.hanzi) return;
      if (!state.autoSpeak) return;
      speakHanzi(word.hanzi);
    }, 280);
  }

  function initSpeechUI() {
    const ok = speechSupported();
    state.speechReady = ok;
    if (!els.speakRow) return;
    if (!ok) {
      els.speakRow.classList.add("unsupported");
      showSpeakNote("此瀏覽器唔支援音訊播放");
      return;
    }
    hideSpeakNote();

    try {
      const saved = localStorage.getItem(AUTO_SPEAK_KEY);
      if (saved === "0") state.autoSpeak = false;
      else if (saved === "1") state.autoSpeak = true;
    } catch (e) { /* ignore */ }
    if (els.autoSpeak) {
      els.autoSpeak.checked = state.autoSpeak;
      els.autoSpeak.addEventListener("change", function () {
        state.autoSpeak = !!els.autoSpeak.checked;
        try {
          localStorage.setItem(AUTO_SPEAK_KEY, state.autoSpeak ? "1" : "0");
        } catch (e2) { /* ignore */ }
        if (!state.autoSpeak) cancelSpeech();
      });
    }
    if (els.btnSpeak) {
      els.btnSpeak.addEventListener("click", function () {
        if (!state.current) return;
        hideSpeakNote();
        speakHanzi(state.current.hanzi, { immediate: true });
      });
    }
  }

  function userUsedToneNumbers(raw) {
    return /[1-5]/.test(raw || "");
  }

  function finishAnswer(isCorrect, word) {
    state.answered = true;
    state.total += 1;
    if (isCorrect) {
      state.correct += 1;
      state.streak += 1;
      if (state.streak > state.bestStreak) state.bestStreak = state.streak;
      els.feedback.textContent = "✓ 正確！Correct";
      els.feedback.className = "feedback ok";
    } else {
      state.streak = 0;
      els.feedback.textContent = "✗ 唔啱 — 正確答案：" + word.pinyinMarks + "（" + word.pinyin + "）";
      els.feedback.className = "feedback bad";
    }
    const usedNums = state.mode === "type"
      ? userUsedToneNumbers(els.pinyinInput.value)
      : true;
    showReveal(word, usedNums);
    els.nextBtn.hidden = false;
    updateStats();

    if (state.mode === "type") {
      els.pinyinInput.disabled = true;
      els.submitBtn.disabled = true;
    } else {
      Array.prototype.forEach.call(els.choices.querySelectorAll("button"), function (btn) {
        btn.disabled = true;
        const val = btn.getAttribute("data-pinyin");
        if (normalizePinyin(val).replace(/ /g, "") === normalizePinyin(word.pinyin).replace(/ /g, "")) {
          btn.classList.add("correct");
        } else if (btn.classList.contains("picked") && !isCorrect) {
          btn.classList.add("wrong");
        }
      });
    }
    // Focus Next after cooldown so the same Enter that submitted cannot also activate it
    setTimeout(function () {
      if (!els.nextBtn.hidden) els.nextBtn.focus();
    }, 500);
  }

  function loadQuestion() {
    clearFeedback();
    state.answered = false;

    if (!state.deck.length || state.index >= state.deck.length) {
      // reshuffle for continuous practice
      state.deck = shuffle(filteredWords());
      state.index = 0;
      if (!state.deck.length) {
        els.hanzi.textContent = "—";
        els.meaning.textContent = "沒有詞彙（試吓改篩選）";
        cancelSpeech();
        return;
      }
    }

    const word = state.deck[state.index];
    state.current = word;
    els.hanzi.textContent = word.hanzi;
    els.meaning.textContent = word.meaning || "";
    updateStats();

    if (state.mode === "type") {
      els.typeArea.hidden = false;
      els.choiceArea.hidden = true;
      els.pinyinInput.disabled = false;
      els.submitBtn.disabled = false;
      els.pinyinInput.value = "";
      els.pinyinInput.focus();
    } else {
      els.typeArea.hidden = true;
      els.choiceArea.hidden = false;
      const distractors = makeDistractors(word, 3);
      const options = shuffle([normalizePinyin(word.pinyin)].concat(distractors));
      state.choices = options;
      els.choices.innerHTML = "";
      options.forEach(function (opt) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "choice-btn";
        btn.setAttribute("data-pinyin", opt);
        btn.textContent = opt;
        btn.addEventListener("click", function () {
          if (state.answered) return;
          btn.classList.add("picked");
          const ok = answersMatch(opt, word.pinyin);
          finishAnswer(ok, word);
        });
        els.choices.appendChild(btn);
      });
    }

    scheduleAutoSpeak(word);
  }

  function submitType() {
    if (state.answered || state.mode !== "type") return;
    const word = state.current;
    if (!word) return;
    const raw = els.pinyinInput.value;
    if (!raw.trim()) {
      els.feedback.textContent = "請輸入拼音 / Please type pinyin";
      els.feedback.className = "feedback warn";
      return;
    }
    const ok = answersMatch(raw, word.pinyin);
    finishAnswer(ok, word);
  }

  function nextQuestion() {
    if (!state.answered) return;
    state.index += 1;
    loadQuestion();
  }

  function startGame(mode) {
    state.mode = mode;
    state.filter = els.filterSelect ? els.filterSelect.value : "all";
    state.deck = shuffle(filteredWords());
    state.index = 0;
    state.correct = 0;
    state.total = 0;
    state.streak = 0;
    state.answered = false;
    els.modeBadge.textContent = mode === "type" ? "輸入拼音" : "多選一";
    showScreen("play");
    updateStats();
    loadQuestion();
  }

  function goHome() {
    state.mode = null;
    cancelSpeech();
    showScreen("home");
  }

  // --- Events ---
  document.querySelectorAll("[data-start]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      startGame(btn.getAttribute("data-start"));
    });
  });

  $("btn-home").addEventListener("click", goHome);
  $("btn-restart").addEventListener("click", function () {
    if (state.mode) startGame(state.mode);
  });

  if (els.filterSelect) {
    els.filterSelect.addEventListener("change", function () {
      state.filter = els.filterSelect.value;
      if (state.mode) {
        state.deck = shuffle(filteredWords());
        state.index = 0;
        state.answered = false;
        loadQuestion();
      }
    });
  }

  // Prevent one Enter from both submitting and advancing (form submit + keydown, or focus jumping to Next)
  let enterCooldownUntil = 0;
  function armEnterCooldown() {
    enterCooldownUntil = Date.now() + 450;
  }
  function enterCooling() {
    return Date.now() < enterCooldownUntil;
  }

  // Form submit = Enter in the input OR clicking 提交
  if (els.typeForm) {
    els.typeForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (enterCooling()) return;
      if (state.answered) return; // next is handled by document / Next button only
      armEnterCooldown();
      submitType();
    });
  } else {
    els.submitBtn.addEventListener("click", submitType);
  }
  els.nextBtn.addEventListener("click", function () {
    if (enterCooling()) return;
    nextQuestion();
  });

  function isEnterKey(e) {
    return e.key === "Enter" || e.code === "Enter" || e.keyCode === 13;
  }

  function isImeComposing(e) {
    return e.isComposing || e.keyCode === 229;
  }

  // Global Enter: submit in type mode, or go next after answering
  document.addEventListener("keydown", function (e) {
    if (!screens.play.classList.contains("active")) return;
    if (isImeComposing(e)) return;

    if (isEnterKey(e)) {
      if (enterCooling()) {
        e.preventDefault();
        return;
      }

      // Let the form own Enter while typing in the input (avoids double-fire with submit event)
      const inTypeInput = document.activeElement === els.pinyinInput;
      if (inTypeInput && els.typeForm && !state.answered && !els.pinyinInput.disabled) {
        return;
      }

      e.preventDefault();
      if (state.answered) {
        armEnterCooldown();
        nextQuestion();
        return;
      }
      if (state.mode === "type") {
        armEnterCooldown();
        submitType();
        return;
      }
    }

    // number keys 1-4 for multiple choice
    if (state.mode === "choice" && !state.answered && /^[1-4]$/.test(e.key)) {
      const idx = parseInt(e.key, 10) - 1;
      const buttons = els.choices.querySelectorAll("button");
      if (buttons[idx]) buttons[idx].click();
    }
  });

  // Word count on home
  const countEl = $("word-count");
  if (countEl) countEl.textContent = String(WORDS.length);

  initSpeechUI();
  showScreen("home");
})();
