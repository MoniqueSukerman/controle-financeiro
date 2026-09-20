export interface OfxTransaction {
  date: string
  description: string
  amount: number
}

function extractTag(block: string, tag: string): string | undefined {
  const match = block.match(new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i'))
  return match?.[1].trim()
}

function toIsoDate(dtposted: string): string {
  const year = dtposted.slice(0, 4)
  const month = dtposted.slice(4, 6)
  const day = dtposted.slice(6, 8)
  return `${year}-${month}-${day}`
}

export function parseOfx(content: string): OfxTransaction[] {
  const blocks = content.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi) ?? []

  return blocks
    .map((block): OfxTransaction | null => {
      const dtposted = extractTag(block, 'DTPOSTED')
      const trnamt = extractTag(block, 'TRNAMT')
      if (!dtposted || !trnamt) return null

      const memo = extractTag(block, 'MEMO')
      const name = extractTag(block, 'NAME')

      return {
        date: toIsoDate(dtposted),
        amount: Number.parseFloat(trnamt),
        description: memo || name || 'Transação importada',
      }
    })
    .filter((t): t is OfxTransaction => t !== null && !Number.isNaN(t.amount))
}
