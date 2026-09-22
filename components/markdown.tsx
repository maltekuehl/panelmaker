import "@/node_modules/rehype-github-alerts/dist/styling/css/index.css"
import { defaultSchema } from "hast-util-sanitize"
import Image from "next/image"
import ReactMarkdown from "react-markdown"
import rehypeExternalLinks from "rehype-external-links"
import { rehypeGithubAlerts } from "rehype-github-alerts"
import rehypeRaw from "rehype-raw"
import rehypeSanitize from "rehype-sanitize"
import remarkGfm from "remark-gfm"
import remarkSubSuper from "remark-supersub"
import { Pluggable, PluggableList } from "unified"
import CodeBlock from "./code-block"

interface MarkdownProps {
  children: string
}

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": (defaultSchema.attributes?.["*"] || []).filter((attr) => {
      const attrName = Array.isArray(attr) ? attr[0] : attr
      return attrName !== "className" && attrName !== "style"
    }),
  },
}

// Helper function to parse GitHub repository URL
function cleanProblematicHtmlTags(content: string): string {
  // List of HTML tags that should be removed but their content preserved
  const problematicTags = ["body", "section"]

  let cleanedContent = content

  // Remove problematic tags but keep their content
  for (const tag of problematicTags) {
    // Match opening and closing tags (case insensitive, with optional attributes)
    // Also handle leading whitespace before tags
    const openTagRegex = new RegExp(`^\\s*<${tag}[^>]*>\\s*`, "gmi")
    const closeTagRegex = new RegExp(`\\s*</${tag}>\\s*$`, "gmi")

    // Remove opening tags with any leading whitespace
    cleanedContent = cleanedContent.replace(openTagRegex, "")
    // Remove closing tags with any trailing whitespace
    cleanedContent = cleanedContent.replace(closeTagRegex, "")
  }

  // Security: Clean up HTML comments to prevent injection attacks
  // Multiple passes handle various edge cases and malformed comment patterns
  // Note: rehype-sanitize provides additional protection, but defense in depth is critical

  // First pass: standard well-formed HTML comments (including --!> variant)
  cleanedContent = cleanedContent.replace(/<!--[\s\S]*?--!?>/g, "")

  // Second pass: unclosed or malformed comments that could bypass sanitization
  cleanedContent = cleanedContent.replace(/<!--[\s\S]*$/g, "") // Unclosed comments at end
  cleanedContent = cleanedContent.replace(/^[\s\S]*?--!?>/g, "") // Comments without opening tag (both --> and --!>)

  // Third pass: remove malformed comment-like patterns
  cleanedContent = cleanedContent.replace(/<--[^>]*>/g, "") // Single dash variants
  cleanedContent = cleanedContent.replace(/<!-[^>]*>/g, "") // Partial opening tags
  cleanedContent = cleanedContent.replace(/<!--[^>]*$/g, "") // Incomplete opening tags at end

  // Clean up excessive whitespace that might result from tag removal
  cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n/g, "\n\n")

  // Don't remove leading whitespace indiscriminately as it breaks code block indentation
  // Only remove leading whitespace from lines that are clearly not part of code blocks
  // This is a more conservative approach that preserves code formatting

  return cleanedContent
}

const Markdown = (props: MarkdownProps) => {
  const string = cleanProblematicHtmlTags(props.children)

  return (
    <>
      <ReactMarkdown
        components={{
          code: ({ className, children, ...rest }) => {
            const isInline =
              !className?.includes("language-") || (typeof children === "string" && !children.includes("\n"))

            // For inline code, just render as a simple code element
            if (isInline) {
              return (
                <code className={`px-1 py-0.5 rounded bg-muted text-sm font-mono ${className || ""}`} {...rest}>
                  {children}
                </code>
              )
            }

            // For code blocks, extract language and content
            const match = /language-(\w+)/.exec(className || "")
            const language = match ? match[1] : "text"
            const value = String(children).replace(/\n$/, "")

            return <CodeBlock value={value} language={language} className={className} />
          },
          img: ({ node, ...rest }) => {
            const substrings = rest.alt?.split("{{")
            const alt = substrings ? String(substrings[0]).trim() : rest.alt || "Image"

            // Don't resize markdown images - use original dimensions or reasonable defaults
            const widthMatch = substrings && substrings.length >= 2 && String(substrings[1]).match(/w:\s?(\d+)/)
            const heightMatch = substrings && substrings.length >= 2 && String(substrings[1]).match(/h:\s?(\d+)/)

            // Only use custom dimensions if explicitly specified in alt text
            const hasCustomDimensions = widthMatch || heightMatch
            const width = widthMatch ? parseInt(widthMatch[1], 10) : undefined
            const height = heightMatch ? parseInt(heightMatch[1], 10) : undefined

            // Ensure src is always a string and handle empty/undefined cases
            const src = typeof rest.src === "string" ? rest.src : ""

            if (hasCustomDimensions) {
              return (
                <Image
                  src={src}
                  alt={alt}
                  width={width || 640}
                  height={height || 400}
                  className="select-none object-contain"
                  unoptimized
                />
              )
            }

            // Use native img element like GitHub does for maximum compatibility
            return <img src={src} alt={alt} style={{ maxWidth: "100%" }} className="select-none max-h-[480px]" />
          },
          table: ({ node, ...rest }) => {
            return (
              <div className="overflow-x-scroll p-1">
                <table className="table-auto">{rest.children}</table>
              </div>
            )
          },
        }}
        remarkPlugins={[remarkSubSuper, [remarkGfm, { singleTilde: false }] as Pluggable]}
        rehypePlugins={
          [
            rehypeRaw,
            [rehypeSanitize, sanitizeSchema],
            [
              rehypeExternalLinks,
              {
                target: "_blank",
                rel: ["noopener", "noreferrer"],
              },
            ],
            rehypeGithubAlerts,
          ] as PluggableList
        }
        allowedElements={[
          "a",
          "p",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "img",
          "table",
          "thead",
          "tbody",
          "tr",
          "th",
          "td",
          "ul",
          "ol",
          "li",
          "input",
          "blockquote",
          "code",
          "math",
          "pre",
          "em",
          "strong",
          "del",
          "ins",
          "hr",
          "br",
          "sup",
          "sub",
          "span",
          "div",
          "svg",
        ]}
      >
        {string}
      </ReactMarkdown>
    </>
  )
}

export default Markdown
