import React, { useState, useRef, useEffect } from 'react';
import { 
  Note, Folder, SensitivityLabel, NoteVersion 
} from '../../types';
import { 
  FileText, Plus, Search, Pin, Star, Trash2, Download, Upload, 
  Bold, Italic, Underline, Strikethrough, Heading1, Heading2, Heading3, 
  List, ListOrdered, CheckSquare, Quote, Code, Minus, AlertCircle, 
  Sparkles, Clock, Folder as FolderIcon, Tag, Share2, Save,
  Highlighter, Table, Maximize2, Minimize2, ListTree, Copy, Check, SearchCode, Eye, X,
  ChevronRight, ThumbsUp, Activity, Figma, Globe, Shield, History
} from 'lucide-react';
import { SlashCommandMenu } from './SlashCommandMenu';
import { CopilotSidebar } from './CopilotSidebar';
import { LoopIntegrationsModal } from './LoopIntegrationsModal';
import { PageCustomizationHeader } from './PageCustomizationHeader';
import { MultilevelPageTree } from './MultilevelPageTree';
import { VersionHistoryDrawer } from './VersionHistoryDrawer';

interface NotesModuleProps {
  notes: Note[];
  folders: Folder[];
  onSaveNote: (note: Note) => void;
  onCreateNote: (folderId?: string, parentNoteId?: string) => void;
  onDeleteNote: (noteId: string) => void;
  activeFolderId?: string;
}

export const NotesModule: React.FC<NotesModuleProps> = ({
  notes,
  folders,
  onSaveNote,
  onCreateNote,
  onDeleteNote,
  activeFolderId,
}) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string>(notes[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [saveIndicator, setSaveIndicator] = useState<'saved' | 'saving'>('saved');
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [isDistractionFree, setIsDistractionFree] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);

  // M365 & Loop Modals/Drawers State
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);
  const [slashMenuPos, setSlashMenuPos] = useState({ top: 200, left: 400 });
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);

  // Currently active note
  const currentNote = notes.find(n => n.id === selectedNoteId) || notes[0];

  const editorRef = useRef<HTMLDivElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  // Keydown listener for Slash Menu trigger '/'
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === '/') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.top > 0) {
          setSlashMenuPos({
            top: Math.min(rect.top + 24, window.innerHeight - 360),
            left: Math.min(rect.left, window.innerWidth - 340)
          });
        }
      }
      setIsSlashMenuOpen(true);
    } else if (e.key === 'Escape') {
      setIsSlashMenuOpen(false);
    }
  };

  // Extract headings for Table of Contents / Outline
  const documentHeadings = React.useMemo(() => {
    if (!currentNote?.content) return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(currentNote.content, 'text/html');
    const nodes = doc.querySelectorAll('h1, h2, h3');
    return Array.from(nodes).map((node, index) => ({
      id: `heading_${index}`,
      tag: node.tagName.toLowerCase(),
      text: node.textContent || 'Untitled Section',
    }));
  }, [currentNote?.content]);

  // Copy Note Text / HTML
  const copyToClipboard = (type: 'text' | 'html') => {
    if (!currentNote) return;
    if (type === 'text') {
      const text = editorRef.current?.innerText || currentNote.content.replace(/<[^>]+>/g, '');
      navigator.clipboard.writeText(text);
      setCopiedStatus('Text copied!');
    } else {
      navigator.clipboard.writeText(currentNote.content);
      setCopiedStatus('HTML copied!');
    }
    setTimeout(() => setCopiedStatus(null), 2000);
  };

  // Keep editor content in sync when selected note changes
  useEffect(() => {
    if (editorRef.current && currentNote) {
      if (editorRef.current.innerHTML !== currentNote.content) {
        editorRef.current.innerHTML = currentNote.content;
      }
    }
  }, [currentNote?.id]);

  // Extract all unique tags across notes
  const allTags = Array.from(new Set(notes.flatMap(n => n.tags || [])));

  // Filter notes
  const filteredNotes = notes.filter(n => {
    if (activeFolderId && n.folderId !== activeFolderId) return false;
    if (selectedTag && !n.tags.includes(selectedTag)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchContent = n.content.toLowerCase().includes(q);
      const matchTags = n.tags.some(t => t.toLowerCase().includes(q));
      if (!matchTitle && !matchContent && !matchTags) return false;
    }
    return true;
  }).sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const handleContentInput = () => {
    if (!editorRef.current || !currentNote) return;
    setSaveIndicator('saving');
    const newHtml = editorRef.current.innerHTML;
    const textOnly = editorRef.current.innerText || '';
    const wordCount = textOnly.trim().split(/\s+/).filter(Boolean).length;

    const updated: Note = {
      ...currentNote,
      content: newHtml,
      wordCount,
      updatedAt: new Date().toISOString(),
    };

    onSaveNote(updated);
    setTimeout(() => setSaveIndicator('saved'), 400);
  };

  const handleTitleChange = (newTitle: string) => {
    if (!currentNote) return;
    onSaveNote({
      ...currentNote,
      title: newTitle,
      updatedAt: new Date().toISOString(),
    });
  };

  const togglePin = () => {
    if (!currentNote) return;
    onSaveNote({
      ...currentNote,
      isPinned: !currentNote.isPinned,
      updatedAt: new Date().toISOString(),
    });
  };

  const toggleFavorite = () => {
    if (!currentNote) return;
    onSaveNote({
      ...currentNote,
      isFavorite: !currentNote.isFavorite,
      updatedAt: new Date().toISOString(),
    });
  };
  const toggleFav = toggleFavorite;

  const applyHighlight = (color: string) => {
    execCmd('hiliteColor', color);
  };

  const handleFolderChange = (folderId: string) => {
    if (!currentNote) return;
    onSaveNote({
      ...currentNote,
      folderId: folderId || undefined,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddTag = (tagText: string) => {
    if (!currentNote || !tagText.trim()) return;
    const clean = tagText.trim().replace(/^#/, '');
    if (!currentNote.tags.includes(clean)) {
      onSaveNote({
        ...currentNote,
        tags: [...currentNote.tags, clean],
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!currentNote) return;
    onSaveNote({
      ...currentNote,
      tags: currentNote.tags.filter(t => t !== tagToRemove),
      updatedAt: new Date().toISOString(),
    });
  };

  // Rich Text Editor Commands using document.execCommand / HTML blocks
  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    handleContentInput();
  };

  const insertCallout = (type: 'info' | 'warning' | 'tip') => {
    const borderColors = {
      info: '#6366f1',
      warning: '#f59e0b',
      tip: '#10b981',
    };
    const bgColors = {
      info: 'rgba(99, 102, 241, 0.1)',
      warning: 'rgba(245, 158, 11, 0.1)',
      tip: 'rgba(16, 185, 129, 0.1)',
    };
    const html = `<div style="border-left: 4px solid ${borderColors[type]}; background: ${bgColors[type]}; padding: 12px 16px; border-radius: 6px; margin: 14px 0;"><strong>${type.toUpperCase()}:</strong> Enter callout note here...</div><p></p>`;
    execCmd('insertHTML', html);
  };

  const insertChecklist = () => {
    const html = `<div style="display: flex; align-items: center; gap: 8px; margin: 6px 0;"><input type="checkbox" style="width: 16px; height: 16px; cursor: pointer;" /> <span>Checklist task item</span></div><p></p>`;
    execCmd('insertHTML', html);
  };

  const insertCodeBlock = () => {
    const html = `<pre style="background: #090d16; border: 1px solid #1e293b; border-radius: 8px; padding: 12px; margin: 12px 0; font-family: monospace; color: #38bdf8;"><code>// Write or paste code snippet here\nfunction example() {\n  return true;\n}</code></pre><p></p>`;
    execCmd('insertHTML', html);
  };

  const insertTable = () => {
    const html = `<table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #334155;">
      <thead>
        <tr style="background: #1e293b; color: #f8fafc;">
          <th style="border: 1px solid #334155; padding: 8px 12px; text-align: left;">Header 1</th>
          <th style="border: 1px solid #334155; padding: 8px 12px; text-align: left;">Header 2</th>
          <th style="border: 1px solid #334155; padding: 8px 12px; text-align: left;">Header 3</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border: 1px solid #334155; padding: 8px 12px;">Cell 1</td>
          <td style="border: 1px solid #334155; padding: 8px 12px;">Cell 2</td>
          <td style="border: 1px solid #334155; padding: 8px 12px;">Cell 3</td>
        </tr>
        <tr>
          <td style="border: 1px solid #334155; padding: 8px 12px;">Cell 4</td>
          <td style="border: 1px solid #334155; padding: 8px 12px;">Cell 5</td>
          <td style="border: 1px solid #334155; padding: 8px 12px;">Cell 6</td>
        </tr>
      </tbody>
    </table><p></p>`;
    execCmd('insertHTML', html);
  };

  const handleSlashCommandSelect = (cmdId: string) => {
    setIsSlashMenuOpen(false);
    switch (cmdId) {
      case 'h1': execCmd('formatBlock', '<h1>'); break;
      case 'h2': execCmd('formatBlock', '<h2>'); break;
      case 'h3': execCmd('formatBlock', '<h3>'); break;
      case 'paragraph': execCmd('formatBlock', '<p>'); break;
      case 'bullet_list': execCmd('insertUnorderedList'); break;
      case 'numbered_list': execCmd('insertOrderedList'); break;
      case 'checklist': insertChecklist(); break;
      case 'quote': execCmd('formatBlock', '<blockquote>'); break;
      case 'callout_info': insertCallout('info'); break;
      case 'callout_warning': insertCallout('warning'); break;
      case 'code_snippet': insertCodeBlock(); break;
      case 'collapsible_h1':
        execCmd('insertHTML', `<details style="border: 1px solid #334155; border-radius: 8px; padding: 10px 14px; background: #0f172a; margin: 12px 0;"><summary style="font-weight: bold; color: #38bdf8; cursor: pointer; font-size: 15px;">▶ Collapsible Section Title</summary><div style="margin-top: 8px; color: #cbd5e1; padding-left: 12px; border-left: 2px solid #38bdf8;"><p>Fold away long text heavy documentation here...</p></div></details><p></p>`);
        break;
      case 'voting_table':
        execCmd('insertHTML', `
          <div style="border: 1px solid #6366f1; border-radius: 12px; padding: 14px; background: #0f172a; margin: 16px 0;">
            <div style="font-weight: bold; color: #818cf8; margin-bottom: 8px; font-size: 14px;">👍 Team Idea Voting Table</div>
            <table style="width: 100%; border-collapse: collapse; color: #e2e8f0; font-size: 13px;">
              <thead>
                <tr style="border-bottom: 1px solid #334155; text-align: left; background: #1e293b;">
                  <th style="padding: 8px; border: 1px solid #334155;">Idea Description</th>
                  <th style="padding: 8px; border: 1px solid #334155;">Proposer</th>
                  <th style="padding: 8px; border: 1px solid #334155;">Upvotes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 8px; border: 1px solid #334155;">Feature A: Micro-services API caching</td>
                  <td style="padding: 8px; border: 1px solid #334155;">@Engineering</td>
                  <td style="padding: 8px; border: 1px solid #334155;"><button style="background: #312e81; color: #c7d2fe; border: 1px solid #6366f1; border-radius: 6px; padding: 4px 10px; cursor: pointer;">👍 6 Upvotes</button></td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #334155;">Feature B: Live Figma canvas embeds</td>
                  <td style="padding: 8px; border: 1px solid #334155;">@UX Team</td>
                  <td style="padding: 8px; border: 1px solid #334155;"><button style="background: #312e81; color: #c7d2fe; border: 1px solid #6366f1; border-radius: 6px; padding: 4px 10px; cursor: pointer;">👍 11 Upvotes</button></td>
                </tr>
              </tbody>
            </table>
          </div><p></p>
        `);
        break;
      case 'progress_tracker':
        execCmd('insertHTML', `
          <div style="border: 1px solid #10b981; border-radius: 12px; padding: 14px; background: #022c22; margin: 16px 0;">
            <div style="font-weight: bold; color: #34d399; margin-bottom: 8px; font-size: 14px;">⚡ Operational Progress Tracker</div>
            <table style="width: 100%; border-collapse: collapse; color: #e2e8f0; font-size: 13px;">
              <thead>
                <tr style="border-bottom: 1px solid #065f46; text-align: left; background: #064e3b;">
                  <th style="padding: 8px; border: 1px solid #065f46;">Deliverable</th>
                  <th style="padding: 8px; border: 1px solid #065f46;">Owner</th>
                  <th style="padding: 8px; border: 1px solid #065f46;">Status</th>
                  <th style="padding: 8px; border: 1px solid #065f46;">Risk Indicator</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 8px; border: 1px solid #065f46;">System Security Audit</td>
                  <td style="padding: 8px; border: 1px solid #065f46;">@DevSecOps</td>
                  <td style="padding: 8px; border: 1px solid #065f46;"><span style="background: #065f46; color: #a7f3d0; padding: 2px 8px; border-radius: 4px; font-weight: bold;">In Review</span></td>
                  <td style="padding: 8px; border: 1px solid #065f46;"><span style="color: #34d399; font-weight: bold;">🟢 Low Risk</span></td>
                </tr>
              </tbody>
            </table>
          </div><p></p>
        `);
        break;
      case 'structured_table':
        insertTable();
        break;
      case 'figma_embed':
        execCmd('insertHTML', `
          <div style="border: 1px solid #ec4899; border-radius: 12px; padding: 12px; background: #1f0923; margin: 16px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-weight: bold; color: #f472b6;">🎨 Interactive Figma Canvas Embed</span>
              <span style="font-size: 11px; color: #fbcfe8; background: rgba(244, 114, 182, 0.2); padding: 2px 8px; border-radius: 4px;">Live Preview</span>
            </div>
            <iframe style="border: 1px solid rgba(255,255,255,0.1); width: 100%; height: 280px; border-radius: 8px;" src="https://www.figma.com/embed?embed_host=share&url=https://www.figma.com/file/sample" allowfullscreen></iframe>
          </div><p></p>
        `);
        break;
      case 'copilot_draft':
        setIsCopilotOpen(true);
        break;
      default:
        break;
    }
  };

  // Export Note to HTML / Markdown
  const exportNote = (format: 'html' | 'md') => {
    if (!currentNote) return;
    let fileContent = '';
    let mimeType = 'text/plain';
    let ext = 'txt';

    if (format === 'html') {
      fileContent = `<!DOCTYPE html><html><head><title>${currentNote.title}</title><meta charset="utf-8"></head><body style="font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px;"><h1>${currentNote.title}</h1>${currentNote.content}</body></html>`;
      mimeType = 'text/html';
      ext = 'html';
    } else {
      // Basic HTML to markdown converter
      fileContent = `# ${currentNote.title}\n\n` + 
        currentNote.content
          .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
          .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
          .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
          .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
          .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
          .replace(/<em>(.*?)<\/em>/gi, '*$1*')
          .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
          .replace(/<ul>|<\/ul>|<ol>|<\/ol>/gi, '')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]+>/g, '');
      ext = 'md';
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentNote.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-950 relative">
      
      {/* LEFT: Multilevel Nested Page Tree Navigation (Hidden in Distraction Free Mode) */}
      {!isDistractionFree && (
        <MultilevelPageTree
          notes={notes}
          folders={folders}
          selectedNoteId={selectedNoteId}
          onSelectNote={setSelectedNoteId}
          onCreateNote={onCreateNote}
          onDeleteNote={onDeleteNote}
          onTogglePinNote={togglePin}
          onToggleFavNote={toggleFav}
        />
      )}

      {/* RIGHT: Document Editor Pane */}
      {currentNote ? (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 relative">
          
          {/* Customization Banner Header (Cover graphic, Emoji icon, Sensitivity DLP label, Copilot & Integrations) */}
          <PageCustomizationHeader
            title={currentNote.title}
            onChangeTitle={handleTitleChange}
            coverImage={currentNote.coverImage}
            onChangeCoverImage={(url) => onSaveNote({ ...currentNote, coverImage: url, updatedAt: new Date().toISOString() })}
            coverIcon={currentNote.coverIcon}
            onChangeCoverIcon={(icon) => onSaveNote({ ...currentNote, coverIcon: icon, updatedAt: new Date().toISOString() })}
            sensitivityLabel={currentNote.sensitivityLabel || 'General'}
            onChangeSensitivityLabel={(label) => onSaveNote({ ...currentNote, sensitivityLabel: label, updatedAt: new Date().toISOString() })}
            onOpenVersions={() => setIsVersionsOpen(true)}
            onOpenCopilot={() => setIsCopilotOpen(true)}
            onOpenIntegrations={() => setIsIntegrationsOpen(true)}
          />

          {/* Document Secondary Toolbar */}
          <div className="px-6 py-2 border-b border-slate-800/80 flex items-center justify-between gap-4 bg-slate-900/30">
            {/* Folder & Status */}
            <div className="flex items-center gap-2.5">
              <select
                value={currentNote.folderId || ''}
                onChange={(e) => handleFolderChange(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">No Folder (Root)</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>

              {/* Slash Command Trigger Button */}
              <button
                onClick={() => setIsSlashMenuOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold hover:bg-indigo-600/30 cursor-pointer transition-colors"
                title="Open Slash Command Insert Menu (/)"
              >
                <span className="font-mono font-bold text-indigo-400 bg-indigo-500/30 px-1 py-0.2 rounded text-[10px]">/</span>
                <span>Insert Menu</span>
              </button>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 border-l border-slate-800 pl-3">
                <Clock className="w-3.5 h-3.5" />
                <span>~{Math.max(1, Math.ceil((currentNote.wordCount || 0) / 200))} min read</span>
                <span className="text-slate-600">•</span>
                <span className={saveIndicator === 'saving' ? 'text-amber-400' : 'text-emerald-400'}>
                  {saveIndicator === 'saving' ? 'Saving changes...' : 'Saved to local storage'}
                </span>
              </div>
            </div>

            {/* Actions: Outline, Distraction Free, Copy, Pin, Favorite, Export, Delete */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOutlineOpen(prev => !prev)}
                title="Toggle Table of Contents / Outline"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 px-2 text-xs font-medium ${
                  isOutlineOpen ? 'text-indigo-300 bg-indigo-500/20 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <ListTree className="w-3.5 h-3.5" />
                <span>Outline ({documentHeadings.length})</span>
              </button>

              <button
                onClick={() => setIsDistractionFree(prev => !prev)}
                title={isDistractionFree ? "Exit Distraction-Free Mode" : "Enter Distraction-Free Full Width Editor"}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDistractionFree ? 'text-indigo-400 bg-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {isDistractionFree ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <div className="h-4 w-px bg-slate-800 mx-1" />

              <button
                onClick={() => copyToClipboard('text')}
                title="Copy Plain Text to Clipboard"
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 px-2"
              >
                {copiedStatus ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedStatus || 'Copy Text'}</span>
              </button>

              <button
                onClick={togglePin}
                title={currentNote.isPinned ? 'Unpin Document' : 'Pin to Top'}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  currentNote.isPinned ? 'text-amber-400 bg-amber-400/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Pin className="w-4 h-4" />
              </button>

              <button
                onClick={toggleFavorite}
                title={currentNote.isFavorite ? 'Remove Favorite' : 'Mark Favorite'}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  currentNote.isFavorite ? 'text-yellow-400 bg-yellow-400/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Star className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-slate-800 mx-1" />

              <button
                onClick={() => exportNote('md')}
                title="Export as Markdown (.md)"
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 px-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export MD</span>
              </button>

              <button
                onClick={() => exportNote('html')}
                title="Export as HTML Document"
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 px-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>HTML</span>
              </button>

              <button
                onClick={() => onDeleteNote(currentNote.id)}
                title="Delete Document"
                className="p-1.5 text-red-400/80 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer ml-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Formatting Toolbar */}
          <div className="px-6 py-2 border-b border-slate-800/80 flex items-center gap-1 overflow-x-auto bg-slate-900/40 text-slate-300">
            {/* Headers */}
            <button
              onClick={() => execCmd('formatBlock', '<h1>')}
              title="Heading 1"
              className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              onClick={() => execCmd('formatBlock', '<h2>')}
              title="Heading 2"
              className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => execCmd('formatBlock', '<h3>')}
              title="Heading 3"
              className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <Heading3 className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-slate-800 mx-1" />

            {/* Inline Styles */}
            <button
              onClick={() => execCmd('bold')}
              title="Bold (Ctrl+B)"
              className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors cursor-pointer font-bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => execCmd('italic')}
              title="Italic (Ctrl+I)"
              className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors cursor-pointer italic"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              onClick={() => execCmd('underline')}
              title="Underline (Ctrl+U)"
              className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors cursor-pointer underline"
            >
              <Underline className="w-4 h-4" />
            </button>
            <button
              onClick={() => execCmd('strikeThrough')}
              title="Strikethrough"
              className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors cursor-pointer line-through"
            >
              <Strikethrough className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-slate-800 mx-1" />

            {/* Lists & Checklists */}
            <button
              onClick={() => execCmd('insertUnorderedList')}
              title="Bulleted List"
              className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => execCmd('insertOrderedList')}
              title="Numbered List"
              className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              onClick={insertChecklist}
              title="Interactive Checklist"
              className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <CheckSquare className="w-4 h-4 text-emerald-400" />
            </button>

            <div className="h-4 w-px bg-slate-800 mx-1" />

            {/* Highlights */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => applyHighlight('#fef08a')}
                title="Highlight Yellow"
                className="w-5 h-5 rounded bg-yellow-300 hover:scale-110 transition-transform cursor-pointer border border-yellow-400"
              />
              <button
                onClick={() => applyHighlight('#bbf7d0')}
                title="Highlight Green"
                className="w-5 h-5 rounded bg-emerald-300 hover:scale-110 transition-transform cursor-pointer border border-emerald-400"
              />
              <button
                onClick={() => applyHighlight('#bfdbfe')}
                title="Highlight Blue"
                className="w-5 h-5 rounded bg-sky-300 hover:scale-110 transition-transform cursor-pointer border border-sky-400"
              />
              <button
                onClick={() => applyHighlight('#e9d5ff')}
                title="Highlight Purple"
                className="w-5 h-5 rounded bg-purple-300 hover:scale-110 transition-transform cursor-pointer border border-purple-400"
              />
            </div>

            <div className="h-4 w-px bg-slate-800 mx-1" />

            {/* Block formats: Blockquote, Code block, Table, Divider */}
            <button
              onClick={insertTable}
              title="Insert Table"
              className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <Table className="w-4 h-4 text-emerald-400" />
            </button>
            <button
              onClick={() => execCmd('formatBlock', '<blockquote>')}
              title="Blockquote"
              className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <Quote className="w-4 h-4" />
            </button>
            <button
              onClick={insertCodeBlock}
              title="Code Block"
              className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <Code className="w-4 h-4 text-cyan-400" />
            </button>
            <button
              onClick={() => execCmd('insertHorizontalRule')}
              title="Divider Line"
              className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-slate-800 mx-1" />

            {/* Callouts */}
            <div className="flex items-center gap-1 text-[11px]">
              <button
                onClick={() => insertCallout('info')}
                className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/30 font-medium cursor-pointer"
              >
                + Info
              </button>
              <button
                onClick={() => insertCallout('tip')}
                className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30 font-medium cursor-pointer"
              >
                + Tip
              </button>
              <button
                onClick={() => insertCallout('warning')}
                className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 font-medium cursor-pointer"
              >
                + Alert
              </button>
            </div>
          </div>

          {/* Editor Body */}
          <div className="flex-1 overflow-y-auto px-10 py-8 max-w-4xl w-full mx-auto">
            {/* Title Input */}
            <input
              ref={titleInputRef}
              type="text"
              value={currentNote.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Untitled Document..."
              className="w-full text-3xl font-extrabold text-white bg-transparent border-none focus:outline-none placeholder:text-slate-600 mb-4"
            />

            {/* Tags Pills bar */}
            <div className="flex flex-wrap items-center gap-1.5 mb-6">
              {currentNote.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/80"
                >
                  #{tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-400 cursor-pointer ml-0.5 text-slate-500"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="+ Add tag..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
                className="bg-transparent border-none text-xs text-slate-400 placeholder:text-slate-600 focus:outline-none w-24 py-0.5"
              />
            </div>

            {/* Content Editable Area */}
            <div
              ref={editorRef}
              contentEditable
              onInput={handleContentInput}
              onKeyDown={handleEditorKeyDown}
              className="document-editor w-full min-h-[500px] text-slate-200 leading-relaxed focus:outline-none pb-32"
            />
          </div>

          {/* OUTLINE DRAWER SIDE PANEL */}
          {isOutlineOpen && (
            <div className="w-64 border-l border-slate-800 bg-slate-900/80 p-4 flex flex-col flex-shrink-0 animate-in slide-in-from-right-4">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 uppercase tracking-wider">
                  <ListTree className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Document Outline</span>
                </div>
                <button
                  onClick={() => setIsOutlineOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {documentHeadings.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 space-y-1">
                  <p>No headings found.</p>
                  <p className="text-[10px] text-slate-600">Add Heading 1, 2, or 3 to generate an outline automatically.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-1">
                  {documentHeadings.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        const headings = editorRef.current?.querySelectorAll('h1, h2, h3');
                        if (headings && headings[i]) {
                          headings[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                      className={`w-full text-left py-1 px-2 rounded-lg text-xs hover:bg-slate-800 hover:text-indigo-300 transition-colors truncate cursor-pointer font-medium ${
                        h.tag === 'h1' ? 'text-slate-200 font-bold' : h.tag === 'h2' ? 'text-slate-400 pl-4' : 'text-slate-500 pl-6 text-[11px]'
                      }`}
                    >
                      {h.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Copilot Sidebar Drawer */}
          <CopilotSidebar
            isOpen={isCopilotOpen}
            onClose={() => setIsCopilotOpen(false)}
            onInsertToCanvas={(html) => execCmd('insertHTML', html)}
            pageTitle={currentNote.title}
          />

          {/* Version History Drawer */}
          <VersionHistoryDrawer
            isOpen={isVersionsOpen}
            onClose={() => setIsVersionsOpen(false)}
            versions={currentNote.versions}
            onRestoreVersion={(ver) => {
              onSaveNote({
                ...currentNote,
                title: ver.title,
                content: ver.content,
                updatedAt: new Date().toISOString()
              });
              setIsVersionsOpen(false);
            }}
          />

        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
          <FileText className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">Select or create a document to begin writing.</p>
        </div>
      )}

      {/* Interactive Slash Command Menu Trigger */}
      <SlashCommandMenu
        isOpen={isSlashMenuOpen}
        onClose={() => setIsSlashMenuOpen(false)}
        onSelectCommand={handleSlashCommandSelect}
        position={slashMenuPos}
      />

      {/* M365 Ecosystem Sync & Portable Loop Component Modal */}
      <LoopIntegrationsModal
        isOpen={isIntegrationsOpen}
        onClose={() => setIsIntegrationsOpen(false)}
        pageTitle={currentNote?.title || 'Workspace Page'}
        pageContentHtml={currentNote?.content || ''}
      />

    </div>
  );
};
