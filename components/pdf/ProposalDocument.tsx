import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer'
import { formatCurrency } from '@/lib/utils'

export interface ProposalData {
  jobNumber: string
  title: string | null
  generatedAt: string
  contractor: {
    companyName: string
    displayName: string
    phone: string | null
    email: string | null
    logoUrl: string | null
  }
  client: {
    firstName: string
    lastName: string
    addressLine1: string
    city: string
    state: string
    zip: string
    phone: string | null
    email: string | null
  }
  siteAddress: string | null
  notes: string | null
  areas: Array<{
    id: string
    label: string
    items: Array<{
      id: string
      category: string
      description: string
      quantity: number
      unit: string
      lineTotal: number
    }>
    areaTotal: number
  }>
  totals: {
    totalMaterial: number
    totalLabor: number
    totalMarkup: number
    grandTotal: number
  }
}

const BLUE = '#2563eb'
const GRAY_900 = '#111827'
const GRAY_600 = '#4b5563'
const GRAY_400 = '#9ca3af'
const GRAY_100 = '#f3f4f6'
const BORDER = '#e5e7eb'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: GRAY_900,
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 48,
  },

  // ── Header ────────────────────────────────────────────
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  logo: { width: 56, height: 56, objectFit: 'contain', borderRadius: 4 },
  companyName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: BLUE },
  companyContact: { fontSize: 8, color: GRAY_600, marginTop: 2 },

  // ── Title block ────────────────────────────────────────
  titleBlock: { backgroundColor: BLUE, borderRadius: 6, padding: 16, marginBottom: 20 },
  titleLabel: { fontSize: 8, color: '#bfdbfe', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  titleText: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  jobNumber: { fontSize: 8, color: '#bfdbfe', marginTop: 4, fontFamily: 'Helvetica-Oblique' },

  // ── Two-column meta ────────────────────────────────────
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  metaCard: { flex: 1, backgroundColor: GRAY_100, borderRadius: 6, padding: 12 },
  metaLabel: { fontSize: 7, color: GRAY_400, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  metaValue: { fontSize: 9, color: GRAY_900 },
  metaValueBold: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: GRAY_900 },

  // ── Section heading ────────────────────────────────────
  sectionLabel: { fontSize: 7, color: GRAY_400, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6, marginTop: 16 },

  // ── Area group ─────────────────────────────────────────
  areaHeader: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: GRAY_100, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4, marginBottom: 2 },
  areaLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: GRAY_900 },
  areaTotal: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: GRAY_900 },

  // ── Line item row ──────────────────────────────────────
  lineRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: BORDER },
  lineRowLast: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 10, paddingVertical: 5 },
  badge: { fontSize: 7, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1.5, marginRight: 6, marginTop: 0.5 },
  lineDesc: { flex: 1, fontSize: 9, color: GRAY_900, lineHeight: 1.35 },
  lineQty: { width: 40, fontSize: 8, color: GRAY_600, textAlign: 'right', marginRight: 8 },
  lineAmount: { width: 52, fontSize: 9, fontFamily: 'Helvetica-Bold', color: GRAY_900, textAlign: 'right' },

  // ── Totals ─────────────────────────────────────────────
  totalsContainer: { marginTop: 16, alignItems: 'flex-end' },
  totalsBox: { width: 220, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  totalLabel: { fontSize: 9, color: GRAY_600 },
  totalValue: { fontSize: 9, color: GRAY_900, textAlign: 'right' },
  grandRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: BORDER, marginTop: 4 },
  grandLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: GRAY_900 },
  grandValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: BLUE, textAlign: 'right' },

  // ── Notes ──────────────────────────────────────────────
  notesSection: { marginTop: 20, backgroundColor: GRAY_100, borderRadius: 6, padding: 12 },
  notesLabel: { fontSize: 7, color: GRAY_400, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  notesText: { fontSize: 9, color: GRAY_600, lineHeight: 1.5 },

  // ── Footer ─────────────────────────────────────────────
  footer: { position: 'absolute', bottom: 28, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: BORDER, paddingTop: 8 },
  footerText: { fontSize: 7, color: GRAY_400 },
})

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  material: { bg: '#eff6ff', text: '#1d4ed8' },
  labor:    { bg: '#f5f3ff', text: '#6d28d9' },
  permit:   { bg: '#fffbeb', text: '#b45309' },
  demo:     { bg: '#fff7ed', text: '#c2410c' },
  misc:     { bg: '#f9fafb', text: '#4b5563' },
}

function Badge({ category }: { category: string }) {
  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.misc
  return (
    <Text style={[s.badge, { backgroundColor: colors.bg, color: colors.text }]}>
      {category.toUpperCase()}
    </Text>
  )
}

export function ProposalDocument({ data }: { data: ProposalData }) {
  const { contractor, client, areas, totals } = data
  const clientAddress = `${client.addressLine1}, ${client.city}, ${client.state} ${client.zip}`
  const workSite = data.siteAddress || clientAddress
  const date = new Date(data.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <Document
      title={`Proposal ${data.jobNumber}`}
      author={contractor.companyName}
      creator="AccessScope"
    >
      <Page size="LETTER" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.companyName}>{contractor.companyName}</Text>
            {contractor.phone && <Text style={s.companyContact}>{contractor.phone}</Text>}
            {contractor.email && <Text style={s.companyContact}>{contractor.email}</Text>}
          </View>
          {contractor.logoUrl && (
            <Image src={contractor.logoUrl} style={s.logo} />
          )}
        </View>

        {/* Title */}
        <View style={s.titleBlock}>
          <Text style={s.titleLabel}>Accessibility Modification Proposal</Text>
          <Text style={s.titleText}>
            {data.title || `${client.firstName} ${client.lastName}`}
          </Text>
          <Text style={s.jobNumber}>{data.jobNumber} · {date}</Text>
        </View>

        {/* Meta: client + site */}
        <View style={s.metaRow}>
          <View style={s.metaCard}>
            <Text style={s.metaLabel}>Prepared for</Text>
            <Text style={s.metaValueBold}>{client.firstName} {client.lastName}</Text>
            <Text style={s.metaValue}>{clientAddress}</Text>
            {client.phone && <Text style={s.metaValue}>{client.phone}</Text>}
            {client.email && <Text style={s.metaValue}>{client.email}</Text>}
          </View>
          <View style={s.metaCard}>
            <Text style={s.metaLabel}>Work site</Text>
            <Text style={s.metaValue}>{workSite}</Text>
          </View>
        </View>

        {/* Line items */}
        <Text style={s.sectionLabel}>Scope of work</Text>

        {areas.map((area) => (
          <View key={area.id} style={{ marginBottom: 12 }} wrap={false}>
            <View style={s.areaHeader}>
              <Text style={s.areaLabel}>{area.label}</Text>
              <Text style={s.areaTotal}>{formatCurrency(area.areaTotal)}</Text>
            </View>

            {area.items.map((item, idx) => {
              const isLast = idx === area.items.length - 1
              return (
                <View key={item.id} style={isLast ? s.lineRowLast : s.lineRow}>
                  <Badge category={item.category} />
                  <Text style={s.lineDesc}>{item.description}</Text>
                  {(item.quantity !== 1 || item.unit !== 'each') && (
                    <Text style={s.lineQty}>{item.quantity} {item.unit}</Text>
                  )}
                  <Text style={s.lineAmount}>{formatCurrency(item.lineTotal)}</Text>
                </View>
              )
            })}
          </View>
        ))}

        {/* Totals */}
        <View style={s.totalsContainer}>
          <View style={s.totalsBox}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Materials</Text>
              <Text style={s.totalValue}>{formatCurrency(totals.totalMaterial)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Labor</Text>
              <Text style={s.totalValue}>{formatCurrency(totals.totalLabor)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Markup</Text>
              <Text style={s.totalValue}>{formatCurrency(totals.totalMarkup)}</Text>
            </View>
            <View style={s.grandRow}>
              <Text style={s.grandLabel}>Total Estimate</Text>
              <Text style={s.grandValue}>{formatCurrency(totals.grandTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={s.notesSection}>
            <Text style={s.notesLabel}>Notes &amp; Terms</Text>
            <Text style={s.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{contractor.companyName} · {data.jobNumber}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
