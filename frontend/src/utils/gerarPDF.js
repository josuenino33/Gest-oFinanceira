import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function gerarRelatorioPDF({ data, patrimonioData, periodoLabel }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const fmt = v => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const hoje = new Date().toLocaleDateString('pt-BR')

  // Header
  doc.setFillColor(34, 197, 94)
  doc.rect(0, 0, W, 28, 'F')
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Minhas Financas', 14, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Relatorio Financeiro — Periodo: ${periodoLabel}`, 14, 20)
  doc.text(`Gerado em ${hoje}`, W - 14, 20, { align: 'right' })

  // Patrimônio
  doc.setTextColor(0)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Patrimônio', 14, 38)

  autoTable(doc, {
    startY: 42,
    head: [['Indicador', 'Valor']],
    body: [
      ['Patrimônio Líquido', fmt(patrimonioData?.patrimonio_liquido)],
      ['Em Caixa',           fmt(patrimonioData?.saldo_caixa)],
      ['A Pagar',            fmt(patrimonioData?.a_pagar)],
      ['Investido',          fmt(patrimonioData?.investimentos)],
      ['Rendimento',         fmt(patrimonioData?.rendimento)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [34, 197, 94], textColor: 0, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' } },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  })

  // Resumo do período
  const y1 = doc.lastAutoTable.finalY + 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(`Resumo do Período — ${periodoLabel}`, 14, y1)

  autoTable(doc, {
    startY: y1 + 4,
    head: [['Categoria', 'Valor']],
    body: [
      ['Receitas',       fmt(data?.receitas)],
      ['Despesas',       fmt(data?.despesas)],
      ['Saldo',          fmt(data?.saldo)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [34, 197, 94], textColor: 0, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' } },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  })

  // Gastos por categoria
  if (data?.categorias?.length > 0) {
    const y2 = doc.lastAutoTable.finalY + 10
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('Gastos por Categoria', 14, y2)

    autoTable(doc, {
      startY: y2 + 4,
      head: [['Categoria', 'Total']],
      body: data.categorias.map(c => [c.nome, fmt(c.total)]),
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94], textColor: 0, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' } },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    })
  }

  // Footer
  const pages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text(`Minhas Financas — Pagina ${i} de ${pages}`, W / 2, 290, { align: 'center' })
  }

  doc.save(`relatorio-financeiro-${hoje.replace(/\//g, '-')}.pdf`)
}
