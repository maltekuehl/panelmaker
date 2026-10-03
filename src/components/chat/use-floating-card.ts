"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const DEFAULT_WIDTH = 440
const DEFAULT_HEIGHT = 640
const MIN_WIDTH = 300
const MAX_WIDTH = 600
const MIN_HEIGHT = 350
const MAX_HEIGHT = 800
const CARD_HEIGHT_MINIMIZED = 48
const EDGE_MARGIN = 16
const DRAG_THRESHOLD = 4

// The card is anchored by its bottom-right corner (CSS `right`/`bottom` offsets
// from the viewport edges), matching the FAB origin. With this anchor, minimizing
// collapses straight down and resizing from the top-left corner grows up/left,
// both for free, without recomputing the position.
const DEFAULT_OFFSET = { right: EDGE_MARGIN, bottom: EDGE_MARGIN }

type Offset = typeof DEFAULT_OFFSET

// Clamp the bottom-right offsets so the card stays fully on screen.
function clampOffset(right: number, bottom: number, width: number, height: number): Offset {
  const maxRight = Math.max(0, window.innerWidth - width)
  const maxBottom = Math.max(0, window.innerHeight - height)
  return {
    right: Math.max(0, Math.min(right, maxRight)),
    bottom: Math.max(0, Math.min(bottom, maxBottom)),
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function trackWindowGesture<M extends keyof WindowEventMap>(
  moveType: M,
  endType: keyof WindowEventMap,
  onMove: (event: WindowEventMap[M]) => void,
  onEnd: () => void,
  moveOptions?: AddEventListenerOptions,
) {
  const handleEnd = () => {
    onEnd()
    window.removeEventListener(moveType, onMove)
    window.removeEventListener(endType, handleEnd)
  }
  window.addEventListener(moveType, onMove, moveOptions)
  window.addEventListener(endType, handleEnd)
}

function measure(card: HTMLDivElement | null) {
  return { width: card?.offsetWidth ?? DEFAULT_WIDTH, height: card?.offsetHeight ?? DEFAULT_HEIGHT }
}

function startsOnButton(event: React.SyntheticEvent): boolean {
  return Boolean((event.target as HTMLElement).closest("button"))
}

// Position, size and minimized state of the floating assistant card, plus the drag (header) and
// resize (top-left corner) gestures that change them.
export function useFloatingCard(isOpen: boolean) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [offset, setOffset] = useState(DEFAULT_OFFSET)
  const [isDragging, setIsDragging] = useState(false)
  const [dimensions, setDimensions] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT })
  const [isResizing, setIsResizing] = useState(false)

  const dragStartPointer = useRef<{ x: number; y: number } | null>(null)
  const dragStartOffset = useRef<Offset | null>(null)
  const hasDragged = useRef(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(offset)
  const resizeStart = useRef<{ x: number; y: number; width: number; height: number } | null>(null)

  useEffect(() => {
    offsetRef.current = offset
  }, [offset])

  // A viewport that shrinks under the card would otherwise strand it outside the visible area.
  useEffect(() => {
    if (!isOpen) return
    const onViewportResize = () =>
      setOffset((current) => {
        const { width, height } = measure(cardRef.current)
        return clampOffset(current.right, current.bottom, width, height)
      })
    window.addEventListener("resize", onViewportResize)
    return () => window.removeEventListener("resize", onViewportResize)
  }, [isOpen])

  // Dragging moves the card by adjusting its bottom-right offsets: a rightward
  // pointer move decreases the `right` offset, a downward move decreases `bottom`.
  const applyDrag = useCallback((clientX: number, clientY: number) => {
    if (!dragStartPointer.current || !dragStartOffset.current) return false
    const dx = clientX - dragStartPointer.current.x
    const dy = clientY - dragStartPointer.current.y

    if (!hasDragged.current && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return false
    hasDragged.current = true

    const { width, height } = measure(cardRef.current)
    setOffset(clampOffset(dragStartOffset.current.right - dx, dragStartOffset.current.bottom - dy, width, height))
    return true
  }, [])

  const startDrag = useCallback((clientX: number, clientY: number) => {
    hasDragged.current = false
    dragStartPointer.current = { x: clientX, y: clientY }
    dragStartOffset.current = { ...offsetRef.current }
    setIsDragging(true)
  }, [])

  const endDrag = useCallback(() => {
    setIsDragging(false)
    dragStartPointer.current = null
    dragStartOffset.current = null
  }, [])

  const onHeaderMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (startsOnButton(e)) return
      e.preventDefault()
      startDrag(e.clientX, e.clientY)
      trackWindowGesture("mousemove", "mouseup", (move) => applyDrag(move.clientX, move.clientY), endDrag)
    },
    [startDrag, applyDrag, endDrag],
  )

  const onHeaderTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (startsOnButton(e)) return
      const touch = e.touches[0]
      startDrag(touch.clientX, touch.clientY)
      trackWindowGesture(
        "touchmove",
        "touchend",
        (move) => {
          const point = move.touches[0]
          if (applyDrag(point.clientX, point.clientY)) move.preventDefault()
        },
        endDrag,
        { passive: false },
      )
    },
    [startDrag, applyDrag, endDrag],
  )

  // Minimizing/expanding only toggles height. The bottom-right anchor keeps the bottom edge fixed,
  // so the card collapses straight down toward its origin and grows back up on expand. A card parked
  // near the top of the viewport would grow its header (the only drag and toggle affordance) off
  // screen, so the offset is re-clamped against the height it is about to have.
  const handleHeaderClick = useCallback(() => {
    if (hasDragged.current) return
    const nextHeight = isMinimized ? dimensions.height : CARD_HEIGHT_MINIMIZED
    setOffset((current) => clampOffset(current.right, current.bottom, dimensions.width, nextHeight))
    setIsMinimized(!isMinimized)
  }, [isMinimized, dimensions.height, dimensions.width])

  const toggleMinimized = useCallback(() => setIsMinimized((prev) => !prev), [])

  // The bottom-right anchor is fixed, so resizing is purely a dimension change:
  // dragging the top-left corner up/left grows the card up/left.
  const onResizeMove = useCallback((e: MouseEvent) => {
    if (!resizeStart.current) return
    const width = clamp(resizeStart.current.width + resizeStart.current.x - e.clientX, MIN_WIDTH, MAX_WIDTH)
    const height = clamp(resizeStart.current.height + resizeStart.current.y - e.clientY, MIN_HEIGHT, MAX_HEIGHT)
    setDimensions({ width, height })
    setOffset((current) => clampOffset(current.right, current.bottom, width, height))
  }, [])

  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      resizeStart.current = { x: e.clientX, y: e.clientY, width: dimensions.width, height: dimensions.height }
      setIsResizing(true)
      trackWindowGesture("mousemove", "mouseup", onResizeMove, () => {
        setIsResizing(false)
        resizeStart.current = null
      })
    },
    [dimensions, onResizeMove],
  )

  const style: React.CSSProperties = {
    right: offset.right,
    bottom: offset.bottom,
    width: dimensions.width,
    height: isMinimized ? CARD_HEIGHT_MINIMIZED : dimensions.height,
    transition: isDragging || isResizing ? "none" : "height 200ms ease-in-out",
  }

  return {
    cardRef,
    style,
    isMinimized,
    isDragging,
    toggleMinimized,
    handleHeaderClick,
    onHeaderMouseDown,
    onHeaderTouchStart,
    onResizeMouseDown,
  }
}
