"""Deterministic offline authoring of the first 19 boards; preserve demo as stage 20.

Run from the repository root: python scripts/generate-coconut-stages.py
Runtime consumes the committed JSON, never a random board.
"""
import itertools
import json
import random
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AP = [(a, a + d, a + 2 * d) for d in range(1, 5) for a in range(1, 10 - 2 * d)]
GP = [(1, 2, 4), (1, 3, 9), (2, 4, 8), (4, 6, 9)]
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


def geometry(cols, rows, upper, stage_id):
    tiles = [dict(id=f'L{r+1}{c+1}', layer=0, row=r, col=c,
                  x=c*52, y=(28 if upper else 0)+r*88, value=0)
             for r in range(rows) for c in range(cols)]
    if upper:
        start = (cols-3)*26
        xs = [start+c*52+12 for c in range(3)]
        if stage_id == 17:
            xs = [26, 130, 234]
        elif stage_id == 18:
            xs = [26, 104, 208]
        for i in range(upper):
            r, c = divmod(i, 3)
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


stages = []
for number, (name, cols, rows, upper, pool, lesson) in enumerate(SPECS, 1):
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
        if result and result['initialMoves'] >= (1 if number == 1 else 2):
            accepted = dict(id=number, name=name, lesson=lesson,
                            focus='입문' if number <= 10 else '선택과 해방',
                            tiles=tiles, solution=solution, validation=result)
            break
    if not accepted:
        raise RuntimeError(f'No acceptable board for stage {number}')
    stages.append(accepted)
    print(number, name, len(accepted['tiles']), 'attempt', attempt,
          accepted['validation'], flush=True)

demo = json.loads((ROOT/'src/coconut/board.json').read_text())
stages.append(dict(id=20, name='코코넛 섬의 첫 여정',
                   lesson='어느 패가 다음 길을 여는지 살펴보세요.', focus='종합',
                   **demo, validation=analyze(demo['tiles'])))
(ROOT/'src/coconut/stages.json').write_text(
    json.dumps(stages, ensure_ascii=False, indent=2)+'\n')
