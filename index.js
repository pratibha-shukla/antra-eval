


/**
 * --- MODEL ---
 * Handles data logic, state management, and API communication.
 * 
 * Manages the "source of truth." It handles data structures, 
 * state updates, and all asynchronous API communication.
 */
const createTodoModel = () => {
  let todos = []; // Private state for the application

  return {
    getTodos: () => todos,

     
      /**
       * Fetches initial dataset from external API
     * Initial data load. Populates the local state from the API.
     */
    async fetchTodos() {
      const res = await fetch('https://dummyjson.com/todos');
      const data = await res.json();
      todos = data.todos;
      return todos;
    },


       /**
     * Sends new todo to server and updates local state.
     * Note: DummyJSON doesn't actually persist data to their DB.
     */
    async addTodo(todoText) {
      const res = await fetch('https://dummyjson.com/todos/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todo: todoText, completed: false, userId: 5 })
      });
      const newTodo = await res.json();

       // Override the static ID (255) returned by the API so local 
      // operations (delete/edit) work on the correct unique item.
      newTodo.id = Date.now(); 
      todos.push(newTodo);
    },

 /**
     * Switches completion status.
     * Uses "Optimistic UI" logic by updating local state before the API call finishes.
     */

    async toggleTodo(id) {
      const todo = todos.find(t => t.id === id);
      if (!todo) return;

      // Update locally FIRST so the UI moves immediately
      todo.completed = !todo.completed;

      // Logic Guard: DummyJSON only recognizes IDs it generated (1-255).
      // We skip the API call for locally created items to avoid 404 errors.

        if (id <= 255) {
        await fetch(`https://dummyjson.com/todos/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: todo.completed })
        });
      }
    },

  
    async deleteTodo(id) {
        // Remove from local array immediately for snappy UI
      todos = todos.filter(t => t.id !== id);

      // Added /todos/ and the $ sign
      if (id <= 255) {
        await fetch(`https://dummyjson.com/todos/${id}`, { method: 'DELETE' });
      }
    },
    async updateTodo(id, newText) {
      const todo = todos.find(t => t.id === id);
      if (todo) todo.todo = newText;

      // Added /todos/ and the $ sign
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


/**
 * --- VIEW ---
 * Handles the DOM. It doesn't "know" how data works; 
 * it only knows how to display it and capture user input.
 */
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
 /**
     * Clears and rebuilds the list items based on the provided data array.
     */


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

          // Sort items into different lists based on status

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

  /**
     * Custom event binder to bridge View and Controller for the "Add" action.
     */
  bindAddTodo(handler) {
      elements.submitBtn.onclick = () => {
        if (elements.input.value.trim()) {
          handler(elements.input.value);
          elements.input.value = '';  // Clear input after submission
  
        }
      };
    }
  };
};




/**
 * --- CONTROLLER ---
 * The "Brain." It listens to the View, tells the Model what to do, 
 * and tells the View when to re-render.
 */
const todoController = async (model, view) => {


   /**
   * Main click delegation. Instead of adding listeners to every button,
   * we listen at the container level for better performance.
   */


  const handleClicks = async (e) => {
    const listItem = e.target.closest('li');
    if (!listItem) return;
    
 // Dataset IDs come back as strings; convert to Number for Model comparison
    const id = Number(listItem.dataset.id);

    if (e.target.closest('.delete-btn')) {
      await model.deleteTodo(id);
    } else if (e.target.closest('.toggle-btn')) {
      await model.toggleTodo(id);
    } else if (e.target.closest('.edit-btn')) {

       // Logic for editing is handled separately to manage the contentEditable state
      await handleEdit(e.target.closest('.edit-btn'), id);
      return; 
    }
    

    // Refresh the UI with the updated data
    view.render(model.getTodos());
  };

   /**
   * Manages the "Inline Editing" state.
   */

  const handleEdit = async (btn, id) => {
    const li = btn.closest('li');
    const span = li.querySelector('.todo-text');
    const isEditing = span.contentEditable === 'true';

    if (isEditing) {

        // Save Mode
      await model.updateTodo(id, span.innerText);
      span.contentEditable = 'false';
      btn.innerText = '✏️';
      view.render(model.getTodos());
    } else {

       // Edit Mode
      span.contentEditable = 'true';
      span.focus();
      btn.innerText = '💾'; // Change icon to "Save"
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

// Start application intial 
todoController(createTodoModel(), createTodoView());




