"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Bot, ChevronDown, ChevronUp, Send, Sparkles, User, X } from "lucide-react"
import { useState } from "react"

export function AIAssistantFloating() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  if (!isOpen) {
    return (
      <Button
        className="fixed bottom-4 right-4 h-12 rounded-full shadow-lg z-50 gap-2 pl-3 pr-4"
        onClick={() => setIsOpen(true)}
      >
        <div className="bg-white/20 p-1 rounded-full">
          <Sparkles className="h-4 w-4" />
        </div>
        AI Assistant
      </Button>
    )
  }

  return (
    <Card
      className={cn(
        "fixed bottom-4 right-4 w-[350px] bg-white shadow-xl z-50 flex flex-col overflow-hidden transition-all duration-300 ease-in-out border-zinc-200 p-0",
        isMinimized ? "h-[48px]" : "h-[500px]",
      )}
    >
      {/* Header */}
      <div
        className="p-3 border-b bg-zinc-50/80 backdrop-blur flex justify-between items-center cursor-pointer hover:bg-zinc-100/80 transition-colors"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          AI Assistant
        </h3>
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 border-0 mr-2">
            MCP Active
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
              setIsMinimized(!isMinimized)
            }}
          >
            {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(false)
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <>
          <div className="flex-1 p-4 space-y-4 overflow-y-auto text-sm bg-white">
            {/* Bot Message */}
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded bg-purple-100 flex items-center justify-center shrink-0">
                <Bot className="h-3 w-3 text-purple-700" />
              </div>
              <div className="bg-muted p-3 rounded-md rounded-tl-none">
                <p>
                  Hello! I can help you design IF panels or find markers. Try asking: &quot;Design a 4-plex panel for
                  human liver.&quot;
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
        </>
      )}
    </Card>
  )
}
