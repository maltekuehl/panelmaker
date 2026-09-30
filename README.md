# PanelMaker

PanelMaker is open-source software for designing antibody panels and sharing antibody validation data for multiplexed tissue imaging, with a focus on antibody-based multiplex immunofluorescence (CyCIF, IBEX, CODEX/PhenoCycler, PathoPlex and similar). It is self-hosted: a research group, core facility or institution runs its own instance for its own users. Each instance keeps its own data and does not connect to other instances or to a central service.

## Features

- **Marker and antibody database** with validation reports, searchable by species, tissue, cell type, imaging method and fixation
- **Validation reports** with ontology-backed metadata (Cell Ontology, UBERON, NCBI Taxonomy, GO, Disease Ontology), RRID lookup through the Antibody Registry, and image uploads (PNG, JPEG, WebP, TIFF up to 80 MB)
- **Panel designer** for multi-cycle panels, with fluorophore overlap checks based on FPbase spectra and host species cross-reactivity checks
- **Panel export** as CSV, an order list CSV for procurement, or JSON
- **Labs** with roles, invitation links, a shared antibody inventory, and private, lab or public visibility for experiments and panels
- **Admin review** before reports become public
- **AI assistant** that answers questions from the instance database and can edit panels, running on Google Gemini, OpenAI or Anthropic keys supplied by the operator, a lab or the user
- **Public read API** for proteins, antibodies, cell types, reports, fluorophores and public panels
- **Optional import** of the IBEX Imaging Community knowledge base (1,277 published validation reports)

## Quick start

Requirements: Docker with the Compose plugin. For anything beyond a trial on your own machine you also need a hostname with TLS; see the [deployment guide](docs/self-hosting/deployment.md).

```bash
git clone https://github.com/complextissue/panelmaker.git
cd panelmaker
cp .env.local.example .env
```

Edit `.env`:

- `AUTH_SECRET`: output of `openssl rand -hex 32`
- `POSTGRES_PASSWORD`: output of `openssl rand -hex 32` (required)
- `NEXT_PUBLIC_BASE_URL`: the public URL, or `http://localhost:8080` for a local trial (the example value `http://localhost:3000` is for the dev server)
- On a server with its own domain: `SITE_ADDRESS` set to the hostname, `HTTP_PORT="80"` and `HTTPS_PORT="443"`, and the bundled Caddy proxy gets a TLS certificate by itself. For a production server, follow the [step-by-step deployment guide](docs/self-hosting/deployment.md) instead, which also covers the firewall, a service user and basic auth.

Start the stack and create the first admin:

```bash
docker compose up -d --build
docker compose run --rm migrate npm run admin:create -- --email you@example.edu --name "Your Name"
```

The second command prints a one-time password. Open the instance (by default `http://localhost:8080`), sign in with "Email and Password", and find the admin area at `/admin`.

Optionally load the IBEX knowledge base:

```bash
docker compose run --rm migrate npm run ibex:import
```

## Documentation

- [Self-hosting guide](docs/self-hosting/README.md): deployment, configuration, legal pages, AI keys, data, upgrades, administration
- [Development docs](docs/development/README.md): architecture and design notes
- User documentation ships with every instance at `/docs`
- [Contributing](CONTRIBUTING.md) and [security policy](SECURITY.md)

## Development

You need Node.js at the version in `.nvmrc` and PostgreSQL. The dev Compose file can run Postgres for you.

```bash
nvm use
npm install
cp .env.local.example .env
docker compose -f docker-compose.dev.yml up -d postgres
```

In `.env`, set `AUTH_SECRET` and point `DATABASE_URL` at the dev database, which listens on `localhost:5433` (`POSTGRES_PORT`) with user, password and database `panelmaker`:

```bash
DATABASE_URL="postgresql://panelmaker:panelmaker@localhost:5433/panelmaker"
```

Remove the placeholder `SHADOW_DATABASE_URL` line, or point it at a second, disposable database. Then apply the migrations, load demo data and start the dev server:

```bash
npx prisma migrate deploy
npm run seed:all
npm run dev
```

`npm run seed:all` wipes the database and loads fictional demo users, labs, reports and panels, PathoPlex and IBEX data, and FPbase spectra. It also creates a demo admin and writes its login to `DEMO_CREDENTIALS.txt`. The app runs at `http://localhost:3000`. `./run.sh` starts the whole dev stack in Docker instead.

Checks and tests:

```bash
npm run lint          # Prettier and ESLint
npx tsc --noEmit      # type check
npm run test:unit     # unit tests
npm test              # Playwright end-to-end tests
```

For schema changes, create migrations with `npx prisma migrate dev --create-only --name <name>` and review the SQL before applying. More in [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/development](docs/development/README.md).

## Citation

If PanelMaker is useful to your research, please cite:

```bibtex
@article{BioContext_AI_Kuehl_Schaub_2025,
  title={BioContextAI is a community hub for agentic biomedical systems},
  url={http://dx.doi.org/10.1038/s41587-025-02900-9},
  urldate = {2025-11-06},
  doi={10.1038/s41587-025-02900-9},
  journal={Nature Biotechnology},
  publisher={Springer Science and Business Media LLC},
  author={Kuehl, Malte and Schaub, Darius P. and Carli, Francesco and Heumos, Lukas and Hellmig, Malte and Fernández-Zapata, Camila and Kaiser, Nico and Schaul, Jonathan and Kulaga, Anton and Usanov, Nikolay and Koutrouli, Mikaela and Ergen, Can and Palla, Giovanni and Krebs, Christian F. and Panzer, Ulf and Bonn, Stefan and Lobentanzer, Sebastian and Saez-Rodriguez, Julio and Puelles, Victor G.},
  year={2025},
  month=nov,
  language={en},
}
```

Software citation metadata is in [CITATION.cff](CITATION.cff).

## License

Apache License 2.0. See [LICENSE](LICENSE).

## Acknowledgements

- The [IBEX Imaging Community](https://github.com/IBEXImagingCommunity/ibex_imaging_knowledge_base) for the knowledge base that the optional import uses (CC BY 4.0)
- [FPbase](https://www.fpbase.org) for fluorophore spectra, the [Antibody Registry](https://www.antibodyregistry.org) and SciCrunch for RRID data, [UniProt](https://www.uniprot.org), [EMBL-EBI OLS](https://www.ebi.ac.uk/ols4) and [NCBI Taxonomy](https://www.ncbi.nlm.nih.gov/taxonomy) for protein and ontology lookups
- Parts of the authentication setup are based on the Auth.js Next.js example ([ISC License](https://github.com/nextauthjs/next-auth/blob/main/LICENSE))
