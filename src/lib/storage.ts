import { useSyncExternalStore } from "react"

import type { StudyDoc } from "@/lib/types"

const KEY = "preround-docs-v1"
const EVENT = "preround-change"

function notify() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT))
  }
}

export function loadDocs(): StudyDoc[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StudyDoc[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveDocs(docs: StudyDoc[]) {
  localStorage.setItem(KEY, JSON.stringify(docs))
  notify()
}

export function upsertDoc(doc: StudyDoc) {
  const docs = loadDocs().filter((item) => item.id !== doc.id)
  docs.unshift(doc)
  saveDocs(docs)
}

export function deleteDoc(id: string) {
  saveDocs(loadDocs().filter((item) => item.id !== id))
}

export function getDoc(id: string): StudyDoc | undefined {
  return loadDocs().find((item) => item.id === id)
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener(EVENT, onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(EVENT, onChange)
  }
}

function getSnapshot() {
  return localStorage.getItem(KEY) ?? "[]"
}

function getServerSnapshot() {
  return "[]"
}

export function useDocs(): StudyDoc[] {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  try {
    const parsed = JSON.parse(raw) as StudyDoc[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
