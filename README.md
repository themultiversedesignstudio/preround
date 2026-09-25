# PreRound

A study companion for medicine. Import lecture slides, hear them read aloud, then quiz yourself from the same notes.

Imported files stay in this browser until you ask TonTon. That question, and the slide text needed to answer it, are sent to ChatGPT.

## What it does

- Import PDF, PowerPoint (`.pptx`), Markdown, or plain text
- Split the deck into slides and keep them in this browser
- Read a slide or the rest of the deck with the browser speech engine
- Build multiple-choice, fill-in-the-blank, and true/false questions from the text
- Flip flashcards
- Ask TonTon, who answers from the imported lecture through ChatGPT

TonTon needs an `OPENAI_API_KEY` on the server. In Vercel, open the `preroundz` project, add that environment variable, and redeploy. Optional: set `OPENAI_MODEL` (the default is `gpt-4.1-mini`).

Image-only scans have no text to extract. Paste the notes instead, or export a text-based PDF.

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43173](http://127.0.0.1:43173).

## Try it without a file

Use **Try a sample lecture** on the home page. That loads a short wound-healing deck used in reconstructive surgery teaching.
