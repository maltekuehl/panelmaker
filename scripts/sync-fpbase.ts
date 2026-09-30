import "dotenv/config"
import { runScript } from "../prisma/client"
import { printFluorophoreSpectraSync, syncFluorophoreSpectra } from "../prisma/reference"

// Full re-sync of every fluorophore against FPbase (npm run setup only fills rows that have no curves yet).
// Panel intelligence reads the stored curves, so a fluorophore without them falls back to the coarse
// emission-peak rule. Safe to re-run: every write is an update keyed on the existing row.
runScript(async (prisma) => {
  console.log("Syncing fluorophore spectra from FPbase...")
  printFluorophoreSpectraSync(await syncFluorophoreSpectra(prisma, { onlyMissing: false }))
})
