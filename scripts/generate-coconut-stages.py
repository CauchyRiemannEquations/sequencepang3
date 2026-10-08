"""Deterministic offline authoring of 50 boards; preserve demo as stage 20.

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

PRESERVATION_SPECS = [
    ('하나 남은 아홉', 6, 3, 6, [(2, 4, 8), (2, 3, 4), (3, 5, 7), (1, 3, 5), (2, 4, 6), (4, 5, 6), (1, 4, 7), (3, 6, 9)], '하나뿐인 9를 쓰기 전에 아래의 숫자를 살펴보세요.'),
    ('아직 쓰지 않을 패', 6, 3, 6, [(1, 2, 4), (2, 4, 8), (3, 5, 7), (2, 3, 4), (4, 5, 6), (3, 4, 5), (2, 5, 8), (4, 6, 9)], '지금 만들 수 있는 수열이 마지막에도 도움이 될까요?'),
    ('다음 수열의 몫', 6, 3, 6, [(2, 3, 4), (4, 5, 6), (1, 2, 4), (2, 4, 8), (3, 4, 5), (2, 5, 8), (4, 6, 9), (3, 5, 7)], '적게 남은 숫자가 어떤 수열에 필요한지 찾아보세요.'),
    ('늦게 열리는 짝', 6, 3, 9, [(2, 4, 8), (1, 3, 5), (2, 3, 4), (3, 6, 9), (2, 4, 6), (4, 5, 6), (1, 4, 7), (3, 4, 5), (3, 5, 7)], '아직 덮인 패와 짝이 될 숫자를 남겨 보세요.'),
    ('빈자리의 약속', 6, 3, 9, [(1, 2, 4), (3, 4, 5), (2, 4, 8), (3, 5, 7), (2, 3, 4), (4, 5, 6), (2, 4, 6), (2, 5, 8), (4, 6, 9)], '먼저 열 길을 정한 뒤 남길 숫자를 골라 보세요.'),
    ('두 번의 기다림', 6, 3, 9, [(1, 2, 4), (2, 4, 8), (3, 5, 7), (2, 3, 4), (4, 5, 6), (3, 4, 5), (2, 5, 8), (2, 4, 6), (4, 6, 9)], '몇 수 뒤에 열릴 숫자도 미리 생각해 보세요.'),
    ('섬 끝의 한 조각', 6, 4, 6, [(2, 4, 8), (1, 3, 5), (2, 3, 4), (3, 5, 7), (2, 4, 6), (4, 5, 6), (1, 4, 7), (1, 2, 3), (4, 6, 8), (3, 6, 9)], '섬 가장자리의 숫자도 나중에 필요할 수 있어요.'),
    ('남겨야 이어지는 길', 6, 3, 12, [(1, 2, 4), (2, 4, 8), (3, 5, 7), (2, 3, 4), (4, 5, 6), (3, 4, 5), (2, 4, 6), (2, 5, 8), (3, 4, 5), (4, 6, 9)], '여러 조합에 쓸 수 있는 숫자를 서둘러 쓰지 마세요.'),
    ('마지막 세 패를 위해', 6, 4, 6, [(1, 2, 4), (2, 4, 8), (3, 5, 7), (2, 3, 4), (4, 5, 6), (3, 4, 5), (2, 5, 8), (4, 5, 6), (2, 3, 4), (4, 6, 9)], '끝에 만들 수열부터 거꾸로 생각해 보세요.'),
    ('코코넛 섬의 비축', 6, 3, 12, [(2, 4, 8), (1, 3, 5), (2, 3, 4), (3, 6, 9), (2, 4, 6), (4, 5, 6), (1, 4, 7), (1, 4, 7), (3, 5, 7), (3, 5, 7)], '열릴 패와 남길 숫자를 함께 계획해 섬을 비워 보세요.'),
]

LAYER_SPECS = [
    ('첫 세 겹', 6, 3, (3, 3), [(1, 2, 3)], '맨 위 세 패를 지우고, 가운데층이 열리는지 살펴보세요.'),
    ('가운데층의 문', 6, 3, (3, 3), [(1, 3, 5), (2, 4, 8), (2, 3, 4)], '아래층을 열려면 가운데층도 지워야 해요.'),
    ('한 겹씩 내려가기', 5, 3, (6, 3), [(2, 4, 6), (1, 2, 4), (3, 5, 7)], '위층을 지운 다음, 새로 열린 가운데층을 확인해 보세요.'),
    ('먼저 열어야 할 길', 6, 3, (6, 3), [(1, 3, 9), (2, 4, 8), (3, 6, 9), (1, 4, 7)], '필요한 아래층 숫자에서 위쪽으로 길을 찾아보세요.'),
    ('가운데층의 갈림길', 6, 3, (6, 3), [(2, 3, 4), (3, 5, 7), (4, 6, 9), (2, 4, 8)], '어느 가운데층 패를 지우면 다음 조합이 열릴까요?'),
    ('비껴 쌓은 세 겹', 6, 3, (6, 3), [(1, 4, 7), (2, 5, 8), (1, 2, 4), (4, 5, 6)], '층이 비껴 있어도 겹친 패를 모두 지워야 열려요.'),
    ('깊은 섬의 숫자', 6, 3, (9, 3), [(1, 3, 5), (2, 4, 8), (3, 6, 9), (4, 6, 9)], '깊이 덮인 숫자와 조합할 패를 미리 찾아보세요.'),
    ('두 개의 지붕', 6, 3, (6, 6), [(1, 2, 4), (3, 5, 7), (2, 4, 6), (2, 5, 8)], '서로 다른 위층 구역에서 열릴 길을 비교해 보세요.'),
    ('겹친 길의 순서', 6, 3, (6, 6), [(2, 4, 8), (1, 3, 9), (4, 5, 6), (1, 4, 7)], '위층과 가운데층의 제거 순서를 함께 계획해 보세요.'),
    ('코코넛 섬의 세 겹', 5, 3, (9, 6), [(1, 2, 4), (2, 4, 8), (4, 6, 9), (1, 4, 7), (3, 5, 7)], '열릴 숫자와 남길 숫자를 생각하며 세 겹의 섬을 비워 보세요.'),
]


def layer_geometry(cols, rows, counts, stage_id):
    middle_count, top_count = counts
    middle_xs = {41: [26, 130, 234], 42: [0, 104, 208], 43: [26, 104, 182],
                 44: [26, 130, 234], 45: [0, 104, 208], 46: [52, 130, 234],
                 47: [26, 130, 234], 48: [26, 104, 182], 49: [0, 104, 208],
                 50: [26, 104, 182]}[stage_id]
    top_xs = {41: [52, 130, 208], 42: [0, 104, 208], 43: [52, 104, 156],
              44: [26, 130, 234], 45: [26, 104, 182], 46: [104, 156, 234],
              47: [52, 130, 208], 48: [26, 130, 234], 49: [0, 104, 208],
              50: [26, 104, 182]}[stage_id]
    tiles = [dict(id=f'L{r+1}{c+1}', layer=0, row=r, col=c,
                  x=c*52, y=56+r*110, value=0)
             for r in range(rows) for c in range(cols)]
    for layer, count, xs in [(1, middle_count, middle_xs), (2, top_count, top_xs)]:
        for i in range(count):
            r, c = divmod(i, 3)
            # The second roof starts farther down so it does not cover both
            # printed corners of the middle and lower rows.
            y = 28+r*110 if layer == 1 else r*122
            tiles.append(dict(id=f'{"M" if layer == 1 else "U"}{r+1}{c+1}',
                              layer=layer, row=r, col=c, x=xs[c], y=y, value=0))
    return tiles


def geometry(cols, rows, upper, stage_id):
    if isinstance(upper, tuple):
        return layer_geometry(cols, rows, upper, stage_id)
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
        elif stage_id in [31, 34, 37]:
            xs = [26, 130, 234]
        elif stage_id in [32, 35, 39]:
            xs = [0, 104, 208]
        elif stage_id == 33:
            xs = [52, 130, 234]
        elif stage_id == 36:
            xs = [26, 104, 182]
        elif stage_id == 38:
            xs = [0, 78, 156, 234]
        elif stage_id == 40:
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


NUMBER_GROUPS = [values for values in itertools.combinations(range(1, 10), 3)
                 if valid(values)]


@lru_cache(None)
def numbers_partitionable(counts):
    """Can the numbers form triples even if every tile were uncovered?"""
    total = sum(counts)
    if not total:
        return True
    if total % 3 or max(counts) > total // 3:
        return False
    options = [values for values in NUMBER_GROUPS
               if all(counts[value-1] for value in values)]
    present = [value for value in range(1, 10) if counts[value-1]]
    pivot = min(present, key=lambda value: sum(value in group for group in options))
    for group in options:
        if pivot not in group:
            continue
        after = list(counts)
        for value in group:
            after[value-1] -= 1
        if numbers_partitionable(tuple(after)):
            return True
    return False


def preservation_choice(tiles, solution):
    """Certify a scarce exposed number needed later for a covered partner.

    The tempting legal first move destroys number balance, so no removal order
    can finish it. The authored solution saves that number for a later move.
    """
    counts = tuple(sum(tile['value'] == value for tile in tiles) for value in range(1, 10))
    blocks = blockers(tiles)
    by_id = {tile['id']: i for i, tile in enumerate(tiles)}
    exposed = [i for i in range(len(tiles)) if not blocks[i]]
    for ids in itertools.combinations(exposed, 3):
        values = [tiles[i]['value'] for i in ids]
        if not valid(values):
            continue
        after = list(counts)
        for value in values:
            after[value-1] -= 1
        if numbers_partitionable(tuple(after)):
            continue
        for i in ids:
            value = tiles[i]['value']
            if counts[value-1] != 1:
                continue
            step = next(index for index, move in enumerate(solution) if tiles[i]['id'] in move)
            partners = [by_id[tile_id] for tile_id in solution[step] if tile_id != tiles[i]['id']]
            if step < 2 or not any(blocks[partner] for partner in partners):
                continue
            return dict(scarceValue=value, scarceTile=tiles[i]['id'],
                        trapMove=[tiles[index]['id'] for index in ids],
                        savedUntilMove=step+1)
    return None


def layer_unlock(tiles, solution):
    """A real roof -> middle -> lower unlock in the certified solution."""
    blocks = blockers(tiles)
    by_id = {tile['id']: i for i, tile in enumerate(tiles)}
    mask = (1 << len(tiles))-1
    opened_at = {}
    for step, move in enumerate(solution, 1):
        removed = [by_id[tile_id] for tile_id in move]
        after = mask ^ sum(1 << i for i in removed)
        for i, tile in enumerate(tiles):
            if not after & (1 << i) or not blocks[i] & mask or blocks[i] & after:
                continue
            opened_at[i] = step
            if tile['layer'] != 0:
                continue
            for middle in removed:
                if tiles[middle]['layer'] == 1 and middle in opened_at and blocks[i] & (1 << middle):
                    return dict(middleTile=tiles[middle]['id'], lowerTile=tile['id'],
                                middleOpenedAfterMove=opened_at[middle], lowerOpenedAfterMove=step)
        mask = after
    return None


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
            ids = ([i for i in exposed if tiles[i]['layer'] == 2-len(solution)]
                   if number == 41 and len(solution) < 2 else rng.sample(exposed, 3))
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
        preservation = preservation_choice(tiles, solution) if 31 <= number <= 40 else None
        if 31 <= number <= 40 and not preservation:
            continue
        unlock = layer_unlock(tiles, solution) if number >= 41 else None
        if number >= 41 and not unlock:
            continue
        if result and result['initialMoves'] >= (1 if number == 1 else 2) and (number < 21 or branches > 0):
            if number >= 21:
                result['positionChoices'] = branches
            if preservation:
                result['numberPreservation'] = preservation
            if unlock:
                result['layerUnlock'] = unlock
            accepted = dict(id=number, name=name, lesson=lesson,
                            focus='입문' if number <= 10 else '여러 겹의 해방' if number >= 41 else '필요한 숫자 남기기' if number >= 31 else '같은 숫자, 다른 위치' if number >= 21 else '선택과 해방',
                            tiles=tiles, solution=solution, validation=result)
            break
    if not accepted:
        raise RuntimeError(f'No acceptable board for stage {number}')
    print(number, name, len(accepted['tiles']), 'attempt', attempt,
          accepted['validation'], flush=True)
    return accepted


def main():
    stages = [make_stage(number, spec) for number, spec in enumerate(SPECS, 1)]
    demo = json.loads((ROOT/'src/coconut/board.json').read_text(encoding='utf-8'))
    stages.append(dict(id=20, name='코코넛 섬의 첫 여정',
                       lesson='어느 패가 다음 길을 여는지 살펴보세요.', focus='종합',
                       **demo, validation=analyze(demo['tiles'])))
    stages.extend(make_stage(number, spec) for number, spec in enumerate(POSITION_SPECS, 21))
    stages.extend(make_stage(number, spec) for number, spec in enumerate(PRESERVATION_SPECS, 31))
    stages.extend(make_stage(number, spec) for number, spec in enumerate(LAYER_SPECS, 41))
    (ROOT/'src/coconut/stages.json').write_text(
        json.dumps(stages, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')


if __name__ == '__main__':
    main()
