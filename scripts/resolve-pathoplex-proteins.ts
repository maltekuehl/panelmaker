// Resolves the curated PathoPlex target genes (prisma/data/pathoplex-target-genes.ts) to UniProtKB
// accessions and writes prisma/data/pathoplex-proteins.resolved.json, which pathoplex:seed reads. A target
// is accepted only when exactly one reviewed (Swiss-Prot) entry has that exact primary gene name in the
// panel's organism (or, for a renamed gene, exactly one entry lists it as a synonym): human when the
// reagent ran on the human panel, mouse when it ran on mouse only.
// Anything else is reported and left out, never guessed.
//
//   npm run pathoplex:proteins
import { writeFileSync } from "node:fs"
import path from "node:path"
import { PATHOPLEX_ANTIBODIES } from "../prisma/data/pathoplex-antibodies"
import { PATHOPLEX_TARGET_GENES } from "../prisma/data/pathoplex-target-genes"

const UNIPROT = "https://rest.uniprot.org/uniprotkb/search"
const OUTPUT = path.join(process.cwd(), "prisma", "data", "pathoplex-proteins.resolved.json")
const HUMAN = 9606
const MOUSE = 10090

type UniProtHit = {
  primaryAccession: string
  proteinDescription?: { recommendedName?: { fullName?: { value: string } } }
  genes?: { geneName?: { value: string } }[]
}

export type ResolvedTarget = { accession: string; label: string; geneSymbol: string; organismId: number }

async function search(gene: string, organismId: number): Promise<UniProtHit[]> {
  const query = `gene_exact:${gene} AND organism_id:${organismId} AND reviewed:true`
  const url = `${UNIPROT}?query=${encodeURIComponent(query)}&fields=accession,protein_name,gene_primary&format=json&size=5`
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, { headers: { Accept: "application/json" } })
    if (response.ok) return ((await response.json()) as { results: UniProtHit[] }).results
    if (response.status !== 429 && response.status < 500) throw new Error(`${response.status} for ${url}`)
    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)))
  }
  throw new Error(`gave up on ${url}`)
}

async function main() {
  const reagentByKey = new Map(PATHOPLEX_ANTIBODIES.map((reagent) => [reagent.key, reagent]))
  const targets: Record<string, ResolvedTarget> = {}
  const problems: string[] = []

  for (const [key, target] of Object.entries(PATHOPLEX_TARGET_GENES)) {
    const reagent = reagentByKey.get(key)
    if (!reagent) {
      problems.push(`${key}: no such reagent in pathoplex-antibodies.ts`)
      continue
    }
    if (target.gene === null) continue

    const organismId = reagent.samples.includes("human") ? HUMAN : MOUSE
    const hits = await search(target.gene, organismId)
    const primary = hits.filter((hit) => hit.genes?.[0]?.geneName?.value.toLowerCase() === target.gene.toLowerCase())
    const matches = primary.length > 0 ? primary : hits
    if (matches.length !== 1) {
      problems.push(`${key}: ${target.gene} in ${organismId} gave ${matches.length} reviewed entries`)
      continue
    }
    const hit = matches[0]
    targets[key] = {
      accession: hit.primaryAccession,
      label: hit.proteinDescription?.recommendedName?.fullName?.value ?? target.gene,
      geneSymbol: hit.genes?.[0]?.geneName?.value ?? target.gene,
      organismId,
    }
    await new Promise((resolve) => setTimeout(resolve, 150))
  }

  writeFileSync(
    OUTPUT,
    `${JSON.stringify(
      {
        resolvedAt: new Date().toISOString().slice(0, 10),
        source: "UniProtKB REST, gene_exact + organism_id + reviewed:true, fields accession,protein_name,gene_primary",
        targets,
      },
      null,
      2,
    )}\n`,
  )

  console.log(`Resolved ${Object.keys(targets).length} PathoPlex targets to UniProt accessions.`)
  const unlinked = Object.entries(PATHOPLEX_TARGET_GENES).filter(([, target]) => target.gene === null)
  console.log(`Left unlinked on purpose: ${unlinked.length}`)
  if (problems.length > 0) {
    console.log("Needs attention:")
    for (const problem of problems) console.log(`  ${problem}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
