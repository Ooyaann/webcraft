import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const createUniqueId = (type) => `${type}_${Math.random().toString(36).substring(2, 9)}`;

const getBlockDefaults = (type) => {
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

const isDescendant = (nodes, parentId, childId) => {
  const findNode = (currentNodes) => {
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
  
  const parentNode = findNode(nodes, parentId);
  if (!parentNode || !parentNode.children) return false;
  
  const checkChildren = (children) => {
    for (const child of children) {
      if (child.id === childId) return true;
      if (child.children && checkChildren(child.children)) return true;
    }
    return false;
  };
  
  return checkChildren(parentNode.children);
};

const findAndExtractNode = (nodes, targetId) => {
  let extractedNode = null;
  
  const recurse = (currentNodes) => {
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

const insertNode = (nodes, nodeToInsert, targetId, relation) => {
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

export const useStore = create(
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

  // === ACTIONS ===
  setUser: (user) => set({ user }),
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
    attemptHistory: [],
    attemptCount: 0,
    ctJourneyAnswers: state.ctJourneyAnswers,
    ctPreScore: state.ctPreScore
  })),

  // Add block to AST
  addBlock: (type, parentId = 'body-root') => {
    const defaults = getBlockDefaults(type);
    const newBlock = {
      id: createUniqueId(type),
      type,
      ...defaults
    };

    const addToChildren = (nodes) => {
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
      selectedContainerId: newBlock.children !== undefined ? newBlock.id : state.selectedContainerId
    }));
  },

  // Remove block from AST
  removeBlock: (id) => {
    if (id === 'body-root') return; // Cannot delete body root

    const removeFromNodes = (nodes) => {
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
        selectedContainerId: state.selectedContainerId === id ? 'body-root' : state.selectedContainerId
      };
    });
  },

  // Update block content
  updateContent: (id, content) => {
    const updateInNodes = (nodes) => {
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
      ast: updateInNodes(state.ast)
    }));
  },

  // Update block properties (e.g. img source)
  updateProperty: (id, key, value) => {
    const updateInNodes = (nodes) => {
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
      ast: updateInNodes(state.ast)
    }));
  },

  setSelectedContainerId: (id) => set({ selectedContainerId: id }),

  recordAttempt: (errors) => {
    const snapshot = {
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

  moveOrAddBlock: (source, targetId, relation) => {
    let blockToInsert = null;
    let currentAst = get().ast;

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
    set({
      ast: updatedAst,
      selectedContainerId: blockToInsert.children !== undefined 
        ? blockToInsert.id 
        : get().selectedContainerId
    });
  }
    }),
    {
      name: 'webcraft-storage',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
