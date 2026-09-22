# 아트 제작 기록

2026-09-22 사용자가 제공한 두 시퀀스팡3 디자인 이미지를 시각 참고 자료로 사용했습니다. 새 지시의 귀여운 캐릭터 방향을 반영했으며, 이미지 안의 임의 수치·카드 설명은 규칙으로 사용하지 않았습니다.

## 생성 자산

도구: 내장 imagegen. 모드: 참조 이미지 기반 편집 / 배경 분리. 투명 PNG로 생성 후 알파를 유지한 WebP로 리사이즈·압축했습니다. 원본 이미지는 프로젝트에 포함하지 않습니다.

- `public/art/dragon-mascot.webp`: 900×900, 약 163 KB.
- `public/art/black-seed.webp`: 512×512, 약 79 KB. 적 종류별 크기·색조 변형을 CSS로 적용합니다.

### 용과 캐릭터 프롬프트

Use case: background-extraction. Asset type: production mobile puzzle game character illustration. Use supplied poster as edit target and visual reference. Extract/recreate ONLY cheerful cute dragon-fruit mascot jumping above cut dragon-fruit bowl, glossy premium 3D toy quality, white seeded flesh face, pink cheeks, closed happy eyes, little pink arms/feet, pink rind and lime green tips. Few sparkles/swooshes okay. Center full mascot and bowl with generous margins on a genuinely transparent alpha background. Square. Remove all words, logos, numbers, tiles, buttons, purple background and foreground fruit corners. No text. Clean compositable asset, not UI.

### 적 프롬프트

Use case: background-extraction. Production mobile puzzle game enemy sprite. Extract/recreate ONLY upper black dragon-fruit seed monster. Full centered character on genuine transparent alpha with margin. Glossy obsidian-purple round seed body, mischievous glowing magenta eyes and broad zigzag mouth, chunky pink dragon-fruit flame crown with some lime green tips, tiny floating black seed companions and restrained magenta aura. Playful toy, premium 3D, cute and formidable, not horror, no gore. Remove all UI, title, numbers, damage, board, labels, buttons, phone status and background. Square isolated sprite, no text.

## 폰트와 UI

- Jua: Google Fonts의 공식 `ofl/jua/Jua-Regular.ttf`. SIL Open Font License 1.1 사본을 `public/fonts/OFL.txt`에 포함합니다.
- 로고·타일·배경·게이지는 HTML/CSS/SVG로 표현합니다. 아이콘은 lucide-react입니다.
- 폰트와 아트는 모두 자체 제공되며, 플레이 중 외부 이미지·폰트 서비스에 요청하지 않습니다.
