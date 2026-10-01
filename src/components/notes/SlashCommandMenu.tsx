import React, { useState, useEffect } from 'react';
import { 
  FileText, Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, 
  Quote, Code, AlertCircle, ThumbsUp, Activity, Table, Sparkles, 
  Figma, Clock, ShieldAlert, ChevronRight, X
} from 'lucide-react';

interface SlashCommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCommand: (commandType: string, payload?: any) => void;
  position?: { top: number; left: number };
}

interface CommandItem {
  id: string;
  category: 'Text' | 'Callouts & Quotes' | 'Live Loop Components' | 'AI Copilot';
  label: string;
  description: string;
  icon: React.ReactNode;
  shortcut?: string;
}

export const COMMAND_ITEMS: CommandItem[] = [
  // Text & Layout
  { id: 'paragraph', category: 'Text', label: 'Paragraph', description: 'Plain body text for documentation', icon: <FileText className="w-4 h-4 text-slate-400" /> },
  { id: 'h1', category: 'Text', label: 'Heading 1', description: 'Large section title', icon: <Heading1 className="w-4 h-4 text-indigo-400" /> },
  { id: 'h2', category: 'Text', label: 'Heading 2', description: 'Medium subsection heading', icon: <Heading2 className="w-4 h-4 text-indigo-400" /> },
  { id: 'h3', category: 'Text', label: 'Heading 3', description: 'Small topic heading', icon: <Heading3 className="w-4 h-4 text-indigo-400" /> },
  { id: 'collapsible_h1', category: 'Text', label: 'Collapsible Heading', description: 'Toggle section to fold text-heavy content', icon: <ChevronRight className="w-4 h-4 text-cyan-400" /> },
  { id: 'bullet_list', category: 'Text', label: 'Bullet List', description: 'Simple bulleted list', icon: <List className="w-4 h-4 text-slate-400" /> },
  { id: 'numbered_list', category: 'Text', label: 'Numbered List', description: 'Ordered sequential list', icon: <ListOrdered className="w-4 h-4 text-slate-400" /> },
  { id: 'checklist', category: 'Text', label: 'Checklist', description: 'Action list with strikethrough completion', icon: <CheckSquare className="w-4 h-4 text-emerald-400" /> },

  // Callouts & Formatting
  { id: 'callout_info', category: 'Callouts & Quotes', label: 'Callout Box (Tip 💡)', description: 'Highlighted container with custom emphasis pin', icon: <AlertCircle className="w-4 h-4 text-amber-400" /> },
  { id: 'callout_warning', category: 'Callouts & Quotes', label: 'Callout Box (Warning ⚠️)', description: 'High-visibility alert container for critical details', icon: <ShieldAlert className="w-4 h-4 text-rose-400" /> },
  { id: 'quote', category: 'Callouts & Quotes', label: 'Quote Block', description: 'Indented styling for key team statements', icon: <Quote className="w-4 h-4 text-purple-400" /> },
  { id: 'code_snippet', category: 'Callouts & Quotes', label: 'Code Snippet (14 Languages)', description: 'Syntax container with line numbers & copy button', icon: <Code className="w-4 h-4 text-cyan-400" /> },

  // Live Loop Components
  { id: 'voting_table', category: 'Live Loop Components', label: 'Voting Table', description: 'Idea matrix with live upvote counters per row', icon: <ThumbsUp className="w-4 h-4 text-indigo-400" /> },
  { id: 'progress_tracker', category: 'Live Loop Components', label: 'Progress Tracker Table', description: 'Execution matrix tracking owner, status, & risk indicators', icon: <Activity className="w-4 h-4 text-emerald-400" /> },
  { id: 'structured_table', category: 'Live Loop Components', label: 'Structured Data Table', description: 'Relational table with auto SUM/AVG calculation tallies', icon: <Table className="w-4 h-4 text-sky-400" /> },
  { id: 'task_list_sync', category: 'Live Loop Components', label: 'Synchronized Task List', description: 'Live checklist linked to Microsoft Planner / To Do', icon: <Clock className="w-4 h-4 text-purple-400" /> },
  { id: 'figma_embed', category: 'Live Loop Components', label: 'Figma Canvas Embed', description: 'Interactive Figma design asset frame', icon: <Figma className="w-4 h-4 text-pink-400" /> },

  // AI Copilot
  { id: 'copilot_draft', category: 'AI Copilot', label: 'Draft with Copilot', description: 'Generate outline blueprints, text, or summaries via AI', icon: <Sparkles className="w-4 h-4 text-indigo-400" /> },
];

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  isOpen,
  onClose,
  onSelectCommand,
  position
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredItems = COMMAND_ITEMS.filter(item => 
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.description.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed z-50 w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95"
      style={{
        top: position ? `${position.top}px` : '30%',
        left: position ? `${position.left}px` : '40%',
      }}
    >
      {/* Header input */}
      <div className="p-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2 flex-1 px-2">
          <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-500/30">/</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or component name..."
            className="w-full bg-transparent text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
            autoFocus
          />
        </div>
        <button 
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Command List grouped by Category */}
      <div className="max-h-80 overflow-y-auto p-1.5 space-y-2">
        {filteredItems.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">
            No matching command or component found for "{query}"
          </div>
        ) : (
          filteredItems.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => {
                onSelectCommand(item.id);
                onClose();
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`w-full text-left p-2 rounded-xl flex items-start gap-2.5 transition-all cursor-pointer ${
                selectedIndex === idx 
                  ? 'bg-indigo-600/30 border border-indigo-500/40 text-white shadow-sm' 
                  : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
              }`}
            >
              <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 flex-shrink-0 mt-0.5">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold truncate text-slate-200">{item.label}</span>
                  <span className="text-[10px] text-slate-500 uppercase font-mono">{item.category}</span>
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.description}</p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
        <span>Use ↑ ↓ to navigate</span>
        <span>Esc to dismiss</span>
      </div>
    </div>
  );
};
