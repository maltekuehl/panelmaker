export type SeedUserDef = {
  id: string
  name: string
  email: string
  institution: string
  institutionId: string | null
}

// Stable user IDs so reports can reference them reliably across re-runs.
// Everything except the Puelles lab owner is a fictional demo persona at a fictional institution
// with an @example.org address, so no real researcher is credited with invented data.
export const USERS: SeedUserDef[] = [
  {
    id: "seed_user_demo_rhodes",
    name: "Ada Rhodes",
    email: "ada.rhodes@example.org",
    institution: "Example University",
    institutionId: null,
  },
  {
    id: "seed_user_demo_okafor",
    name: "Ben Okafor",
    email: "ben.okafor@example.org",
    institution: "Example University",
    institutionId: null,
  },
  {
    id: "seed_user_demo_navarro",
    name: "Clara Navarro",
    email: "clara.navarro@example.org",
    institution: "Example Institute of Technology",
    institutionId: null,
  },
  {
    id: "seed_user_demo_lindqvist",
    name: "Dag Lindqvist",
    email: "dag.lindqvist@example.org",
    institution: "Example University",
    institutionId: null,
  },
  {
    id: "seed_user_demo_valdez",
    name: "Elena Valdez",
    email: "elena.valdez@example.org",
    institution: "Example Medical Center",
    institutionId: null,
  },
  {
    id: "seed_user_demo_fenwick",
    name: "Felix Fenwick",
    email: "felix.fenwick@example.org",
    institution: "Example Genome Center",
    institutionId: null,
  },
  {
    id: "seed_user_demo_ibrahim",
    name: "Grace Ibrahim",
    email: "grace.ibrahim@example.org",
    institution: "Example Institute of Technology",
    institutionId: null,
  },
  {
    id: "seed_user_demo_tanaka",
    name: "Hana Tanaka",
    email: "hana.tanaka@example.org",
    institution: "Example Institute of Technology",
    institutionId: null,
  },
  {
    id: "seed_user_demo_boateng",
    name: "Ivan Boateng",
    email: "ivan.boateng@example.org",
    institution: "Example College of Medicine",
    institutionId: null,
  },
  {
    id: "seed_user_demo_moreau",
    name: "Julia Moreau",
    email: "julia.moreau@example.org",
    institution: "Example Cancer Center",
    institutionId: null,
  },
  {
    id: "seed_user_puelles_victor",
    name: "Victor Puelles",
    email: "victor.puelles@clin.au.dk",
    institution: "Aarhus University",
    institutionId: "ror:01aj84f44",
  },
  {
    id: "seed_user_puelles_member",
    name: "Kira Bramble",
    email: "kira.bramble@example.org",
    institution: "Aarhus University",
    institutionId: "ror:01aj84f44",
  },
]
