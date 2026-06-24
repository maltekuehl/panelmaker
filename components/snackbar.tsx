"use client"
import { usePathname } from "next/navigation"
import CustomLink from "./custom-link"

export default function Snackbar() {
  const pathname = usePathname()

  return (
    <>
      {!pathname.includes("/chat") && (
        <div className="w-full text-center text-pretty bg-primary p-2 text-sm text-primary-foreground">
          <strong className="whitespace-nowrap">Our Correspondence is out in Nature Biotechnology!</strong>&nbsp;
          <CustomLink
            href="https://www.nature.com/articles/s41587-025-02900-9"
            className="text-primary-foreground underline"
          >
            PanelMaker is a community hub for agentic biomedical systems
          </CustomLink>
        </div>
      )}
    </>
  )
}
