import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Store global Zustand (dari useStore.js, kini TypeScript).

export type BlockNode = {
  id: string;
  type: string;
  content?: string;
  children?: BlockNode[];
  [key: string]: unknown;
};

export type AttemptSnapshot = {
  ast: BlockNode[];
  timestamp: number;
  errors: unknown[];
  attempt: number;
};

export type SessionUser = {
  id: string;
  name: string;
  role: string; // 'siswa' | 'guru' | 'admin'
  email: string;
} | null;

export type CtJourneyAnswers = {
  decomposition: unknown;
  abstraction: unknown;
  pattern: unknown;
  algorithm: unknown;
};

type MoveSource =
  | { type: 'new'; blockType: string }
  | { type: 'existing'; id: string };

type InsertRelation = 'before' | 'after' | 'append';

type WebcraftState = {
  // === WORKSPACE STATE ===
  ast: BlockNode[];
  selectedContainerId: string;
  astPast: BlockNode[][];
  astFuture: BlockNode[][];
  attemptHistory: AttemptSnapshot[];
  attemptCount: number;
  activeLevel: string | null;
  activeLevelConfig: Record<string, unknown> | null;

  // === CT JOURNEY STATE ===
  ctJourneyAnswers: CtJourneyAnswers;
  ctPreScore: Record<string, number> | null;

  // === SESSION STATE ===
  user: SessionUser;
  activeRoom: Record<string, unknown> | null;
  // true setelah AppShell selesai probe /auth/me (cookie) — dipakai guard
  // untuk membedakan "belum dicek" dari "benar-benar tamu".
  authChecked: boolean;

  // === ACTIONS ===
  setUser: (user: SessionUser) => void;
  setAuthChecked: (v: boolean) => void;
  setActiveRoom: (room: Record<string, unknown> | null) => void;
  setActiveLevel: (
    levelId: string | null,
    config: Record<string, unknown> | null,
  ) => void;
  logout: () => void;
  resetWorkspace: () => void;
  addBlock: (type: string, parentId?: string) => void;
  removeBlock: (id: string) => void;
  updateContent: (id: string, content: string) => void;
  updateProperty: (id: string, key: string, value: unknown) => void;
  setSelectedContainerId: (id: string) => void;
  undo: () => void;
  redo: () => void;
  recordAttempt: (errors: unknown[]) => void;
  setCtJourneyAnswers: (step: keyof CtJourneyAnswers, answers: unknown) => void;
  setCtPreScore: (score: Record<string, number> | null) => void;
  resetCtJourney: () => void;
  moveOrAddBlock: (
    source: MoveSource,
    targetId: string,
    relation: InsertRelation,
  ) => void;
  moveBlockUpDown: (id: string, direction: 'up' | 'down') => void;
};

const createUniqueId = (type: string) =>
  `${type}_${Math.random().toString(36).substring(2, 9)}`;

// Max number of AST snapshots kept for undo/redo.
const HISTORY_LIMIT = 50;
const deepCloneAst = (ast: BlockNode[]): BlockNode[] => JSON.parse(JSON.stringify(ast));

const getBlockDefaults = (type: string): { content: string; children?: BlockNode[] } => {
  const containers = ['body', 'div', 'ul', 'ol', 'nav', 'header', 'footer', 'section', 'article', 'main', 'aside', 'form', 'table', 'tr', 'thead', 'tbody', 'a', 'span', 'button', 'li'];

  let content = '';
  if (type === 'img') content = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300';
  else if (type.match(/^h[1-6]$/)) content = 'Judul Baru';
  else if (['p', 'span', 'a', 'label', 'th', 'td', 'caption', 'strong', 'em', 'b', 'i', 'mark', 'small'].includes(type)) content = 'Teks baru di sini.';
  else if (type === 'button') content = 'Klik Aku';
  else if (type === 'li') content = 'Item list';
  else if (type === 'style') content = 'body { background-color: #ffffff; }';
  else if (type === 'input') content = 'Teks Placeholder';
  else if (type === 'textarea') content = 'Teks Area';

  return {
    content,
    children: containers.includes(type) ? [] : undefined
  };
};

const isDescendant = (nodes: BlockNode[], parentId: string, childId: string): boolean => {
  const findNode = (currentNodes: BlockNode[]): BlockNode | null => {
    for (const node of currentNodes) {
      if (node.id === parentId) {
        return node;
      }
      if (node.children) {
        const found = findNode(node.children);
        if (found) return found;
      }
    }
    return null;
  };

  const parentNode = findNode(nodes);
  if (!parentNode || !parentNode.children) return false;

  const checkChildren = (children: BlockNode[]): boolean => {
    for (const child of children) {
      if (child.id === childId) return true;
      if (child.children && checkChildren(child.children)) return true;
    }
    return false;
  };

  return checkChildren(parentNode.children);
};

const findAndExtractNode = (
  nodes: BlockNode[],
  targetId: string,
): { updatedNodes: BlockNode[]; extractedNode: BlockNode | null } => {
  let extractedNode: BlockNode | null = null;

  const recurse = (currentNodes: BlockNode[]): BlockNode[] => {
    const index = currentNodes.findIndex(n => n.id === targetId);
    if (index !== -1) {
      extractedNode = currentNodes[index];
      return currentNodes.filter((_, i) => i !== index);
    }

    return currentNodes.map(node => {
      if (node.children) {
        return {
          ...node,
          children: recurse(node.children)
        };
      }
      return node;
    });
  };

  const updatedNodes = recurse(nodes);
  return { updatedNodes, extractedNode };
};

const insertNode = (
  nodes: BlockNode[],
  nodeToInsert: BlockNode,
  targetId: string,
  relation: InsertRelation,
): BlockNode[] => {
  return nodes.map(node => {
    if (relation === 'append' && node.id === targetId) {
      return {
        ...node,
        children: [...(node.children || []), nodeToInsert]
      };
    }

    if (node.children) {
      const siblingIndex = node.children.findIndex(c => c.id === targetId);
      if (siblingIndex !== -1) {
        const newChildren = [...node.children];
        if (relation === 'before') {
          newChildren.splice(siblingIndex, 0, nodeToInsert);
        } else if (relation === 'after') {
          newChildren.splice(siblingIndex + 1, 0, nodeToInsert);
        } else if (relation === 'append') {
          newChildren.push(nodeToInsert);
        }
        return {
          ...node,
          children: newChildren
        };
      }

      return {
        ...node,
        children: insertNode(node.children, nodeToInsert, targetId, relation)
      };
    }

    return node;
  });
};

export const useStore = create<WebcraftState>()(
  persist(
    (set, get) => ({
      // === WORKSPACE STATE ===
      ast: [
        {
          id: 'body-root',
          type: 'body',
          content: '',
          children: []
        }
      ],
      selectedContainerId: 'body-root',
      // Undo/redo stacks of AST snapshots (structural edits). Kept in-memory only.
      astPast: [],
      astFuture: [],
      attemptHistory: [], // [{ast_snapshot, timestamp, errors, attempt}]
      attemptCount: 0,
      activeLevel: null,
      activeLevelConfig: null, // {id, judul, misi, validator_rules, cbl_engage}

      // === CT JOURNEY STATE ===
      ctJourneyAnswers: {
        decomposition: [],
        abstraction: [],
        pattern: [],
        algorithm: []
      },
      ctPreScore: null,

      // === SESSION STATE ===
      user: null, // {id, name, role: 'siswa'|'guru', email}
      activeRoom: null, // {id, name, code}
      authChecked: false,

      // === ACTIONS ===
      setUser: (user) => set({ user }),
      setAuthChecked: (v) => set({ authChecked: v }),
      setActiveRoom: (room) => set({ activeRoom: room }),
      setActiveLevel: (levelId, config) => set({ activeLevel: levelId, activeLevelConfig: config }),
      logout: () => set({
        user: null,
        activeRoom: null,
        ctPreScore: null,
        ast: [
          { id: 'body-root', type: 'body', children: [] }
        ],
        selectedContainerId: 'body-root',
        astPast: [],
        astFuture: [],
        attemptHistory: [],
        attemptCount: 0,
        ctJourneyAnswers: { decomposition: [], abstraction: [], pattern: [], algorithm: [] },
        activeLevel: null,
        activeLevelConfig: null
      }),
      // Reset only the coding surface (AST + attempts). CT Journey answers & pre-score
      // are produced in the Investigate phase BEFORE the workspace, so they are preserved.
      resetWorkspace: () => set((state) => ({
        ast: [
          { id: 'body-root', type: 'body', children: [] },
          { id: 'style-root', type: 'style', content: 'body {\n  background-color: #ffffff;\n}' }
        ],
        selectedContainerId: 'body-root',
        astPast: [],
        astFuture: [],
        attemptHistory: [],
        attemptCount: 0,
        ctJourneyAnswers: state.ctJourneyAnswers,
        ctPreScore: state.ctPreScore
      })),

      // Add block to AST
      addBlock: (type, parentId = 'body-root') => {
        const defaults = getBlockDefaults(type);
        const newBlock: BlockNode = {
          id: createUniqueId(type),
          type,
          ...defaults
        };

        const addToChildren = (nodes: BlockNode[]): BlockNode[] => {
          return nodes.map(node => {
            if (node.id === parentId) {
              return {
                ...node,
                children: [...(node.children || []), newBlock]
              };
            }
            if (node.children) {
              return {
                ...node,
                children: addToChildren(node.children)
              };
            }
            return node;
          });
        };

        set(state => ({
          ast: addToChildren(state.ast),
          astPast: [...state.astPast, deepCloneAst(state.ast)].slice(-HISTORY_LIMIT),
          astFuture: [],
          selectedContainerId: newBlock.children !== undefined ? newBlock.id : state.selectedContainerId
        }));
      },

      // Remove block from AST
      removeBlock: (id) => {
        if (id === 'body-root') return; // Cannot delete body root

        const removeFromNodes = (nodes: BlockNode[]): BlockNode[] => {
          return nodes
            .filter(node => node.id !== id)
            .map(node => {
              if (node.children) {
                return {
                  ...node,
                  children: removeFromNodes(node.children)
                };
              }
              return node;
            });
        };

        set(state => {
          const updatedAst = removeFromNodes(state.ast);
          return {
            ast: updatedAst,
            astPast: [...state.astPast, deepCloneAst(state.ast)].slice(-HISTORY_LIMIT),
            astFuture: [],
            selectedContainerId: state.selectedContainerId === id ? 'body-root' : state.selectedContainerId
          };
        });
      },

      // Update block content
      updateContent: (id, content) => {
        const updateInNodes = (nodes: BlockNode[]): BlockNode[] => {
          return nodes.map(node => {
            if (node.id === id) {
              return { ...node, content };
            }
            if (node.children) {
              return {
                ...node,
                children: updateInNodes(node.children)
              };
            }
            return node;
          });
        };

        set(state => ({
          ast: updateInNodes(state.ast),
          astPast: [...state.astPast, deepCloneAst(state.ast)].slice(-HISTORY_LIMIT),
          astFuture: [],
        }));
      },

      // Update block properties (e.g. img source)
      updateProperty: (id, key, value) => {
        const updateInNodes = (nodes: BlockNode[]): BlockNode[] => {
          return nodes.map(node => {
            if (node.id === id) {
              return { ...node, [key]: value };
            }
            if (node.children) {
              return {
                ...node,
                children: updateInNodes(node.children)
              };
            }
            return node;
          });
        };

        set(state => ({
          ast: updateInNodes(state.ast),
          astPast: [...state.astPast, deepCloneAst(state.ast)].slice(-HISTORY_LIMIT),
          astFuture: [],
        }));
      },

      setSelectedContainerId: (id) => set({ selectedContainerId: id }),

      // Undo the last structural AST change.
      undo: () => set(state => {
        if (state.astPast.length === 0) return {};
        const previous = state.astPast[state.astPast.length - 1];
        return {
          ast: previous,
          astPast: state.astPast.slice(0, -1),
          astFuture: [deepCloneAst(state.ast), ...state.astFuture].slice(0, HISTORY_LIMIT),
        };
      }),

      // Redo a previously undone change.
      redo: () => set(state => {
        if (state.astFuture.length === 0) return {};
        const next = state.astFuture[0];
        return {
          ast: next,
          astPast: [...state.astPast, deepCloneAst(state.ast)].slice(-HISTORY_LIMIT),
          astFuture: state.astFuture.slice(1),
        };
      }),

      recordAttempt: (errors) => {
        const snapshot: AttemptSnapshot = {
          ast: JSON.parse(JSON.stringify(get().ast)),
          timestamp: Date.now(),
          errors,
          attempt: get().attemptCount + 1
        };
        set(state => ({
          attemptHistory: [...state.attemptHistory, snapshot],
          attemptCount: state.attemptCount + 1
        }));
      },

      setCtJourneyAnswers: (step, answers) => set(state => ({
        ctJourneyAnswers: {
          ...state.ctJourneyAnswers,
          [step]: answers
        }
      })),

      setCtPreScore: (score) => set({ ctPreScore: score }),

      // Analisis CT bersifat per-misi: kosongkan saat berpindah ke tugas lain
      // supaya fase Action misi baru kembali terkunci sampai CT-nya dikerjakan.
      resetCtJourney: () => set({
        ctPreScore: null,
        ctJourneyAnswers: { decomposition: [], abstraction: [], pattern: [], algorithm: [] },
      }),

      moveOrAddBlock: (source, targetId, relation) => {
        let blockToInsert: BlockNode | null = null;
        const originalAst = get().ast;
        let currentAst = originalAst;

        if (source.type === 'new') {
          const type = source.blockType;
          if (type === 'body' && currentAst.some(n => n.type === 'body')) {
            return;
          }
          const defaults = getBlockDefaults(type);
          blockToInsert = {
            id: createUniqueId(type),
            type,
            ...defaults
          };
        } else if (source.type === 'existing') {
          const draggedId = source.id;
          if (draggedId === 'body-root') return;
          if (draggedId === targetId) return;
          if (isDescendant(currentAst, draggedId, targetId)) return;

          const { updatedNodes, extractedNode } = findAndExtractNode(currentAst, draggedId);
          if (!extractedNode) return;
          currentAst = updatedNodes;
          blockToInsert = extractedNode;
        }

        if (!blockToInsert) return;

        const updatedAst = insertNode(currentAst, blockToInsert, targetId, relation);
        set(state => ({
          ast: updatedAst,
          astPast: [...state.astPast, deepCloneAst(originalAst)].slice(-HISTORY_LIMIT),
          astFuture: [],
          selectedContainerId: blockToInsert.children !== undefined
            ? blockToInsert.id
            : get().selectedContainerId
        }));
      },
      moveBlockUpDown: (id, direction) => {
        if (id === 'body-root') return;
        const originalAst = get().ast;

        const swapInNodes = (nodes: BlockNode[]): { updated: BlockNode[]; swapped: boolean } => {
          const index = nodes.findIndex(n => n.id === id);
          if (index !== -1) {
            const newNodes = [...nodes];
            if (direction === 'up' && index > 0) {
              const temp = newNodes[index];
              newNodes[index] = newNodes[index - 1];
              newNodes[index - 1] = temp;
              return { updated: newNodes, swapped: true };
            } else if (direction === 'down' && index < newNodes.length - 1) {
              const temp = newNodes[index];
              newNodes[index] = newNodes[index + 1];
              newNodes[index + 1] = temp;
              return { updated: newNodes, swapped: true };
            }
            return { updated: nodes, swapped: false };
          }

          let swapped = false;
          const updatedNodes = nodes.map(node => {
            if (node.children && !swapped) {
              const res = swapInNodes(node.children);
              if (res.swapped) {
                swapped = true;
                return { ...node, children: res.updated };
              }
            }
            return node;
          });

          return { updated: updatedNodes, swapped };
        };

        const { updated, swapped } = swapInNodes(originalAst);
        if (swapped) {
          set(state => ({
            ast: updated,
            astPast: [...state.astPast, deepCloneAst(originalAst)].slice(-HISTORY_LIMIT),
            astFuture: []
          }));
        }
      }
    }),
    {
      name: 'webcraft-storage',
      storage: createJSONStorage(() => sessionStorage),
      // Persist only lightweight, resume-worthy state. attemptHistory holds a
      // full deep-copied AST snapshot per attempt and can bloat storage to
      // hundreds of KB, so it stays in-memory only; selectedContainerId is
      // transient UI state. attemptCount (a small int) is kept.
      partialize: (state) => ({
        ast: state.ast,
        ctJourneyAnswers: state.ctJourneyAnswers,
        ctPreScore: state.ctPreScore,
        activeLevel: state.activeLevel,
        activeLevelConfig: state.activeLevelConfig,
        user: state.user,
        activeRoom: state.activeRoom,
        attemptCount: state.attemptCount,
      }),
    }
  )
);
