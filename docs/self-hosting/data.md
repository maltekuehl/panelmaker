# Data

An instance holds three kinds of data:

- **Reference data** that every instance needs: ontology terms, marker proteins, fluorophores. Loaded by `npm run setup`. Imaging methods are not preloaded: they are EFO terms stored the first time someone picks one.
- **Content** created by your users: experiments, validation reports, images, panels, labs and inventory.
- **Optional imports** of published data, such as the IBEX knowledge base.

Demo data is separate and only meant for development and demonstrations.

## Reference data

`npm run setup` ([`scripts/setup.ts`](../../scripts/setup.ts), data in [`prisma/reference.ts`](../../prisma/reference.ts) and [`prisma/data/`](../../prisma/data/)) loads:

- taxa (NCBI Taxonomy), tissues (UBERON), cellular components (GO), cell types (Cell Ontology), disease conditions, fixatives and developmental stages
- marker proteins with their canonical cell-type markers
- fluorophores, then fills in missing excitation and emission spectra from FPbase

It only upserts. It deletes nothing, creates no users and no demo content, and is safe to run on a live instance. In Docker the `migrate` service runs it on every `docker compose up`. `npx prisma db seed` runs the same script.

If FPbase cannot be reached, `setup` prints a warning and continues without spectra. Pass `--skip-fpbase` or set `SETUP_SKIP_FPBASE=1` to skip the download on purpose. Panel overlap checks work without spectra but fall back to a coarser rule based on emission peaks. Load the spectra later with `npm run fpbase:sync`.

## Scripts

Run these with `npm run <script>` on a bare-metal install, or `docker compose run --rm migrate npm run <script>` in Docker.

| Script             | What it does                                                                                                                                                    | Destructive                   | For              |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------------- |
| `setup`            | Reference data and missing FPbase spectra, as above                                                                                                             | no                            | every instance   |
| `admin:create`     | Creates an admin account or promotes an existing one. See [Administration](./administration.md#admin-accounts)                                                  | no                            | every instance   |
| `fpbase:sync`      | Re-syncs the spectra of every fluorophore from FPbase, not only missing ones                                                                                    | no (updates spectra in place) | every instance   |
| `ibex:import`      | Imports the IBEX knowledge base from committed files. See [below](#ibex-knowledge-base)                                                                         | no                            | optional         |
| `ibex:fetch`       | Downloads a fresh copy of the IBEX source tables into `prisma/data/ibex/` and regenerates lookups. Changes files, not the database                              | no (database)                 | maintainers      |
| `seed:demo`        | **Deletes every row in the database**, then loads reference data plus fictional users, labs, antibodies, reports and panels                                     | **yes**                       | development, demo servers |
| `seed:demo-user`   | Creates the `demo@panelmaker.local` admin with a known password and writes it to `DEMO_CREDENTIALS.txt`                                                         | no                            | development only |
| `pathoplex:lookup` | Resolves RRIDs for the PathoPlex reagent list against the Antibody Registry. Needs `SCICRUNCH_API_KEY`. Writes `prisma/data/pathoplex-antibodies.resolved.json` | no (database)                 | maintainers      |
| `pathoplex:seed`   | Adds the PathoPlex antibody inventory and two kidney experiments to the demo Puelles lab. Needs `seed:demo` first                                               | no                            | development, demo servers |
| `seed:all`         | Runs `seed:demo`, `seed:demo-user`, `pathoplex:seed`, `ibex:import` and `fpbase:sync` in order                                                                  | **yes**                       | development only |

`seed:demo` refuses to run when `NODE_ENV=production` unless `SEED_ALLOW_RESET=1` is set. `seed:demo-user` refuses when `NODE_ENV=production` unless `DEMO_USER_PASSWORD` is set. In Docker, `NODE_ENV` is `production` in the `migrate` image. On a bare-metal install, set `NODE_ENV=production` in `.env` to get the same protection.

`npx prisma migrate reset` is also destructive: it drops the database and reapplies the migrations. Run `npm run setup` afterwards.

## IBEX knowledge base

The [IBEX Imaging Community knowledge base](https://github.com/IBEXImagingCommunity/ibex_imaging_knowledge_base) is a curated, versioned collection of antibody validation records for IBEX multiplexed imaging, licensed CC BY 4.0. `npm run ibex:import` turns it into 104 public experiments with 1,277 published reports, plus the antibodies, proteins and fluorophores they reference.

- It reads the copy of the source tables committed under `prisma/data/ibex/`, so it needs no network access.
- It is idempotent: records are keyed on stable identifiers, shared records are only filled in and never overwritten, and nothing is deleted.
- The reports are created as `PUBLISHED`, because they were reviewed upstream. They do not go through your review queue.
- Every imported experiment links to the IBEX data source, which holds the CC BY 4.0 attribution. Experiment and report pages show it, and browse can filter by source.
- Report images are not downloaded. They point at `raw.githubusercontent.com`, so visitors' browsers load them from GitHub.

Importing is a choice for each instance: it gives users a useful body of published validation data on day one, but the records are not your institution's own. The mapping decisions are documented in [docs/development/ibex-import.md](../development/ibex-import.md).

## PathoPlex

The PathoPlex scripts load the real antibody panels from the PathoPlex paper (Kuehl et al., Nature 2025) into the fictional demo lab created by `seed:demo`, including named members of the Puelles lab. They exist for demonstrations and development and do not belong on a production instance.

## Demo data

Demo data wipes the database first. Never load it on an instance with real data.

**Local development.** `npm run seed:all` builds a complete demo: fictional researchers and labs, antibodies with RRIDs, experiments and reports across several imaging methods, two panels, a demo admin login (`seed:demo-user`), PathoPlex, IBEX and FPbase spectra.

**A demo or test server in Docker.** Run the steps one by one in the `migrate` container, and create a real admin instead of the known-password demo login:

```bash
docker compose run --rm -e SEED_ALLOW_RESET=1 migrate npm run seed:demo
docker compose run --rm migrate npm run pathoplex:seed
docker compose run --rm migrate npm run ibex:import
docker compose run --rm migrate npm run admin:create -- --email you@example.edu --name "Your Name"
```

`seed:demo` also generates sample report images. The `migrate` service mounts the app's uploads volume, so they end up where the app serves them from. `fpbase:sync` is not needed: `seed:demo` loads the reference data and spectra itself.

## Outbound network access

The server needs outbound HTTPS to these hosts. Without them the app still runs, but the listed features fail or return no results.

| Host                                                                       | Used for                                                                                                    | When                   |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------- |
| `www.ebi.ac.uk` (OLS4)                                                     | Cell Ontology, UBERON, GO, Disease Ontology, ChEBI, developmental stage and ROR institution search in forms | runtime                |
| `eutils.ncbi.nlm.nih.gov` (NCBI E-utilities)                               | Species search                                                                                              | runtime                |
| `rest.uniprot.org` (UniProt)                                               | Protein lookup by gene name                                                                                 | runtime                |
| `scicrunch.org` (SciCrunch resolver)                                       | Antibody lookup by RRID, no key needed                                                                      | runtime                |
| `api.scicrunch.io` (SciCrunch Elasticsearch)                               | Free-text and catalog-number antibody search, only with `SCICRUNCH_API_KEY`                                 | runtime                |
| `www.fpbase.org` (FPbase)                                                  | Fluorophore spectra                                                                                         | `setup`, `fpbase:sync` |
| `generativelanguage.googleapis.com`, `api.openai.com`, `api.anthropic.com` | AI assistant, only for providers with a configured key                                                      | runtime                |
| `github.com`                                                               | GitHub sign-in, only when configured                                                                        | runtime                |
| `raw.githubusercontent.com`                                                | IBEX source tables                                                                                          | `ibex:fetch` only      |

Visitors' browsers additionally load IBEX report images from `raw.githubusercontent.com` and GitHub avatars from `avatars.githubusercontent.com`. Building the Docker image needs access to the npm registry, Docker Hub and the Debian package mirrors.

PanelMaker does not send email and has no other outbound dependencies.
