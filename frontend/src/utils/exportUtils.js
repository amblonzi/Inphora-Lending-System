import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const downloadBuffer = (buffer, filename, type) => {
  const blob = new Blob([buffer], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export data to CSV
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file (without extension)
 */
export const exportToCSV = async (data, filename) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');
  
  if (data && data.length > 0) {
    worksheet.columns = Object.keys(data[0]).map(key => ({ header: key, key }));
    worksheet.addRows(data);
  }
  
  const buffer = await workbook.csv.writeBuffer();
  downloadBuffer(buffer, `${filename}.csv`, 'text/csv;charset=utf-8;');
};

/**
 * Export data to Excel (.xlsx)
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file (without extension)
 * @param {string} sheetName - Name of the worksheet
 */
export const exportToExcel = async (data, filename, sheetName = 'Sheet1') => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  
  if (data && data.length > 0) {
    worksheet.columns = Object.keys(data[0]).map(key => ({ header: key, key }));
    worksheet.addRows(data);
  }
  
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, `${filename}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
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
