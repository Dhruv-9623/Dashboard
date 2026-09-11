import { Fragment } from 'react'
import { cn } from '@/lib/utils'

// Digests come back from the Claude agent as Markdown. This renders the narrow
// subset the digest.compose() tool emits (headings, lists, bold, paragraphs)
// rather than pulling in a full CommonMark parser.
const renderInline = (text: string) =>
  text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((token, index) => {
    if (token.startsWith('**') && token.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-gray-900">
          {token.slice(2, -2)}
        </strong>
      )
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <code key={index} className="rounded bg-gray-100 px-1 py-0.5 text-[0.85em] text-gray-800">
          {token.slice(1, -1)}
        </code>
      )
    }
    return <Fragment key={index}>{token}</Fragment>
  })

export const Markdown = ({ content, className }: { content: string; className?: string }) => {
  const blocks: React.ReactNode[] = []
  let listBuffer: string[] = []

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return
    blocks.push(
      <ul key={key} className="my-3 list-disc space-y-1.5 pl-5 text-sm text-gray-700">
        {listBuffer.map((item, index) => (
          <li key={index}>{renderInline(item)}</li>
        ))}
      </ul>
    )
    listBuffer = []
  }

  content.split('\n').forEach((rawLine, index) => {
    const line = rawLine.trimEnd()
    const key = `block-${index}`

    if (/^\s*[-*]\s+/.test(line)) {
      listBuffer.push(line.replace(/^\s*[-*]\s+/, ''))
      return
    }

    flushList(`list-${index}`)

    if (!line.trim()) return

    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      const text = renderInline(heading[2])
      if (level <= 2) {
        blocks.push(
          <h2 key={key} className="mb-2 mt-6 text-lg font-semibold text-gray-900 first:mt-0">
            {text}
          </h2>
        )
      } else {
        blocks.push(
          <h3 key={key} className="mb-1.5 mt-5 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {text}
          </h3>
        )
      }
      return
    }

    blocks.push(
      <p key={key} className="my-2.5 text-sm leading-relaxed text-gray-700">
        {renderInline(line)}
      </p>
    )
  })

  flushList('list-final')

  return <div className={cn('max-w-none', className)}>{blocks}</div>
}
