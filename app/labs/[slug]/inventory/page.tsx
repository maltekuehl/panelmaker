import { auth } from "@/auth"
import { InventoryManager } from "@/components/lab/inventory-manager"
import { LabPageHeader } from "@/components/lab/lab-page-header"
import { labInventoryParsers } from "@/lib/data-table"
import {
  canDoLabAction,
  getLabBySlug,
  getLabInventoryFacets,
  getLabInventoryPage,
  getUserLabRole,
  toLabAntibodyResponse,
} from "@/models/lab"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createLoader, type SearchParams } from "nuqs/server"

interface LabInventoryPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<SearchParams>
}

const loadSearchParams = createLoader(labInventoryParsers)

export async function generateMetadata({ params }: LabInventoryPageProps): Promise<Metadata> {
  const { slug } = await params
  const lab = await getLabBySlug(slug)
  if (!lab) return { title: "Lab Not Found | PanelMaker" }
  return { title: `Inventory | ${lab.name} | PanelMaker`, robots: { index: false, follow: false } }
}

export default async function LabInventoryPage({ params, searchParams }: LabInventoryPageProps) {
  const { slug } = await params

  const [lab, session, query] = await Promise.all([getLabBySlug(slug), auth(), loadSearchParams(searchParams)])

  if (!lab) {
    notFound()
  }

  if (!session?.user?.id) {
    notFound()
  }

  const role = await getUserLabRole(session.user.id, lab.id)

  if (!role) {
    notFound()
  }

  const [{ rows, total, page, pageCount }, facets] = await Promise.all([
    getLabInventoryPage(lab.id, query),
    getLabInventoryFacets(lab.id),
  ])
  const canManage = canDoLabAction(role, "manage_inventory")

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <LabPageHeader lab={lab} role={role} crumb="Inventory" />
      <InventoryManager
        labId={lab.id}
        canManage={canManage}
        items={rows.map(toLabAntibodyResponse)}
        total={total}
        page={page}
        pageCount={pageCount}
        facets={facets}
      />
    </div>
  )
}
