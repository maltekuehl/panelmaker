"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Bot, Send, Sparkles, User } from "lucide-react"

export function AIAssistantPanel() {
  return (
    <Card className="h-[400px] flex flex-col relative overflow-hidden bg-white p-0">
      <div className="p-4 border-b bg-zinc-50/50 flex justify-between items-center">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          AI Assistant
        </h3>
        <Badge
          variant="secondary"
          className="text-[10px] bg-green-100 text-green-700 hover:bg-green-100 px-2 py-0.5 rounded-full border-0"
        >
          MCP Active
        </Badge>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto text-sm">
        {/* Bot Message */}
        <div className="flex gap-3">
          <div className="h-6 w-6 rounded bg-purple-100 flex items-center justify-center shrink-0">
            <Bot className="h-3 w-3 text-purple-700" />
          </div>
          <div className="bg-muted p-3 rounded-md rounded-tl-none">
            <p>
              Hello! I can help you design IF panels or find markers. Try asking: &quot;Design a 4-plex panel for human
              liver.&quot;
            </p>
          </div>
        </div>

        {/* User Message */}
        <div className="flex gap-3 flex-row-reverse">
          <div className="h-6 w-6 rounded bg-zinc-200 flex items-center justify-center shrink-0">
            <User className="h-3 w-3 text-zinc-700" />
          </div>
          <div className="bg-primary text-primary-foreground p-3 rounded-md rounded-tr-none">
            <p>What are good markers for Kupffer cells?</p>
          </div>
        </div>

        {/* Bot Message with Actions */}
        <div className="flex gap-3">
          <div className="h-6 w-6 rounded bg-purple-100 flex items-center justify-center shrink-0">
            <Bot className="h-3 w-3 text-purple-700" />
          </div>
          <div className="bg-muted p-3 rounded-md rounded-tl-none">
            <p>
              For human Kupffer cells, <strong>CD163</strong> and <strong>CD68</strong> are standard.{" "}
              <strong>MARCO</strong> is also highly specific.
            </p>
            <div className="mt-2 flex gap-2">
              <Button variant="outline" size="sm" className="h-auto py-1 px-2 text-xs bg-white">
                View CD163
              </Button>
              <Button variant="outline" size="sm" className="h-auto py-1 px-2 text-xs bg-white">
                Add to Panel
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 border-t bg-background">
        <form className="flex w-full items-center space-x-2" onSubmit={(e) => e.preventDefault()}>
          <Input className="flex-1 h-9 text-sm" placeholder="Ask PanelMaker AI..." />
          <Button type="submit" size="icon" className="h-9 w-9">
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
        <div className="text-muted-foreground mt-2 text-center text-[10px]">Powered by BioContextAI</div>
      </div>
    </Card>
  )
}
