from typing import List, Dict, Any

def find_node_by_type(nodes: List[Dict[str, Any]], target_type: str) -> Dict[str, Any]:
    for node in nodes:
        if node.get("type") == target_type:
            return node
        children = node.get("children")
        if children:
            found = find_node_by_type(children, target_type)
            if found:
                return found
    return None

def count_nodes_by_type(nodes: List[Dict[str, Any]], target_type: str) -> int:
    count = 0
    for node in nodes:
        if node.get("type") == target_type:
            count += 1
        children = node.get("children")
        if children:
            count += count_nodes_by_type(children, target_type)
    return count

def is_child_of(nodes: List[Dict[str, Any]], parent_type: str, child_type: str) -> bool:
    def find_parent(node_list):
        for n in node_list:
            if n.get("type") == parent_type:
                return n
            children = n.get("children")
            if children:
                p = find_parent(children)
                if p:
                    return p
        return None

    parent_node = find_parent(nodes)
    if not parent_node or not parent_node.get("children"):
        return False

    def has_child(children):
        for c in children:
            if c.get("type") == child_type:
                return True
            grandkids = c.get("children")
            if grandkids and has_child(grandkids):
                return True
        return False

    return has_child(parent_node.get("children"))

def validate_ast(ast: List[Dict[str, Any]], rules: List[Dict[str, Any]]) -> List[str]:
    errors = []
    if not rules:
        return errors

    for rule in rules:
        rule_type = rule.get("type")
        selector = rule.get("selector")
        err_msg = rule.get("error_message", "Aturan validasi gagal.")

        if rule_type == "exists":
            if not find_node_by_type(ast, selector):
                errors.append(err_msg)
        elif rule_type == "child_of":
            parent = rule.get("parent")
            child = rule.get("child")
            if not is_child_of(ast, parent, child):
                errors.append(err_msg)
        elif rule_type == "count":
            count = count_nodes_by_type(ast, selector)
            min_val = rule.get("min")
            max_val = rule.get("max")
            if min_val is not None and count < min_val:
                errors.append(err_msg)
            if max_val is not None and count > max_val:
                errors.append(err_msg)
        elif rule_type == "content_match":
            clean_sel = selector.split(">")[-1].strip() if ">" in selector else selector.strip()
            node = find_node_by_type(ast, clean_sel)
            if not node:
                errors.append(f"Tag <{clean_sel}> tidak ditemukan.")
            else:
                content = str(node.get("content", "")).strip()
                val = str(rule.get("value", "")).strip()
                match = False
                if rule.get("case_insensitive", True):
                    match = val.lower() in content.lower()
                else:
                    match = val in content
                if not match:
                    errors.append(err_msg)
                    
    return errors
