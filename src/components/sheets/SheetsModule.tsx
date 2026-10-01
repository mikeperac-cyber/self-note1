import React, { useState, useRef } from 'react';
import { 
  SheetData, SheetCell, Folder 
} from '../../types';
import { 
  Table, Plus, Download, Upload, Trash2, DollarSign, Percent, Bold, 
  Search, FileSpreadsheet, Database, ChevronDown, Check, Calendar, 
  HelpCircle, Sparkles, Folder as FolderIcon 
} from 'lucide-react';
import { 
  colIndexToLetter, evaluateCell, exportSheetToCSV, parseCSVToSheet 
} from '../../utils/formulaEngine';

interface SheetsModuleProps {
  sheets: SheetData[];
  folders: Folder[];
  onSaveSheet: (sheet: SheetData) => void;
  onCreateSheet: (mode: 'spreadsheet' | 'database', folderId?: string) => void;
  onDeleteSheet: (sheetId: string) => void;
  activeFolderId?: string;
}

export const SheetsModule: React.FC<SheetsModuleProps> = ({
  sheets,
  folders,
  onSaveSheet,
  onCreateSheet,
  onDeleteSheet,
  activeFolderId,
}) => {
  const [selectedSheetId, setSelectedSheetId] = useState<string>(sheets[0]?.id || '');
  const [selectedCoord, setSelectedCoord] = useState<string>('A1');
  const [formulaInput, setFormulaInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentSheet = sheets.find(s => s.id === selectedSheetId) || sheets[0];

  const filteredSheets = sheets.filter(s => {
    if (activeFolderId && s.folderId !== activeFolderId) return false;
    if (searchQuery.trim() && !s.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Handle cell selection
  const handleSelectCell = (coord: string) => {
    setSelectedCoord(coord);
    const cell = currentSheet?.cells[coord];
    setFormulaInput(cell?.raw || '');
  };

  // Update cell raw value
  const handleUpdateCell = (coord: string, rawVal: string) => {
    if (!currentSheet) return;
    const updatedCells = {
      ...currentSheet.cells,
      [coord]: {
        ...(currentSheet.cells[coord] || {}),
        raw: rawVal,
      },
    };
    onSaveSheet({
      ...currentSheet,
      cells: updatedCells,
      updatedAt: new Date().toISOString(),
    });
  };

  // Cell formatting toggle: bold, currency, percent
  const toggleCellFormat = (formatType: 'bold' | 'currency' | 'percent') => {
    if (!currentSheet || !selectedCoord) return;
    const existing = currentSheet.cells[selectedCoord] || { raw: '' };
    let updatedCell: SheetCell = { ...existing };

    if (formatType === 'bold') {
      updatedCell.bold = !updatedCell.bold;
    } else if (formatType === 'currency') {
      updatedCell.format = updatedCell.format === 'currency' ? undefined : 'currency';
    } else if (formatType === 'percent') {
      updatedCell.format = updatedCell.format === 'percent' ? undefined : 'percent';
    }

    const updatedCells = {
      ...currentSheet.cells,
      [selectedCoord]: updatedCell,
    };

    onSaveSheet({
      ...currentSheet,
      cells: updatedCells,
      updatedAt: new Date().toISOString(),
    });
  };

  // Add row or column
  const handleAddRow = () => {
    if (!currentSheet) return;
    onSaveSheet({
      ...currentSheet,
      rows: currentSheet.rows + 1,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddCol = () => {
    if (!currentSheet) return;
    onSaveSheet({
      ...currentSheet,
      cols: currentSheet.cols + 1,
      updatedAt: new Date().toISOString(),
    });
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!currentSheet) return;
    const csv = exportSheetToCSV(currentSheet.rows, currentSheet.cols, currentSheet.cells);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentSheet.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import CSV
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentSheet) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const { rows, cols, cells } = parseCSVToSheet(text);
        onSaveSheet({
          ...currentSheet,
          rows,
          cols,
          cells,
          updatedAt: new Date().toISOString(),
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Database mode: Add new row
  const handleAddDbRow = () => {
    if (!currentSheet || currentSheet.mode !== 'database') return;
    const newRowId = `r_${Date.now()}`;
    const newRow: Record<string, any> = { id: newRowId };
    (currentSheet.dbColumns || []).forEach(col => {
      newRow[col.id] = col.type === 'checkbox' ? false : '';
    });
    onSaveSheet({
      ...currentSheet,
      dbRows: [...(currentSheet.dbRows || []), newRow],
      updatedAt: new Date().toISOString(),
    });
  };

  // Database mode: Update cell in row
  const handleUpdateDbCell = (rowId: string, colId: string, value: any) => {
    if (!currentSheet || currentSheet.mode !== 'database') return;
    const updatedRows = (currentSheet.dbRows || []).map(r => 
      r.id === rowId ? { ...r, [colId]: value } : r
    );
    onSaveSheet({
      ...currentSheet,
      dbRows: updatedRows,
      updatedAt: new Date().toISOString(),
    });
  };

  // Database mode: Delete row
  const handleDeleteDbRow = (rowId: string) => {
    if (!currentSheet || currentSheet.mode !== 'database') return;
    onSaveSheet({
      ...currentSheet,
      dbRows: (currentSheet.dbRows || []).filter(r => r.id !== rowId),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-950">
      
      {/* LEFT: Sheets & Databases Selector */}
      <div className="w-72 flex-shrink-0 border-r border-slate-800 flex flex-col bg-slate-900/60">
        
        {/* Header & New Sheet */}
        <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sheets..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onCreateSheet('spreadsheet', activeFolderId)}
              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
              title="Create Formula Spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onCreateSheet('database', activeFolderId)}
              className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer"
              title="Create Dynamic Database Table"
            >
              <Database className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* List of Sheets */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filteredSheets.map(sheet => {
            const isSelected = sheet.id === currentSheet?.id;
            const folder = folders.find(f => f.id === sheet.folderId);
            return (
              <div
                key={sheet.id}
                onClick={() => setSelectedSheetId(sheet.id)}
                className={`p-3 rounded-xl cursor-pointer transition-all border ${
                  isSelected 
                    ? 'bg-slate-800/90 border-indigo-500/40 shadow-sm' 
                    : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-800/50 hover:border-slate-700/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 truncate">
                    {sheet.mode === 'spreadsheet' ? (
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Database className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    )}
                    <h3 className={`text-xs font-semibold truncate ${isSelected ? 'text-indigo-200' : 'text-slate-200'}`}>
                      {sheet.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>
                    {sheet.mode === 'spreadsheet' 
                      ? `${sheet.rows} rows × ${sheet.cols} cols`
                      : `${sheet.dbRows?.length || 0} records`}
                  </span>
                  {folder && (
                    <span 
                      className="px-1.5 py-0.5 rounded font-medium"
                      style={{ backgroundColor: `${folder.color}20`, color: folder.color }}
                    >
                      {folder.name}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* RIGHT: Active Sheet / Database Grid */}
      {currentSheet ? (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
          
          {/* Top Bar: Sheet Title, Folder, CSV, Add Rows */}
          <div className="px-6 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/40 flex-shrink-0">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={currentSheet.title}
                onChange={(e) => {
                  onSaveSheet({ ...currentSheet, title: e.target.value, updatedAt: new Date().toISOString() });
                }}
                className="text-base font-bold text-white bg-transparent border-none focus:outline-none placeholder:text-slate-500"
              />
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                currentSheet.mode === 'spreadsheet' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
              }`}>
                {currentSheet.mode === 'spreadsheet' ? 'Formula Engine' : 'Database Table'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {currentSheet.mode === 'spreadsheet' && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                    title="Import CSV"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import CSV</span>
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                    title="Export CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </>
              )}

              {currentSheet.mode === 'database' && (
                <button
                  onClick={handleAddDbRow}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Record</span>
                </button>
              )}

              <button
                onClick={() => onDeleteSheet(currentSheet.id)}
                className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                title="Delete Sheet"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* SPREADSHEET MODE: Formula Bar & Formatting Toolbar */}
          {currentSheet.mode === 'spreadsheet' && (
            <div className="px-6 py-2 border-b border-slate-800/80 flex items-center gap-3 bg-slate-900/60 flex-shrink-0">
              {/* Active Cell Indicator */}
              <div className="w-14 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-center text-xs font-mono font-bold text-indigo-400">
                {selectedCoord}
              </div>

              {/* Function / Formula Input */}
              <div className="flex-1 relative flex items-center">
                <span className="absolute left-3 text-xs font-mono text-slate-500 font-bold">fx</span>
                <input
                  type="text"
                  value={formulaInput}
                  onChange={(e) => {
                    setFormulaInput(e.target.value);
                    handleUpdateCell(selectedCoord, e.target.value);
                  }}
                  placeholder="Enter formula e.g. =SUM(B2:B5), =C2*12 or raw value..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Quick Format Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleCellFormat('bold')}
                  className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                    currentSheet.cells[selectedCoord]?.bold ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                  title="Bold"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => toggleCellFormat('currency')}
                  className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                    currentSheet.cells[selectedCoord]?.format === 'currency' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                  title="Currency ($)"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => toggleCellFormat('percent')}
                  className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                    currentSheet.cells[selectedCoord]?.format === 'percent' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                  title="Percentage (%)"
                >
                  <Percent className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="h-4 w-px bg-slate-800" />

              <button
                onClick={handleAddRow}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                + Row
              </button>
              <button
                onClick={handleAddCol}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                + Col
              </button>
            </div>
          )}

          {/* SPREADSHEET GRID */}
          {currentSheet.mode === 'spreadsheet' && (
            <div className="flex-1 overflow-auto bg-slate-950 p-4">
              <table className="border-collapse table-fixed text-xs font-mono">
                <thead>
                  <tr>
                    {/* Top-left corner */}
                    <th className="w-12 h-7 bg-slate-900 border border-slate-800 text-slate-500 font-medium text-center sticky top-0 left-0 z-20">
                      #
                    </th>
                    {/* Column Headers A, B, C... */}
                    {Array.from({ length: currentSheet.cols }).map((_, cIdx) => (
                      <th
                        key={cIdx}
                        className="w-36 h-7 bg-slate-900 border border-slate-800 text-slate-400 font-semibold text-center sticky top-0 z-10"
                      >
                        {colIndexToLetter(cIdx)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: currentSheet.rows }).map((_, rIdx) => {
                    const rowNum = rIdx + 1;
                    return (
                      <tr key={rowNum}>
                        {/* Row Header 1, 2, 3... */}
                        <td className="w-12 h-7 bg-slate-900 border border-slate-800 text-slate-500 text-center font-medium sticky left-0 z-10">
                          {rowNum}
                        </td>
                        {/* Cells */}
                        {Array.from({ length: currentSheet.cols }).map((_, cIdx) => {
                          const coord = `${colIndexToLetter(cIdx)}${rowNum}`;
                          const cell = currentSheet.cells[coord];
                          const evaluated = evaluateCell(coord, currentSheet.cells);
                          const isSelected = selectedCoord === coord;

                          return (
                            <td
                              key={coord}
                              onClick={() => handleSelectCell(coord)}
                              className={`h-7 px-2 border border-slate-800/80 truncate text-slate-200 transition-colors cursor-cell select-none ${
                                isSelected ? 'bg-indigo-500/20 ring-2 ring-indigo-500 ring-inset z-10' : 'hover:bg-slate-900/60'
                              } ${cell?.bold ? 'font-bold text-white' : ''}`}
                            >
                              {evaluated}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* DATABASE MODE: Notion / Airtable Dynamic Table */}
          {currentSheet.mode === 'database' && (
            <div className="flex-1 overflow-auto p-6">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900 text-slate-400 font-semibold">
                    {(currentSheet.dbColumns || []).map(col => (
                      <th key={col.id} className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span>{col.name}</span>
                          <span className="text-[10px] text-slate-500 font-normal">({col.type})</span>
                        </div>
                      </th>
                    ))}
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(currentSheet.dbRows || []).map(row => (
                    <tr key={row.id} className="hover:bg-slate-900/40 transition-colors">
                      {(currentSheet.dbColumns || []).map(col => {
                        const val = row[col.id];

                        if (col.type === 'status') {
                          return (
                            <td key={col.id} className="py-2.5 px-4">
                              <select
                                value={val || ''}
                                onChange={(e) => handleUpdateDbCell(row.id, col.id, e.target.value)}
                                className="bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs text-indigo-300 font-medium focus:outline-none"
                              >
                                {(col.options || ['Planned', 'In Progress', 'Shipped']).map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </td>
                          );
                        }

                        if (col.type === 'select') {
                          return (
                            <td key={col.id} className="py-2.5 px-4">
                              <select
                                value={val || ''}
                                onChange={(e) => handleUpdateDbCell(row.id, col.id, e.target.value)}
                                className="bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
                              >
                                {(col.options || []).map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </td>
                          );
                        }

                        if (col.type === 'checkbox') {
                          return (
                            <td key={col.id} className="py-2.5 px-4">
                              <input
                                type="checkbox"
                                checked={Boolean(val)}
                                onChange={(e) => handleUpdateDbCell(row.id, col.id, e.target.checked)}
                                className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                              />
                            </td>
                          );
                        }

                        return (
                          <td key={col.id} className="py-2.5 px-4">
                            <input
                              type="text"
                              value={val || ''}
                              onChange={(e) => handleUpdateDbCell(row.id, col.id, e.target.value)}
                              className="w-full bg-transparent border-none text-xs text-slate-200 focus:outline-none focus:bg-slate-900 px-1 py-0.5 rounded"
                            />
                          </td>
                        );
                      })}

                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteDbRow(row.id)}
                          className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {(currentSheet.dbRows || []).length === 0 && (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No records yet. Click "Add Record" above.
                </div>
              )}
            </div>
          )}

        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
          <FileSpreadsheet className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">Select or create a spreadsheet to begin.</p>
        </div>
      )}

    </div>
  );
};
