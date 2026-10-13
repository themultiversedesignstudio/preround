"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, Search, X, type LucideIcon } from "lucide-react"

import { cn } from "cn"

export type ShellNavItem = {
  label: string
  icon: LucideIcon
  href?: string
  onClick?: () => void
  active?: boolean
}

export function AppShell({
  title,
  nav,
  children,
  search,
  onSearch,
  searchPlaceholder = "Search",
  footer,
  right,
  dockRight = false,
  onFiles,
}: {
  title: string
  nav: ShellNavItem[]
  children: React.ReactNode
  search?: string
  onSearch?: (value: string) => void
  searchPlaceholder?: string
  footer?: React.ReactNode
  right?: React.ReactNode
  dockRight?: boolean
  onFiles?: (files: File[]) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  return (
    <div
      className="min-h-dvh bg-background p-2 sm:p-4 md:p-5"
      onDragOver={(event) => {
        if (!onFiles) return
        event.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return
        setDragOver(false)
      }}
      onDrop={(event) => {
        if (!onFiles) return
        event.preventDefault()
        setDragOver(false)
        onFiles([...event.dataTransfer.files])
      }}
    >
      <div className="relative mx-auto flex min-h-[calc(100dvh-1rem)] max-w-[1440px] flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_-36px_rgba(92,28,40,0.42)] md:min-h-[calc(100dvh-2.5rem)] md:flex-row">
        <aside className="flex w-full shrink-0 flex-col md:w-[228px] md:border-r md:border-black/5">
          <div className="flex items-center justify-between px-4 pt-4 pb-2 md:px-5 md:pt-5">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-primary text-lg shadow-sm">
                <span aria-hidden="true">🐣</span>
              </span>
              <span className="text-[15px] font-extrabold tracking-tight text-[#2c181c]">
                Çalış Kız
              </span>
            </Link>
            <button
              type="button"
              className="grid size-9 place-items-center rounded-xl text-[#7a565b] hover:bg-[#f8eeef] md:hidden"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
          <nav
            className={cn(
              "flex-col gap-1 px-3 pb-3",
              menuOpen ? "flex" : "hidden md:flex"
            )}
          >
            {nav.map((item) => {
              const Icon = item.icon
              const className = cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-[#7a565b] transition-colors hover:bg-[#f8eeef]",
                item.active && "bg-[#f8e6e8] text-[#3d1c22]"
              )
              const inner = (
                <>
                  <Icon className="size-[18px]" />
                  {item.label}
                </>
              )
              if (item.href) {
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    aria-current={item.active ? "page" : undefined}
                    className={className}
                    onClick={() => {
                      item.onClick?.()
                      setMenuOpen(false)
                    }}
                  >
                    {inner}
                  </Link>
                )
              }
              return (
                <button
                  key={item.label}
                  type="button"
                  aria-current={item.active ? "page" : undefined}
                  className={className}
                  onClick={() => {
                    item.onClick?.()
                    setMenuOpen(false)
                  }}
                >
                  {inner}
                </button>
              )
            })}
          </nav>
          {footer ? (
            <div
              className={cn(
                "px-3 pb-4 md:mt-auto",
                menuOpen ? "block" : "hidden md:block"
              )}
            >
              {footer}
            </div>
          ) : null}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col xl:flex-row">
          <div className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6">
            <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <h1 className="text-[28px] leading-tight font-extrabold tracking-tight break-words text-[#2a1619]">
                {title}
              </h1>
              {onSearch ? (
                <label className="flex h-11 w-full items-center gap-2 rounded-full bg-[#f6f0f1] px-4 text-sm text-[#8d656b] lg:max-w-sm">
                  <Search className="size-4 shrink-0" />
                  <input
                    value={search ?? ""}
                    onChange={(event) => onSearch(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full bg-transparent text-foreground outline-none placeholder:text-[#a0787e]"
                  />
                </label>
              ) : null}
            </header>
            {children}
          </div>
          {right ? (
            <aside
              className={cn(
                "flex w-full shrink-0 flex-col border-t border-black/5 px-4 py-6 sm:px-6 xl:w-[340px] xl:border-t-0 xl:border-l",
                dockRight
                  ? "max-xl:hidden xl:h-[calc(100dvh-2.5rem)] xl:overflow-hidden"
                  : "xl:sticky xl:top-5 xl:max-h-[calc(100dvh-2.5rem)] xl:self-start xl:overflow-y-auto"
              )}
            >
              {right}
            </aside>
          ) : null}
        </div>

        {dragOver ? (
          <div className="pointer-events-none absolute inset-3 z-30 grid place-items-center rounded-[24px] border-2 border-dashed border-primary bg-primary/10 text-lg font-bold text-primary">
            Drop lectures to import
          </div>
        ) : null}
      </div>
    </div>
  )
}
