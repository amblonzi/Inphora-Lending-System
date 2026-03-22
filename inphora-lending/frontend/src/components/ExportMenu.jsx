import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, Table } from 'lucide-react';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/exportUtils';
import { motion, AnimatePresence } from 'framer-motion';

const ExportMenu = ({ data, columns, filename, title }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = (format) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const fullFilename = `${filename}_${timestamp}`;

    switch (format) {
      case 'csv':
        exportToCSV(data, fullFilename);
        break;
      case 'excel':
        exportToExcel(data, fullFilename);
        break;
      case 'pdf':
        exportToPDF(columns, data, fullFilename, title);
        break;
      default:
        break;
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all active:scale-95 shadow-sm font-bold text-xs uppercase tracking-widest"
      >
        <Download size={16} />
        <span>Export</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1a1b26] border border-gray-100 dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
          >
            <div className="p-1">
              <button
                onClick={() => handleExport('csv')}
                className="flex items-center gap-3 w-full px-4 py-3 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors group"
              >
                <Table size={16} className="text-gray-400 group-hover:text-tytaj-500" />
                <span className="text-xs font-bold uppercase tracking-wider">CSV</span>
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="flex items-center gap-3 w-full px-4 py-3 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors group"
              >
                <FileSpreadsheet size={16} className="text-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-wider">Excel</span>
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="flex items-center gap-3 w-full px-4 py-3 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors group"
              >
                <FileText size={16} className="text-rose-500" />
                <span className="text-xs font-bold uppercase tracking-wider">PDF</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExportMenu;
