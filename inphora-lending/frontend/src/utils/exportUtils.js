import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Export data to CSV
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file (without extension)
 */
export const exportToCSV = (data, filename) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${filename}.csv`);
};

/**
 * Export data to Excel (.xlsx)
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file (without extension)
 * @param {string} sheetName - Name of the worksheet
 */
export const exportToExcel = (data, filename, sheetName = 'Sheet1') => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

/**
 * Export data to PDF using autoTable
 * @param {Array} columns - Array of column objects { header: 'Title', dataKey: 'key' }
 * @param {Array} data - Array of data objects
 * @param {string} filename - Name of the file (without extension)
 * @param {string} title - Title to display at the top of the PDF
 */
export const exportToPDF = (columns, data, filename, title) => {
  const doc = new jsPDF();
  
  // Title
  if (title) {
      doc.setFontSize(18);
      doc.text(title, 14, 22);
  }
  
  // Table
  autoTable(doc, {
    startY: title ? 30 : 20,
    columns: columns,
    body: data,
    headStyles: { fillColor: [249, 115, 22] }, // Using orange primary color (approx #f97316)
    styles: { fontSize: 8 },
    theme: 'grid'
  });
  
  doc.save(`${filename}.pdf`);
};
