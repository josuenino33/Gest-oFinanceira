export function exportToCSV(data, filename, columns) {
  const header = columns.map(c => c.label).join(';')
  const rows = data.map(row =>
    columns.map(c => {
      const val = row[c.key] ?? ''
      const str = typeof c.format === 'function' ? c.format(val, row) : String(val)
      return str.includes(';') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"` : str
    }).join(';')
  )
  const csv = '﻿' + [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
