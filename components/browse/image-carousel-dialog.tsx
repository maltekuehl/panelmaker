"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ImageIcon } from "lucide-react"

interface ImageCarouselDialogProps {
  images: string[]
  title: string
}

export function ImageCarouselDialog({ images, title }: ImageCarouselDialogProps) {
  const hasImages = images && images.length > 0
  const displayImages = hasImages ? images : ["/assets/placeholder.svg"] // Fallback

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors overflow-hidden group">
          <CardContent className="p-0 aspect-video relative bg-muted flex items-center justify-center">
            {hasImages ? (
              <div className="relative w-full h-full">
                {/* Using a simple div for placeholder if next/image is tricky with external URLs or placeholders */}
                <div className="w-full h-full bg-zinc-100 flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-10 w-10 mb-2" />
                </div>
                {/* In a real app, we'd use next/image here with the first image */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 bg-black/75 text-white text-xs px-2 py-1 rounded-full transition-opacity">
                    View Gallery
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-muted-foreground">
                <ImageIcon className="h-8 w-8 mb-2" />
                <span className="text-xs">No images</span>
              </div>
            )}
          </CardContent>
        </Card>
      </DialogTrigger>
      {hasImages && (
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black border-zinc-800">
          <DialogTitle className="sr-only">{title} Images</DialogTitle>
          <div className="relative w-full aspect-video flex items-center justify-center bg-black">
            <Carousel className="w-full max-w-xl">
              <CarouselContent>
                {displayImages.map((src, index) => (
                  <CarouselItem key={index}>
                    <div className="p-1">
                      <div className="flex aspect-video items-center justify-center p-6">
                        {/* Placeholder for actual image component */}
                        <div className="w-full h-full bg-zinc-900 rounded-lg flex items-center justify-center text-zinc-500">
                          Image {index + 1}: {src}
                        </div>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-4" />
              <CarouselNext className="right-4" />
            </Carousel>
          </div>
        </DialogContent>
      )}
    </Dialog>
  )
}
