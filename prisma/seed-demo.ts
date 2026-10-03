// Destructive demo seed: wipes every row in the database, then loads the reference data plus fictional
// demo users, labs, antibodies, experiments, reports and panels. For local development and demos only.
// A real instance is bootstrapped with `npm run setup` and `npm run admin:create` instead.
//
//   npm run seed:demo      (refuses when NODE_ENV=production unless SEED_ALLOW_RESET=1)
import "dotenv/config"
import type { PrismaClient } from "../lib/generated/prisma/client"
import { runScript } from "./client"
import { ANTIBODIES } from "./data/antibodies"
import { LABS } from "./data/labs"
import { CELL_TYPES, TISSUE_TYPE_TO_UBERON } from "./data/ontology"
import { PANELS } from "./data/panels"
import { PROTEIN_SUBCELLULAR } from "./data/proteins"
import { REPORTS, SPECIMEN_BY_CONTEXT, SPECIMEN_PREP, type ImagingMethodRef, type ReportInput } from "./data/reports"
import { SPECIES_TO_TAXON, taxonIdForHost } from "./data/taxa"
import { USERS } from "./data/users"
import { storeEfoImagingMethod, storeLocalImagingMethod } from "./imaging-methods"
import { printReferenceDataCounts, upsertReferenceData } from "./reference"
import { generateSeedBlobImages, getReportImages } from "./seed-images"

type AntibodyIdByRrid = Record<string, string>

const storedImagingMethods = new Map<string, { id: string; label: string }>()

async function storeImagingMethod(prisma: PrismaClient, ref: ImagingMethodRef): Promise<{ id: string; label: string }> {
  const key = imagingMethodKey(ref)
  const cached = storedImagingMethods.get(key)
  if (cached) return cached
  const method =
    typeof ref === "string"
      ? await storeEfoImagingMethod(prisma, ref)
      : await storeLocalImagingMethod(prisma, ref.label, ref.parentId)
  storedImagingMethods.set(key, method)
  return method
}

function imagingMethodKey(ref: ImagingMethodRef): string {
  return typeof ref === "string" ? ref : `${ref.parentId}|${ref.label}`
}

let fluorophoreIdByName: Record<string, string> = {}

function fluId(name?: string | null): string | undefined {
  if (!name) return undefined
  const id = fluorophoreIdByName[name]
  if (!id) throw new Error(`Seed references unknown fluorophore: ${name}`)
  return id
}

async function seedUsers(prisma: PrismaClient) {
  await prisma.user.createMany({ data: USERS })
  return USERS.length
}

async function seedAntibodies(prisma: PrismaClient): Promise<AntibodyIdByRrid> {
  const created = await prisma.antibody.createManyAndReturn({
    data: ANTIBODIES.map((ab) => ({
      rrid: ab.rrid,
      name: ab.name,
      catalogNumber: ab.catalogNumber,
      cloneId: ab.cloneId,
      clonality: ab.clonality,
      hostTaxonId: taxonIdForHost(ab.sourceOrganism),
      targetSpecies: ab.targetSpecies,
      targetProteinId: ab.targetProteinId,
      targetName: ab.targetName,
      applications: ab.applications,
      vendorName: ab.vendorName,
      vendorUrl: ab.vendorUrl,
      citationCount: ab.citationCount,
      conjugate: ab.conjugate ?? null,
    })),
    select: { id: true, rrid: true },
  })

  const byRrid: AntibodyIdByRrid = {}
  for (const ab of created) if (ab.rrid) byRrid[ab.rrid] = ab.id
  return byRrid
}

async function loadFluorophoreIds(prisma: PrismaClient) {
  const rows = await prisma.fluorophore.findMany({ select: { id: true, name: true } })
  fluorophoreIdByName = Object.fromEntries(rows.map((f) => [f.name, f.id]))
}

async function seedExperimentalReports(prisma: PrismaClient, antibodyMap: AntibodyIdByRrid) {
  type Grouped = { context: ReportInput; members: { r: ReportInput; index: number }[] }
  const groups = new Map<string, Grouped>()
  for (let i = 0; i < REPORTS.length; i++) {
    const r = REPORTS[i]
    const key = [
      r.submitterId,
      r.species,
      r.tissueType,
      r.prep,
      imagingMethodKey(r.imagingMethod),
      r.antigenRetrieval ?? "NONE",
    ].join("|")
    if (!groups.has(key)) groups.set(key, { context: r, members: [] })
    groups.get(key)!.members.push({ r, index: i })
  }

  const knownCellTypeIds = new Set(CELL_TYPES.map((ct) => ct.id))

  for (const { context, members } of groups.values()) {
    const preservation = SPECIMEN_PREP[context.prep]
    const specimen = SPECIMEN_BY_CONTEXT[`${context.species}|${context.tissueType}`]
    const imagingMethod = await storeImagingMethod(prisma, context.imagingMethod)
    const experiment = await prisma.experiment.create({
      data: {
        name: `${context.tissueType} ${imagingMethod.label} run`,
        speciesId: SPECIES_TO_TAXON[context.species] ?? null,
        tissueId: TISSUE_TYPE_TO_UBERON[context.tissueType] ?? null,
        preservation: preservation.preservation,
        preservationText: specimen?.preservationText ?? null,
        fixativeId: preservation.fixativeId,
        fixativeConcentration: preservation.concentration,
        antigenRetrievalText: specimen?.antigenRetrievalText ?? null,
        sampleType: specimen?.sampleType ?? null,
        sectionThicknessUm: specimen?.sectionThicknessUm ?? null,
        donorSex: specimen?.donorSex ?? null,
        donorAge: specimen?.donorAge ?? null,
        developmentalStageId: specimen?.developmentalStageId ?? null,
        protocolDoi: specimen?.protocolDoi ?? null,
        imagingMethodId: imagingMethod.id,
        antigenRetrieval: context.antigenRetrieval ?? null,
        submitterId: context.submitterId,
        visibility: "PUBLIC",
      },
      select: { id: true },
    })

    for (const { r, index } of members) {
      const antibodyId = antibodyMap[r.antibodyRrid]
      if (antibodyId === undefined) throw new Error(`Antibody not found for RRID: ${r.antibodyRrid}`)

      const cellTypeIds = [r.cellTypeId, ...(r.extraCellTypeIds ?? [])].filter(
        (id): id is string => typeof id === "string" && knownCellTypeIds.has(id),
      )

      const report = await prisma.experimentalReport.create({
        data: {
          experimentId: experiment.id,
          antibodyId,
          subcellularId: r.targetProteinId ? (PROTEIN_SUBCELLULAR[r.targetProteinId] ?? null) : null,
          fluorophoreId: fluId(r.fluorophore),
          metalTag: r.metalTag,
          dilution: r.dilution,
          incubation: r.incubation ?? null,
          status: r.status,
          works: r.works,
          signalQuality: r.signalQuality,
          specificity: r.specificity,
          notes: r.notes,
          cellTypes: { create: cellTypeIds.map((cellTypeId) => ({ cellTypeId })) },
        },
        select: { id: true },
      })

      for (const [sortOrder, url] of getReportImages(index).entries()) {
        const image = await prisma.image.upsert({
          where: { experimentId_url: { experimentId: experiment.id, url } },
          update: {},
          create: { experimentId: experiment.id, url, sortOrder },
          select: { id: true, _count: { select: { channels: true } } },
        })
        await prisma.imageChannel.create({
          data: { imageId: image.id, reportId: report.id, sortOrder: image._count.channels },
        })
        await prisma.imageCellType.createMany({
          data: cellTypeIds.map((cellTypeId) => ({ imageId: image.id, cellTypeId })),
          skipDuplicates: true,
        })
      }
    }
  }

  return REPORTS.length
}

async function seedPanels(prisma: PrismaClient, antibodyMap: AntibodyIdByRrid) {
  for (const panel of PANELS) {
    await prisma.panel.create({
      data: {
        id: panel.id,
        name: panel.name,
        description: panel.description,
        speciesId: panel.speciesId,
        preservation: SPECIMEN_PREP[panel.prep].preservation,
        fixativeId: SPECIMEN_PREP[panel.prep].fixativeId,
        imagingMethodId: (await storeImagingMethod(prisma, panel.imagingMethod)).id,
        ownerId: panel.ownerId,
        visibility: "PUBLIC",
        cycles: {
          create: panel.cycles.map((cycle, cycleIndex) => ({
            name: cycle.name,
            notes: cycle.notes,
            sortOrder: cycleIndex,
            markers: {
              create: cycle.markers.map((marker, markerIndex) => ({
                proteinId: marker.proteinId,
                antibodyId: antibodyMap[marker.antibodyRrid],
                fluorophoreId: fluId(marker.fluorophore),
                sortOrder: markerIndex,
              })),
            },
          })),
        },
      },
      select: { id: true },
    })
  }
  return PANELS.length
}

async function seedLabs(prisma: PrismaClient) {
  const MOUSE_TAXON = "NCBITaxon:10090"
  // T-cell and macrophage markers (CD3 epsilon, CD8 alpha, CD68).
  const STOCKED_PROTEIN_IDS = ["P07766", "P01732", "P34810"]

  await prisma.lab.createMany({
    data: LABS.map((lab) => ({
      id: lab.id,
      name: lab.name,
      slug: lab.slug,
      institution: lab.institution,
      institutionId: lab.institutionId,
      description: lab.description,
      website: lab.website,
      isPublicProfile: lab.isPublicProfile,
      createdById: lab.ownerId,
    })),
  })

  await prisma.labMembership.createMany({
    data: LABS.flatMap((lab) => [
      { userId: lab.ownerId, labId: lab.id, role: "OWNER" as const, invitedById: null },
      ...lab.memberIds.map((userId) => ({ userId, labId: lab.id, role: "MEMBER" as const, invitedById: lab.ownerId })),
    ]),
  })

  // Attribute a few of the home lab's mouse experiments to the lab as LAB-visible,
  // make one unpublished but successful (to demonstrate that members see in-progress work),
  // and stock the antibodies those experiments used so the lab-scoped AI query has data.
  const homeLab = LABS[0]
  const homeLabMemberIds = [homeLab.ownerId, ...homeLab.memberIds]
  const labExperiments = await prisma.experiment.findMany({
    where: { submitterId: { in: homeLabMemberIds }, speciesId: MOUSE_TAXON },
    select: { id: true },
    take: 3,
  })

  const antibodyIdsToStock = new Set<string>()
  for (const [i, exp] of labExperiments.entries()) {
    await prisma.experiment.update({
      where: { id: exp.id },
      data: { visibility: "LAB", owningLabId: homeLab.id },
    })
    await prisma.experimentLabShare.create({ data: { experimentId: exp.id, labId: homeLab.id } })
    if (i === 0) {
      await prisma.experimentalReport.updateMany({
        where: { experimentId: exp.id },
        data: { status: "PENDING", works: true },
      })
    }
    const reports = await prisma.experimentalReport.findMany({
      where: { experimentId: exp.id, works: true, antibodyId: { not: null } },
      select: { antibodyId: true },
    })
    for (const r of reports) if (r.antibodyId) antibodyIdsToStock.add(r.antibodyId)
  }

  // Attribute one PUBLIC experiment to the lab too, so the public /browse "Lab" facet has data
  // (public content attributed to a lab) without exposing any private content.
  const publicExp = await prisma.experiment.findFirst({
    where: { submitterId: { in: homeLabMemberIds }, visibility: "PUBLIC", owningLabId: null },
    select: { id: true },
  })
  if (publicExp) {
    await prisma.experiment.update({ where: { id: publicExp.id }, data: { owningLabId: homeLab.id } })
  }

  // Always stock the canonical T-cell/macrophage markers so the inventory is populated
  // even if the attributed experiments did not use them.
  const markerAntibodies = await prisma.antibody.findMany({
    where: { targetProteinId: { in: STOCKED_PROTEIN_IDS } },
    select: { id: true },
    take: 6,
  })
  for (const a of markerAntibodies) antibodyIdsToStock.add(a.id)

  await prisma.labAntibody.createMany({
    data: [...antibodyIdsToStock].map((antibodyId, i) => ({
      labId: homeLab.id,
      antibodyId,
      storageLocation: i % 2 === 0 ? "-20C freezer A" : "4C fridge B",
      freezerLocation: `Box ${1 + (i % 4)}, slot ${1 + i}`,
      lotNumber: `LOT-${1000 + i}`,
      status: i % 5 === 0 ? ("LOW" as const) : ("IN_STOCK" as const),
      addedById: homeLab.ownerId,
    })),
  })

  return { labs: LABS.length, labExperiments: labExperiments.length, inventory: antibodyIdsToStock.size }
}

async function resetDatabase(prisma: PrismaClient) {
  console.log("Resetting database...")
  await prisma.experimentLabShare.deleteMany()
  await prisma.panelLabShare.deleteMany()
  await prisma.labAntibody.deleteMany()
  await prisma.labInvitation.deleteMany()
  await prisma.labMembership.deleteMany()
  await prisma.lab.deleteMany()
  await prisma.panelMarker.deleteMany()
  await prisma.panelCycle.deleteMany()
  await prisma.panel.deleteMany()
  await prisma.image.deleteMany()
  await prisma.reportCellType.deleteMany()
  await prisma.experimentalReport.deleteMany()
  await prisma.experiment.deleteMany()
  await prisma.dataSource.deleteMany()
  await prisma.fluorophore.deleteMany()
  await prisma.cellTypeMarker.deleteMany()
  await prisma.antibody.deleteMany()
  await prisma.protein.deleteMany()
  await prisma.cellType.deleteMany()
  await prisma.tissue.deleteMany()
  await prisma.cellularComponent.deleteMany()
  await prisma.taxon.deleteMany()
  await prisma.diseaseCondition.deleteMany()
  await prisma.fixative.deleteMany()
  await prisma.developmentalStage.deleteMany()
  await prisma.chatMessage.deleteMany()
  await prisma.rateLimit.deleteMany()
  await prisma.verificationToken.deleteMany()
  await prisma.account.deleteMany()
  await prisma.session.deleteMany()
  await prisma.user.deleteMany()
  console.log("Database reset complete")
}

function assertResetAllowed() {
  if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW_RESET !== "1") {
    throw new Error(
      "Refusing to wipe a database while NODE_ENV=production. This is the demo seed. " +
        "Use `npm run setup` to load reference data on a real instance, or set SEED_ALLOW_RESET=1 to force it.",
    )
  }
}

runScript(async (prisma) => {
  assertResetAllowed()
  console.log("DEMO SEED: this wipes every row in the database (users, labs, antibodies, experiments, reports,")
  console.log("panels, chats and reference data) and replaces them with fictional demo data.")
  await resetDatabase(prisma)

  console.log("Loading reference data...")
  printReferenceDataCounts(await upsertReferenceData(prisma))
  await loadFluorophoreIds(prisma)

  const userCount = await seedUsers(prisma)
  const antibodyMap = await seedAntibodies(prisma)
  const images = await generateSeedBlobImages()
  const reportCount = await seedExperimentalReports(prisma, antibodyMap)
  const panelCount = await seedPanels(prisma, antibodyMap)
  const labStats = await seedLabs(prisma)

  console.log("Demo data created successfully")
  console.log(`  ${userCount} users`)
  console.log(`  ${images.length} generated blob images`)
  console.log(`  ${Object.keys(antibodyMap).length} antibodies`)
  console.log(`  ${reportCount} experimental reports`)
  console.log(`  ${panelCount} panels with cycles and markers`)
  console.log(
    `  ${labStats.labs} labs (${labStats.labExperiments} lab-visible experiments, ${labStats.inventory} inventory items)`,
  )
})
