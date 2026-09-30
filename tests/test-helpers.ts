import { test as base, expect } from "@playwright/test"
import path from "node:path"

export const STORAGE_STATE = path.join(__dirname, ".auth", "user.json")

export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL ?? "demo@panelmaker.local",
  password: process.env.TEST_USER_PASSWORD ?? process.env.DEMO_USER_PASSWORD ?? "PanelMakerDemo2026!",
}

export const LOGGED_OUT = { cookies: [], origins: [] }

export const SEEDED = {
  PROTEIN_ID: "P07766",
  CELL_TYPE_ID: "CL:0000084",
}

const IGNORED_CONSOLE_ERRORS = [
  "favicon",
  "Third-party",
  "Extension",
  "Download the React DevTools",
  "the server responded with a status of 404",
  "net::ERR_",
]

type ConsoleGuardFixtures = {
  allowConsoleErrors: boolean
  consoleGuard: void
}

export const test = base.extend<ConsoleGuardFixtures>({
  allowConsoleErrors: [false, { option: true }],

  consoleGuard: [
    async ({ page, allowConsoleErrors }, use) => {
      const errors: string[] = []

      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text())
      })
      page.on("pageerror", (error) => errors.push(error.message))

      await use()

      if (allowConsoleErrors) return

      const unexpected = errors.filter((error) => !IGNORED_CONSOLE_ERRORS.some((ignored) => error.includes(ignored)))
      expect(unexpected, `Unexpected browser console errors:\n${unexpected.join("\n")}`).toHaveLength(0)
    },
    { auto: true },
  ],
})

export { expect }

export const TEST_DATA = {
  COMMON_PAGES: [
    { path: "/", name: "Home", heading: "antibody validation" },
    { path: "/browse", name: "Browse", heading: "Browse" },
    { path: "/panel", name: "Panel Designer", heading: "Panel Designer" },
    { path: "/docs", name: "Documentation", heading: "PanelMaker Introduction" },
    { path: "/leaderboard", name: "Community", heading: "Community Leaderboard" },
  ],

  LEGAL_PAGES: [
    { path: "/docs/legal/terms", name: "Terms", heading: "Terms and Conditions" },
    { path: "/docs/legal/privacy", name: "Privacy", heading: "Privacy Policy" },
    { path: "/docs/legal/notice", name: "Legal Notice", heading: "Legal Notice" },
  ],
}
