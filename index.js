


// --- MODEL ---
const createTodoModel = () => {
  let todos = [];

  return {
    getTodos: () => todos,
    async fetchTodos() {
      const res = await fetch('https://dummyjson.com/todos');
      const data = await res.json();
      todos = data.todos;
      return todos;
    },
    async addTodo(todoText) {
      const res = await fetch('https://dummyjson.com/todos/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todo: todoText, completed: false, userId: 5 })
      });
      const newTodo = await res.json();

      // IMPORTANT: Give new items a unique ID so they don't all share '255'
      newTodo.id = Date.now(); 
      todos.push(newTodo);
    },
    async toggleTodo(id) {
      const todo = todos.find(t => t.id === id);
      if (!todo) return;

      // Update locally FIRST so the UI moves immediately
      todo.completed = !todo.completed;

      // Only call API if it's an original ID (< 255) 
      // otherwise dummyjson returns 404 and breaks the code
      if (id <= 255) {
        await fetch(`https://dummyjson.com/todos/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: todo.completed })
        });
      }
    },
    async deleteTodo(id) {
      // Filter locally first
      todos = todos.filter(t => t.id !== id);

      // FIX: Added /todos/ and the $ sign
      if (id <= 255) {
        await fetch(`https://dummyjson.com/todos/${id}`, { method: 'DELETE' });
      }
    },
    async updateTodo(id, newText) {
      const todo = todos.find(t => t.id === id);
      if (todo) todo.todo = newText;

      // FIX: Added /todos/ and the $ sign
      if (id <= 255) {
        await fetch(`https://dummyjson.com/todos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ todo: newText })
        });
      }
    }
  };
};



// --- VIEW ---
const createTodoView = () => {
  const elements = {
    appContainer: document.querySelector('.app-container'),
    input: document.getElementById('todo-input'),
    submitBtn: document.getElementById('submit-btn'),
    pendingList: document.getElementById('pending-list'),
    completedList: document.getElementById('completed-list')
  };

  return {
    elements,
    render(todos) {
      elements.pendingList.innerHTML = '';
      elements.completedList.innerHTML = '';

      todos.forEach(todo => {
        const li = document.createElement('li');
        li.className = 'todo-item';
        li.dataset.id = todo.id;

        const textHtml = `<span class="todo-text" contenteditable="false">${todo.todo}</span>`;
        const actionBtns = `
          <div class="btn-group">
            <button class="edit-btn btn-square">✏️</button>
            <button class="delete-btn btn-square">🗑️</button>
          </div>`;

        if (todo.completed) {
          li.innerHTML = `<button class="toggle-btn btn-square">⬅️</button>
          ${textHtml}
          ${actionBtns}`;
          elements.completedList.appendChild(li);
        } else {
          li.innerHTML = `${textHtml}${actionBtns}
          <button class="toggle-btn btn-square">➡️</button>`;
          elements.pendingList.appendChild(li);
        }
      });
    },

  
  bindAddTodo(handler) {
      elements.submitBtn.onclick = () => {
        if (elements.input.value.trim()) {
          handler(elements.input.value);
          elements.input.value = '';
  
        }
      };
    }
  };
};




// --- CONTROLLER ---
const todoController = async (model, view) => {
  const handleClicks = async (e) => {
    const listItem = e.target.closest('li');
    if (!listItem) return;
    
    // Use Number() to ensure the ID matches the model's number format
    const id = Number(listItem.dataset.id);

    if (e.target.closest('.delete-btn')) {
      await model.deleteTodo(id);
    } else if (e.target.closest('.toggle-btn')) {
      await model.toggleTodo(id);
    } else if (e.target.closest('.edit-btn')) {
      await handleEdit(e.target.closest('.edit-btn'), id);
      return; 
    }
    
    view.render(model.getTodos());
  };

  const handleEdit = async (btn, id) => {
    const li = btn.closest('li');
    const span = li.querySelector('.todo-text');
    const isEditing = span.contentEditable === 'true';

    if (isEditing) {
      await model.updateTodo(id, span.innerText);
      span.contentEditable = 'false';
      btn.innerText = '✏️';
      view.render(model.getTodos());
    } else {
      span.contentEditable = 'true';
      span.focus();
      btn.innerText = '💾';
    }
  };

  // Event Listeners
  view.elements.appContainer.addEventListener('click', handleClicks);
  view.bindAddTodo(async (text) => {
    await model.addTodo(text);
    view.render(model.getTodos());
  });

  // Initial Load
  await model.fetchTodos();
  view.render(model.getTodos());
};

// Start
todoController(createTodoModel(), createTodoView());




