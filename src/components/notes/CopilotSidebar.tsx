import React, { useState } from 'react';
import { Sparkles, Send, Bot, User, Check, ArrowRight, X, FileText, List, ThumbsUp } from 'lucide-react';

interface CopilotSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertToCanvas: (contentHtml: string) => void;
  pageTitle: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'copilot';
  text: string;
  generatedHtml?: string;
  timestamp: string;
}

export const CopilotSidebar: React.FC<CopilotSidebarProps> = ({
  isOpen,
  onClose,
  onInsertToCanvas,
  pageTitle
}) => {
  const [promptInput, setPromptInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'copilot',
      text: `Hello! I'm Copilot for Loop. How can I assist you with "${pageTitle}" today? You can ask me to draft requirements, create a structured voting table, or write a summary.`,
      timestamp: 'Just now'
    }
  ]);

  if (!isOpen) return null;

  const handleSendPrompt = (customText?: string) => {
    const textToSend = customText || promptInput;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: 'Just now'
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customText) setPromptInput('');
    setIsGenerating(true);

    setTimeout(() => {
      let aiResponseText = `I've generated a structured draft based on "${textToSend}".`;
      let generatedHtml = '';

      if (textToSend.toLowerCase().includes('blueprint') || textToSend.toLowerCase().includes('outline')) {
        generatedHtml = `
          <h2>🚀 Project Architecture Blueprint</h2>
          <p>This document details the core deliverables and milestone schedule.</p>
          <ul>
            <li><strong>Phase 1:</strong> System Design & API Contract Finalization</li>
            <li><strong>Phase 2:</strong> Frontend React Canvas Engine Integration</li>
            <li><strong>Phase 3:</strong> Security Audit & DLP Sensitivity Verification</li>
          </ul>
        `;
      } else if (textToSend.toLowerCase().includes('voting') || textToSend.toLowerCase().includes('idea')) {
        generatedHtml = `
          <h3>💡 Team Idea Voting Matrix</h3>
          <table style="width:100%; border-collapse:collapse; margin:12px 0; border:1px solid #334155;">
            <thead>
              <tr style="background:#1e293b; color:#f8fafc;">
                <th style="padding:8px; border:1px solid #334155;">Idea Description</th>
                <th style="padding:8px; border:1px solid #334155;">Proposer</th>
                <th style="padding:8px; border:1px solid #334155;">Upvotes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:8px; border:1px solid #334155;">Implement native WebSockets sync</td>
                <td style="padding:8px; border:1px solid #334155;">Engineering</td>
                <td style="padding:8px; border:1px solid #334155;">👍 8</td>
              </tr>
              <tr>
                <td style="padding:8px; border:1px solid #334155;">Add Figma live canvas integration</td>
                <td style="padding:8px; border:1px solid #334155;">Product Design</td>
                <td style="padding:8px; border:1px solid #334155;">👍 12</td>
              </tr>
            </tbody>
          </table>
        `;
      } else {
        generatedHtml = `
          <div style="background:#1e1b4b; border-left:4px solid #6366f1; padding:12px; margin:12px 0; rounded-right:8px;">
            <h4 style="margin:0 0 6px 0; color:#818cf8;">✨ Copilot Co-Creation Summary</h4>
            <p style="margin:0; color:#e0e7ff;">${textToSend}</p>
          </div>
        `;
      }

      const copilotMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'copilot',
        text: aiResponseText,
        generatedHtml,
        timestamp: 'Just now'
      };

      setMessages(prev => [...prev, copilotMsg]);
      setIsGenerating(false);
    }, 800);
  };

  return (
    <div className="w-80 border-l border-slate-800 bg-slate-900/90 flex flex-col h-full flex-shrink-0 animate-in slide-in-from-right-6 shadow-2xl z-20">
      
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-200">Copilot in Loop</h3>
            <p className="text-[10px] text-slate-400">Contextual Co-Creation Assistant</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Prompts */}
      <div className="p-2 border-b border-slate-800/80 bg-slate-950/30 flex items-center gap-1.5 overflow-x-auto">
        <button
          onClick={() => handleSendPrompt("Draft a project blueprint outline")}
          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-indigo-300 border border-slate-700 whitespace-nowrap cursor-pointer flex items-center gap-1"
        >
          <FileText className="w-3 h-3 text-indigo-400" /> Blueprint
        </button>
        <button
          onClick={() => handleSendPrompt("Create a team voting table for ideas")}
          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-emerald-300 border border-slate-700 whitespace-nowrap cursor-pointer flex items-center gap-1"
        >
          <ThumbsUp className="w-3 h-3 text-emerald-400" /> Voting Table
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col space-y-1 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 px-1">
              {msg.sender === 'user' ? <User className="w-3 h-3 text-slate-400" /> : <Bot className="w-3 h-3 text-indigo-400" />}
              <span>{msg.sender === 'user' ? 'You' : 'Copilot'}</span>
              <span>• {msg.timestamp}</span>
            </div>

            <div className={`p-3 rounded-2xl text-xs max-w-[92%] ${
              msg.sender === 'user'
                ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/20'
                : 'bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-tl-none'
            }`}>
              <p>{msg.text}</p>

              {msg.generatedHtml && (
                <div className="mt-2.5 pt-2 border-t border-slate-700/80">
                  <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] max-h-36 overflow-y-auto font-mono text-indigo-200"
                       dangerouslySetInnerHTML={{ __html: msg.generatedHtml }} />
                  
                  <button
                    onClick={() => onInsertToCanvas(msg.generatedHtml!)}
                    className="mt-2 w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-indigo-600/30"
                  >
                    <span>Insert into Page Canvas</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isGenerating && (
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/50 text-indigo-300 text-xs animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
            <span>Copilot is drafting page content...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-800 bg-slate-950">
        <div className="relative flex items-center">
          <input
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt()}
            placeholder="Ask Copilot to write or format..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-3 pr-10 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => handleSendPrompt()}
            disabled={!promptInput.trim() || isGenerating}
            className="absolute right-1.5 p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </div>
  );
};
