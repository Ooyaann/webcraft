// Port dari backend/app/services/validator.py — validasi AST blok siswa
// terhadap aturan misi (offline, tanpa AI).

export type AstNode = {
  type?: string;
  content?: unknown;
  children?: AstNode[];
  [key: string]: unknown;
};

export type ValidatorRule = {
  type?: string;
  selector?: string;
  parent?: string;
  child?: string;
  value?: unknown;
  min?: number;
  max?: number;
  case_insensitive?: boolean;
  error_message?: string;
  [key: string]: unknown;
};

export function findNodeByType(
  nodes: AstNode[],
  targetType: string,
): AstNode | null {
  for (const node of nodes) {
    if (node.type === targetType) return node;
    if (node.children?.length) {
      const found = findNodeByType(node.children, targetType);
      if (found) return found;
    }
  }
  return null;
}

export function countNodesByType(nodes: AstNode[], targetType: string): number {
  let count = 0;
  for (const node of nodes) {
    if (node.type === targetType) count += 1;
    if (node.children?.length) count += countNodesByType(node.children, targetType);
  }
  return count;
}

export function isChildOf(
  nodes: AstNode[],
  parentType: string,
  childType: string,
): boolean {
  const parentNode = findNodeByType(nodes, parentType);
  if (!parentNode?.children?.length) return false;

  const hasChild = (children: AstNode[]): boolean =>
    children.some(
      (c) => c.type === childType || (c.children?.length ? hasChild(c.children) : false),
    );
  return hasChild(parentNode.children);
}

export function validateAst(
  ast: AstNode[],
  rules: ValidatorRule[],
): string[] {
  const errors: string[] = [];
  if (!rules?.length) return errors;

  for (const rule of rules) {
    const errMsg = rule.error_message ?? "Aturan validasi gagal.";

    if (rule.type === "exists") {
      if (!findNodeByType(ast, rule.selector ?? "")) errors.push(errMsg);
    } else if (rule.type === "child_of") {
      if (!isChildOf(ast, rule.parent ?? "", rule.child ?? "")) {
        errors.push(errMsg);
      }
    } else if (rule.type === "count") {
      const count = countNodesByType(ast, rule.selector ?? "");
      if (rule.min != null && count < rule.min) errors.push(errMsg);
      if (rule.max != null && count > rule.max) errors.push(errMsg);
    } else if (rule.type === "content_match") {
      const selector = rule.selector ?? "";
      const cleanSel = selector.includes(">")
        ? (selector.split(">").pop() ?? "").trim()
        : selector.trim();
      const node = findNodeByType(ast, cleanSel);
      if (!node) {
        errors.push(`Tag <${cleanSel}> tidak ditemukan.`);
      } else {
        const content = String(node.content ?? "").trim();
        const val = String(rule.value ?? "").trim();
        const match =
          rule.case_insensitive !== false
            ? content.toLowerCase().includes(val.toLowerCase())
            : content.includes(val);
        if (!match) errors.push(errMsg);
      }
    }
  }
  return errors;
}
