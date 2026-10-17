"""Cross-check optimized solutions against independent small-input oracles."""

import itertools
import json
import operator
import random
import subprocess
import sys

import pytest

from app.content.trainer import TASKS


def oracle_case(number, rng):
    if number == 17:
        values = [rng.randint(-8, 8) for _ in range(rng.randrange(1, 15))]
        k = rng.randint(1, len(values))
        return {"values": values, "k": k}, [
            max(values[i : i + k]) for i in range(len(values) - k + 1)
        ]
    if number == 18:
        text = "".join(rng.choices("ab ВГ12", k=rng.randrange(18)))
        answer = max(
            (
                end - start
                for start in range(len(text) + 1)
                for end in range(start, len(text) + 1)
                if len(set(text[start:end])) == end - start
            ),
            default=0,
        )
        return text, answer
    if number == 19:
        names = list("abcde")
        graph = {
            name: [other for other in names if rng.random() < 0.25]
            for name in names
            if rng.random() < 0.8
        }
        distances = {
            (a, b): 0 if a == b else 1 if b in graph.get(a, []) else 100
            for a in names
            for b in names
        }
        for middle, a, b in itertools.product(names, repeat=3):
            distances[a, b] = min(distances[a, b], distances[a, middle] + distances[middle, b])
        start, end = rng.choices(names, k=2)
        answer = distances[start, end]
        return {"graph": graph, "start": start, "end": end}, answer if answer < 100 else -1
    if number == 20:
        coins = rng.sample(range(1, 9), rng.randrange(5))
        amount = rng.randrange(25)
        reachable = {0}
        answer = -1
        for count in range(amount + 1):
            if amount in reachable:
                answer = count
                break
            reachable = {
                total + coin for total in reachable for coin in coins if total + coin <= amount
            }
        return {"coins": coins, "amount": amount}, answer
    if number == 21:
        capacity = rng.randrange(4)
        operations = []
        recent = []
        answers = []
        for _ in range(25):
            key = rng.choice("abcd")
            previous = next((pair for pair in recent if pair[0] == key), None)
            if rng.random() < 0.5:
                operations.append(["get", key])
                answers.append(previous[1] if previous else -1)
                if previous:
                    recent.remove(previous)
                    recent.insert(0, previous)
            else:
                value = rng.randint(-5, 10)
                operations.append(["put", key, value])
                if previous:
                    recent.remove(previous)
                recent.insert(0, (key, value))
                recent = recent[:capacity]
        return {"capacity": capacity, "ops": operations}, answers
    if number == 22:

        def expression(depth):
            if not depth or rng.random() < 0.3:
                value = rng.randint(-9, 9)
                return str(value), value
            left, left_value = expression(depth - 1)
            right, right_value = expression(depth - 1)
            symbol = rng.choice("+-*")
            value = {"+": operator.add, "-": operator.sub, "*": operator.mul}[symbol](
                left_value, right_value
            )
            return f"{left} {right} {symbol}", value

        return expression(4)
    if number == 23:
        names = list("abcde")[: rng.randint(1, 5)]
        graph = {
            name: rng.choices(names, k=rng.randrange(3)) for name in names if rng.random() < 0.85
        }
        nodes = set(graph) | {dep for deps in graph.values() for dep in deps}
        valid = []
        for order in itertools.permutations(sorted(nodes)):
            positions = {name: index for index, name in enumerate(order)}
            if all(
                positions[dep] < positions[name] for name, deps in graph.items() for dep in deps
            ):
                valid.append(order)
        return graph, list(min(valid)) if valid else "цикл"
    meetings = []
    for _ in range(rng.randrange(12)):
        start = rng.randint(-5, 10)
        meetings.append([start, start + rng.randint(1, 7)])
    answer = max(
        (sum(start <= time < end for start, end in meetings) for time in range(-5, 18)),
        default=0,
    )
    return meetings, answer


@pytest.mark.parametrize("number", range(17, 25))
def test_hard_trainer_solutions_against_independent_oracles(number):
    rng = random.Random(20261017 + number)
    exercise = TASKS[number - 1].practice
    for _ in range(12):
        value, expected = oracle_case(number, rng)
        stdin = value if number in (18, 22) else json.dumps(value)
        result = subprocess.run(
            [sys.executable, "-X", "utf8", "-I", "-c", exercise.solution],
            input=stdin + "\n",
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=5,
        )
        assert result.returncode == 0, result.stderr
        output = result.stdout.rstrip("\r\n")
        actual = output if expected == "цикл" else json.loads(output)
        assert actual == expected, (number, value, expected, actual)
