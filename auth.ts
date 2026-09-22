import bcrypt from "bcryptjs"
import NextAuth from "next-auth"
import "next-auth/jwt"

import { canSignIn } from "@/lib/auth"
import { UserStatus } from "@/lib/generated/prisma/enums"
import { prisma } from "@/lib/prisma"
import { normalizeEmail } from "@/models/user/transforms"
import { PrismaAdapter } from "@auth/prisma-adapter"
import type { Provider } from "next-auth/providers"
import Credentials from "next-auth/providers/credentials"
import GitHub from "next-auth/providers/github"
import LinkedIn from "next-auth/providers/linkedin"

// Compared against when no account matches, so an unknown email costs the same time as a wrong password.
const UNKNOWN_USER_HASH = "$2b$12$rborUbjV7ArM121xOcMsH.yZTnDQAbfa2NOZzl/rCQyp435R1LSim"

const providers: Provider[] = []

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(GitHub)
}

if (process.env.AUTH_LINKEDIN_ID && process.env.AUTH_LINKEDIN_SECRET) {
  providers.push(LinkedIn)
}

providers.push(
  Credentials({
    id: "credentials",
    name: "Email and Password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (credentials) => {
      const email = credentials?.email as string | undefined
      const password = credentials?.password as string | undefined

      if (!email || !password) return null

      const user = await prisma.user.findUnique({
        where: { email: normalizeEmail(email) },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          password: true,
          status: true,
        },
      })

      if (!user?.password) {
        await bcrypt.compare(password, UNKNOWN_USER_HASH)
        return null
      }

      const isValidPassword = await bcrypt.compare(password, user.password)
      if (!isValidPassword) return null

      if (user.status === UserStatus.BLOCKED) return null

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      }
    },
  }),
)

export const providerMap = providers
  .map((provider) => {
    if (typeof provider === "function") {
      const providerData = provider()
      return { id: providerData.id, name: providerData.name }
    } else {
      return { id: provider.id, name: provider.name }
    }
  })
  .filter((provider) => provider.id !== "credentials")

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: process.env.AUTH_DEBUG === "true",
  adapter: PrismaAdapter(prisma),
  providers,
  basePath: "/auth",
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async signIn({ user }) {
      return !user.email || (await canSignIn(user.email))
    },
    async jwt({ token, trigger, account, user }) {
      if (account && user) {
        token.id = user.id
      }
      if (trigger === "update" && token.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id },
          select: { name: true, image: true },
        })
        if (fresh) {
          token.name = fresh.name
          token.picture = fresh.image
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token?.id) session.user.id = token.id as string

      return session
    },
  },
})

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
  }
}
