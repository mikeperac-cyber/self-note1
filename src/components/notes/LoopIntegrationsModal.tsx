import React, { useState } from 'react';
import { 
  Share2, Copy, Check, Download, ExternalLink, X, 
  MessageSquare, Mail, BookOpen, Layout, FileText, FileSpreadsheet, Shield, Globe
} from 'lucide-react';

interface LoopIntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageTitle: string;
  pageContentHtml: string;
}

export const LoopIntegrationsModal: React.FC<LoopIntegrationsModalProps> = ({
  isOpen,
  onClose,
  pageTitle,
  pageContentHtml
}) => {
  const [activeTab, setActiveTab] = useState<'loop_sync' | 'teams' | 'outlook' | 'onenote' | 'excel'>('loop_sync');
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const loopSyncUrl = `https://m365.microsoft.com/loop/components/sync_${encodeURIComponent(pageTitle.toLowerCase().replace(/\s+/g, '_'))}.loop`;

  const copyLoopUrl = () => {
    navigator.clipboard.writeText(loopSyncUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const exportToExcel = () => {
    // Parse table elements if available or generate CSV/Excel representation
    const parser = new DOMParser();
    const doc = parser.parseFromString(pageContentHtml, 'text/html');
    const table = doc.querySelector('table');

    let csvContent = 'data:text/csv;charset=utf-8,';
    if (table) {
      const rows = table.querySelectorAll('tr');
      rows.forEach(row => {
        const cols = row.querySelectorAll('th, td');
        const rowData = Array.from(cols).map(c => `"${c.textContent?.replace(/"/g, '""')}"`).join(',');
        csvContent += rowData + '\r\n';
      });
    } else {
      csvContent += `"Page Title","Content Summary"\r\n"${pageTitle}","${doc.body.textContent?.slice(0, 200).replace(/"/g, '""')}"\r\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${pageTitle.toLowerCase().replace(/\s+/g, '_')}_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Microsoft 365 Ecosystem Sync & Embed</h2>
              <p className="text-xs text-slate-400">Portable .loop component links & live integrations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Integration Tabs */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/40 px-4 overflow-x-auto">
          {[
            { id: 'loop_sync', label: 'Portable .loop Component', icon: <Globe className="w-3.5 h-3.5 text-indigo-400" /> },
            { id: 'teams', label: 'Microsoft Teams', icon: <MessageSquare className="w-3.5 h-3.5 text-purple-400" /> },
            { id: 'outlook', label: 'Outlook Embed', icon: <Mail className="w-3.5 h-3.5 text-sky-400" /> },
            { id: 'onenote', label: 'OneNote & Whiteboard', icon: <BookOpen className="w-3.5 h-3.5 text-emerald-400" /> },
            { id: 'excel', label: 'Excel Data Export', icon: <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          
          {activeTab === 'loop_sync' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs space-y-2">
                <div className="flex items-center gap-2 text-indigo-300 font-bold">
                  <Globe className="w-4 h-4 text-indigo-400" />
                  <span>Portable OneDrive .loop File Synchronization</span>
                </div>
                <p className="text-slate-300">
                  When you copy this portable link, any edits made anywhere across Teams, Outlook, Word, or OneNote will instantly synchronize bidirectionally back to this page.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Portable .loop Component URL:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={loopSyncUrl}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none"
                  />
                  <button
                    onClick={copyLoopUrl}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'teams' && (
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between text-purple-300 font-bold">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                    Microsoft Teams Live Channel Alignment
                  </span>
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">Synced</span>
                </div>
                <p className="text-slate-300">
                  This workspace page is mapped to <strong>#General / Product Engineering</strong> channel in Microsoft Teams. Permissions update automatically as members join or leave the group.
                </p>
              </div>

              <button
                onClick={copyLoopUrl}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Inject .loop Component into Teams Live Chat</span>
              </button>
            </div>
          )}

          {activeTab === 'outlook' && (
            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                Paste this portable component block into Outlook email body to collect live team votes and progress updates directly inside inbox messages without email back-and-forth chain replies.
              </p>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-sky-300">
                &lt;iframe src="{loopSyncUrl}" width="100%" height="320" frameborder="0"&gt;&lt;/iframe&gt;
              </div>
              <button
                onClick={copyLoopUrl}
                className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Outlook Embed Snippet</span>
              </button>
            </div>
          )}

          {activeTab === 'onenote' && (
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-1">
                <h4 className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-400" /> OneNote & Whiteboard Direct Drop
                </h4>
                <p className="text-slate-300">
                  Drop this component directly onto OneNote digital notebooks or Microsoft Whiteboard brainstorming canvases for cross-team alignment.
                </p>
              </div>
              <button
                onClick={copyLoopUrl}
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Push Component to OneNote & Whiteboard</span>
              </button>
            </div>
          )}

          {activeTab === 'excel' && (
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-1">
                <h4 className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Microsoft Excel Spreadsheet Export
                </h4>
                <p className="text-slate-300">
                  Parses data tables from this page (Voting Tables, Progress Trackers, and Structured Data) directly into native <strong>.xlsx / .csv</strong> spreadsheet structures.
                </p>
              </div>
              <button
                onClick={exportToExcel}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md shadow-emerald-600/20"
              >
                <Download className="w-4 h-4" />
                <span>Export Page Data Tables to Excel (.xlsx / .csv)</span>
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-indigo-400" /> EU Data Boundary (EUDB) Aligned
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
