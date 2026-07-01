export const CONTAINER_TAGS = ['body', 'div', 'ul'];

// Helper to escape HTML characters
export const escapeHTML = (text) => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Escape a value for safe use inside a double-quoted HTML attribute.
const escapeAttr = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

// Allow only safe image URL schemes; block javascript:, vbscript:, etc.
// (XSS hardening for AST content rendered into the sandboxed preview.)
const sanitizeUrl = (url) => {
  const value = String(url ?? '').trim();
  const scheme = value.match(/^([a-z][a-z0-9+.\-]*):/i);
  if (!scheme) return value; // relative path / anchor — safe, no scheme
  const name = scheme[1].toLowerCase();
  if (name === 'http' || name === 'https') return value;
  if (/^data:image\//i.test(value)) return value;
  return ''; // unknown/dangerous scheme — drop it
};

// Neutralize any attempt to break out of a <style> raw-text element.
const sanitizeStyleContent = (css) => String(css ?? '').replace(/<\/(style|script)/gi, '');

// Tags a leaf node is allowed to emit. Anything else is rendered as escaped
// text, never as a tag — so a tampered AST (e.g. type "script") can't inject.
const KNOWN_LEAF_TAGS = ['h1', 'p', 'li', 'button'];

// Serialize AST to raw HTML string (for sandboxed iframe preview)
export const toHTML = (nodes) => {
  if (!nodes || nodes.length === 0) return '';

  return nodes.map(node => {
    if (node.type === 'style') {
      return `<style>${sanitizeStyleContent(node.content || '')}</style>`;
    }
    if (node.type === 'img') {
      return `<img src="${escapeAttr(sanitizeUrl(node.content || ''))}" alt="WebCraft Image" style="max-width:100%; border:3px solid #0F172A; box-shadow:3px 3px 0px #0F172A; border-radius:8px;" />`;
    }
    if (CONTAINER_TAGS.includes(node.type)) {
      const inner = toHTML(node.children || []);
      return `<${node.type}>${inner}</${node.type}>`;
    }
    if (KNOWN_LEAF_TAGS.includes(node.type)) {
      let classes = '';
      if (node.type === 'button') {
        classes = ' style="background-color:#FACC15; color:#0F172A; border:3px solid #0F172A; box-shadow:2px 2px 0px #0F172A; font-weight:bold; padding:4px 12px; border-radius:6px; cursor:pointer;"';
      }
      return `<${node.type}${classes}>${escapeHTML(node.content || '')}</${node.type}>`;
    }
    // Unknown / untrusted node type: render text content escaped, never a tag.
    return escapeHTML(node.content || '');
  }).join('');
};

// Serialize AST to indented HTML code (for syntax highlighted view)
export const toFormattedCode = (nodes, depth = 0) => {
  if (!nodes || nodes.length === 0) return '';

  const indent = '  '.repeat(depth);
  return nodes.map(node => {
    if (node.type === 'style') {
      return `${indent}<style>\n${node.content ? node.content.split('\n').map(line => indent + '  ' + line).join('\n') : ''}\n${indent}</style>`;
    }
    if (node.type === 'img') {
      return `${indent}<img src="${node.content || ''}" alt="Image" />`;
    }
    if (CONTAINER_TAGS.includes(node.type)) {
      const inner = toFormattedCode(node.children || [], depth + 1);
      if (inner) {
        return `${indent}<${node.type}>\n${inner}\n${indent}</${node.type}>`;
      }
      return `${indent}<${node.type}></${node.type}>`;
    }
    return `${indent}<${node.type}>${escapeHTML(node.content || '')}</${node.type}>`;
  }).join('\n');
};

// Search helper to find a node by type in the AST
export const findNodeByType = (nodes, type) => {
  for (const node of nodes) {
    if (node.type === type) return node;
    if (node.children) {
      const found = findNodeByType(node.children, type);
      if (found) return found;
    }
  }
  return null;
};

// Helper to count nodes of a specific type in AST
export const countNodesByType = (nodes, type) => {
  let count = 0;
  for (const node of nodes) {
    if (node.type === type) count++;
    if (node.children) {
      count += countNodesByType(node.children, type);
    }
  }
  return count;
};

// Helper to check nesting (is childNode a descendant of parentNode?)
export const isChildOf = (nodes, parentType, childType) => {
  const findParent = (nodesList) => {
    for (const node of nodesList) {
      if (node.type === parentType) {
        return node;
      }
      if (node.children) {
        const p = findParent(node.children);
        if (p) return p;
      }
    }
    return null;
  };

  const parentNode = findParent(nodes);
  if (!parentNode || !parentNode.children) return false;

  const hasChild = (children) => {
    for (const child of children) {
      if (child.type === childType) return true;
      if (child.children && hasChild(child.children)) return true;
    }
    return false;
  };

  return hasChild(parentNode.children);
};

// Helper to evaluate direct children count of a node
export const getDirectChildrenCount = (nodes, parentType) => {
  const node = findNodeByType(nodes, parentType);
  return node && node.children ? node.children.length : 0;
};

// Validate AST based on JSON rules
export const validateAST = (ast, rules) => {
  if (!rules || !Array.isArray(rules)) return [];

  const errors = [];

  rules.forEach(rule => {
    if (rule.type === 'exists') {
      const exists = findNodeByType(ast, rule.selector);
      if (!exists) {
        errors.push({ rule, message: rule.error_message });
      }
    }
    else if (rule.type === 'child_of') {
      const isNested = isChildOf(ast, rule.parent, rule.child);
      if (!isNested) {
        errors.push({ rule, message: rule.error_message });
      }
    }
    else if (rule.type === 'content_match') {
      // Find the node
      const selectorType = rule.selector.includes('>')
        ? rule.selector.split('>').pop().trim()
        : rule.selector.trim();

      const node = findNodeByType(ast, selectorType);
      if (!node) {
        errors.push({ rule, message: `Tag <${selectorType}> tidak ditemukan.` });
      } else {
        const content = (node.content || '').trim();
        const targetValue = rule.value.trim();
        let match = false;

        if (rule.case_insensitive) {
          match = content.toLowerCase().includes(targetValue.toLowerCase());
        } else {
          match = content.includes(targetValue);
        }

        if (!match) {
          errors.push({ rule, message: rule.error_message });
        }
      }
    }
    else if (rule.type === 'count') {
      let count = 0;
      if (rule.selector.includes('>')) {
        const parts = rule.selector.split('>').map(s => s.trim());
        const parentType = parts[0];
        const childType = parts[1];
        if (childType === '*') {
          count = getDirectChildrenCount(ast, parentType);
        } else {
          const parentNode = findNodeByType(ast, parentType);
          if (parentNode && parentNode.children) {
            count = parentNode.children.filter(c => c.type === childType).length;
          }
        }
      } else {
        count = countNodesByType(ast, rule.selector);
      }

      if (rule.min && count < rule.min) {
        errors.push({ rule, message: rule.error_message });
      }
      if (rule.max && count > rule.max) {
        errors.push({ rule, message: rule.error_message });
      }
    }
  });

  return errors;
};
