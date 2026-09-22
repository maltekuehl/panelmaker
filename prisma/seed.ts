import { IMAGING_METHODS } from "@/models/imaging-method/data"
import "dotenv/config"
import type { PrismaClient } from "../lib/generated/prisma/client"
import { runScript } from "./client"
import { ANTIBODIES } from "./data/antibodies"
import { BLOG_POSTS } from "./data/blog-posts"
import { FLUOROPHORE_SEED } from "./data/fluorophores"
import { LABS } from "./data/labs"
import {
  CELLULAR_COMPONENTS,
  CELL_TYPES,
  DEVELOPMENTAL_STAGES,
  DISEASE_CONDITIONS,
  FIXATIVES,
  TISSUES,
  TISSUE_TYPE_TO_UBERON,
} from "./data/ontology"
import { PANELS } from "./data/panels"
import { CELL_TYPE_MARKERS, PROTEINS, PROTEIN_SUBCELLULAR } from "./data/proteins"
import { FIXATION_TO_PRESERVATION, REPORTS, SPECIMEN_BY_CONTEXT, type ReportInput } from "./data/reports"
import { SPECIES_TO_TAXON, TAXA, taxonIdForHost } from "./data/taxa"
import { USERS } from "./data/users"
import { generateSeedBlobImages, getReportImages } from "./seed-images"

type AntibodyIdByRrid = Record<string, string>

const IMAGING_METHOD_BY_ID = new Map(IMAGING_METHODS.map((method) => [method.id, method]))

// The short common name ("CODEX", "IMC"), which reads better in a generated experiment name than the
// full ontology label.
function shortMethodName(imagingMethodId: string): string {
  return IMAGING_METHOD_BY_ID.get(imagingMethodId)?.shortLabel ?? imagingMethodId
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

async function seedTaxa(prisma: PrismaClient) {
  await prisma.taxon.createMany({ data: TAXA })
  return TAXA.length
}

async function seedTissues(prisma: PrismaClient) {
  await prisma.tissue.createMany({
    data: TISSUES.map((t) => ({ id: t.id, label: t.label, partOfIds: t.partOfIds })),
  })
  return TISSUES.length
}

async function seedCellularComponents(prisma: PrismaClient) {
  await prisma.cellularComponent.createMany({
    data: CELLULAR_COMPONENTS.map((c) => ({ id: c.id, label: c.label, partOfIds: c.partOfIds })),
  })
  return CELLULAR_COMPONENTS.length
}

async function seedCellTypes(prisma: PrismaClient) {
  await prisma.cellType.createMany({
    data: CELL_TYPES.map((ct) => ({ id: ct.id, label: ct.label, parentIds: ct.parentIds })),
  })
  return CELL_TYPES.length
}

async function seedDiseaseConditions(prisma: PrismaClient) {
  await prisma.diseaseCondition.createMany({ data: DISEASE_CONDITIONS })
  return DISEASE_CONDITIONS.length
}

async function seedFixatives(prisma: PrismaClient) {
  await prisma.fixative.createMany({ data: FIXATIVES, skipDuplicates: true })
  return FIXATIVES.length
}

async function seedDevelopmentalStages(prisma: PrismaClient) {
  await prisma.developmentalStage.createMany({ data: DEVELOPMENTAL_STAGES, skipDuplicates: true })
  return DEVELOPMENTAL_STAGES.length
}

async function seedProteins(prisma: PrismaClient) {
  await prisma.protein.createMany({ data: PROTEINS })
  return PROTEINS.length
}

async function seedCellTypeMarkers(prisma: PrismaClient) {
  await prisma.cellTypeMarker.createMany({ data: CELL_TYPE_MARKERS.map((m) => ({ ...m, source: "HuBMAP" })) })
  return CELL_TYPE_MARKERS.length
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

async function seedImagingMethods(prisma: PrismaClient) {
  await prisma.imagingMethod.createMany({ data: IMAGING_METHODS, skipDuplicates: true })
  return IMAGING_METHODS.length
}

async function seedFluorophores(prisma: PrismaClient) {
  const created = await prisma.fluorophore.createManyAndReturn({ data: FLUOROPHORE_SEED })
  fluorophoreIdByName = Object.fromEntries(created.map((f) => [f.name, f.id]))
  return created.length
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
      r.fixation,
      r.imagingMethodId,
      r.antigenRetrieval ?? "NONE",
    ].join("|")
    if (!groups.has(key)) groups.set(key, { context: r, members: [] })
    groups.get(key)!.members.push({ r, index: i })
  }

  const knownCellTypeIds = new Set(CELL_TYPES.map((ct) => ct.id))

  for (const { context, members } of groups.values()) {
    const preservation = FIXATION_TO_PRESERVATION[context.fixation]
    const specimen = SPECIMEN_BY_CONTEXT[`${context.species}|${context.tissueType}`]
    const experiment = await prisma.experiment.create({
      data: {
        name: `${context.tissueType} ${shortMethodName(context.imagingMethodId)} run`,
        speciesId: SPECIES_TO_TAXON[context.species] ?? null,
        tissueId: TISSUE_TYPE_TO_UBERON[context.tissueType] ?? null,
        fixation: context.fixation,
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
        imagingMethodId: context.imagingMethodId,
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

      await prisma.experimentalReport.create({
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
          images: {
            create: getReportImages(index).map((url, sortOrder) => ({
              url,
              sortOrder,
              cellTypes: { create: cellTypeIds.map((cellTypeId) => ({ cellTypeId })) },
            })),
          },
        },
        select: { id: true },
      })
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
        fixation: panel.fixation,
        imagingMethodId: panel.imagingMethodId,
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

async function seedBlogPosts(prisma: PrismaClient) {
  await prisma.blogPost.createMany({ data: BLOG_POSTS })
  return BLOG_POSTS.length
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
  await prisma.reportCellType.deleteMany()
  await prisma.experimentalReport.deleteMany()
  await prisma.experiment.deleteMany()
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
  await prisma.blogPost.deleteMany()
  await prisma.authenticator.deleteMany()
  await prisma.verificationToken.deleteMany()
  await prisma.account.deleteMany()
  await prisma.session.deleteMany()
  await prisma.user.deleteMany()
  console.log("Database reset complete")
}

function assertResetAllowed() {
  if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW_RESET !== "1") {
    throw new Error("Refusing to reset a production database. Set SEED_ALLOW_RESET=1 to override.")
  }
}

runScript(async (prisma) => {
  assertResetAllowed()
  await resetDatabase(prisma)

  const userCount = await seedUsers(prisma)
  await seedTaxa(prisma)
  const tissueCount = await seedTissues(prisma)
  const cellularComponentCount = await seedCellularComponents(prisma)
  const cellTypeCount = await seedCellTypes(prisma)
  await seedDiseaseConditions(prisma)
  const fixativeCount = await seedFixatives(prisma)
  const developmentalStageCount = await seedDevelopmentalStages(prisma)
  const proteinCount = await seedProteins(prisma)
  const cellTypeMarkerCount = await seedCellTypeMarkers(prisma)
  const antibodyMap = await seedAntibodies(prisma)
  const fluorophoreCount = await seedFluorophores(prisma)
  const imagingMethodCount = await seedImagingMethods(prisma)
  const images = await generateSeedBlobImages()
  const reportCount = await seedExperimentalReports(prisma, antibodyMap)
  const panelCount = await seedPanels(prisma, antibodyMap)
  const blogPostCount = await seedBlogPosts(prisma)
  const labStats = await seedLabs(prisma)

  console.log("Seed data created successfully")
  console.log(`  ${userCount} users`)
  console.log(`  ${TAXA.length} taxa`)
  console.log(`  ${tissueCount} tissues`)
  console.log(`  ${cellularComponentCount} cellular components`)
  console.log(`  ${fluorophoreCount} fluorophores`)
  console.log(`  ${imagingMethodCount} imaging methods`)
  console.log(`  ${images.length} generated blob images`)
  console.log(`  ${cellTypeCount} cell types`)
  console.log(`  ${fixativeCount} fixatives`)
  console.log(`  ${developmentalStageCount} developmental stages`)
  console.log(`  ${proteinCount} proteins`)
  console.log(`  ${cellTypeMarkerCount} cell type markers`)
  console.log(`  ${Object.keys(antibodyMap).length} antibodies`)
  console.log(`  ${reportCount} experimental reports`)
  console.log(`  ${panelCount} panels with cycles and markers`)
  console.log(`  ${blogPostCount} blog posts`)
  console.log(
    `  ${labStats.labs} labs (${labStats.labExperiments} lab-visible experiments, ${labStats.inventory} inventory items)`,
  )
})
