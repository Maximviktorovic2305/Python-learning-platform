"""Incomplete scaffolds for authored practice tasks; solutions stay server-side."""

import ast


def _input_value(node: ast.expr, text: str) -> object:
    """Read only the authored input conversions; never evaluate Python source."""
    if not isinstance(node, ast.Call) or node.keywords:
        raise ValueError("Not an input conversion")
    if isinstance(node.func, ast.Name):
        name = node.func.id
        if name == "input" and not node.args:
            return text
        if name in {"int", "float"} and len(node.args) == 1:
            value = _input_value(node.args[0], text)
            if not isinstance(value, str):
                raise ValueError("Expected input text")
            return int(value) if name == "int" else float(value)
        if name in {"list", "tuple"} and len(node.args) == 1:
            value = _input_value(node.args[0], text)
            if not isinstance(value, list):
                raise ValueError("Expected a sequence")
            return value if name == "list" else tuple(value)
        if name == "map" and len(node.args) == 2:
            converter, values = node.args
            if not isinstance(converter, ast.Name) or converter.id not in {"int", "float"}:
                raise ValueError("Unsupported conversion")
            items = _input_value(values, text)
            if not isinstance(items, list) or not all(isinstance(item, str) for item in items):
                raise ValueError("Expected split input")
            return [int(str(item)) if converter.id == "int" else float(str(item)) for item in items]
    if isinstance(node.func, ast.Attribute) and node.func.attr == "split":
        value = _input_value(node.func.value, text)
        if isinstance(value, str) and len(node.args) <= 1:
            separator = ast.literal_eval(node.args[0]) if node.args else None
            if separator is None or isinstance(separator, str):
                return value.split(separator)
    raise ValueError("Not an input conversion")


def uses_input(source: str) -> bool:
    return any(
        isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "input"
        for node in ast.walk(ast.parse(source))
    )


def with_given_data(solution: str, sample: str) -> str:
    """Move authored sample data above the algorithm, without solving the task."""
    tree = ast.parse(solution)
    given: list[ast.stmt] = []
    remaining: list[ast.stmt] = []
    for statement in tree.body:
        if isinstance(statement, ast.Assign):
            try:
                value = _input_value(statement.value, sample)
            except ValueError:
                pass
            else:
                given.append(
                    ast.Assign(
                        targets=statement.targets, value=ast.parse(repr(value), mode="eval").body
                    )
                )
                continue
        remaining.append(statement)
    tree.body = remaining
    if uses_input(ast.unparse(tree)):
        names = {node.id for node in ast.walk(tree) if isinstance(node, ast.Name)}
        name = "source_text"
        while name in names:
            name = "given_" + name
        given.append(
            ast.Assign(targets=[ast.Name(id=name, ctx=ast.Store())], value=ast.Constant(sample))
        )

        class ReplaceInput(ast.NodeTransformer):
            def visit_Call(self, node: ast.Call) -> ast.expr:
                if isinstance(node.func, ast.Name) and node.func.id == "input":
                    return ast.Name(id=name, ctx=ast.Load())
                self.generic_visit(node)
                return node

        tree = ReplaceInput().visit(tree)
    tree.body = given + tree.body
    return ast.unparse(ast.fix_missing_locations(tree))


def exercise_description(description: str, expected: str, starter: str) -> str:
    context, separator, instruction = description.partition(". ")
    if not separator:
        instruction = description.removeprefix("Ввод: ")
    names = [
        node.id
        for statement in ast.parse(starter).body
        if isinstance(statement, ast.Assign)
        for target in statement.targets
        for node in ast.walk(target)
        if isinstance(node, ast.Name)
    ]
    data = ", ".join(names)
    preface = (
        f"Исходные данные уже записаны в начале solution.py: {data}. Используйте их в решении."
    )
    if "source_text" in names:
        preface += "\n\nСодержимое source_text: " + context.removeprefix("Ввод: ") + "."
    instruction = (
        instruction.replace("Пустой ввод", "Пустые данные")
        .replace("пустого ввода", "пустых данных")
        .replace("на ввод, commit", "на заданное value, выполните commit")
        .replace("входной текст", "заданный текст")
        .replace("в порядке входа", "в исходном порядке")
        .replace("порядка входа", "исходного порядка")
        .replace("допустимым входом", "допустимыми данными")
        .replace(" без приглашения ко вводу", "")
    )
    return (
        preface
        + "\n\n"
        + instruction
        + "\n\nОжидаемый вывод:\n"
        + (expected or "(пустой вывод)")
        + "\n\nПроверяется результат программы с этими данными."
    )


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
