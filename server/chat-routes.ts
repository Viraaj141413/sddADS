import { Express, Request, Response } from 'express';

// Helper functions for generating specific types of applications
function generateWebsiteCode(prompt: string): string {
  return `I'll create a modern, responsive website for you!

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modern Website</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            line-height: 1.6;
            color: #333;
        }
        .hero {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            color: white;
        }
        .hero-content {
            max-width: 800px;
            padding: 0 20px;
        }
        .hero h1 {
            font-size: clamp(2.5rem, 5vw, 4rem);
            margin-bottom: 1rem;
            font-weight: 700;
        }
        .hero p {
            font-size: 1.25rem;
            margin-bottom: 2rem;
            opacity: 0.9;
        }
        .cta-button {
            background: rgba(255,255,255,0.2);
            color: white;
            padding: 15px 30px;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 50px;
            font-size: 1.1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
        }
        .cta-button:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="hero">
        <div class="hero-content">
            <h1>Welcome to Your Modern Website</h1>
            <p>Beautiful, responsive design that works on all devices</p>
            <a href="#" class="cta-button">Get Started</a>
        </div>
    </div>
</body>
</html>
\`\`\`
`;
}

function generateReactCode(prompt: string): string {
  return `I'll create a modern React application for you!

\`\`\`jsx
import React, { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{
      fontFamily: 'Inter, sans-serif',
      padding: '2rem',
      maxWidth: '600px',
      margin: '0 auto',
      textAlign: 'center'
    }}>
      <h1 style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        fontSize: '3rem',
        marginBottom: '2rem'
      }}>
        React Counter App
      </h1>
      
      <div style={{
        background: '#f8f9fa',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginBottom: '1rem', color: '#333' }}>
          Count: {count}
        </h2>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button 
            onClick={() => setCount(count - 1)}
            style={{
              padding: '10px 20px',
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Decrease
          </button>
          
          <button 
            onClick={() => setCount(count + 1)}
            style={{
              padding: '10px 20px',
              background: '#2ecc71',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Increase
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
\`\`\`
`;
}

function generatePythonCode(prompt: string): string {
  return `I'll create a Python application for you!

\`\`\`python
import json
import datetime

class TaskManager:
    def __init__(self):
        self.tasks = []
    
    def add_task(self, title, description=""):
        task = {
            'id': len(self.tasks) + 1,
            'title': title,
            'description': description,
            'completed': False,
            'created_at': datetime.datetime.now().isoformat()
        }
        self.tasks.append(task)
        print(f"✅ Task added: {title}")
    
    def list_tasks(self):
        if not self.tasks:
            print("No tasks found.")
            return
        
        print("\\n📋 Your Tasks:")
        print("-" * 40)
        for task in self.tasks:
            status = "✅" if task['completed'] else "⏳"
            print(f"{status} {task['id']}. {task['title']}")
            if task['description']:
                print(f"   📝 {task['description']}")
        print("-" * 40)
    
    def complete_task(self, task_id):
        for task in self.tasks:
            if task['id'] == task_id:
                task['completed'] = True
                print(f"✅ Task completed: {task['title']}")
                return
        print("❌ Task not found.")
    
    def save_to_file(self, filename="tasks.json"):
        with open(filename, 'w') as f:
            json.dump(self.tasks, f, indent=2)
        print(f"💾 Tasks saved to {filename}")

def main():
    tm = TaskManager()
    
    print("🚀 Welcome to Task Manager!")
    print("Commands: add, list, complete, save, quit")
    
    while True:
        command = input("\\n> ").strip().lower()
        
        if command == 'quit':
            break
        elif command == 'add':
            title = input("Task title: ")
            description = input("Description (optional): ")
            tm.add_task(title, description)
        elif command == 'list':
            tm.list_tasks()
        elif command == 'complete':
            try:
                task_id = int(input("Task ID to complete: "))
                tm.complete_task(task_id)
            except ValueError:
                print("❌ Please enter a valid task ID.")
        elif command == 'save':
            tm.save_to_file()
        else:
            print("❌ Unknown command. Try: add, list, complete, save, quit")

if __name__ == "__main__":
    main()
\`\`\`
`;
}

function generateAPICode(prompt: string): string {
  return `I'll create a REST API for you!

\`\`\`javascript
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// In-memory data store
let todos = [
  { id: 1, title: 'Learn Node.js', completed: false },
  { id: 2, title: 'Build an API', completed: true }
];

// Routes
app.get('/api/todos', (req, res) => {
  res.json(todos);
});

app.post('/api/todos', (req, res) => {
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  const newTodo = {
    id: todos.length + 1,
    title,
    completed: false
  };
  
  todos.push(newTodo);
  res.status(201).json(newTodo);
});

app.put('/api/todos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const todo = todos.find(t => t.id === id);
  
  if (!todo) {
    return res.status(404).json({ error: 'Todo not found' });
  }
  
  todo.completed = !todo.completed;
  res.json(todo);
});

app.delete('/api/todos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  todos = todos.filter(t => t.id !== id);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(\`🚀 Server running on port \${PORT}\`);
});
\`\`\`
`;
}

function generateLocalResponse(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('website') || lowerPrompt.includes('landing')) {
    return generateWebsiteCode(prompt);
  } else if (lowerPrompt.includes('react') || lowerPrompt.includes('component')) {
    return generateReactCode(prompt);
  } else if (lowerPrompt.includes('python') || lowerPrompt.includes('script')) {
    return generatePythonCode(prompt);
  } else if (lowerPrompt.includes('api') || lowerPrompt.includes('backend')) {
    return generateAPICode(prompt);
  } else {
    return generateWebsiteCode(prompt);
  }
}

function extractFilesFromResponse(response: string): Record<string, { content: string; language: string }> {
  const files: Record<string, { content: string; language: string }> = {};
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  let fileIndex = 0;

  while ((match = codeBlockRegex.exec(response)) !== null) {
    const language = match[1] || 'text';
    const content = match[2].trim();
    
    if (content) {
      let filename = `file${fileIndex + 1}`;
      
      if (language === 'html') filename = 'index.html';
      else if (language === 'css') filename = 'styles.css';
      else if (language === 'javascript' || language === 'js') filename = 'script.js';
      else if (language === 'jsx') filename = 'App.jsx';
      else if (language === 'python') filename = 'main.py';
      else if (language === 'json') filename = 'data.json';
      else filename = `${filename}.${language}`;
      
      files[filename] = { content, language };
      fileIndex++;
    }
  }

  return files;
}

export function registerChatRoutes(app: Express) {
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      console.log('🤖 Generating response for:', message);

      // Use local generation
      const response = generateLocalResponse(message);
      const files = extractFilesFromResponse(response);

      res.json({
        success: true,
        message: response,
        files: files
      });

    } catch (error) {
      console.error('Error in chat route:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to generate response'
      });
    }
  });
}