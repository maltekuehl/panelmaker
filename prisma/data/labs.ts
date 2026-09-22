export type SeedLabDef = {
  id: string
  name: string
  slug: string
  institution: string
  institutionId: string | null
  description: string
  website: string | null
  isPublicProfile: boolean
  ownerId: string
  memberIds: string[]
}

// Stable lab IDs. The owner is created with the OWNER role; memberIds become MEMBERs.
// The Puelles lab is the real home lab (its inventory is seeded from the PathoPlex paper).
// The other three are fictional demo labs.
export const LABS: SeedLabDef[] = [
  {
    id: "seed_lab_puelles",
    name: "Puelles Lab",
    slug: "puelles-lab",
    institution: "Aarhus University",
    institutionId: "ror:01aj84f44",
    description: "Spatial proteomics of the kidney and complex tissue architecture.",
    website: "https://www.au.dk/",
    isPublicProfile: true,
    ownerId: "seed_user_puelles_victor",
    memberIds: ["seed_user_puelles_member"],
  },
  {
    id: "seed_lab_rhodes",
    name: "Rhodes Lab",
    slug: "rhodes-lab",
    institution: "Example University",
    institutionId: null,
    description: "Spatial single-cell biology and CODEX multiplexed tissue imaging.",
    website: null,
    isPublicProfile: true,
    ownerId: "seed_user_demo_rhodes",
    memberIds: ["seed_user_demo_okafor", "seed_user_demo_lindqvist"],
  },
  {
    id: "seed_lab_systems_imaging",
    name: "Systems Imaging Group",
    slug: "systems-imaging-group",
    institution: "Example Institute of Technology",
    institutionId: null,
    description: "Tissue imaging with CyCIF and tumor microenvironment profiling.",
    website: null,
    isPublicProfile: true,
    ownerId: "seed_user_demo_navarro",
    memberIds: ["seed_user_demo_ibrahim", "seed_user_demo_tanaka"],
  },
  {
    id: "seed_lab_valdez",
    name: "Valdez Lab",
    slug: "valdez-lab",
    institution: "Example Medical Center",
    institutionId: null,
    description: "Immune cell dynamics and the tumor immune microenvironment.",
    website: null,
    isPublicProfile: false,
    ownerId: "seed_user_demo_valdez",
    memberIds: [],
  },
]
