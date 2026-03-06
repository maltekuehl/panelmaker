import bcrypt from "bcryptjs"
import NextAuth from "next-auth"
import "next-auth/jwt"

import { canSignIn } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PrismaAdapter } from "@auth/prisma-adapter"
import type { Provider } from "next-auth/providers"
import Credentials from "next-auth/providers/credentials"
import GitHub from "next-auth/providers/github"
import LinkedIn from "next-auth/providers/linkedin"

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
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          password: true,
          status: true,
        },
      })

      if (!user || !user.password) return null

      const isValidPassword = await bcrypt.compare(password, user.password)
      if (!isValidPassword) return null

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
  debug: process.env.NODE_ENV === "development",
  theme: { logo: undefined, colorScheme: "auto" },
  adapter: PrismaAdapter(prisma),
  providers,
  basePath: "/auth",
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (user.email) {
        const canUserSignIn = await canSignIn(user.email)
        if (!canUserSignIn) {
          return false
        }
      }

      if (account?.provider === "credentials") {
        return true
      }

      return true
    },
    jwt({ token, trigger, session, account, user }) {
      if (trigger === "update") token.name = session.user.name
      if (account && user) {
        token.id = user.id
      }
      if (account?.provider === "github" || account?.provider === "linkedin") {
        return { ...token, accessToken: account.access_token, refreshToken: account.refresh_token }
      }
      return token
    },
    async session({ session, token }) {
      if (token?.accessToken) session.accessToken = token.accessToken
      if (token?.id) session.user.id = token.id as string

      return session
    },
  },
})

declare module "next-auth" {
  interface Session {
    accessToken?: string
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
    accessToken?: string
    id?: string
  }
}
