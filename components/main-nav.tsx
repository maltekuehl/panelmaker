"use client"

import { Menu, Microscope, Plus } from "lucide-react"
import Link from "next/link"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import React from "react"
import CustomLink from "./custom-link"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "./ui/navigation-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet"

export function MainNav({ children }: { children?: React.ReactNode }) {
  const isMobile = useIsMobile()

  const navigationItems = [
    { href: "/browse", title: "Browse" },
    { href: "/docs", title: "Documentation" },
    { href: "/panel", title: "Panels" },
    { href: "/blog", title: "Blog" },
  ]

  if (isMobile) {
    return (
      <div className="flex items-center justify-between w-full" id="mobile-nav">
        <CustomLink href="/" className="flex items-center space-x-2">
          <Microscope className="h-6 w-6" />
          <span className="text-lg font-bold">PanelMaker</span>
        </CustomLink>
        <div className="flex items-center gap-2">
          {children}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-8 w-8" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 mt-4">
                <div className="border-b pb-4">
                  <CustomLink href="/">
                    <span className="text-lg font-bold">PanelMaker</span>
                  </CustomLink>
                </div>
                <div className="flex flex-col gap-2">
                  {navigationItems.map((item) => (
                    <CustomLink
                      key={item.href}
                      href={item.href}
                      className="flex items-center py-2 text-sm font-medium hover:text-primary transition-colors"
                    >
                      {item.title}
                    </CustomLink>
                  ))}
                  <CustomLink
                    href="/submit"
                    className="flex items-center py-2 text-sm font-medium hover:text-primary transition-colors"
                  >
                    Submit
                  </CustomLink>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <CustomLink href="/" className="flex items-center gap-2">
          <Microscope className="h-6 w-6" />
          <span className="text-lg font-bold">PanelMaker</span>
        </CustomLink>
        <NavigationMenu>
          <NavigationMenuList>
            {navigationItems.map((item) => (
              <NavigationMenuItem key={item.href}>
                <CustomLink href={item.href} className={navigationMenuTriggerStyle()}>
                  {item.title}
                </CustomLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
      </div>
      <div className="flex items-center gap-4">
        <Button
          variant="secondary"
          size="sm"
          className="hidden md:inline-flex h-9 shadow-sm border border-input"
          asChild
        >
          <Link href="/submit">
            <Plus className="h-4 w-4" />
            Submit
          </Link>
        </Button>
        <Input
          type="search"
          placeholder="Search cell types, proteins..."
          className={cn("max-w-md h-9", "hidden md:inline-flex flex-1")}
        />
        {children}
      </div>
    </>
  )
}

const ListItem = React.forwardRef<React.ElementRef<"a">, React.ComponentPropsWithoutRef<"a">>(
  ({ className, title, children, ...props }, ref) => {
    return (
      <li>
        <NavigationMenuLink asChild>
          <a
            ref={ref}
            className={cn(
              "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors",
              className,
            )}
            {...props}
          >
            <div className="text-sm font-medium leading-none">{title}</div>
            <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">{children}</p>
          </a>
        </NavigationMenuLink>
      </li>
    )
  },
)
ListItem.displayName = "ListItem"
