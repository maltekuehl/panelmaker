import { createAuthHandler } from "@/lib/auth"
import { createErrorResponse, createSuccessResponse } from "@/lib/error-handling"
import { getRequestContext, logger } from "@/lib/monitoring"
import { prisma } from "@/lib/prisma"
import { connection, NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const reviewApprovalSchema = z.object({
  reviewId: z.string().min(1, "Review ID is required"),
  action: z.enum(["approve", "delete", "delete_and_block"]),
})

export const GET = createAuthHandler(async (request: NextRequest, user) => {
  await connection()
  const context = getRequestContext(request)
  logger.apiRequest("GET", "/api/admin/reviews", { ...context, userId: user.id })

  try {
    const reviews = await prisma.review.findMany({
      where: { isPending: true },
      include: { author: true },
    })

    return createSuccessResponse({
      reviews: reviews.map((review) => ({
        id: review.id,
        name: review.name,
        reviewBody: review.reviewBody,
        isHelpful: review.isHelpful,
        datePublished: review.datePublished,
        author: {
          id: review.author.id,
          name: review.author.name,
          email: review.author.email,
          image: review.author.image,
        },
        isPending: review.isPending,
        isApproved: review.isApproved,
      })),
    })
  } catch (error) {
    logger.error("Failed to fetch pending reviews", error as Error, { userId: user.id })
    return createErrorResponse(error, "Failed to fetch pending reviews")
  }
}, true)

export const POST = createAuthHandler(async (request: NextRequest, user) => {
  const context = getRequestContext(request)
  logger.apiRequest("POST", "/api/admin/reviews", { ...context, userId: user.id })

  try {
    const body = await request.json()
    const { reviewId, action } = reviewApprovalSchema.parse(body)

    switch (action) {
      case "approve": {
        await prisma.review.update({
          where: { id: reviewId },
          data: { isPending: false, isApproved: true, approvedBy: user.id, approvedAt: new Date() },
        })
        logger.info("Review approved by admin", { reviewId, adminId: user.id })
        return createSuccessResponse({ message: "Review approved successfully" })
      }

      case "delete": {
        await prisma.review.delete({ where: { id: reviewId } })
        logger.info("Review deleted by admin", { reviewId, adminId: user.id })
        return createSuccessResponse({ message: "Review deleted successfully" })
      }

      case "delete_and_block": {
        const review = await prisma.review.findUnique({
          where: { id: reviewId },
          select: { authorId: true, author: { select: { name: true } } },
        })
        if (!review) {
          return NextResponse.json({ error: "Review not found" }, { status: 404 })
        }
        await prisma.$transaction([
          prisma.review.delete({ where: { id: reviewId } }),
          prisma.user.update({ where: { id: review.authorId }, data: { status: "BLOCKED" } }),
        ])
        logger.info("Review deleted and user blocked by admin", {
          reviewId,
          adminId: user.id,
          blockedUser: review.author.name,
        })
        return createSuccessResponse({ message: `Review deleted and user ${review.author.name} blocked successfully` })
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    logger.error("Failed to process review action", error as Error, { userId: user.id })
    return createErrorResponse(error, "Failed to process review action")
  }
}, true)
