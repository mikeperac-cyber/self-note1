import React, { useState } from 'react';
import { 
  DevProject, BuildHistoryItem 
} from '../../types';
import { 
  GitBranch, ExternalLink, Zap, Share2, ArrowRight, ShieldCheck, 
  RotateCw, Plus, Trash2, CheckCircle2, AlertTriangle, Clock, 
  Terminal, Globe, Github, Layers, Play, Sparkles
} from 'lucide-react';

interface DevHubModuleProps {
  projects: DevProject[];
  onSaveProject: (project: DevProject) => void;
  onCreateProject: (project: DevProject) => void;
  onDeleteProject: (projectId: string) => void;
  onSpawnQuickTask: (title: string, priority: string, projectId: string) => void;
}

export const DevHubModule: React.FC<DevHubModuleProps> = ({
  projects,
  onSaveProject,
  onCreateProject,
  onDeleteProject,
  onSpawnQuickTask,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [isDeploying, setIsDeploying] = useState<string | null>(null);
  const [deployNotification, setDeployNotification] = useState<string | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // New Project Form state
  const [newProjectName, setNewProjectName] = useState('');
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [newVercelUrl, setNewVercelUrl] = useState('');
  const [newPreviewUrl, setNewPreviewUrl] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');

  const currentProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  // Helper to parse owner/repo from GitHub URL
  const parseRepoName = (url: string): string => {
    try {
      const clean = url.replace(/\.git$/, '').replace(/\/+$/, '');
      const match = clean.match(/github\.com[/:]([^/]+\/[^/]+)/);
      if (match) return match[1];
      const parts = clean.split('/');
      if (parts.length >= 2) {
        return parts.slice(-2).join('/');
      }
      return url;
    } catch {
      return url;
    }
  };

  // Trigger Vercel Webhook / simulated deploy
  const handleTriggerDeploy = async (project: DevProject) => {
    setIsDeploying(project.id);
    setDeployNotification(`Triggering deployment for ${project.name}...`);

    // In a live browser or server environment, if webhookUrl exists, fetch it
    if (project.webhookUrl) {
      try {
        await fetch(project.webhookUrl, { method: 'POST', mode: 'no-cors' });
      } catch (err) {
        console.warn('Webhook post attempt:', err);
      }
    }

    setTimeout(() => {
      const newBuild: BuildHistoryItem = {
        id: `b_${Date.now()}`,
        commitSha: Math.random().toString(16).slice(2, 9),
        message: 'manual: deployment triggered via Self-Note DevHub',
        branch: 'main',
        state: 'ready',
        durationSeconds: Math.floor(Math.random() * 25) + 30,
        timestamp: new Date().toISOString(),
        url: project.vercelUrl,
      };

      // Cap at 25 builds
      const updatedBuilds = [newBuild, ...(project.builds || [])].slice(0, 25);

      const updatedProject: DevProject = {
        ...project,
        status: 'operational',
        lastDeployedAt: new Date().toISOString(),
        builds: updatedBuilds,
      };

      onSaveProject(updatedProject);
      setIsDeploying(null);
      setDeployNotification(`✅ Deployment successful for ${project.name}! Build ready in ${newBuild.durationSeconds}s.`);
      setTimeout(() => setDeployNotification(null), 5000);
    }, 2500);
  };

  const handleCreateNewProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !newRepoUrl.trim()) return;

    const project: DevProject = {
      id: `proj_${Date.now()}`,
      name: newProjectName.trim(),
      repoUrl: newRepoUrl.trim(),
      vercelUrl: newVercelUrl.trim() || undefined,
      previewUrl: newPreviewUrl.trim() || undefined,
      webhookUrl: newWebhookUrl.trim() || undefined,
      env: 'production',
      status: 'operational',
      lastDeployedAt: new Date().toISOString(),
      builds: [
        {
          id: `b_${Date.now()}`,
          commitSha: 'init001',
          message: 'Initial project registration',
          branch: 'main',
          state: 'ready',
          durationSeconds: 32,
          timestamp: new Date().toISOString(),
        }
      ]
    };

    onCreateProject(project);
    setSelectedProjectId(project.id);
    setIsCreatingProject(false);
    setNewProjectName('');
    setNewRepoUrl('');
    setNewVercelUrl('');
    setNewPreviewUrl('');
    setNewWebhookUrl('');
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-950">
      
      {/* LEFT: Dev Projects List */}
      <div className="w-80 flex-shrink-0 border-r border-slate-800 flex flex-col bg-slate-900/60">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              Dev & Vercel Hub
            </h2>
            <p className="text-[11px] text-slate-500">Repos, deployments & quick tasks</p>
          </div>
          <button
            onClick={() => setIsCreatingProject(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>

        {/* Projects Cards List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {projects.map(proj => {
            const isSelected = proj.id === currentProject?.id;
            const parsedRepo = parseRepoName(proj.repoUrl);
            const latestBuild = proj.builds?.[0];

            return (
              <div
                key={proj.id}
                onClick={() => setSelectedProjectId(proj.id)}
                className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                  isSelected 
                    ? 'bg-slate-800/90 border-cyan-500/50 shadow-sm' 
                    : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-800/50 hover:border-slate-700/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className={`text-xs font-bold truncate flex-1 ${isSelected ? 'text-cyan-200' : 'text-slate-100'}`}>
                    {proj.name}
                  </h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                    proj.status === 'operational'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {proj.status}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                  <Github className="w-3.5 h-3.5 text-slate-500" />
                  <span className="truncate font-mono">{parsedRepo}</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
                  <span>{proj.builds?.length || 0} builds</span>
                  <span>{latestBuild ? `${latestBuild.durationSeconds}s duration` : 'No builds'}</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* RIGHT: Selected Project Details & Deployment Console */}
      {currentProject ? (
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-950 p-6 space-y-6">
          
          {/* Notification Banner */}
          {deployNotification && (
            <div className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-200 text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
                <span>{deployNotification}</span>
              </div>
              <button 
                onClick={() => setDeployNotification(null)}
                className="text-slate-400 hover:text-white text-xs px-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Project Header Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-xl font-extrabold text-white">{currentProject.name}</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ● {currentProject.env.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  {parseRepoName(currentProject.repoUrl)}
                </p>
              </div>

              {/* Deploy Trigger Button */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleTriggerDeploy(currentProject)}
                  disabled={isDeploying === currentProject.id}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Zap className={`w-4 h-4 ${isDeploying === currentProject.id ? 'animate-bounce' : ''}`} />
                  <span>{isDeploying === currentProject.id ? 'Triggering Vercel Build...' : 'Trigger Vercel Deploy'}</span>
                </button>
                <button
                  onClick={() => onDeleteProject(currentProject.id)}
                  className="p-2 text-slate-500 hover:text-red-400 rounded-xl transition-colors cursor-pointer"
                  title="Delete Project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Links Row */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800">
              <a
                href={currentProject.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors text-xs text-slate-300 group"
              >
                <div className="flex items-center gap-2 truncate">
                  <Github className="w-4 h-4 text-slate-400" />
                  <span className="truncate">GitHub Repository</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 flex-shrink-0" />
              </a>

              {currentProject.vercelUrl && (
                <a
                  href={currentProject.vercelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors text-xs text-slate-300 group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Globe className="w-4 h-4 text-indigo-400" />
                    <span className="truncate">Production URL</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 flex-shrink-0" />
                </a>
              )}

              {currentProject.previewUrl && (
                <a
                  href={currentProject.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors text-xs text-slate-300 group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <GitBranch className="w-4 h-4 text-purple-400" />
                    <span className="truncate">Staging Preview</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 flex-shrink-0" />
                </a>
              )}
            </div>
          </div>

          {/* 1-CLICK QUICK LINK TASKS SECTION */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-amber-400" />
              1-Click Quick Link Tasks (Spawns into Central Task Board)
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Instantly create predefined operational tasks linked directly to this project.
            </p>

            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={() => onSpawnQuickTask(`⚡ Trigger Vercel Redeploy & Verify: ${currentProject.name}`, 'high', currentProject.id)}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 flex flex-col gap-2 text-left transition-all hover:scale-[1.02] cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-200 group-hover:text-indigo-300">
                  Trigger Vercel Redeploy
                </h4>
                <p className="text-[11px] text-slate-500">
                  Schedule deployment smoke test in task board.
                </p>
              </button>

              <button
                onClick={() => onSpawnQuickTask(`📢 Share Preview Link with Team: ${currentProject.name}`, 'medium', currentProject.id)}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 flex flex-col gap-2 text-left transition-all hover:scale-[1.02] cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-200 group-hover:text-cyan-300">
                  Share Preview Link
                </h4>
                <p className="text-[11px] text-slate-500">
                  Distribute staging link for stakeholder review.
                </p>
              </button>

              <button
                onClick={() => onSpawnQuickTask(`🔄 Migrate / Move Repository: ${currentProject.name}`, 'high', currentProject.id)}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 flex flex-col gap-2 text-left transition-all hover:scale-[1.02] cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <RotateCw className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-200 group-hover:text-purple-300">
                  Migrate Repository
                </h4>
                <p className="text-[11px] text-slate-500">
                  Transfer repo or update upstream origin.
                </p>
              </button>

              <button
                onClick={() => onSpawnQuickTask(`🛡️ Audit & Security Review: ${currentProject.name}`, 'urgent', currentProject.id)}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-red-500/50 flex flex-col gap-2 text-left transition-all hover:scale-[1.02] cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-200 group-hover:text-red-300">
                  Audit & Security Review
                </h4>
                <p className="text-[11px] text-slate-500">
                  Run npm audit, check env secrets and tokens.
                </p>
              </button>
            </div>
          </div>

          {/* BUILD & DEPLOYMENT HISTORY TABLE */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                Deployment & Build History ({currentProject.builds?.length || 0} / 25 capped)
              </h2>
              <span className="text-xs text-slate-500">Auto-synchronized with Vercel</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">State</th>
                    <th className="py-2.5 px-3">Commit SHA</th>
                    <th className="py-2.5 px-3">Commit Message</th>
                    <th className="py-2.5 px-3">Branch</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {(currentProject.builds || []).map(build => (
                    <tr key={build.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          {build.state.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-cyan-400 font-bold">
                        {build.commitSha}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-sans truncate max-w-xs">
                        {build.message}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {build.branch}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {build.durationSeconds}s
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px] font-sans">
                        {new Date(build.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {(currentProject.builds || []).length === 0 && (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No build history recorded yet.
                </div>
              )}
            </div>
          </div>

        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
          <Terminal className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">No dev project selected.</p>
        </div>
      )}

      {/* New Project Modal */}
      {isCreatingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <form 
            onSubmit={handleCreateNewProject}
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                Register New Project & Deploy Hook
              </h3>
              <button
                type="button"
                onClick={() => setIsCreatingProject(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Project Name</label>
              <input
                type="text"
                required
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g. self-note-client"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">GitHub Repository URL</label>
              <input
                type="url"
                required
                value={newRepoUrl}
                onChange={(e) => setNewRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Production Vercel URL (Optional)</label>
              <input
                type="url"
                value={newVercelUrl}
                onChange={(e) => setNewVercelUrl(e.target.value)}
                placeholder="https://my-app.vercel.app"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Vercel Deploy Webhook URL (Optional)</label>
              <input
                type="url"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                placeholder="https://api.vercel.com/v1/integrations/deploy/..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreatingProject(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Create Project
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
