# Pinyin Practice

An offline Mandarin pinyin mini-game for learners. Practice typing pinyin with tone numbers, or drill with multiple choice. Includes a starter HSK1–HSK2 word bank and browser-based Mandarin pronunciation.

Built for Frankie Hung.

## Features

- **Type mode** — see a character or word, type the pinyin (tone numbers preferred)
- **Multiple choice** — pick the correct pinyin from four near-miss options
- **Filters** — all cards, single characters, or multi-character words
- **Scoring** — correct count, accuracy, and streak
- **Pronunciation** — auto-speak on each question, plus a replay button (Web Speech API)
- **Keyboard-friendly** — Enter to submit / next; `1`–`4` for choices

No install, no build step, no CDN. Open `index.html` and play.

## Quick start

1. Clone this repository (or download the files).
2. Open `index.html` in Chrome, Edge, Firefox, or Safari.

Optional local server:

```bash
python3 -m http.server 8765
# then open http://localhost:8765/
```

## How to play

### Type pinyin

- Type tone numbers, e.g. `ni3 hao3`
- Tone marks also work, e.g. `nǐ hǎo`
- Type `ü` as `v` or `u:`
- Neutral tone is `5` (e.g. `ma1 ma5`)
- Case and spacing are flexible
- Press **Enter** to submit; press **Enter** again for the next question

### Multiple choice

- Choose one of four options, or press `1`–`4`
- Wrong options are plausible near-misses (wrong tone or similar spelling)

### Pronunciation

Plays **Mandarin** audio over the network (Youdao dictvoice `type=0`, with Google Translate TTS as fallback). This avoids Hong Kong devices reading 汉字 with the system Cantonese voice via Web Speech.

- **Auto-speak:** each new question plays Mandarin audio when **自動朗讀** is on (saved in `localStorage`)
- **Replay:** tap **🔊 發音** anytime
- Needs a network connection for audio
- On some phones, the first auto-play may be blocked until you tap **發音** once (browser autoplay policy)


## Controls

| Action | Effect |
|--------|--------|
| Enter | Submit answer, or go to next after answering |
| 1–4 | Select multiple-choice option |
| Speak | Replay pronunciation |
| Auto-speak | Toggle auto pronunciation (saved locally) |
| Home | Back to mode select |
| Restart | Reset score and reshuffle |

## Project structure

| File | Description |
|------|-------------|
| `index.html` | App shell (home + play screens) |
| `style.css` | Dark theme layout |
| `words.js` | Word bank (~278 HSK1–HSK2 entries) |
| `game.js` | Game logic, scoring, speech |
| `README.md` | This file |

## Limitations

- Citation forms only (no full tone-sandhi engine)
- Some characters have multiple readings; the deck uses the common HSK sense
- Pronunciation quality depends on the OS/browser Chinese voice pack
- UI labels are Traditional Chinese; deck hanzi are mostly simplified (HSK style)

## License

Personal learning project. Feel free to fork and adapt for your own study.
