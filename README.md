# Pinyin Practice

An offline Mandarin pinyin mini-game for learners. Practice typing pinyin with tone numbers, or drill with multiple choice. Includes a starter HSK1–HSK2 word bank and **bundled Mandarin MP3 pronunciation** (works offline on GitHub Pages and on phone Safari).

Built for Frankie Hung.

## Features

- **Type mode** — see a character or word, type the pinyin (tone numbers preferred)
- **Multiple choice** — pick the correct pinyin from four near-miss options
- **Filters** — all cards, single characters, or multi-character words
- **Scoring** — correct count, accuracy, and streak
- **Pronunciation** — pre-generated Mandarin MP3s (`zh-CN` neural TTS), auto-speak + replay, **no network TTS required**
- **Keyboard-friendly** — Enter to submit / next; `1`–`4` for choices

No install, no build step, no CDN. Open `index.html` and play.

## Quick start

1. Clone this repository (or download the files).
2. Open `index.html` in Chrome, Edge, Firefox, or Safari.

Or play the hosted site: https://frankie-hung.github.io/pinyin-practice/

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

Each word has a **bundled Mandarin MP3** under `audio/` (generated with Microsoft Edge neural voice `zh-CN-XiaoxiaoNeural`). Playback is local — it does **not** use the device Web Speech API (which often reads 汉字 as Cantonese on Hong Kong phones) and does **not** call Youdao/Google TTS.

- **Auto-speak:** each new question plays when **自動朗讀** is on (saved in `localStorage`)
- **Replay:** tap **🔊 發音** anytime
- Works offline once the page and audio files are cached / served from Pages
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

| File / folder | Description |
|---------------|-------------|
| `index.html` | App shell (home + play screens) |
| `style.css` | Dark theme layout |
| `words.js` | Word bank (~278 HSK1–HSK2 entries) |
| `audio-manifest.js` | Map of hanzi → `audio/<hash>.mp3` |
| `audio/` | Bundled Mandarin MP3 files |
| `game.js` | Game logic, scoring, local audio playback |
| `README.md` | This file |

## Limitations

- Citation forms only (no full tone-sandhi engine)
- Some characters have multiple readings; the deck uses the common HSK sense
- UI labels are Traditional Chinese; deck hanzi are mostly simplified (HSK style)

## License

Personal learning project. Feel free to fork and adapt for your own study.
