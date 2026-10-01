import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

app.post('/api/tasks/insights', async (req, res) => {
  try {
    const { tasks, selectedTaskId } = req.body;
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'Tasks array required' });
    }

    const taskSummaries = tasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description || '',
      status: t.status,
      priority: t.priority,
      attentionProfile: t.attentionProfile,
      estimatedHours: t.estimatedHours,
      dependencies: t.dependencies || [],
      dueDate: t.dueDate,
      tags: t.tags || [],
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Analyze the following task list and generate actionable task insights:
${JSON.stringify({ tasks: taskSummaries, focusTaskId: selectedTaskId }, null, 2)}

Provide:
1. Optimal time-blocking schedule (e.g., Morning 9:00 AM - 11:30 AM for deep work coding, Afternoon 2:00 PM for shallow work/reviews).
2. Potential bottlenecks based on dependencies (tasks blocking multiple downstream items or pending backlog items).
3. Missing prerequisites or implicit preparation steps in task descriptions.
4. An overall executive workload summary.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallSummary: { type: Type.STRING },
            timeBlocking: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  taskId: { type: Type.STRING },
                  taskTitle: { type: Type.STRING },
                  suggestedTimeSlot: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  attentionProfile: { type: Type.STRING },
                },
                required: ['taskId', 'taskTitle', 'suggestedTimeSlot', 'reason'],
              },
            },
            bottlenecks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  taskId: { type: Type.STRING },
                  taskTitle: { type: Type.STRING },
                  severity: { type: Type.STRING },
                  description: { type: Type.STRING },
                  recommendation: { type: Type.STRING },
                },
                required: ['taskId', 'taskTitle', 'severity', 'description', 'recommendation'],
              },
            },
            missingPrerequisites: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  taskId: { type: Type.STRING },
                  taskTitle: { type: Type.STRING },
                  suggestedPrerequisiteTitle: { type: Type.STRING },
                  rationale: { type: Type.STRING },
                },
                required: ['taskId', 'taskTitle', 'suggestedPrerequisiteTitle', 'rationale'],
              },
            },
          },
          required: ['overallSummary', 'timeBlocking', 'bottlenecks', 'missingPrerequisites'],
        },
      },
    });

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);
    res.json(parsed);
  } catch (err: any) {
    console.error('Task Insights API error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate AI insights' });
  }
});

app.post('/api/inbox/daily-digest', async (req, res) => {
  try {
    const { tasks, currentDate, userEmail } = req.body;
    const taskList = Array.isArray(tasks) ? tasks : [];

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Generate a concise, highly motivating 'AI Daily Digest' morning briefing for a modern professional.
Current date/time context: ${currentDate || new Date().toISOString()}
Tasks dataset: ${JSON.stringify(taskList.map((t: any) => ({ title: t.title, priority: t.priority, status: t.status, dueDate: t.dueDate, attentionProfile: t.attentionProfile, estimatedHours: t.estimatedHours })), null, 2)}

Produce a JSON object with:
1. "greeting": Personalized energizing morning greeting.
2. "scheduleHighlight": A 2-sentence summary of today's recommended workflow pacing (peak deep work vs shallow tasks).
3. "keyDeadlines": List of up to 4 top urgent or upcoming deadline tasks with brief notes.
4. "focusPriorities": List of 3 strategic top focus priorities for today.
5. "productivityTip": A high-impact productivity tip tailored to the workload.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            greeting: { type: Type.STRING },
            scheduleHighlight: { type: Type.STRING },
            keyDeadlines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  taskTitle: { type: Type.STRING },
                  dueDateOrUrgency: { type: Type.STRING },
                  note: { type: Type.STRING }
                },
                required: ['taskTitle', 'dueDateOrUrgency', 'note']
              }
            },
            focusPriorities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  action: { type: Type.STRING },
                  attentionProfile: { type: Type.STRING }
                },
                required: ['title', 'action']
              }
            },
            productivityTip: { type: Type.STRING }
          },
          required: ['greeting', 'scheduleHighlight', 'keyDeadlines', 'focusPriorities', 'productivityTip']
        }
      }
    });

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);
    res.json(parsed);
  } catch (err: any) {
    console.error('Daily Digest API error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate Daily Digest' });
  }
});

// AI Auto-Labeling for Tasks endpoint
app.post('/api/tasks/suggest-tags', async (req, res) => {
  try {
    const { title, description, existingTags } = req.body;
    if (!title && !description) {
      return res.status(400).json({ error: 'Title or description required for AI auto-labeling' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are an intelligent task organization assistant. Analyze the task title and description to suggest 3 to 5 concise, highly relevant tags/labels for the task.
Task Title: "${title || ''}"
Task Description: "${description || ''}"
${existingTags && Array.isArray(existingTags) && existingTags.length > 0 ? `Existing Workspace Tags for pattern alignment: ${JSON.stringify(existingTags)}` : ''}

Rules:
1. Return 3 to 5 lowercase single-word or short camelCase/hyphenated tags (e.g., "dev", "frontend", "billing", "urgent", "review", "bug", "design", "api").
2. Match existing workspace tags if applicable, or suggest high-accuracy domain tags.
3. Provide a brief 1-sentence rationale.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedTags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Array of suggested tag strings',
            },
            rationale: {
              type: Type.STRING,
              description: 'Brief explanation of why these tags were suggested',
            },
          },
          required: ['suggestedTags', 'rationale'],
        },
      },
    });

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);
    res.json(parsed);
  } catch (err: any) {
    console.error('Suggest Tags API error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate AI tag suggestions' });
  }
});

import fs from 'fs';
import path from 'path';

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer();
