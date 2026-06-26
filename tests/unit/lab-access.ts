// Standalone assertions for the security-critical pure access/visibility logic.
// Run with: npx tsx tests/unit/lab-access.ts
// The access/visibility modules use type-only Prisma imports (erased at runtime), so this needs no DB.
import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import {
  canDoLabAction,
  canEditResource,
  canViewResource,
  ROLE_RANK,
  type ResourceVisibility,
  type ViewerContext,
} from "../../models/lab/access"
import { buildPanelVisibilityWhere, buildReportVisibilityWhere } from "../../models/lab/visibility"

let failures = 0
function check(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ok  ${name}`)
  } catch (error) {
    failures += 1
    console.error(`FAIL  ${name}\n      ${error instanceof Error ? error.message : String(error)}`)
  }
}

const member: ViewerContext = {
  userId: "u1",
  labIds: ["labA"],
  roleByLab: { labA: "MEMBER" },
  isAdmin: false,
}
const admin: ViewerContext = {
  userId: "u2",
  labIds: ["labA"],
  roleByLab: { labA: "ADMIN" },
  isAdmin: false,
}
const outsider: ViewerContext = { userId: "u3", labIds: ["labB"], roleByLab: { labB: "OWNER" }, isAdmin: false }

const publicRes: ResourceVisibility = { ownerId: "owner", visibility: "PUBLIC", owningLabId: null, sharedLabIds: [] }
const privateRes: ResourceVisibility = { ownerId: "u1", visibility: "PRIVATE", owningLabId: null, sharedLabIds: [] }
const labRes: ResourceVisibility = { ownerId: "owner", visibility: "LAB", owningLabId: "labA", sharedLabIds: ["labA"] }

check("ROLE_RANK is ordered VIEWER<MEMBER<ADMIN<OWNER", () => {
  assert.ok(ROLE_RANK.VIEWER < ROLE_RANK.MEMBER)
  assert.ok(ROLE_RANK.MEMBER < ROLE_RANK.ADMIN)
  assert.ok(ROLE_RANK.ADMIN < ROLE_RANK.OWNER)
})

check("PUBLIC resource is visible to anonymous (null viewer)", () => {
  assert.equal(canViewResource(null, publicRes), true)
})

check("PRIVATE/LAB resources are NOT visible to anonymous", () => {
  assert.equal(canViewResource(null, privateRes), false)
  assert.equal(canViewResource(null, labRes), false)
})

check("owner can view their PRIVATE resource", () => {
  assert.equal(canViewResource(member, privateRes), true)
})

check("LAB resource visible to a member of the shared lab, not to an outsider", () => {
  assert.equal(canViewResource(member, labRes), true)
  assert.equal(canViewResource(outsider, labRes), false)
})

check("edit: owner edits own; lab ADMIN edits shared; plain MEMBER cannot edit another's", () => {
  // owner of labRes is "owner"; member u1 is only a MEMBER of labA -> cannot edit
  assert.equal(canEditResource(member, labRes), false)
  // admin of labA can edit a resource shared with labA even though not the owner
  assert.equal(canEditResource(admin, labRes), true)
  // outsider cannot edit
  assert.equal(canEditResource(outsider, labRes), false)
  // the owner can always edit
  assert.equal(canEditResource({ ...member, userId: "owner" }, labRes), true)
})

check("canDoLabAction matrix", () => {
  assert.equal(canDoLabAction("OWNER", "delete_lab"), true)
  assert.equal(canDoLabAction("ADMIN", "delete_lab"), false)
  assert.equal(canDoLabAction("ADMIN", "invite"), true)
  assert.equal(canDoLabAction("MEMBER", "invite"), false)
  assert.equal(canDoLabAction("MEMBER", "manage_inventory"), true)
  assert.equal(canDoLabAction("VIEWER", "manage_inventory"), false)
  assert.equal(canDoLabAction(undefined, "create_resource"), false)
})

check("buildReportVisibilityWhere(null) yields PUBLIC-only (single clause)", () => {
  const where = buildReportVisibilityWhere(null)
  assert.ok(Array.isArray(where.OR))
  assert.equal(where.OR!.length, 1)
  assert.deepEqual(where.OR![0], { status: "PUBLISHED", experiment: { visibility: "PUBLIC" } })
})

check("buildReportVisibilityWhere(member) adds own + lab clauses (3 total)", () => {
  const where = buildReportVisibilityWhere(member)
  assert.equal(where.OR!.length, 3)
})

check("empty labIds never emits a lab clause (2 clauses: public + own)", () => {
  const where = buildReportVisibilityWhere({ userId: "u9", labIds: [], roleByLab: {}, isAdmin: false })
  assert.equal(where.OR!.length, 2)
  const serialized = JSON.stringify(where)
  assert.ok(!serialized.includes("labShares"), "must not reference labShares with empty labIds")
})

check("panel builder mirrors the report builder shape", () => {
  assert.equal(buildPanelVisibilityWhere(null).OR!.length, 1)
  assert.equal(buildPanelVisibilityWhere(member).OR!.length, 3)
})

check("builders FAIL CLOSED on a malformed (truthy-but-empty) viewer", () => {
  assert.throws(() => buildReportVisibilityWhere({} as unknown as ViewerContext))
  assert.throws(() => buildPanelVisibilityWhere({ userId: "", labIds: [] } as unknown as ViewerContext))
})

check("purity guard: access.ts and visibility.ts import neither prisma client nor server-only", () => {
  for (const file of ["access.ts", "visibility.ts"]) {
    const src = readFileSync(path.join(process.cwd(), "models", "lab", file), "utf8")
    assert.ok(!/import\s+["']server-only["']/.test(src), `${file} must not import server-only`)
    assert.ok(
      !/import\s+\{[^}]*\}\s+from\s+["']@\/lib\/prisma["']/.test(src),
      `${file} must not import the prisma client`,
    )
  }
})

check('import guard: no "use client" file imports server-only lab/prisma modules', () => {
  const roots = ["components", "app"]
  const offenders: string[] = []
  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".next") continue
        walk(full)
      } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
        const src = readFileSync(full, "utf8")
        if (!/^["']use client["']/m.test(src)) continue
        // Client bundles must import pure symbols from @/models/lab/access or /visibility,
        // never the server-only barrel (@/models/lab), the prisma client, or "server-only".
        if (/from\s+["']@\/models\/lab["']/.test(src)) offenders.push(`${full} imports the @/models/lab barrel`)
        if (/from\s+["']@\/models\/lab\/queries["']/.test(src)) offenders.push(`${full} imports @/models/lab/queries`)
        if (/from\s+["']@\/lib\/prisma["']/.test(src)) offenders.push(`${full} imports @/lib/prisma`)
        if (/import\s+["']server-only["']/.test(src)) offenders.push(`${full} imports server-only`)
      }
    }
  }
  for (const root of roots) walk(path.join(process.cwd(), root))
  assert.equal(offenders.length, 0, `client components must not pull in server-only code:\n  ${offenders.join("\n  ")}`)
})

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`)
  process.exit(1)
}
console.log("\nAll lab-access assertions passed")
