// Bootstraps a PanelMaker instance with the reference data every deployment needs: taxa, UBERON tissues,
// GO cellular components, Cell Ontology cell types, disease conditions, fixatives, developmental stages,
// marker proteins with their canonical cell-type markers and fluorophores, plus FPbase
// spectra for any fluorophore that does not have them yet.
//
// Non-destructive and idempotent: upserts only, nothing is deleted, no users or demo content are created.
// Safe to re-run on a live instance (the Docker migrate service runs it on every deploy).
//
//   npm run setup
//   npm run setup -- --skip-fpbase     (or SETUP_SKIP_FPBASE=1) for air-gapped hosts
import "dotenv/config"
import { runScript } from "../prisma/client"
import {
  printFluorophoreSpectraSync,
  printReferenceDataCounts,
  syncFluorophoreSpectra,
  upsertReferenceData,
} from "../prisma/reference"

const skipFpbase = process.argv.includes("--skip-fpbase") || process.env.SETUP_SKIP_FPBASE === "1"

runScript(async (prisma) => {
  console.log("Loading reference data (upserts only, nothing is deleted)...")
  printReferenceDataCounts(await upsertReferenceData(prisma))

  if (skipFpbase) {
    console.log("\nSkipping the FPbase spectra sync.")
  } else {
    console.log("\nFilling missing fluorophore spectra from FPbase...")
    try {
      printFluorophoreSpectraSync(await syncFluorophoreSpectra(prisma, { onlyMissing: true }))
    } catch (error) {
      console.warn("FPbase sync failed, continuing without spectra. Re-run `npm run fpbase:sync` later.")
      console.warn(error)
    }
  }

  console.log("\nReference data is up to date.")
})
