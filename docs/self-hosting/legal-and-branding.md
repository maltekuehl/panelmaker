# Legal pages and branding

Every instance is run by someone, and visitors need to know who. PanelMaker takes the operator's identity from environment variables and uses it for the instance name and for three legal pages. There is no bundled identity: an unconfigured instance says so on its legal pages instead of showing made-up details.

## Instance identity

| Variable                 | Where it appears                                                           |
| ------------------------ | -------------------------------------------------------------------------- |
| `INSTANCE_NAME`          | Sidebar, page titles, web app manifest, legal pages. Default `PanelMaker`. |
| `INSTANCE_INSTITUTION`   | Sidebar and legal pages                                                    |
| `INSTANCE_OPERATOR`      | Legal pages, as the responsible party                                      |
| `INSTANCE_ADDRESS`       | Legal pages. Separate lines with `\n` or real newlines.                    |
| `INSTANCE_CONTACT_EMAIL` | Legal pages, as a `mailto:` link. Must be a valid email address.           |

All of them are server-side variables, not `NEXT_PUBLIC_` ones, so one image can serve any institution. See the [build-time caveat](#build-time-caveat) below.

## Legal pages

The app serves three pages:

| Path                  | Page           | Override file                            |
| --------------------- | -------------- | ---------------------------------------- |
| `/docs/legal/notice`  | Legal notice   | `<INSTANCE_CONFIG_DIR>/legal/notice.md`  |
| `/docs/legal/privacy` | Privacy policy | `<INSTANCE_CONFIG_DIR>/legal/privacy.md` |
| `/docs/legal/terms`   | Terms          | `<INSTANCE_CONFIG_DIR>/legal/terms.md`   |

Without an override file, each page is a generic, jurisdiction-neutral template filled in from the `INSTANCE_*` variables (see [`lib/instance.ts`](../../lib/instance.ts)). If none of operator, institution, address and contact email is set, each page starts with a notice that the instance has not configured this information.

The templates are a starting point, not legal advice. The privacy template states that the instance only sets strictly necessary cookies (the Auth.js session and CSRF cookies and a cookie that remembers the sidebar state), which is why PanelMaker shows no cookie banner. Check that this is still true for your deployment, for example if you add analytics or put the instance behind a service that sets its own cookies. Operators in jurisdictions with statutory imprint rules, such as Germany (§ 5 TMG, § 18 MStV), should write a proper `notice.md`.

### Writing an override

`INSTANCE_CONFIG_DIR` defaults to `./config`. In Docker it is `/app/config`, mounted read-only from `./config` in the repository checkout.

```bash
cp config/legal/privacy.md.example config/legal/privacy.md
# edit config/legal/privacy.md
```

- Each file is GitHub Flavored Markdown, sanitized before rendering.
- Start with a top-level `#` heading. It is the page title visitors see.
- An empty file counts as missing, so the template is used.
- `config/legal/*.md` is gitignored, so your institution's text is not committed. Keep it in your own backup or configuration management. See [`config/README.md`](../../config/README.md).

The legal pages are cached for up to about an hour. After changing an override or an `INSTANCE_*` value, allow for that delay.

## Search engine indexing

Indexing is off by default. With `INSTANCE_ALLOW_INDEXING` unset or anything other than `true`:

- `/robots.txt` disallows every path for every crawler
- `/sitemap.xml` is empty
- pages carry a `noindex, nofollow` robots meta tag

With `INSTANCE_ALLOW_INDEXING=true`, robots.txt allows public pages, keeps `/api/`, `/admin/`, `/auth/`, `/settings`, `/labs`, `/lab/` and `/chat` closed, blocks a list of AI training crawlers, and points to a sitemap of public content. Only enable it for a public instance you want listed. The basic auth gate in the [deployment guide](./deployment.md#optional-basic-auth-gate) is the stronger option if an instance should not be reachable at all.

## Build-time caveat

robots.txt, the sitemap and the legal page contents read the `INSTANCE_*` values at runtime. The instance name and institution in the sidebar, the default page title, the web app manifest and the robots meta tag are set in the root layout and manifest, which Next.js may prerender during `next build`. The Docker build does not see your `.env`, so these parts can show the build-time defaults (`PanelMaker`, no institution, `noindex`) regardless of your runtime settings.

In practice:

- With indexing off (the default), robots.txt and the meta tag agree, and nothing is indexed.
- With `INSTANCE_ALLOW_INDEXING=true` on a Docker build, the meta tag may still say `noindex`. Check the served HTML of a public page before relying on indexing.
- If the sidebar shows `PanelMaker` instead of your `INSTANCE_NAME`, this is the cause.
