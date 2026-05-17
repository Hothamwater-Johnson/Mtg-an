import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { ProposalDocument } from '@/components/pdf/ProposalDocument'
import type { ProposalData } from '@/components/pdf/ProposalDocument'

export type { ProposalData }

export async function generateProposalPdf(data: ProposalData): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(ProposalDocument, { data }) as any
  const buffer = await renderToBuffer(element)
  return Buffer.from(buffer)
}
