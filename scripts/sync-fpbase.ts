import { resolveFluorophoreSpectra } from "@/lib/integrations/fpbase"
import "dotenv/config"
import { runScript } from "../prisma/client"

// Pulls excitation and emission curves, extinction coefficients and quantum yields from FPbase into the
// Fluorophore table. Panel intelligence reads the stored curves, so a fluorophore without them falls back
// to the coarse emission-peak rule. Safe to re-run: every write is an update keyed on the existing row.
runScript(async (prisma) => {
  const rows = await prisma.fluorophore.findMany({ select: { id: true, name: true, aliases: true } })
  console.log(`Fluorophores in database: ${rows.length}`)

  const result = await resolveFluorophoreSpectra(rows)

  let withEmission = 0
  let withExcitation = 0
  let withBrightness = 0

  for (const match of result.matched) {
    const { update } = match
    if (update.emissionSpectrum) withEmission += 1
    if (update.excitationSpectrum) withExcitation += 1
    if (update.extinctionCoefficient && update.quantumYield) withBrightness += 1

    await prisma.fluorophore.update({
      where: { id: match.id },
      data: {
        fpbaseId: update.fpbaseId,
        fpbaseSlug: update.fpbaseSlug,
        extinctionCoefficient: update.extinctionCoefficient,
        quantumYield: update.quantumYield,
        excitationSpectrum: update.excitationSpectrum ?? undefined,
        emissionSpectrum: update.emissionSpectrum ?? undefined,
      },
    })
  }

  console.log(`  matched:            ${result.matched.length}`)
  console.log(`  emission curves:    ${withEmission}`)
  console.log(`  excitation curves:  ${withExcitation}`)
  console.log(`  brightness pairs:   ${withBrightness}`)
  console.log(`  unmatched:          ${result.unmatched.length}`)

  if (result.unmatched.length > 0) {
    console.log("\nNot in FPbase, these keep the emission-peak fallback:")
    for (const row of result.unmatched) console.log(`  ${row.name}`)
  }
})
