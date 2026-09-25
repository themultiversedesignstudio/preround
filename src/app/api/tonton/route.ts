import { retrieveSlides } from "@/lib/generate-study"
import type { Slide } from "@/lib/types"

type IncomingTurn = { role: "you" | "tonton"; text: string }

const MAX_QUESTION = 2000
const MAX_SLIDES = 40
const MAX_SLIDE_TEXT = 4000
const MAX_HISTORY = 8

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    return Response.json(
      {
        error:
          "TonTon is not connected yet. Add OPENAI_API_KEY in the Vercel project settings, then redeploy.",
      },
      { status: 503 }
    )
  }

  let body: { question?: unknown; slides?: unknown; history?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "TonTon could not read that question." }, { status: 400 })
  }

  const question = typeof body.question === "string" ? body.question.trim() : ""
  if (!question || question.length > MAX_QUESTION) {
    return Response.json({ error: "Ask TonTon a shorter question." }, { status: 400 })
  }

  const slides = normalizeSlides(body.slides)
  if (!slides.length) {
    return Response.json(
      { error: "Open a lecture before asking TonTon." },
      { status: 400 }
    )
  }

  const history = normalizeHistory(body.history)
  const focused = retrieveSlides(slides, question, 6)
  const contextSlides = focused.length ? focused : slides.slice(0, 6)
  const lecture = slides
    .map((slide) => `Slide ${slide.index} — ${slide.title}\n${slide.text}`)
    .join("\n\n")

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini"
  const completion = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are TonTon, a study companion inside PreRound.",
            "Answer the student's question using the lecture slides below.",
            "Speak in plain, direct language. Do not invent facts that are not supported by the slides.",
            "If the slides do not cover the question, say so.",
            'Reply as JSON: {"answer":"string","slideIndexes":[1,2]}',
            "slideIndexes must be slide numbers you actually used, or an empty array.",
            "",
            lecture,
          ].join("\n"),
        },
        ...history.map((turn) => ({
          role: turn.role === "you" ? "user" : "assistant",
          content: turn.text,
        })),
        {
          role: "user",
          content: `Question: ${question}\n\nSlides most related to this question: ${contextSlides
            .map((slide) => slide.index)
            .join(", ")}`,
        },
      ],
    }),
  })

  if (!completion.ok) {
    return Response.json(
      { error: "ChatGPT did not answer. Check the OpenAI key and try again." },
      { status: 502 }
    )
  }

  const payload = (await completion.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = payload.choices?.[0]?.message?.content
  const parsed = parseTonTon(content)
  if (!parsed) {
    return Response.json(
      { error: "TonTon sent a reply that could not be read." },
      { status: 502 }
    )
  }

  const sources = parsed.slideIndexes
    .map((index) => slides.find((slide) => slide.index === index))
    .filter((slide): slide is Slide => Boolean(slide))

  return Response.json({ answer: parsed.answer, sources })
}

function normalizeSlides(value: unknown): Slide[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, MAX_SLIDES).flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const slide = item as Partial<Slide>
    if (typeof slide.index !== "number" || typeof slide.text !== "string") return []
    return [
      {
        index: slide.index,
        title: typeof slide.title === "string" ? slide.title.slice(0, 200) : `Slide ${slide.index}`,
        text: slide.text.slice(0, MAX_SLIDE_TEXT),
      },
    ]
  })
}

function normalizeHistory(value: unknown): IncomingTurn[] {
  if (!Array.isArray(value)) return []
  return value.slice(-MAX_HISTORY).flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const turn = item as Partial<IncomingTurn>
    if ((turn.role !== "you" && turn.role !== "tonton") || typeof turn.text !== "string") {
      return []
    }
    return [{ role: turn.role, text: turn.text.slice(0, 4000) }]
  })
}

function parseTonTon(content: string | undefined) {
  if (!content) return null
  try {
    const data = JSON.parse(content) as { answer?: unknown; slideIndexes?: unknown }
    if (typeof data.answer !== "string" || !data.answer.trim()) return null
    const slideIndexes = Array.isArray(data.slideIndexes)
      ? data.slideIndexes.filter((index): index is number => typeof index === "number")
      : []
    return { answer: data.answer.trim(), slideIndexes }
  } catch {
    return null
  }
}
