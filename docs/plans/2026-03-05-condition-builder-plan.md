# Better Condition Builder — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A standalone dark-themed React app where users build nested boolean logic conditions with drag-and-drop, toggleable AND/OR connectors, and a live colored expression output.

**Architecture:** Standalone Vite + React app in its own repo. State is a single recursive tree (`condition | group`) managed with an immutable history stack for undo/redo. `@dnd-kit` handles drag-and-drop; dragging one condition onto another creates a new group. The portfolio Experiments page gets one new card linking to the deployed app.

**Tech Stack:** React 18, Vite, @dnd-kit/core + @dnd-kit/sortable, nanoid, Vitest, gh-pages

---

> **IMPORTANT — Two repos:** All tasks except the last one work in the `better-condition-builder` directory. Task 11 modifies the portfolio repo.

---

### Task 1: Scaffold Repo & Install Dependencies

**Files:**
- Create: `better-condition-builder/` (project root)
- Create: `better-condition-builder/vite.config.js`
- Create: `better-condition-builder/src/test/setup.js`

**Step 1: Create the Vite project**

```bash
npm create vite@latest better-condition-builder -- --template react
cd better-condition-builder
npm install
```

**Step 2: Install runtime dependencies**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities nanoid
```

**Step 3: Install test dependencies**

```bash
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```

**Step 4: Configure Vitest in `vite.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/better-condition-builder/',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  },
})
```

**Step 5: Create `src/test/setup.js`**

```js
import '@testing-library/jest-dom'
```

**Step 6: Add scripts to `package.json`**

In `package.json`, set `"scripts"` to:
```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest",
  "predeploy": "npm run build",
  "deploy": "gh-pages -d dist"
}
```

**Step 7: Install gh-pages**

```bash
npm install -D gh-pages
```

**Step 8: Connect to GitHub remote and initial commit**

```bash
git init
git remote add origin https://github.com/Nyarlat-hotep/better-condition-builder.git
git add .
git commit -m "feat: scaffold Vite React app with deps"
git branch -M main
git push -u origin main
```

**Step 9: Verify dev server runs**

```bash
npm run dev
```
Expected: Vite dev server starts at `http://localhost:5173`

---

### Task 2: Data & Pure Utilities

**Files:**
- Create: `src/data/cosmicFields.js`
- Create: `src/utils/treeOps.js`
- Create: `src/utils/expression.js`
- Create: `src/utils/expression.test.js`
- Create: `src/utils/treeOps.test.js`

**Step 1: Write failing tests for `expression.js`**

Create `src/utils/expression.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { treeToString, rootToString } from './expression'

describe('treeToString', () => {
  it('renders incomplete condition as ? == ?', () => {
    const condition = { id: '1', type: 'condition', field: null, operator: '==', value: null }
    expect(treeToString(condition)).toBe('? == ?')
  })

  it('renders complete condition', () => {
    const condition = { id: '1', type: 'condition', field: 'StarType', operator: '==', value: 'Pulsar' }
    expect(treeToString(condition)).toBe('StarType == Pulsar')
  })

  it('renders group with two conditions', () => {
    const group = {
      id: 'g1', type: 'group', connector: 'AND', color: '#22d3ee',
      children: [
        { id: '1', type: 'condition', field: 'StarType', operator: '==', value: 'Pulsar' },
        { id: '2', type: 'condition', field: 'Mass', operator: '>', value: '5' },
      ],
    }
    expect(treeToString(group)).toBe('(StarType == Pulsar AND Mass > 5)')
  })

  it('renders nested groups', () => {
    const inner = {
      id: 'g2', type: 'group', connector: 'OR', color: '#f5c842',
      children: [
        { id: '1', type: 'condition', field: 'Galaxy', operator: '==', value: 'Andromeda' },
        { id: '2', type: 'condition', field: 'Galaxy', operator: '==', value: 'Sombrero' },
      ],
    }
    const outer = {
      id: 'g1', type: 'group', connector: 'AND', color: '#22d3ee',
      children: [inner],
    }
    expect(treeToString(outer)).toBe('((Galaxy == Andromeda OR Galaxy == Sombrero))')
  })
})

describe('rootToString', () => {
  it('renders root children without outer parens', () => {
    const root = {
      id: 'root', type: 'group', connector: 'AND', color: null,
      children: [
        { id: '1', type: 'condition', field: 'Mass', operator: '>', value: '10' },
        { id: '2', type: 'condition', field: 'Age', operator: '<', value: '5' },
      ],
    }
    expect(rootToString(root)).toBe('Mass > 10 AND Age < 5')
  })

  it('returns empty string for empty root', () => {
    const root = { id: 'root', type: 'group', connector: 'AND', color: null, children: [] }
    expect(rootToString(root)).toBe('')
  })
})
```

**Step 2: Run tests — verify they fail**

```bash
npm test
```
Expected: FAIL — `Cannot find module './expression'`

**Step 3: Implement `src/utils/expression.js`**

```js
export function treeToString(node) {
  if (node.type === 'condition') {
    const field = node.field ?? '?'
    const value = node.value ?? '?'
    return `${field} ${node.operator} ${value}`
  }
  // group
  if (!node.children || node.children.length === 0) return '()'
  const parts = node.children.map(treeToString)
  return `(${parts.join(` ${node.connector} `)})`
}

export function rootToString(root) {
  if (!root.children || root.children.length === 0) return ''
  return root.children.map(treeToString).join(` ${root.connector} `)
}
```

**Step 4: Run tests — verify expression tests pass**

```bash
npm test
```
Expected: expression tests PASS

**Step 5: Write failing tests for `treeOps.js`**

Append to `src/utils/treeOps.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { findNode, removeNode, updateNode, replaceNode } from './treeOps'

const tree = {
  id: 'root', type: 'group', connector: 'AND', color: null,
  children: [
    { id: 'c1', type: 'condition', field: 'Mass', operator: '>', value: '10' },
    {
      id: 'g1', type: 'group', connector: 'OR', color: '#22d3ee',
      children: [
        { id: 'c2', type: 'condition', field: 'Age', operator: '<', value: '5' },
      ],
    },
  ],
}

describe('findNode', () => {
  it('finds root', () => {
    const [node] = findNode(tree, 'root')
    expect(node.id).toBe('root')
  })

  it('finds nested condition', () => {
    const [node, parent, index] = findNode(tree, 'c2')
    expect(node.id).toBe('c2')
    expect(parent.id).toBe('g1')
    expect(index).toBe(0)
  })

  it('returns null for missing id', () => {
    expect(findNode(tree, 'nope')).toBeNull()
  })
})

describe('removeNode', () => {
  it('removes a top-level condition', () => {
    const newTree = removeNode(tree, 'c1')
    expect(newTree.children.length).toBe(1)
    expect(newTree.children[0].id).toBe('g1')
  })

  it('removes a nested condition', () => {
    const newTree = removeNode(tree, 'c2')
    expect(newTree.children[1].children.length).toBe(0)
  })
})

describe('updateNode', () => {
  it('updates a condition field', () => {
    const newTree = updateNode(tree, 'c1', { field: 'Galaxy' })
    const [node] = findNode(newTree, 'c1')
    expect(node.field).toBe('Galaxy')
  })
})

describe('replaceNode', () => {
  it('replaces a condition with a new node', () => {
    const newNode = { id: 'new', type: 'condition', field: 'Temperature', operator: '==', value: '5000' }
    const newTree = replaceNode(tree, 'c1', newNode)
    expect(newTree.children[0].id).toBe('new')
    expect(newTree.children[0].field).toBe('Temperature')
  })
})
```

**Step 6: Run tests — verify they fail**

```bash
npm test
```
Expected: FAIL — `Cannot find module './treeOps'`

**Step 7: Implement `src/utils/treeOps.js`**

```js
import { nanoid } from 'nanoid'

export const PALETTE = ['#22d3ee', '#f5c842', '#ec4899', '#a78bfa', '#34d399', '#fb923c', '#f87171']

export function makeCondition() {
  return { id: nanoid(), type: 'condition', field: null, operator: '==', value: null }
}

export function makeGroup(children = [], color = '#22d3ee') {
  return { id: nanoid(), type: 'group', connector: 'AND', color, children }
}

export function makeRoot() {
  return { id: 'root', type: 'group', connector: 'AND', color: null, children: [] }
}

export function countGroups(node) {
  if (node.type === 'condition') return 0
  return 1 + node.children.reduce((acc, c) => acc + countGroups(c), 0)
}

export function findNode(root, id, parent = null, index = -1) {
  if (root.id === id) return [root, parent, index]
  if (root.type !== 'group') return null
  for (let i = 0; i < root.children.length; i++) {
    const result = findNode(root.children[i], id, root, i)
    if (result) return result
  }
  return null
}

export function removeNode(root, id) {
  if (root.type !== 'group') return root
  return {
    ...root,
    children: root.children
      .filter(c => c.id !== id)
      .map(c => removeNode(c, id)),
  }
}

export function updateNode(root, id, updates) {
  if (root.id === id) return { ...root, ...updates }
  if (root.type !== 'group') return root
  return {
    ...root,
    children: root.children.map(c => updateNode(c, id, updates)),
  }
}

export function replaceNode(root, id, newNode) {
  if (root.id === id) return newNode
  if (root.type !== 'group') return root
  return {
    ...root,
    children: root.children.map(c => replaceNode(c, id, newNode)),
  }
}

export function insertIntoGroup(root, groupId, node, index) {
  if (root.id === groupId && root.type === 'group') {
    const newChildren = [...root.children]
    newChildren.splice(Math.min(index, newChildren.length), 0, node)
    return { ...root, children: newChildren }
  }
  if (root.type !== 'group') return root
  return {
    ...root,
    children: root.children.map(c => insertIntoGroup(c, groupId, node, index)),
  }
}

// Move nodeId to targetParentId at targetIndex
export function moveNode(root, nodeId, targetParentId, targetIndex) {
  const result = findNode(root, nodeId)
  if (!result) return root
  const [node] = result
  let newRoot = removeNode(root, nodeId)
  newRoot = insertIntoGroup(newRoot, targetParentId, node, targetIndex)
  return newRoot
}
```

**Step 8: Create `src/data/cosmicFields.js`**

```js
export const FIELDS = [
  {
    name: 'StarType',
    valueType: 'predefined',
    options: ['Neutron', 'Pulsar', 'Red Giant', 'White Dwarf', 'Black Hole'],
    operators: ['==', '!='],
  },
  {
    name: 'Galaxy',
    valueType: 'predefined',
    options: ['Milky Way', 'Andromeda', 'Triangulum', 'Sombrero'],
    operators: ['==', '!='],
  },
  {
    name: 'Constellation',
    valueType: 'predefined',
    options: ['Orion', 'Cassiopeia', 'Lyra', 'Cygnus', 'Perseus'],
    operators: ['==', '!='],
  },
  {
    name: 'Mass',
    valueType: 'number',
    operators: ['==', '!=', '>', '<', '>=', '<='],
  },
  {
    name: 'Distance',
    valueType: 'number',
    operators: ['==', '!=', '>', '<', '>=', '<='],
  },
  {
    name: 'Temperature',
    valueType: 'number',
    operators: ['==', '!=', '>', '<', '>=', '<='],
  },
  {
    name: 'Age',
    valueType: 'number',
    operators: ['==', '!=', '>', '<', '>=', '<='],
  },
]

export const FIELD_MAP = Object.fromEntries(FIELDS.map(f => [f.name, f]))
```

**Step 9: Run all tests — verify pass**

```bash
npm test
```
Expected: All tests PASS

**Step 10: Commit**

```bash
git add src/
git commit -m "feat: add treeOps, expression utilities, cosmicFields data, and tests"
```

---

### Task 3: useHistory Hook

**Files:**
- Create: `src/hooks/useHistory.js`
- Create: `src/hooks/useHistory.test.js`

**Step 1: Write failing tests**

Create `src/hooks/useHistory.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHistory } from './useHistory'

describe('useHistory', () => {
  it('returns initial state as present', () => {
    const { result } = renderHook(() => useHistory({ value: 0 }))
    expect(result.current.state).toEqual({ value: 0 })
  })

  it('set() updates present and saves to past', () => {
    const { result } = renderHook(() => useHistory({ value: 0 }))
    act(() => result.current.set({ value: 1 }))
    expect(result.current.state).toEqual({ value: 1 })
    expect(result.current.canUndo).toBe(true)
  })

  it('undo() reverts to previous state', () => {
    const { result } = renderHook(() => useHistory({ value: 0 }))
    act(() => result.current.set({ value: 1 }))
    act(() => result.current.undo())
    expect(result.current.state).toEqual({ value: 0 })
    expect(result.current.canUndo).toBe(false)
  })

  it('redo() re-applies undone state', () => {
    const { result } = renderHook(() => useHistory({ value: 0 }))
    act(() => result.current.set({ value: 1 }))
    act(() => result.current.undo())
    act(() => result.current.redo())
    expect(result.current.state).toEqual({ value: 1 })
  })

  it('new set() clears future', () => {
    const { result } = renderHook(() => useHistory({ value: 0 }))
    act(() => result.current.set({ value: 1 }))
    act(() => result.current.undo())
    act(() => result.current.set({ value: 2 }))
    expect(result.current.canRedo).toBe(false)
    expect(result.current.state).toEqual({ value: 2 })
  })

  it('canUndo is false initially', () => {
    const { result } = renderHook(() => useHistory({}))
    expect(result.current.canUndo).toBe(false)
  })

  it('canRedo is false initially', () => {
    const { result } = renderHook(() => useHistory({}))
    expect(result.current.canRedo).toBe(false)
  })
})
```

**Step 2: Run tests — verify they fail**

```bash
npm test
```
Expected: FAIL — `Cannot find module './useHistory'`

**Step 3: Implement `src/hooks/useHistory.js`**

```js
import { useState, useCallback } from 'react'

const MAX_HISTORY = 50

export function useHistory(initialState) {
  const [history, setHistory] = useState({
    past: [],
    present: initialState,
    future: [],
  })

  const set = useCallback((newPresent) => {
    setHistory(h => ({
      past: [...h.past.slice(-(MAX_HISTORY - 1)), h.present],
      present: newPresent,
      future: [],
    }))
  }, [])

  const undo = useCallback(() => {
    setHistory(h => {
      if (h.past.length === 0) return h
      const previous = h.past[h.past.length - 1]
      return {
        past: h.past.slice(0, -1),
        present: previous,
        future: [h.present, ...h.future],
      }
    })
  }, [])

  const redo = useCallback(() => {
    setHistory(h => {
      if (h.future.length === 0) return h
      const next = h.future[0]
      return {
        past: [...h.past, h.present],
        present: next,
        future: h.future.slice(1),
      }
    })
  }, [])

  return {
    state: history.present,
    set,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  }
}
```

**Step 4: Run tests — verify they all pass**

```bash
npm test
```
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/hooks/
git commit -m "feat: add useHistory hook with undo/redo"
```

---

### Task 4: App Shell & State Management

**Files:**
- Modify: `src/App.jsx` (replace default content entirely)
- Create: `src/App.css`
- Modify: `src/index.css`

**Step 1: Replace `src/index.css` with dark theme base**

```css
*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  font-family: monospace;
  background: #04020a;
  color: rgba(220, 210, 240, 0.95);
  min-height: 100vh;
}

button {
  font-family: monospace;
  cursor: pointer;
}
```

**Step 2: Create `src/App.css`**

```css
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem;
  gap: 1.5rem;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.app-title {
  font-size: 0.65rem;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: rgba(220, 210, 240, 0.4);
  margin: 0;
  font-weight: 400;
}

.app-controls {
  display: flex;
  gap: 0.5rem;
}

.control-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(220, 210, 240, 0.7);
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.control-btn:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.35);
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.control-btn:disabled {
  opacity: 0.25;
  cursor: default;
}

.app-main {
  flex: 1;
  border: 1px dashed rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1.5rem;
  min-height: 200px;
}
```

**Step 3: Replace `src/App.jsx`**

```jsx
import { useEffect, useCallback } from 'react'
import { useHistory } from './hooks/useHistory'
import { makeRoot, makeCondition, makeGroup, updateNode, removeNode, moveNode, replaceNode, findNode, insertIntoGroup, countGroups, PALETTE } from './utils/treeOps'
import Builder from './components/Builder'
import ExpressionOutput from './components/ExpressionOutput'
import './App.css'

export default function App() {
  const { state: tree, set, undo, redo, canUndo, canRedo } = useHistory(makeRoot())

  const nextColor = useCallback(() => {
    const count = countGroups(tree)
    return PALETTE[count % PALETTE.length]
  }, [tree])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (!(e.metaKey || e.ctrlKey)) return
      if (e.key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  const onAddCondition = useCallback((parentId) => {
    const result = findNode(tree, parentId)
    if (!result) return
    const [parent] = result
    set(insertIntoGroup(tree, parentId, makeCondition(), parent.children.length))
  }, [tree, set])

  const onAddGroup = useCallback((parentId) => {
    const result = findNode(tree, parentId)
    if (!result) return
    const [parent] = result
    const group = makeGroup([makeCondition()], nextColor())
    set(insertIntoGroup(tree, parentId, group, parent.children.length))
  }, [tree, set, nextColor])

  const onUpdateCondition = useCallback((id, updates) => {
    set(updateNode(tree, id, updates))
  }, [tree, set])

  const onToggleConnector = useCallback((id) => {
    const result = findNode(tree, id)
    if (!result) return
    const [node] = result
    set(updateNode(tree, id, { connector: node.connector === 'AND' ? 'OR' : 'AND' }))
  }, [tree, set])

  const onRemove = useCallback((id) => {
    set(removeNode(tree, id))
  }, [tree, set])

  const onDragEnd = useCallback(({ active, over }) => {
    if (!over || active.id === over.id) return

    const activeResult = findNode(tree, active.id)
    const overResult = findNode(tree, over.id)
    if (!activeResult || !overResult) return

    const [activeNode, activeParent, activeIndex] = activeResult
    const [overNode, overParent, overIndex] = overResult

    // Prevent dropping a group into itself
    if (activeNode.type === 'group') {
      let check = overResult
      while (check) {
        if (check[0].id === activeNode.id) return
        check = check[1] ? findNode(activeNode, check[0].id) : null
      }
    }

    // Drop condition onto condition → wrap both in a new group
    if (activeNode.type === 'condition' && overNode.type === 'condition' && activeParent?.id !== overParent?.id) {
      const color = nextColor()
      const newGroup = makeGroup([activeNode, overNode], color)
      let newTree = removeNode(tree, active.id)
      newTree = replaceNode(newTree, over.id, newGroup)
      set(newTree)
      return
    }

    // Reorder within same parent
    if (activeParent?.id === overParent?.id) {
      const siblings = [...activeParent.children]
      siblings.splice(activeIndex, 1)
      siblings.splice(overIndex, 0, activeNode)
      set(updateNode(tree, activeParent.id, { children: siblings }))
      return
    }

    // Move to different parent (drop onto a group node → append inside it)
    if (overNode.type === 'group') {
      set(moveNode(tree, active.id, overNode.id, overNode.children.length))
      return
    }

    // Move to same parent as overNode
    if (overParent) {
      set(moveNode(tree, active.id, overParent.id, overIndex))
    }
  }, [tree, set, nextColor])

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">CONDITION_BUILDER</h1>
        <div className="app-controls">
          <button className="control-btn" onClick={undo} disabled={!canUndo} title="Undo (⌘Z)">↩</button>
          <button className="control-btn" onClick={redo} disabled={!canRedo} title="Redo (⌘⇧Z)">↪</button>
        </div>
      </header>

      <main className="app-main">
        <Builder
          tree={tree}
          onAddCondition={onAddCondition}
          onAddGroup={onAddGroup}
          onUpdateCondition={onUpdateCondition}
          onToggleConnector={onToggleConnector}
          onRemove={onRemove}
          onDragEnd={onDragEnd}
        />
      </main>

      <ExpressionOutput tree={tree} />
    </div>
  )
}
```

**Step 4: Create stub files so app doesn't crash**

Create `src/components/Builder.jsx`:
```jsx
export default function Builder({ tree }) {
  return <div>Builder — {tree.children.length} children</div>
}
```

Create `src/components/ExpressionOutput.jsx`:
```jsx
export default function ExpressionOutput({ tree }) {
  return <div>Output</div>
}
```

**Step 5: Verify app runs without errors**

```bash
npm run dev
```
Expected: App loads, shows "CONDITION_BUILDER" header with undo/redo buttons, stub Builder text.

**Step 6: Commit**

```bash
git add src/
git commit -m "feat: App shell with useHistory, state management, keyboard shortcuts"
```

---

### Task 5: Popovers & Pill Components

**Files:**
- Create: `src/components/Popover.jsx`
- Create: `src/components/Popover.css`
- Create: `src/components/ConditionRow.jsx`
- Create: `src/components/ConditionRow.css`

**Step 1: Create `src/components/Popover.css`**

```css
.popover-anchor {
  position: relative;
  display: inline-block;
}

.popover {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 100;
  background: #0d0a1a;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 0.35rem;
  min-width: 140px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.6);
}

.popover-item {
  display: block;
  width: 100%;
  padding: 0.45rem 0.75rem;
  text-align: left;
  background: none;
  border: none;
  border-radius: 5px;
  color: rgba(220, 210, 240, 0.8);
  font-size: 0.8rem;
  font-family: monospace;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.1s ease;
}

.popover-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.popover-item--active {
  color: var(--accent, #22d3ee);
}

.popover-input {
  width: 100%;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 5px;
  padding: 0.4rem 0.6rem;
  color: rgba(220, 210, 240, 0.95);
  font-family: monospace;
  font-size: 0.8rem;
  outline: none;
}

.popover-input:focus {
  border-color: rgba(255,255,255,0.35);
}
```

**Step 2: Create `src/components/Popover.jsx`**

```jsx
import { useEffect, useRef } from 'react'
import './Popover.css'

export default function Popover({ children, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div className="popover" ref={ref}>
      {children}
    </div>
  )
}
```

**Step 3: Create `src/components/ConditionRow.css`**

```css
.condition-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0;
}

.condition-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.04);
  font-size: 0.75rem;
  font-family: monospace;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
  white-space: nowrap;
}

.condition-pill:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.3);
}

.condition-pill--incomplete {
  border-color: rgba(239, 68, 68, 0.5);
  color: rgba(239, 68, 68, 0.9);
  background: rgba(239, 68, 68, 0.07);
}

.condition-pill--incomplete:hover {
  background: rgba(239, 68, 68, 0.12);
}

.condition-pill--operator {
  border-color: rgba(255,255,255,0.1);
  color: rgba(220, 210, 240, 0.5);
  min-width: 36px;
  justify-content: center;
}

.drag-handle {
  color: rgba(255,255,255,0.2);
  cursor: grab;
  font-size: 1rem;
  padding: 0 0.15rem;
  line-height: 1;
  user-select: none;
}

.drag-handle:active { cursor: grabbing; }

.remove-btn {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: none;
  color: rgba(255,255,255,0.15);
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: color 0.15s;
  margin-left: 0.1rem;
}

.remove-btn:hover {
  color: rgba(239, 68, 68, 0.8);
}

.pill-anchor {
  position: relative;
  display: inline-block;
}
```

**Step 4: Create `src/components/ConditionRow.jsx`**

```jsx
import { useState, useCallback } from 'react'
import { FIELDS, FIELD_MAP } from '../data/cosmicFields'
import Popover from './Popover'
import './ConditionRow.css'

function FieldPopover({ current, onSelect, onClose }) {
  return (
    <Popover onClose={onClose}>
      {FIELDS.map(f => (
        <button
          key={f.name}
          className={`popover-item${current === f.name ? ' popover-item--active' : ''}`}
          onClick={() => { onSelect(f.name); onClose() }}
        >
          {f.name}
        </button>
      ))}
    </Popover>
  )
}

function OperatorPopover({ operators, current, onSelect, onClose }) {
  return (
    <Popover onClose={onClose}>
      {operators.map(op => (
        <button
          key={op}
          className={`popover-item${current === op ? ' popover-item--active' : ''}`}
          onClick={() => { onSelect(op); onClose() }}
        >
          {op}
        </button>
      ))}
    </Popover>
  )
}

function ValuePopover({ field, current, onSelect, onClose }) {
  const fieldDef = FIELD_MAP[field]
  if (!fieldDef) return null

  if (fieldDef.valueType === 'predefined') {
    return (
      <Popover onClose={onClose}>
        {fieldDef.options.map(opt => (
          <button
            key={opt}
            className={`popover-item${current === opt ? ' popover-item--active' : ''}`}
            onClick={() => { onSelect(opt); onClose() }}
          >
            {opt}
          </button>
        ))}
      </Popover>
    )
  }

  return (
    <Popover onClose={onClose}>
      <input
        className="popover-input"
        type="number"
        defaultValue={current ?? ''}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') { onSelect(e.target.value); onClose() }
          if (e.key === 'Escape') onClose()
        }}
        onBlur={(e) => { onSelect(e.target.value || null); onClose() }}
      />
    </Popover>
  )
}

export default function ConditionRow({ condition, onUpdate, onRemove, dragHandleProps }) {
  const [open, setOpen] = useState(null) // 'field' | 'operator' | 'value'

  const fieldDef = FIELD_MAP[condition.field]
  const operators = fieldDef?.operators ?? ['==']

  const handleFieldSelect = useCallback((name) => {
    // Reset operator and value when field changes type
    const newFieldDef = FIELD_MAP[name]
    onUpdate({ field: name, operator: newFieldDef.operators[0], value: null })
  }, [onUpdate])

  const fieldIncomplete = !condition.field
  const valueIncomplete = !condition.value

  return (
    <div className="condition-row">
      <span className="drag-handle" {...dragHandleProps}>⠿</span>

      {/* Field pill */}
      <div className="pill-anchor">
        <button
          className={`condition-pill${fieldIncomplete ? ' condition-pill--incomplete' : ''}`}
          onClick={() => setOpen(open === 'field' ? null : 'field')}
        >
          {condition.field ?? 'Field'}
        </button>
        {open === 'field' && (
          <FieldPopover
            current={condition.field}
            onSelect={handleFieldSelect}
            onClose={() => setOpen(null)}
          />
        )}
      </div>

      {/* Operator pill */}
      <div className="pill-anchor">
        <button
          className="condition-pill condition-pill--operator"
          onClick={() => setOpen(open === 'operator' ? null : 'operator')}
          disabled={!condition.field}
        >
          {condition.operator}
        </button>
        {open === 'operator' && fieldDef && (
          <OperatorPopover
            operators={operators}
            current={condition.operator}
            onSelect={(op) => onUpdate({ operator: op })}
            onClose={() => setOpen(null)}
          />
        )}
      </div>

      {/* Value pill */}
      <div className="pill-anchor">
        <button
          className={`condition-pill${valueIncomplete ? ' condition-pill--incomplete' : ''}`}
          onClick={() => condition.field && setOpen(open === 'value' ? null : 'value')}
          disabled={!condition.field}
        >
          {condition.value ?? 'Value'}
        </button>
        {open === 'value' && condition.field && (
          <ValuePopover
            field={condition.field}
            current={condition.value}
            onSelect={(val) => onUpdate({ value: val || null })}
            onClose={() => setOpen(null)}
          />
        )}
      </div>

      <button className="remove-btn" onClick={onRemove} title="Remove">×</button>
    </div>
  )
}
```

**Step 5: Verify in browser**

Temporarily render a test condition in `Builder.jsx` stub:
```jsx
import ConditionRow from './ConditionRow'
export default function Builder() {
  return (
    <ConditionRow
      condition={{ id: 'test', type: 'condition', field: null, operator: '==', value: null }}
      onUpdate={() => {}}
      onRemove={() => {}}
      dragHandleProps={{}}
    />
  )
}
```
Expected: A condition row appears with red "Field" and "Value" pills; clicking Field opens cosmic field list.

**Step 6: Commit**

```bash
git add src/components/
git commit -m "feat: ConditionRow with Field/Operator/Value popovers"
```

---

### Task 6: GroupNode (Recursive)

**Files:**
- Create: `src/components/GroupNode.jsx`
- Create: `src/components/GroupNode.css`

**Step 1: Create `src/components/GroupNode.css`**

```css
.group-node {
  border: 1px solid;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  position: relative;
}

.group-node--root {
  border-color: transparent;
  padding: 0;
}

.group-children {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.group-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.connector-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.03);
  font-size: 0.6rem;
  letter-spacing: 1.5px;
  font-family: monospace;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
  margin: 0.2rem 0;
  align-self: flex-start;
  margin-left: 1.5rem;
}

.connector-badge:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.25);
}

.group-drag-handle {
  position: absolute;
  top: 0.6rem;
  left: -1.25rem;
  color: rgba(255,255,255,0.15);
  cursor: grab;
  font-size: 0.9rem;
  padding: 0.1rem;
  user-select: none;
}

.group-drag-handle:active { cursor: grabbing; }

.add-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(255,255,255,0.05);
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.65rem;
  border-radius: 6px;
  border: 1px dashed rgba(255,255,255,0.12);
  background: none;
  color: rgba(220, 210, 240, 0.35);
  font-size: 0.65rem;
  font-family: monospace;
  letter-spacing: 1px;
  text-transform: uppercase;
  transition: all 0.15s ease;
}

.add-btn:hover {
  color: rgba(220, 210, 240, 0.75);
  border-color: rgba(255,255,255,0.25);
  background: rgba(255,255,255,0.03);
}

.remove-group-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: none;
  color: rgba(255,255,255,0.15);
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: color 0.15s;
}

.remove-group-btn:hover { color: rgba(239, 68, 68, 0.8); }

.group-node--over {
  background: rgba(255, 255, 255, 0.03);
}
```

**Step 2: Create `src/components/GroupNode.jsx`**

```jsx
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import ConditionRow from './ConditionRow'
import './GroupNode.css'

function SortableItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  return (
    <div ref={setNodeRef} style={style}>
      {children({ dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  )
}

export default function GroupNode({ node, isRoot = false, onAddCondition, onAddGroup, onUpdateCondition, onToggleConnector, onRemove }) {
  const childIds = node.children.map(c => c.id)

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: node.id })

  const groupStyle = isRoot ? {} : {
    borderColor: `${node.color}40`,
    boxShadow: isOver ? `0 0 0 1px ${node.color}60` : undefined,
  }

  return (
    <div
      className={`group-node${isRoot ? ' group-node--root' : ''}${isOver ? ' group-node--over' : ''}`}
      style={groupStyle}
      ref={setDropRef}
    >
      {!isRoot && (
        <>
          <button className="remove-group-btn" onClick={() => onRemove(node.id)} title="Remove group">×</button>
        </>
      )}

      <SortableContext items={childIds} strategy={verticalListSortingStrategy}>
        <div className="group-children">
          {node.children.map((child, i) => (
            <div key={child.id}>
              <div className="group-row">
                <SortableItem id={child.id}>
                  {({ dragHandleProps }) =>
                    child.type === 'condition' ? (
                      <ConditionRow
                        condition={child}
                        onUpdate={(updates) => onUpdateCondition(child.id, updates)}
                        onRemove={() => onRemove(child.id)}
                        dragHandleProps={dragHandleProps}
                      />
                    ) : (
                      <GroupNode
                        node={child}
                        isRoot={false}
                        onAddCondition={onAddCondition}
                        onAddGroup={onAddGroup}
                        onUpdateCondition={onUpdateCondition}
                        onToggleConnector={onToggleConnector}
                        onRemove={onRemove}
                      />
                    )
                  }
                </SortableItem>
              </div>

              {i < node.children.length - 1 && (
                <button
                  className="connector-badge"
                  style={{ color: isRoot ? 'rgba(220,210,240,0.4)' : node.color }}
                  onClick={() => onToggleConnector(node.id)}
                >
                  {node.connector}
                </button>
              )}
            </div>
          ))}
        </div>
      </SortableContext>

      <div className="add-row">
        <button className="add-btn" onClick={() => onAddCondition(node.id)}>+ Condition</button>
        <button className="add-btn" onClick={() => onAddGroup(node.id)}>+ Group</button>
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/components/GroupNode.jsx src/components/GroupNode.css
git commit -m "feat: recursive GroupNode with sortable children and connector toggle"
```

---

### Task 7: Builder with @dnd-kit

**Files:**
- Modify: `src/components/Builder.jsx` (replace stub)
- Create: `src/components/Builder.css`

**Step 1: Create `src/components/Builder.css`**

```css
.builder {
  width: 100%;
}

.drag-overlay-item {
  opacity: 0.85;
  transform: scale(1.02);
  cursor: grabbing;
}
```

**Step 2: Replace `src/components/Builder.jsx`**

```jsx
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useState } from 'react'
import { findNode } from '../utils/treeOps'
import GroupNode from './GroupNode'
import ConditionRow from './ConditionRow'
import './Builder.css'

export default function Builder({ tree, onAddCondition, onAddGroup, onUpdateCondition, onToggleConnector, onRemove, onDragEnd }) {
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const activeResult = activeId ? findNode(tree, activeId) : null
  const activeNode = activeResult?.[0]

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active }) => setActiveId(active.id)}
      onDragEnd={(event) => { setActiveId(null); onDragEnd(event) }}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="builder">
        <GroupNode
          node={tree}
          isRoot={true}
          onAddCondition={onAddCondition}
          onAddGroup={onAddGroup}
          onUpdateCondition={onUpdateCondition}
          onToggleConnector={onToggleConnector}
          onRemove={onRemove}
        />
      </div>

      <DragOverlay>
        {activeNode?.type === 'condition' && (
          <div className="drag-overlay-item">
            <ConditionRow
              condition={activeNode}
              onUpdate={() => {}}
              onRemove={() => {}}
              dragHandleProps={{}}
            />
          </div>
        )}
        {activeNode?.type === 'group' && (
          <div className="drag-overlay-item" style={{
            border: `1px solid ${activeNode.color}40`,
            borderRadius: 10,
            padding: '0.5rem 1rem',
            color: activeNode.color,
            fontSize: '0.75rem',
            fontFamily: 'monospace',
          }}>
            GROUP ({activeNode.children.length})
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
```

**Step 3: Verify in browser**

```bash
npm run dev
```
Expected:
- "CONDITION_BUILDER" header with undo/redo
- "+ Condition" and "+ Group" buttons visible
- Clicking "+ Condition" adds a red pill row
- Clicking Field pill opens cosmic dropdown
- Selecting a field enables Operator and Value pills
- Dragging conditions works (drag handle `⠿`)
- Undo/redo works

**Step 4: Commit**

```bash
git add src/components/Builder.jsx src/components/Builder.css
git commit -m "feat: Builder with DndContext and DragOverlay"
```

---

### Task 8: ExpressionOutput

**Files:**
- Modify: `src/components/ExpressionOutput.jsx` (replace stub)
- Create: `src/components/ExpressionOutput.css`

**Step 1: Create `src/components/ExpressionOutput.css`**

```css
.expression-output {
  border-top: 1px solid rgba(255,255,255,0.06);
  padding: 1.25rem 0 0;
}

.expression-label {
  font-size: 0.6rem;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: rgba(220, 210, 240, 0.3);
  margin-bottom: 0.75rem;
}

.expression-block {
  background: #000;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  font-family: monospace;
  font-size: 0.85rem;
  line-height: 1.8;
  min-height: 52px;
  word-break: break-word;
}

.expression-empty {
  color: rgba(220, 210, 240, 0.2);
  font-style: italic;
}

.expr-connector {
  color: rgba(220, 210, 240, 0.4);
}

.expr-incomplete {
  color: rgba(239, 68, 68, 0.8);
}

.expr-paren {
  color: rgba(220, 210, 240, 0.25);
}
```

**Step 2: Replace `src/components/ExpressionOutput.jsx`**

```jsx
import './ExpressionOutput.css'

function renderNode(node, isRoot = false) {
  if (node.type === 'condition') {
    const field = node.field
      ? <span>{node.field}</span>
      : <span className="expr-incomplete">?</span>
    const value = node.value
      ? <span>{node.value}</span>
      : <span className="expr-incomplete">?</span>
    return <>{field} <span className="expr-connector">{node.operator}</span> {value}</>
  }

  // group
  if (!node.children || node.children.length === 0) {
    return isRoot ? null : <><span className="expr-paren">(</span><span className="expr-paren">)</span></>
  }

  const parts = node.children.map((child, i) => (
    <span key={child.id}>
      {renderNode(child)}
      {i < node.children.length - 1 && (
        <span className="expr-connector"> {node.connector} </span>
      )}
    </span>
  ))

  if (isRoot) return <>{parts}</>

  return (
    <>
      <span className="expr-paren">(</span>
      <span style={{ color: node.color }}>{parts}</span>
      <span className="expr-paren">)</span>
    </>
  )
}

export default function ExpressionOutput({ tree }) {
  const content = renderNode(tree, true)
  const isEmpty = !tree.children || tree.children.length === 0

  return (
    <div className="expression-output">
      <div className="expression-label">Expression output</div>
      <div className="expression-block">
        {isEmpty
          ? <span className="expression-empty">Add conditions to build an expression...</span>
          : content
        }
      </div>
    </div>
  )
}
```

**Step 3: Verify in browser**

Expected:
- Expression output section appears below the builder
- Adding conditions shows `? == ?` in red
- Selecting values updates expression in real time
- Group content appears in the group's assigned color
- Wrapped groups show colored parens

**Step 4: Commit**

```bash
git add src/components/ExpressionOutput.jsx src/components/ExpressionOutput.css
git commit -m "feat: ExpressionOutput with colored recursive rendering"
```

---

### Task 9: Polish & Dark Theme

**Files:**
- Modify: `src/App.css`
- Modify: `src/index.css`
- Delete: `src/assets/react.svg`
- Delete: `public/vite.svg`

**Step 1: Update `index.css` for full dark theme**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  color-scheme: dark;
}

body {
  font-family: monospace;
  background: #04020a;
  color: rgba(220, 210, 240, 0.95);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

button {
  font-family: monospace;
  cursor: pointer;
}

::selection {
  background: rgba(34, 211, 238, 0.25);
}
```

**Step 2: Finalize `src/App.css`**

Add a page subtitle and refine spacing:
```css
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem;
  gap: 1.5rem;
}

.app-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.app-header-text {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.app-title {
  font-size: 0.65rem;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: rgba(220, 210, 240, 0.4);
  margin: 0;
  font-weight: 400;
}

.app-subtitle {
  font-size: 0.6rem;
  color: rgba(220, 210, 240, 1);
  letter-spacing: 0.5px;
}

.app-controls {
  display: flex;
  gap: 0.5rem;
}

.control-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(220, 210, 240, 0.6);
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.control-btn:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.3);
  color: #fff;
  background: rgba(255, 255, 255, 0.07);
}

.control-btn:disabled {
  opacity: 0.2;
  cursor: default;
}

.app-main {
  flex: 1;
  border: 1px dashed rgba(255, 255, 255, 0.07);
  border-radius: 12px;
  padding: 1.5rem;
  min-height: 180px;
}
```

**Step 3: Update `App.jsx` header to include subtitle**

In the header section replace:
```jsx
<h1 className="app-title">CONDITION_BUILDER</h1>
```
with:
```jsx
<div className="app-header-text">
  <h1 className="app-title">CONDITION_BUILDER</h1>
  <p className="app-subtitle">Add conditions and drag them to form groups.</p>
</div>
```

**Step 4: Update `index.html` title**

In `index.html` change:
```html
<title>Vite + React</title>
```
to:
```html
<title>Condition Builder</title>
```

**Step 5: Delete default Vite assets**

```bash
rm -f src/assets/react.svg public/vite.svg src/App.css.bak 2>/dev/null; true
```

**Step 6: Verify full app in browser**

Expected final state:
- Dark void background
- Header: "CONDITION_BUILDER" + subtitle + undo/redo circles
- Builder canvas with dashed border
- "+ Condition" adds a row with red Field/Value pills
- Clicking Field → cosmic dropdown → selecting changes pill text
- Clicking Operator → operator list
- Clicking Value → predefined list OR number input
- Complete conditions render normally; incomplete = red
- "+ Group" adds a colored nested group
- Dragging conditions reorders them; dragging onto another condition groups them
- Connector badges (AND/OR) toggle on click
- Expression output updates live with group colors
- Cmd+Z / Cmd+Shift+Z undo/redo

**Step 7: Run all tests**

```bash
npm test
```
Expected: All tests PASS

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: polish dark theme, subtitle, clean up default assets"
```

---

### Task 10: GitHub Pages Deploy

**Files:**
- Already configured: `vite.config.js` base = `/better-condition-builder/`
- Already installed: `gh-pages`

**Step 1: Deploy**

```bash
npm run deploy
```
Expected: Build completes, `gh-pages` branch pushed to remote, GitHub Pages serves at `https://nyarlat-hotep.github.io/better-condition-builder/`

**Step 2: Verify deployed URL**

Open `https://nyarlat-hotep.github.io/better-condition-builder/` in browser.
Expected: App loads, all functionality works.

**Step 3: Commit deploy confirmation**

No additional commit needed — `gh-pages` manages the `gh-pages` branch separately.

---

### Task 11: Portfolio Card Integration

> **Switch repos:** This task modifies the **portfolio** repo at `~/Desktop/portfolio`.

**Files:**
- Modify: `src/components/Pages/Experiments.jsx`

**Step 1: Add the condition builder card to the experiments array**

In `src/components/Pages/Experiments.jsx`, find the `experiments` array and add a new entry:

```js
const experiments = [
  {
    title: 'VISUAL_ARCHIVE',
    description: 'Fragments of creation. Images pulled from the spaces between projects. Handle with care.',
    tags: ['Gallery', 'Art'],
    link: null,
    status: 'ACTIVE',
    action: () => setGalleryOpen(true)
  },
  {
    title: 'CONDITION_BUILDER',
    description: 'Visual logic builder. Drag conditions into groups, toggle AND/OR, watch the expression form.',
    tags: ['Tool', 'Logic'],
    link: 'https://nyarlat-hotep.github.io/better-condition-builder/',
    status: 'ACTIVE',
    action: null,
  },
]
```

**Step 2: Verify card renders**

```bash
npm run dev
```
Open the Experiments overlay. Expected: second card "CONDITION_BUILDER" appears with an external link icon, clicking the card (or the external link icon) opens the deployed app in a new tab.

**Step 3: Commit in portfolio repo**

```bash
git add src/components/Pages/Experiments.jsx
git commit -m "feat: add Condition Builder card to Experiments page"
```

---

## Verification Checklist

After all tasks complete, confirm:

- [ ] `npm test` passes all tests in `better-condition-builder`
- [ ] Dev server runs cleanly with no console errors
- [ ] Adding conditions and groups works
- [ ] Clicking Field → cosmic field dropdown → updates pill
- [ ] Clicking Operator → filtered operator list
- [ ] Clicking Value → predefined list OR number input based on field type
- [ ] Incomplete conditions (null field or value) show red pills
- [ ] Connector badge toggles AND ↔ OR on click
- [ ] Drag condition onto condition → creates a new colored group
- [ ] Drag within group → reorders
- [ ] Undo/redo via buttons and Cmd+Z / Cmd+Shift+Z
- [ ] Expression output reflects tree state with group colors
- [ ] Deployed to GitHub Pages and accessible
- [ ] Portfolio Experiments card links to deployed URL
