"""Deterministic offline authoring of 30 boards; preserve demo as stage 20.

Run from the repository root: python scripts/generate-coconut-stages.py
Runtime consumes the committed JSON, never a random board.
"""
import itertools
import json
import random
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPECS = [
    ('첫 세 조각', 3, 2, 0, [(1, 2, 3)], '열린 패 세 개를 골라 보세요.'),
    ('멀리 있어도', 3, 3, 0, [(1, 3, 5)], '떨어진 패도 함께 고를 수 있어요.'),
    ('아래의 숫자', 3, 2, 3, [(1, 2, 3)], '위의 패를 없애면 아래가 열려요.'),
    ('두 개의 같은 숫자', 3, 3, 3, [(2, 4, 6)], '같은 숫자라도 위치를 살펴보세요.'),
    ('두 배씩', 3, 3, 3, [(2, 4, 8)], '2 · 4 · 8도 수열이에요.'),
    ('두 가지 수열', 4, 3, 3, [(2, 3, 4), (2, 4, 8)], '같은 차이, 같은 비율을 찾아보세요.'),
    ('어느 조각부터', 3, 3, 3, [(1, 2, 4), (2, 4, 8)], '지울 위치에 따라 열리는 패가 달라져요.'),
    ('모서리를 보세요', 4, 3, 3, [(3, 5, 7)], '아래층 모서리의 숫자도 살펴보세요.'),
    ('위에서 아래로', 4, 3, 3, [(1, 3, 9)], '새로 열린 패와 수열을 이어 보세요.'),
    ('작은 코코넛 섬', 4, 3, 3, [(1, 2, 4), (2, 4, 8)], '배운 방법으로 섬을 비워 보세요.'),
    ('첫 갈림길', 4, 3, 6, [(1, 3, 5), (2, 4, 8), (3, 6, 9)], '다음에 열릴 숫자도 생각해 보세요.'),
    ('양쪽의 길', 4, 3, 6, [(2, 3, 4), (1, 3, 9), (4, 6, 8)], '왼쪽과 오른쪽의 패를 함께 살펴보세요.'),
    ('남겨 둔 조각', 4, 3, 6, [(1, 4, 7), (2, 4, 8), (3, 5, 7)], '필요한 숫자를 남겨 두는 것도 방법이에요.'),
    ('두 겹의 계단', 4, 3, 6, [(2, 5, 8), (1, 2, 4), (3, 6, 9)], '위층을 정리하며 다음 길을 열어 보세요.'),
    ('넓어진 섬', 5, 3, 6, [(1, 3, 5), (2, 4, 8), (4, 6, 9)], '멀리 떨어진 패도 조합해 보세요.'),
    ('위치의 차이', 5, 3, 6, [(1, 2, 4), (2, 4, 8), (2, 5, 8), (3, 5, 7)], '같은 숫자 중 어느 패가 길을 열까요?'),
    ('세 개의 다리', 6, 3, 6, [(1, 3, 9), (2, 4, 6), (2, 4, 8), (3, 6, 9)], '여러 구역의 숫자를 함께 활용해 보세요.'),
    ('비껴 쌓은 패', 6, 3, 6, [(1, 4, 7), (2, 4, 8), (4, 6, 9), (2, 3, 4)], '가려진 숫자를 보고 순서를 정해 보세요.'),
    ('마지막을 생각하며', 6, 3, 6, [(1, 2, 4), (2, 5, 8), (3, 6, 9), (4, 5, 6)], '끝에 남을 세 숫자도 생각해 보세요.'),
]

POSITION_SPECS = [
    ('다시 만난 갈림길', 6, 3, 6, [(1, 2, 4), (2, 4, 8), (2, 4, 6)], '같은 숫자라도 아래에 무엇이 있는지 살펴보세요.'),
    ('왼쪽의 같은 숫자', 6, 3, 6, [(1, 3, 5), (2, 4, 8), (3, 6, 9)], '왼쪽과 오른쪽의 같은 숫자를 비교해 보세요.'),
    ('한 칸 너머', 6, 3, 6, [(2, 5, 8), (1, 2, 4), (4, 6, 9)], '어느 패를 지우면 필요한 숫자가 열릴까요?'),
    ('서로 다른 문', 6, 3, 6, [(1, 4, 7), (2, 4, 8), (4, 5, 6)], '같은 수열로 서로 다른 길을 열 수 있어요.'),
    ('가운데의 조각', 6, 3, 6, [(1, 3, 9), (3, 5, 7), (2, 4, 8)], '중앙의 패 아래에 있는 숫자도 살펴보세요.'),
    ('두 길의 만남', 6, 3, 6, [(2, 3, 4), (2, 4, 8), (3, 6, 9), (1, 4, 7)], '서로 다른 구역에서 다음 조합을 찾아보세요.'),
    ('먼저 열 문', 6, 3, 6, [(1, 2, 4), (2, 5, 8), (4, 6, 9)], '열고 싶은 숫자부터 정한 뒤 위층을 골라 보세요.'),
    ('짝처럼 보이지만', 6, 3, 6, [(1, 3, 5), (1, 3, 9), (4, 6, 8)], '같은 숫자의 패도 서로 다른 역할을 해요.'),
    ('남겨 둘 위치', 6, 3, 6, [(2, 4, 8), (1, 4, 7), (3, 6, 9), (2, 5, 8)], '숫자뿐 아니라 남길 위치도 생각해 보세요.'),
    ('코코넛 섬의 세 갈래', 6, 3, 8, [(1, 2, 4), (2, 4, 8), (1, 4, 7), (3, 5, 7), (2, 5, 8)], '지울 숫자와 열릴 숫자를 함께 생각해 보세요.'),
]


def geometry(cols, rows, upper, stage_id):
    tiles = [dict(id=f'L{r+1}{c+1}', layer=0, row=r, col=c,
                  x=c*52, y=(28 if upper else 0)+r*88, value=0)
             for r in range(rows) for c in range(cols)]
    if stage_id == 30:
        tiles = [t for t in tiles if (t['row'], t['col']) not in [(1, 2), (1, 3)]]
    if upper:
        start = (cols-3)*26
        xs = [start+c*52+12 for c in range(3)]
        if stage_id == 17:
            xs = [26, 130, 234]
        elif stage_id == 18:
            xs = [26, 104, 208]
        elif stage_id in [21, 24, 27, 29]:
            xs = [26, 130, 234]
        elif stage_id in [22, 26]:
            xs = [0, 104, 208]
        elif stage_id == 23:
            xs = [52, 130, 234]
        elif stage_id == 25:
            xs = [26, 104, 182]
        elif stage_id == 30:
            xs = [26, 78, 182, 234]
        for i in range(upper):
            r, c = divmod(i, len(xs))
            tiles.append(dict(id=f'U{r+1}{c+1}', layer=1, row=r, col=c,
                              x=xs[c], y=r*94, value=0))
    return tiles


def blockers(tiles):
    return [sum(1 << j for j, b in enumerate(tiles)
                if b['layer'] > a['layer'] and abs(a['x']-b['x']) < 48
                and abs(a['y']-b['y']) < 66) for a in tiles]


def valid(vals):
    a, b, c = sorted(vals)
    return a < b < c and (b-a == c-b or b*b == a*c)


def analyze(tiles, require_safe=False):
    blocks = blockers(tiles)
    groups = [(sum(1 << i for i in ids), ids)
              for ids in itertools.combinations(range(len(tiles)), 3)
              if valid([tiles[i]['value'] for i in ids])]

    def moves(mask):
        return [(bits, ids) for bits, ids in groups if bits & mask == bits
                and all(not blocks[i] & mask for i in ids)]

    @lru_cache(None)
    def safe(mask):
        if not mask:
            return True
        options = moves(mask)
        return bool(options) and all(safe(mask ^ bits) for bits, _ in options)

    initial = (1 << len(tiles))-1
    if require_safe and not safe(initial):
        return None
    return dict(initialMoves=len(moves(initial)), allChoicesSolvable=True if require_safe else None,
                verifiedStates=safe.cache_info().currsize if require_safe else 0)


def position_choices(tiles):
    """Same number triple, different physical tiles, different newly opened tiles."""
    blocks = blockers(tiles)
    initial = (1 << len(tiles))-1
    exposed = [i for i in range(len(tiles)) if not blocks[i]]
    seen = {}
    count = 0
    for ids in itertools.combinations(exposed, 3):
        values = tuple(sorted(tiles[i]['value'] for i in ids))
        if not valid(values):
            continue
        after = initial ^ sum(1 << i for i in ids)
        opened = tuple(i for i in range(len(tiles)) if blocks[i]
                       and after & (1 << i) and not blocks[i] & after)
        count += sum(previous != opened for previous in seen.get(values, []))
        seen.setdefault(values, []).append(opened)
    return count


def make_stage(number, spec):
    name, cols, rows, upper, pool, lesson = spec
    rng = random.Random(30000+number)
    accepted = None
    for attempt in range(20000):
        tiles = geometry(cols, rows, upper, number)
        blocks = blockers(tiles)
        remaining = set(range(len(tiles)))
        solution = []
        while remaining:
            mask = sum(1 << i for i in remaining)
            exposed = [i for i in sorted(remaining) if not blocks[i] & mask]
            if len(exposed) < 3:
                break
            ids = rng.sample(exposed, 3)
            values = list(pool[len(solution) % len(pool)])
            rng.shuffle(values)
            for i, value in zip(ids, values):
                tiles[i]['value'] = value
            solution.append([tiles[i]['id'] for i in ids])
            remaining.difference_update(ids)
        if remaining:
            continue
        result = analyze(tiles, require_safe=number <= 10)
        branches = position_choices(tiles) if number >= 21 else 0
        if result and result['initialMoves'] >= (1 if number == 1 else 2) and (number < 21 or branches > 0):
            if number >= 21:
                result['positionChoices'] = branches
            accepted = dict(id=number, name=name, lesson=lesson,
                            focus='입문' if number <= 10 else '같은 숫자, 다른 위치' if number >= 21 else '선택과 해방',
                            tiles=tiles, solution=solution, validation=result)
            break
    if not accepted:
        raise RuntimeError(f'No acceptable board for stage {number}')
    print(number, name, len(accepted['tiles']), 'attempt', attempt,
          accepted['validation'], flush=True)
    return accepted


stages = [make_stage(number, spec) for number, spec in enumerate(SPECS, 1)]

demo = json.loads((ROOT/'src/coconut/board.json').read_text())
stages.append(dict(id=20, name='코코넛 섬의 첫 여정',
                   lesson='어느 패가 다음 길을 여는지 살펴보세요.', focus='종합',
                   **demo, validation=analyze(demo['tiles'])))
stages.extend(make_stage(number, spec) for number, spec in enumerate(POSITION_SPECS, 21))
(ROOT/'src/coconut/stages.json').write_text(
    json.dumps(stages, ensure_ascii=False, indent=2)+'\n')
