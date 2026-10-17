"""Incomplete scaffolds for authored practice tasks; solutions stay server-side."""

import ast


def local_supported(solution: str) -> bool:
    """WebAssembly lacks the OS threads/processes used by these lessons."""
    for node in ast.walk(ast.parse(solution)):
        if isinstance(node, ast.Import):
            names = [alias.name for alias in node.names]
        elif isinstance(node, ast.ImportFrom):
            names = [node.module or ""]
        else:
            continue
        if any(
            name.split(".")[0] in {"threading", "multiprocessing", "subprocess", "concurrent"}
            for name in names
        ):
            return False
    return True


def exercise_starter(solution: str) -> str:
    lines: list[str] = []
    for statement in ast.parse(solution).body:
        if isinstance(statement, ast.Import | ast.ImportFrom):
            lines.append(ast.unparse(statement))
        elif isinstance(statement, ast.Assign):
            # Keep literal starting data, never calculated answers, calls or lambdas.
            try:
                ast.literal_eval(statement.value)
            except ValueError, TypeError:
                break
            lines.append(ast.unparse(statement))
        elif isinstance(statement, ast.FunctionDef):
            lines.extend(
                [
                    f"def {statement.name}({ast.unparse(statement.args)}):",
                    "    # Реализуйте функцию",
                    "    pass",
                ]
            )
            break
        else:
            break
    return "\n".join([*lines, "", "# Допишите решение здесь", ""]).lstrip("\n")
