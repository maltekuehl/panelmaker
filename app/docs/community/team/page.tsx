import Bluesky from "@/components/icons/bluesky"
import GitHub from "@/components/icons/github"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Team | PanelMaker",
  description:
    "Meet the PanelMaker team: maintainers, contributors, and advisory committee members driving the development of spatial proteomics research tools.",
  keywords: [
    "PanelMaker team",
    "maintainers",
    "contributors",
    "advisory committee",
    "open source community",
    "spatial proteomics",
    "antibody panels",
  ],
  openGraph: {
    title: "Team | PanelMaker",
    description: "Meet the team behind PanelMaker",
    type: "website",
  },
}

const members = [
  {
    avatar: "https://www.github.com/vpuelles.png",
    name: "Victor Puelles",
    title: "Principal Investigator",
    bio: "Project lead and principal investigator. Head of the Complex Tissue Lab at the University of Aachen.",
    links: [
      { icon: "github", link: "https://github.com/vpuelles" },
      { icon: "website", link: "https://complextissue.com" },
    ],
  },
  {
    avatar: "https://www.github.com/maltekuehl.png",
    name: "Malte Kuehl",
    title: "Maintainer",
    bio: "Platform development and project management.",
    links: [
      { icon: "github", link: "https://github.com/maltekuehl" },
      { icon: "bluesky", link: "https://bsky.app/profile/panelmaker.ai" },
    ],
  },
  {
    avatar: "https://www.github.com/dschaub95.png",
    name: "Darius P. Schaub",
    title: "Maintainer",
    bio: "Data models and API development.",
    links: [{ icon: "github", link: "https://github.com/dschaub95" }],
  },
  {
    avatar: "https://www.github.com/camifz.png",
    name: "Camila Fernández Zapata",
    title: "Maintainer",
    bio: "Biological use case evaluation and community engagement.",
    links: [{ icon: "github", link: "https://github.com/camifz" }],
  },
  {
    avatar: "https://www.github.com/nnnkaiser.png",
    name: "Nico Kaiser",
    title: "Maintainer",
    bio: "Platform maintenance and infrastructure.",
    links: [{ icon: "github", link: "https://github.com/nnnkaiser" }],
  },
  {
    avatar: "https://www.github.com/saezrodriguez.png",
    name: "Julio Sáez Rodríguez",
    title: "Advisory Committee",
    bio: "Technical advisory and project guidance.",
    links: [{ icon: "github", link: "https://github.com/saezrodriguez" }],
  },
]

function getIconComponent(iconType: string) {
  switch (iconType) {
    case "github":
      return <GitHub className="w-4 h-4" />
    case "bluesky":
      return <Bluesky className="w-4 h-4" />
    case "website":
      return <ExternalLink className="h-4 w-4" />
    default:
      return <ExternalLink className="h-4 w-4" />
  }
}

export default function TeamPage() {
  return (
    <div className="py-12 px-6">
      {/* Header Section */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Meet the <span className="text-primary">PanelMaker</span> Team
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          We are an interdisciplinary and multi-institute team of individuals looking to improve the next generation of
          agentic systems for biomedical research.
        </p>
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {members.map((member, index) => (
          <Card
            key={index}
            className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/50"
          >
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg group-hover:ring-primary/20 transition-all duration-300">
                  <AvatarImage src={member.avatar} alt={member.name} className="object-cover" />
                  <AvatarFallback className="text-lg font-semibold bg-linear-to-br from-primary/20 to-secondary/20">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-xl font-bold">{member.name}</CardTitle>
              <CardDescription className="text-sm">
                <Badge variant="secondary" className="mt-2">
                  {member.title}
                </Badge>
              </CardDescription>
            </CardHeader>

            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{member.bio}</p>

              {/* Social Links */}
              <div className="flex justify-center gap-2">
                {member.links.map((link, linkIndex) => (
                  <Button
                    key={linkIndex}
                    variant="outline"
                    size="sm"
                    asChild
                    className="hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Link
                      href={link.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      {getIconComponent(link.icon)}
                      <span className="capitalize">{link.icon}</span>
                    </Link>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Call to Action Section */}
      <div className="mt-20 text-center bg-linear-to-r from-primary/5 to-secondary/5 rounded-lg p-8 border border-border/50">
        <h2 className="text-2xl font-bold mb-4">Join Our Mission</h2>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          Interested in contributing to PanelMaker? We&apos;re always looking for passionate researchers, developers,
          and domain experts to join our community.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/docs/community/governance">Start Contributing</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/browse">Browse Antibodies</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
