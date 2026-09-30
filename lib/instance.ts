import "server-only"

import { readFile } from "node:fs/promises"
import path from "node:path"
import { env } from "./env"

export interface InstanceConfig {
  name: string
  institution: string | null
  operator: string | null
  address: string[] | null
  contactEmail: string | null
  baseUrl: string
  allowIndexing: boolean
}

export type LegalDocument = "notice" | "privacy" | "terms"

export function getInstanceConfig(): InstanceConfig {
  return {
    name: env.INSTANCE_NAME?.trim() || "PanelMaker",
    institution: env.INSTANCE_INSTITUTION?.trim() || null,
    operator: env.INSTANCE_OPERATOR?.trim() || null,
    address: env.INSTANCE_ADDRESS
      ? env.INSTANCE_ADDRESS.split(/\\n|\n/)
          .map((line) => line.trim())
          .filter(Boolean)
      : null,
    contactEmail: env.INSTANCE_CONTACT_EMAIL?.trim() || null,
    baseUrl: env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
    allowIndexing: env.INSTANCE_ALLOW_INDEXING,
  }
}

function getConfigDir(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), env.INSTANCE_CONFIG_DIR)
}

// Returns the operator-provided override markdown for a legal document, or null when the
// operator has not supplied one. The file content is treated as operator-trusted (it ships in
// their own config mount) but is still rendered through the app's sanitizing Markdown renderer.
export async function loadLegalOverride(document: LegalDocument): Promise<string | null> {
  const filePath = path.join(getConfigDir(), "legal", `${document}.md`)
  try {
    const content = await readFile(filePath, "utf-8")
    return content.trim().length > 0 ? content : null
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return null
    throw error
  }
}

function hasOperatorInfo(config: InstanceConfig): boolean {
  return Boolean(config.operator || config.institution || config.address || config.contactEmail)
}

function unconfiguredNotice(config: InstanceConfig, document: LegalDocument): string {
  return `> **This instance has not configured its ${document === "notice" ? "legal notice" : document} information yet.** The details below are a generic template, not the actual identity of the operator. If you are the instance operator, set \`INSTANCE_OPERATOR\`, \`INSTANCE_INSTITUTION\`, \`INSTANCE_ADDRESS\` and \`INSTANCE_CONTACT_EMAIL\`, or provide a full replacement at \`${env.INSTANCE_CONFIG_DIR}/legal/${document}.md\`.`
}

function operatorBlock(config: InstanceConfig): string {
  const lines = [
    `**Instance:** ${config.name}`,
    `**Institution:** ${config.institution ?? "Not configured"}`,
    `**Responsible party:** ${config.operator ?? "Not configured"}`,
    `**Address:**  \n${config.address ? config.address.join("  \n") : "Not configured"}`,
    `**Contact:** ${config.contactEmail ? `[${config.contactEmail}](mailto:${config.contactEmail})` : "Not configured"}`,
  ]
  return lines.join("\n\n")
}

export function buildNoticeMarkdown(config: InstanceConfig): string {
  return `# Legal Notice

${hasOperatorInfo(config) ? "" : `${unconfiguredNotice(config, "notice")}\n\n`}## Operator

${operatorBlock(config)}

## Scope

This notice covers the ${config.name} instance available at ${config.baseUrl}. PanelMaker is self-hosted software: this deployment is run independently by the operator identified above, not by the authors of the PanelMaker project.

Operators in jurisdictions with statutory imprint requirements (for example Germany's § 5 TMG / § 18 MStV) should replace this page with a proper legal notice by placing a full override at \`config/legal/notice.md\`. This generic template is not a substitute for legal advice.

## Disclaimer

### Liability for Content

The operator has created the content of this site with care, but cannot guarantee the accuracy, completeness, or timeliness of the content. The operator remains responsible for its own content on this site in accordance with applicable law, but is not obligated to monitor third-party information transmitted or stored on this site, or to investigate circumstances indicating unlawful activity, beyond what the law requires.

### Liability for Links

This site may link to external websites over whose content the operator has no control, and for which the operator assumes no liability. The respective provider or operator of a linked page is responsible for its content.

### Copyright

Content and works created by the operator on this site are subject to applicable copyright law. Reproduction, editing, distribution, or any commercial use beyond the scope of copyright law requires the written consent of the respective author. Third-party content is identified as such where possible, and third-party copyrights are respected.

### Data Protection

See the [Privacy Policy](/docs/legal/privacy) for details on how this instance processes personal data.`
}

export function buildPrivacyMarkdown(config: InstanceConfig): string {
  return `# Privacy Policy

${hasOperatorInfo(config) ? "" : `${unconfiguredNotice(config, "privacy")}\n\n`}This Privacy Policy describes how the ${config.name} instance, available at ${config.baseUrl}, collects, uses, and shares information when you visit or use the site.

## Who Is Responsible

${operatorBlock(config)}

## Information We Collect

When you visit the site, we automatically collect certain technical information about your device and connection, including your IP address, browser type, referring and exit pages, and date and time stamps. This is collected through standard server log files and the cookies described below.

**Cookies.** We only use cookies that are strictly necessary for the operation of the site: the session cookies set by the sign-in system (Auth.js) to keep you signed in and protect forms against cross-site requests, and a cookie that remembers whether the sidebar is open. We do not use analytics, advertising or other tracking cookies, so no consent banner is shown.

If you create an account, we also collect the information you provide directly, such as your name, email address, and any content you submit (antibody validation reports, panels, lab and profile information).

## How We Use Information

We use the information we collect to operate, secure, and improve the site, to provide the account and collaboration features you request, and to screen for abuse and fraud.

## Sharing Your Information

We do not sell personal information. We may share information with infrastructure providers (such as hosting, email, and content-delivery services) strictly to operate the site, and we may disclose information where required to comply with applicable law or a lawful request.

## Your Rights

Depending on your jurisdiction, you may have rights to access, correct, delete, restrict, or receive a copy of the personal information we hold about you, and to withdraw any consent you have given. To exercise these rights, use the contact details above.

## Data Retention

We retain personal information only for as long as necessary for the purposes described in this policy, or as required by applicable law.

## Minors

This site is not intended for individuals under the age of 16.

## Changes

We may update this Privacy Policy from time to time to reflect changes to our practices or for operational, legal, or regulatory reasons.

## Contact

For questions about this Privacy Policy or to exercise your rights, contact ${config.contactEmail ? `[${config.contactEmail}](mailto:${config.contactEmail})` : "the operator identified above"}.`
}

export function buildTermsMarkdown(config: InstanceConfig): string {
  return `# Terms and Conditions

${hasOperatorInfo(config) ? "" : `${unconfiguredNotice(config, "terms")}\n\n`}This site is operated by the party identified below (the "Operator") and made available through the ${config.name} instance at ${config.baseUrl} (the "Service"). By accessing or using the Service, you agree to be bound by these Terms and Conditions.

## Operator

${operatorBlock(config)}

## Use of the Service

The Service is a research tool for antibody validation and spatial proteomics panel design. You may use it to browse, contribute, and organize scientific data, subject to these Terms. You agree not to use the Service for any unlawful purpose, to interfere with its operation or security, or to upload content that infringes the rights of others.

## Contributed Content

If you submit reports, panels, images, or other content to the Service, you represent that you have the right to do so and that the content does not infringe any third party's rights. You grant the Operator a license to store, display, and distribute your contributed content as part of operating the Service, consistent with the visibility settings you choose (private, lab, or public).

## Third-Party Content and Links

The Service may aggregate or link to publicly available third-party data and repositories for informational and discovery purposes, with attribution and links to the original source where applicable. Such content remains the property of its original authors and is subject to their licenses. The Operator is not responsible for the accuracy of third-party content and does not endorse it.

## No Warranty

The Service is provided "as is" and "as available", without warranties of any kind, express or implied, including any warranty of accuracy, merchantability, or fitness for a particular purpose. Scientific data displayed on the Service should be independently verified before being relied upon.

## Limitation of Liability

To the extent permitted by applicable law, the Operator is not liable for any indirect, incidental, or consequential damages arising from your use of, or inability to use, the Service.

## Changes

The Operator may update these Terms from time to time. Continued use of the Service after changes are posted constitutes acceptance of the updated Terms.

## Governing Law

These Terms are governed by the laws applicable at the Operator's location identified above. This is a generic, jurisdiction-agnostic template; operators with specific legal requirements should replace it with a full override at \`config/legal/terms.md\`.

## Contact

Questions about these Terms can be directed to ${config.contactEmail ? `[${config.contactEmail}](mailto:${config.contactEmail})` : "the operator identified above"}.`
}
