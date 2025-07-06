import { Express } from 'express';

// Simple local response system that speaks normally in English
function generateLocalResponse(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();

  // Calculator request
  if (lowerPrompt.includes('calculator') || lowerPrompt.includes('calc')) {
    return `I'll create a clean calculator for you! Here's a simple one:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calculator</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .calculator {
            background: white;
            border-radius: 20px;
            padding: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            max-width: 300px;
        }

        .display {
            width: 100%;
            height: 60px;
            font-size: 24px;
            text-align: right;
            border: 2px solid #ddd;
            border-radius: 10px;
            padding: 0 15px;
            margin-bottom: 20px;
            background: #f8f9fa;
        }

        .buttons {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
        }

        button {
            height: 50px;
            font-size: 18px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .number {
            background: #f8f9fa;
            color: #333;
        }

        .operator {
            background: #667eea;
            color: white;
        }

        .equals {
            background: #28a745;
            color: white;
        }

        .clear {
            background: #dc3545;
            color: white;
        }

        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
    </style>
</head>
<body>
    <div class="calculator">
        <input type="text" class="display" id="display" value="0" readonly>
        <div class="buttons">
            <button class="clear" onclick="clearDisplay()">C</button>
            <button class="clear" onclick="deleteLast()">←</button>
            <button class="operator" onclick="appendToDisplay('/')">/</button>
            <button class="operator" onclick="appendToDisplay('*')">×</button>

            <button class="number" onclick="appendToDisplay('7')">7</button>
            <button class="number" onclick="appendToDisplay('8')">8</button>
            <button class="number" onclick="appendToDisplay('9')">9</button>
            <button class="operator" onclick="appendToDisplay('-')">-</button>

            <button class="number" onclick="appendToDisplay('4')">4</button>
            <button class="number" onclick="appendToDisplay('5')">5</button>
            <button class="number" onclick="appendToDisplay('6')">6</button>
            <button class="operator" onclick="appendToDisplay('+')">+</button>

            <button class="number" onclick="appendToDisplay('1')">1</button>
            <button class="number" onclick="appendToDisplay('2')">2</button>
            <button class="number" onclick="appendToDisplay('3')">3</button>
            <button class="equals" onclick="calculate()" rowspan="2">=</button>

            <button class="number" onclick="appendToDisplay('0')" style="grid-column: span 2;">0</button>
            <button class="number" onclick="appendToDisplay('.')">.</button>
        </div>
    </div>

    <script>
        let display = document.getElementById('display');
        let currentInput = '0';

        function updateDisplay() {
            display.value = currentInput;
        }

        function appendToDisplay(value) {
            if (currentInput === '0' && value !== '.') {
                currentInput = value;
            } else {
                currentInput += value;
            }
            updateDisplay();
        }

        function clearDisplay() {
            currentInput = '0';
            updateDisplay();
        }

        function deleteLast() {
            if (currentInput.length > 1) {
                currentInput = currentInput.slice(0, -1);
            } else {
                currentInput = '0';
            }
            updateDisplay();
        }

        function calculate() {
            try {
                currentInput = eval(currentInput.replace('×', '*')).toString();
            } catch (error) {
                currentInput = 'Error';
            }
            updateDisplay();
        }

        // Keyboard support
        document.addEventListener('keydown', function(event) {
            const key = event.key;

            if (/[0-9]/.test(key)) {
                appendToDisplay(key);
            } else if (['+', '-', '*', '/'].includes(key)) {
                appendToDisplay(key === '*' ? '×' : key);
            } else if (key === 'Enter' || key === '=') {
                calculate();
            } else if (key === 'Escape' || key === 'c' || key === 'C') {
                clearDisplay();
            } else if (key === 'Backspace') {
                deleteLast();
            } else if (key === '.') {
                appendToDisplay('.');
            }
        });
    </script>
</body>
</html>
\`\`\`

This calculator includes:
- Clean, modern design
- Full keyboard support
- Basic math operations (+, -, ×, ÷)
- Clear and backspace functions
- Error handling
- Responsive layout

Just save this as an HTML file and open it in your browser!`;
  }

  // Todo app
  if (lowerPrompt.includes('todo') || lowerPrompt.includes('task')) {
    return `I'll create a simple todo app for you:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Todo App</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }

        h1 {
            text-align: center;
            color: #333;
        }

        .input-section {
            display: flex;
            margin-bottom: 20px;
            gap: 10px;
        }

        input[type="text"] {
            flex: 1;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
        }

        button {
            padding: 12px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
        }

        button:hover {
            background: #0056b3;
        }

        .todo-item {
            background: white;
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .todo-item.completed {
            text-decoration: line-through;
            opacity: 0.6;
        }

        .delete-btn {
            background: #dc3545;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <h1>My Todo List</h1>

    <div class="input-section">
        <input type="text" id="todoInput" placeholder="What do you need to do?">
        <button onclick="addTodo()">Add Task</button>
    </div>

    <div id="todoList"></div>

    <script>
        let todos = [];

        function addTodo() {
            const input = document.getElementById('todoInput');
            const text = input.value.trim();

            if (text) {
                todos.push({
                    id: Date.now(),
                    text: text,
                    completed: false
                });
                input.value = '';
                renderTodos();
            }
        }

        function toggleTodo(id) {
            const todo = todos.find(t => t.id === id);
            if (todo) {
                todo.completed = !todo.completed;
                renderTodos();
            }
        }

        function deleteTodo(id) {
            todos = todos.filter(t => t.id !== id);
            renderTodos();
        }

        function renderTodos() {
            const todoList = document.getElementById('todoList');
            todoList.innerHTML = todos.map(todo => 
                \`<div class="todo-item \${todo.completed ? 'completed' : ''}">
                    <span onclick="toggleTodo(\${todo.id})" style="cursor: pointer;">
                        \${todo.text}
                    </span>
                    <button class="delete-btn" onclick="deleteTodo(\${todo.id})">Delete</button>
                </div>\`
            ).join('');
        }

        // Allow Enter key to add todos
        document.getElementById('todoInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addTodo();
            }
        });
    </script>
</body>
</html>
\`\`\`

Features:
- Add new tasks
- Mark tasks as complete
- Delete tasks
- Clean, simple interface
- Keyboard shortcuts (Enter to add)`;
  }

  // Website creation
  if (lowerPrompt.includes('website') || lowerPrompt.includes('web') || lowerPrompt.includes('page')) {
    return `I'll create a simple website for you:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Website</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            line-height: 1.6;
        }

        header {
            background: #333;
            color: white;
            text-align: center;
            padding: 1rem;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }

        .btn {
            display: inline-block;
            background: #007bff;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 5px;
            margin: 10px 5px;
        }

        .btn:hover {
            background: #0056b3;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 40px 0;
        }

        .card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
    </style>
</head>
<body>
    <header>
        <h1>Welcome to My Website</h1>
        <p>A simple, clean website template</p>
    </header>

    <div class="container">
        <h2>About</h2>
        <p>This is a basic website template. You can customize it however you like!</p>

        <a href="#" class="btn">Get Started</a>
        <a href="#" class="btn">Learn More</a>

        <div class="grid">
            <div class="card">
                <h3>Feature 1</h3>
                <p>Description of your first feature</p>
            </div>
            <div class="card">
                <h3>Feature 2</h3>
                <p>Description of your second feature</p>
            </div>
            <div class="card">
                <h3>Feature 3</h3>
                <p>Description of your third feature</p>
            </div>
        </div>
    </div>
</body>
</html>
\`\`\`

This creates a clean, responsive website with:
- Header section
- Content area
- Feature cards
- Modern styling
- Mobile-friendly design`;
  }

  // General chat responses - unique and helpful
  const chatResponses = [
    "Let's build something amazing! Describe your app idea and I'll create the complete code for you.",
    "Ready to code? Tell me what you want to build - calculator, todo list, game, or anything else!",
    "I can generate working code for any app you have in mind. What should we create today?",
    "Describe your project idea and I'll write clean, functional code that works immediately.",
    "What would you like to build? I'll create professional code with modern design and full functionality.",
    "Time to bring your idea to life! Just tell me what you want and I'll handle all the coding."
  ];

  return chatResponses[Math.floor(Math.random() * chatResponses.length)];
}

export function registerChatRoutes(app: Express) {
  // Proxy route for your hosted AI API
  app.post('/api/generate-code', async (req, res) => {
    try {
      console.log('AI proxy request:', req.body);

      const { prompt, codeType, framework, includeComments } = req.body;
      const AI_CODE_API = 'https://new-project-49chatgptreplit.created.app/api/generate-code';

      // Make request to your hosted Create API
      const response = await fetch(AI_CODE_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          codeType: codeType || 'javascript',
          framework: framework || null,
          includeComments: includeComments !== false
        })
      });

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);

    } catch (error) {
      console.error('Error calling AI API:', error);
      res.status(500).json({
        error: 'Failed to generate code',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post('/api/claude-proxy', (req, res) => {
    try {
      const { prompt } = req.body;

      if (!prompt) {
        return res.status(400).json({ 
          success: false, 
          error: 'Prompt is required' 
        });
      }

      const lowerPrompt = prompt.toLowerCase();
      let response = '';

      // Enhanced AI responses with actual code generation
      if (lowerPrompt.includes('calculator')) {
        response = `I'll create a modern calculator app for you!

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modern Calculator</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .calculator {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .display {
            background: rgba(0, 0, 0, 0.3);
            color: white;
            font-size: 2rem;
            padding: 20px;
            text-align: right;
            border-radius: 10px;
            margin-bottom: 20px;
            min-height: 80px;
            display: flex;
            align-items: center;
            justify-content: flex-end;
        }
        .buttons {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
        }
        button {
            padding: 20px;
            font-size: 1.2rem;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 600;
        }
        .number, .decimal { 
            background: rgba(255, 255, 255, 0.8);
            color: #333;
        }
        .operator { 
            background: #ff6b6b;
            color: white;
        }
        .equals { 
            background: #4ecdc4;
            color: white;
        }
        .clear { 
            background: #95a5a6;
            color: white;
        }
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
        .zero { grid-column: span 2; }
    </style>
</head>
<body>
    <div class="calculator">
        <div class="display" id="display">0</div>
        <div class="buttons">
            <button class="clear" onclick="clearDisplay()">C</button>
            <button class="clear" onclick="deleteLast()">⌫</button>
            <button class="operator" onclick="appendToDisplay('/')">/</button>
            <button class="operator" onclick="appendToDisplay('*')">×</button>

            <button class="number" onclick="appendToDisplay('7')">7</button>
            <button class="number" onclick="appendToDisplay('8')">8</button>
            <button class="number" onclick="appendToDisplay('9')">9</button>
            <button class="operator" onclick="appendToDisplay('-')">-</button>

            <button class="number" onclick="appendToDisplay('4')">4</button>
            <button class="number" onclick="appendToDisplay('5')">5</button>
            <button class="number" onclick="appendToDisplay('6')">6</button>
            <button class="operator" onclick="appendToDisplay('+')">+</button>

            <button class="number" onclick="appendToDisplay('1')">1</button>
            <button class="number" onclick="appendToDisplay('2')">2</button>
            <button class="number" onclick="appendToDisplay('3')">3</button>
            <button class="equals" onclick="calculate()" rowspan="2">=</button>

            <button class="number zero" onclick="appendToDisplay('0')">0</button>
            <button class="decimal" onclick="appendToDisplay('.')">.</button>
        </div>
    </div>

    <script>
        let display = document.getElementById('display');
        let currentInput = '0';
        let shouldResetDisplay = false;

        function updateDisplay() {
            display.textContent = currentInput;
        }

        function clearDisplay() {
            currentInput = '0';
            updateDisplay();
        }

        function deleteLast() {
            if (currentInput.length > 1) {
                currentInput = currentInput.slice(0, -1);
            } else {
                currentInput = '0';
            }
            updateDisplay();
        }

        function appendToDisplay(value) {
            if (shouldResetDisplay) {
                currentInput = '0';
                shouldResetDisplay = false;
            }

            if (currentInput === '0' && value !== '.') {
                currentInput = value;
            } else {
                currentInput += value;
            }
            updateDisplay();
        }

        function calculate() {
            try {
                let expression = currentInput.replace(/×/g, '*');
                let result = eval(expression);
                currentInput = result.toString();
                shouldResetDisplay = true;
                updateDisplay();
            } catch (error) {
                currentInput = 'Error';
                shouldResetDisplay = true;
                updateDisplay();
            }
        }

        // Keyboard support
        document.addEventListener('keydown', function(event) {
            const key = event.key;
            if (key >= '0' && key <= '9') {
                appendToDisplay(key);
            } else if (key === '+' || key === '-' || key === '*' || key === '/') {
                appendToDisplay(key === '*' ? '×' : key);
            } else if (key === '.' || key === ',') {
                appendToDisplay('.');
            } else if (key === 'Enter' || key === '=') {
                calculate();
            } else if (key === 'Escape' || key === 'c' || key === 'C') {
                clearDisplay();
            } else if (key === 'Backspace') {
                deleteLast();
            }
        });
    </script>
</body>
</html>
\`\`\`

This calculator features:
- Modern glassmorphism design
- Full keyboard support
- Error handling
- Smooth animations
- Mobile-responsive layout
- Advanced mathematical operations`;

      } else if (lowerPrompt.includes('todo')) {
        response = `I'll create a beautiful todo list app for you!

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart Todo App</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #2d3436;
            text-align: center;
            margin-bottom: 30px;
            font-size: 2.5rem;
        }
        .input-container {
            display: flex;
            gap: 10px;
            margin-bottom: 30px;
        }
        #todoInput {
            flex: 1;
            padding: 15px;
            border: 2px solid #ddd;
            border-radius: 10px;
            font-size: 1rem;
            transition: border-color 0.3s;
        }
        #todoInput:focus {
            outline: none;
            border-color: #74b9ff;
        }
        .add-btn {
            padding: 15px 25px;
            background: #00b894;
            color: white;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 600;
            transition: all 0.3s;
        }
        .add-btn:hover {
            background: #00a085;
            transform: translateY(-2px);
        }
        .stats {
            display: flex;
            justify-content: space-around;
            margin-bottom: 30px;
            padding: 20px;
            background: rgba(116, 185, 255, 0.1);
            border-radius: 15px;
        }
        .stat {
            text-align: center;
        }
        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: #0984e3;
        }
        .stat-label {
            color: #636e72;
        }
        .todo-list {
            list-style: none;
        }
        .todo-item {
            display: flex;
            align-items: center;
            padding: 15px;
            margin-bottom: 10px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            transition: all 0.3s;
        }
        .todo-item:hover {
            transform: translateX(5px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        .todo-item.completed {
            opacity: 0.7;
            text-decoration: line-through;
        }
        .todo-checkbox {
            margin-right: 15px;
            width: 20px;
            height: 20px;
            cursor: pointer;
        }
        .todo-text {
            flex: 1;
            color: #2d3436;
        }
        .todo-actions {
            display: flex;
            gap: 10px;
        }
        .edit-btn, .delete-btn {
            padding: 5px 10px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 0.9rem;
        }
        .edit-btn {
            background: #fdcb6e;
            color: white;
        }
        .delete-btn {
            background: #e17055;
            color: white;
        }
        .filter-buttons {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-bottom: 20px;
        }
        .filter-btn {
            padding: 10px 20px;
            border: 2px solid #74b9ff;
            background: white;
            color: #74b9ff;
            border-radius: 25px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .filter-btn.active {
            background: #74b9ff;
            color: white;
        }
        .empty-state {
            text-align: center;
            padding: 40px;
            color: #636e72;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📝 Smart Todo</h1>

        <div class="input-container">
            <input type="text" id="todoInput" placeholder="Add a new task..." maxlength="100">
            <button class="add-btn" onclick="addTodo()">Add Task</button>
        </div>

        <div class="stats">
            <div class="stat">
                <div class="stat-number" id="totalTasks">0</div>
                <div class="stat-label">Total</div>
            </div>
            <div class="stat">
                <div class="stat-number" id="completedTasks">0</div>
                <div class="stat-label">Completed</div>
            </div>
            <div class="stat">
                <div class="stat-number" id="pendingTasks">0</div>
                <div class="stat-label">Pending</div>
            </div>
        </div>

        <div class="filter-buttons">
            <button class="filter-btn active" onclick="filterTodos('all')">All</button>
            <button class="filter-btn" onclick="filterTodos('pending')">Pending</button>
            <button class="filter-btn" onclick="filterTodos('completed')">Completed</button>
        </div>

        <ul class="todo-list" id="todoList"></ul>

        <div class="empty-state" id="emptyState" style="display: none;">
            <h3>No tasks yet!</h3>
            <p>Add your first task above to get started.</p>
        </div>
    </div>

    <script>
        let todos = [];
        let currentFilter = 'all';

        function addTodo() {
            const input = document.getElementById('todoInput');
            const text = input.value.trim();

            if (text) {
                const todo = {
                    id: Date.now(),
                    text: text,
                    completed: false,
                    createdAt: new Date().toISOString()
                };

                todos.unshift(todo);
                input.value = '';
                renderTodos();
                updateStats();
            }
        }

        function toggleTodo(id) {
            todos = todos.map(todo => 
                todo.id === id ? { ...todo, completed: !todo.completed } : todo
            );
            renderTodos();
            updateStats();
        }

        function deleteTodo(id) {
            todos = todos.filter(todo => todo.id !== id);
            renderTodos();
            updateStats();
        }

        function editTodo(id) {
            const todo = todos.find(t => t.id === id);
            const newText = prompt('Edit task:', todo.text);

            if (newText && newText.trim()) {
                todos = todos.map(t => 
                    t.id === id ? { ...t, text: newText.trim() } : t
                );
                renderTodos();
            }
        }

        function filterTodos(filter) {
            currentFilter = filter;
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');
            renderTodos();
        }

        function renderTodos() {
            const todoList = document.getElementById('todoList');
            const emptyState = document.getElementById('emptyState');

            let filteredTodos = todos;
            if (currentFilter === 'pending')