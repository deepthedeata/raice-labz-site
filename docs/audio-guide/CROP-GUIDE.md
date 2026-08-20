# Crop Guide — do NOT paste this into the TTS tool

Each `script-<lang>.txt` file has exactly **9 paragraphs**, separated by one blank line, always in this fixed order. After you generate the audio for a language in one go, use the pauses at the blank-line breaks to cut it into 9 clips, and name them like this:

| # | Paragraph is about | Save the clip as |
|---|---|---|
| 1 | Procurement Analysis — Test Preparation | `procurement_preparation_<lang>.mp3` |
| 2 | Procurement Analysis — Live Analysis | `procurement_live_<lang>.mp3` |
| 3 | Procurement Analysis — Insights & Reports | `procurement_reports_<lang>.mp3` |
| 4 | Production Analysis — Test Preparation | `production_preparation_<lang>.mp3` |
| 5 | Production Analysis — Live Analysis | `production_live_<lang>.mp3` |
| 6 | Production Analysis — Insights & Reports | `production_reports_<lang>.mp3` |
| 7 | Milled Rice Quality Analysis — Test Preparation | `milled_preparation_<lang>.mp3` |
| 8 | Milled Rice Quality Analysis — Live Analysis | `milled_live_<lang>.mp3` |
| 9 | Milled Rice Quality Analysis — Insights & Reports | `milled_reports_<lang>.mp3` |

Replace `<lang>` with the language code of the file you converted:

- `script-en.txt` → `en`
- `script-hi.txt` → `hi`
- `script-kn.txt` → `kn`
- `script-ta.txt` → `ta`
- `script-te.txt` → `te`
- `script-ml.txt` → `ml`

Once you've got all the cropped clips, send them over (or tell me where they're saved) and I'll wire them into the app so each analysis step plays its matching clip.
