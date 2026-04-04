export interface ParsedTodo {
  task_name: string
  subtasks: string[]
}

export function parseTodoMarkdown(text: string): ParsedTodo[] {
  const lines = text.split('\n')
  const todos: ParsedTodo[] = []
  let current: ParsedTodo | null = null

  for (const line of lines) {
    const todoMatch = line.match(/^- \[[ x]?\] (.+)$/)
    if (todoMatch) {
      current = { task_name: todoMatch[1].trim(), subtasks: [] }
      todos.push(current)
      continue
    }

    if (current) {
      const subtaskMatch = line.match(/^(?:  |\t)- (.+)$/)
      if (subtaskMatch) {
        current.subtasks.push(subtaskMatch[1].trim())
      }
    }
  }

  return todos
}
