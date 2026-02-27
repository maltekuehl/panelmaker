import { cn } from "@/lib/utils"
import { MainNav } from "./main-nav"
import UserButton from "./user-button"

export default function Header({ className }: { className?: string }) {
  return (
    <>
      <header
        className={cn(
          "sticky flex bg-background lg:supports-[backdrop-filter]:backdrop-blur lg:supports-[backdrop-filter]:bg-background/60",
          className,
        )}
      >
        <div className="mx-auto flex h-16 w-full container items-center justify-between px-4 sm:px-6 lg:px-[2rem]">
          <MainNav>
            <div className="flex items-center gap-4">
              <UserButton />
            </div>
          </MainNav>
        </div>
      </header>
    </>
  )
}
