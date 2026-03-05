# Better Condition Builder — Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create the implementation plan from this design.

**Goal:** A standalone visual condition builder where users drag conditions into nested groups, toggle AND/OR connectors, and watch a colored expression build in real time.

**Deployment:** Standalone React + Vite app in its own repo (`https://github.com/Nyarlat-hotep/better-condition-builder.git`), linked from the portfolio's Experiments page as an external card.

---

## Data Model

The builder state is a single recursive tree. Every node is one of two types:

```js
// Condition — one row
{ id, type: 'condition', field: string|null, operator: string, value: string|null }

// Group — wraps children; connector applies BETWEEN them
{ id, type: 'group', connector: 'AND'|'OR', color: string, children: Node[] }
```

- The root is always a `group`
- `field: null` or `value: null` = incomplete → renders red
- Nesting is unlimited — groups can contain conditions or other groups
- Each new group is auto-assigned a color from the palette

### Group Color Palette
```js
['#22d3ee', '#f5c842', '#ec4899', '#a78bfa', '#34d399', '#fb923c', '#f87171']
```
Colors cycle and are assigned in order of group creation.

---

## Cosmic Fields (Fake Data)

| Field | Value Type | Options |
|---|---|---|
| `StarType` | Predefined | Neutron, Pulsar, Red Giant, White Dwarf, Black Hole |
| `Galaxy` | Predefined | Milky Way, Andromeda, Triangulum, Sombrero |
| `Constellation` | Predefined | Orion, Cassiopeia, Lyra, Cygnus, Perseus |
| `Mass` | Number input | (solar masses) |
| `Distance` | Number input | (light years) |
| `Temperature` | Number input | (Kelvin) |
| `Age` | Number input | (billion years) |

**Operators by type:**
- Predefined fields: `==`, `!=`
- Numeric fields: `==`, `!=`, `>`, `<`, `>=`, `<=`

---

## UI Layout

```
┌─────────────────────────────────────────────┐
│  Better Condition Builder          [↩] [↪]  │  ← header + undo/redo
├─────────────────────────────────────────────┤
│                                             │
│  ┌ group (cyan) ───────────────────────┐   │
│  │ ⠿  Field == Value  AND  Field == V  │   │
│  │              [+ Add condition]       │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  AND   ← clickable connector badge         │
│                                             │
│  ⠿  Field == Value          [+]            │
│                                             │
│  [+ Add condition]                          │
│                                             │
├─────────────────────────────────────────────┤
│  Expression output                          │
│  (cyan)(? == ? AND Galaxy == Andromeda)     │
│  AND ? == ?                                 │
└─────────────────────────────────────────────┘
```

**Theme:** Dark, matching portfolio aesthetic (`rgba(4, 2, 10)` background, monospace accents, glowing group borders).

---

## Components

```
src/
  components/
    Builder.jsx          DndContext wrapper, renders root GroupNode
    GroupNode.jsx        Recursive — colored border, connector badges, children, add button
    ConditionRow.jsx     Drag handle + Field pill + Operator pill + Value pill
    FieldPopover.jsx     Cosmic field picker (predefined dropdown)
    OperatorPopover.jsx  Operator picker (filtered by field type)
    ValuePopover.jsx     Predefined list OR number input depending on field
    ExpressionOutput.jsx Read-only colored expression string
  data/
    cosmicFields.js      Field definitions, types, options, valid operators
  hooks/
    useHistory.js        Undo/redo stack
  utils/
    expression.js        Recursive tree → colored expression string
    colors.js            Color palette + assignment logic
    ids.js               nanoid wrapper for unique node IDs
  App.jsx                Root — owns state + history, passes dispatch down
  main.jsx
  index.css              Global dark theme
```

---

## Drag & Drop

Uses `@dnd-kit/core` + `@dnd-kit/sortable`.

- Every `ConditionRow` and `GroupNode` has a drag handle (`⠿`)
- Dragging shows a drop indicator line between siblings
- Dropping onto a group nests the dragged node inside it
- Dropping between siblings reorders
- Drag state is purely visual — tree state only updates on drop

---

## State Management & Undo/Redo

All state lives in `App.jsx`. Every mutation produces a new immutable tree snapshot.

**History shape:**
```js
{ past: Tree[], present: Tree, future: Tree[] }
```

- Any change: push `present` → `past`, set new tree, clear `future`
- Undo: pop `past` → `present`, push old present → `future`
- Redo: pop `future` → `present`, push old present → `past`
- Capped at 50 entries
- Keyboard: `Cmd+Z` undo, `Cmd+Shift+Z` redo

---

## Expression Output

Recursively walks the tree:
- Groups: wrap in `(...)` with a colored `<span>` matching the group's color
- Connector badges between siblings rendered as plain text ` AND ` / ` OR `
- Incomplete field/value renders as `?`
- Root-level connector between root children rendered inline

Example: `(? == ? AND Galaxy == Andromeda) AND ? == ?`

---

## Portfolio Integration

One new card added to the `experiments` array in `src/components/Pages/Experiments.jsx`:

```js
{
  title: 'CONDITION_BUILDER',
  description: 'Visual logic builder. Drag conditions into groups, toggle AND/OR, watch the expression form.',
  tags: ['Tool', 'Logic'],
  link: 'https://nyarlat-hotep.github.io/better-condition-builder',
  status: 'ACTIVE'
}
```

No shared code between repos. The builder is entirely self-contained.

---

## Repo Setup

- Init: `npm create vite@latest better-condition-builder -- --template react`
- Dependencies: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `nanoid`
- Deploy: GitHub Pages via `gh-pages` package
- Remote: `https://github.com/Nyarlat-hotep/better-condition-builder.git`
