"""Incomplete scaffolds for authored practice tasks; solutions stay server-side."""

import ast


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
