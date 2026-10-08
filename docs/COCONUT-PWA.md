# 시퀀스팡3 앱 아이콘과 PWA

2026-10-04. 코코넛 게임 `/`를 홈 화면에 설치할 수 있도록 구성했습니다.

## 사용자 흐름

- 메인의 **홈 화면에 설치**를 누릅니다. 브라우저가 설치 요청을 제공하면 해당 요청을 엽니다.
- 설치 요청을 제공하지 않으면 Android Chrome 메뉴 또는 iPhone Safari 공유 메뉴를 이용하는 안내를 표시합니다. 앱 내부 브라우저에서는 Chrome/Safari로 주소를 열어야 할 수 있습니다.
- 설치 후 시작 주소는 `/`이며, 독립 앱 창으로 표시됩니다.
- 첫 온라인 접속에서 오프라인 준비가 끝나면 전체 50단계, 캐릭터, 로컬 글꼴, 플레이 방법을 오프라인에서도 사용할 수 있습니다. 클리어 기록은 기존 브라우저 저장 방식을 유지합니다.

## 파일과 동작

|파일|역할|
|---|---|
|`public/manifest.webmanifest`|앱 이름·시작 주소·범위·아이콘·독립 표시 모드|
|`public/coconut/icons/icon-master.webp`|1024px 아이콘 원본|
|`public/coconut/icons/icon-192.png`|192px 일반 앱 아이콘|
|`public/coconut/icons/icon-512.png`|512px 일반 앱 아이콘|
|`public/coconut/icons/icon-maskable-512.png`|안드로이드 모양별 잘림에 여백을 둔 별도 아이콘|
|`public/coconut/icons/apple-touch-icon.png`|180px iOS 홈 화면 아이콘|
|`public/coconut/icons/favicon-32.png`|32px 브라우저 아이콘|
|`index.html`|manifest·favicon·Apple 메타데이터 연결|
|`coconut/index.html`|기존 링크에서 루트로 이동하는 호환 페이지|
|`src/coconut/usePwaInstall.ts`|설치 이벤트·독립 모드 감지·서비스 워커 등록|
|`src/coconut/InstallGuide.tsx`|설치 메뉴 안내|
|`scripts/build-coconut-sw.mjs`|Vite 빌드 결과로 서비스 워커 생성|

기본 주소로 코코넛 게임을 이동한 최신 변경을 유지합니다. 기존 manifest의 앱 식별자를 `id: "/"`로 명시하고, 시작 주소와 scope도 `/`로 설정했습니다. `/coconut`, `/coconut/`, `/coconut/index.html`은 쿼리를 유지하며 루트로 이동합니다. 기존 손패 실험 게임은 현재 배포에 포함하지 않습니다.

빌드 시 실제 해시 파일 이름과 콘텐츠로 캐시 버전을 계산합니다. HTML, JS/CSS, 글꼴, 캐릭터, 설치 아이콘을 미리 저장합니다. 온라인 탐색은 네트워크를 사용하고, 실패하면 해당 캐시 버전의 HTML을 사용합니다. 온라인 HTML로 오프라인 HTML을 덮어쓰지 않아, HTML과 JS 버전이 섞이는 문제를 피합니다.

새 서비스 워커는 기존 게임 창이 닫히거나 제어 범위를 벗어날 때까지 기다립니다. 플레이 중 강제 새로고침·`skipWaiting()`을 사용하지 않습니다. 활성화 후 이 게임 접두사를 가진 이전 캐시만 제거합니다. `localStorage`와 다른 앱 캐시는 삭제하지 않습니다. 개발 서버에는 워커를 등록하지 않으며, `npm run build`가 완전한 오프라인 패키지를 생성합니다.

## 검증

`docs/verification/coconut-pwa.json`에 Chromium 153 결과를 기록했습니다. manifest 설치 조건 오류 0개, 모든 PNG 실제 크기 확인, 오프라인 새 탐색·글꼴·캐릭터·안내·30단계 클릭 클리어·기록 복원, 서비스 워커 교체 대기와 캐시 정리, 320px 배치를 확인했습니다. 설치 요청과 설치 완료 이벤트 처리는 시뮬레이션으로 확인했으며 실제 Android/iOS 기기의 홈 화면 설치는 별도 기기 검토 대상입니다. 규칙·기본 주소 회귀 테스트 72개와 프로덕션 빌드도 통과했습니다.

2026-10-08 확장에서는 40단계 전체 데이터가 새 빌드 캐시에 포함됩니다. 오프라인 새로고침 후 39단계 기록에서 40단계를 시작해 실제 패 클릭으로 완주하고, 다시 오프라인에서 40/40 기록이 복원되는 것을 확인했습니다. [40단계 확장 검증 기록](verification/coconut-40-stages.json)을 참고하세요.

이어진 3층 확장에서는 50단계 전체 데이터가 빌드 캐시에 포함됩니다. 오프라인 새로고침 후 49단계 기록에서 50단계를 시작해 완주하고, 다시 오프라인에서 50/50 기록이 복원되는 것을 확인했습니다. [50단계 확장 검증 기록](verification/coconut-50-stages.json)을 참고하세요.

## 아이콘 제작 기록

기존 코코넛 캐릭터를 참고한 내장 이미지 생성 도구를 사용했습니다. 생성된 그림은 위 경로로 복사·포맷 변환했고 PNG 파생 파일은 규격 크기로 출력했습니다. 원본 생성 파일은 삭제하지 않았습니다.

일반 아이콘 프롬프트:

```text
Use case: logo-brand. Asset type: final square PWA app icon for Korean game SequencePang3 (coconut number-sequence mahjong solitaire). Reference image is the game's existing coconut mascot, identity/style reference. Generate one 1024x1024 opaque square app icon, flat full-bleed deep forest teal background #074b43 with a subtle soft luminous center. Center this same adorable half-coconut character with cream face, big shiny brown eyes, joyful smile, brown coconut shell and two fresh green leaves, polished soft 3D game art. In front at bottom-right of coconut, a single thick ivory mahjong-like tile with a large dark-teal numeral '3'. Composition simple and instantly readable at tiny phone icon sizes. Keep all critical artwork, including leaf tips and the tile numeral, fully inside the centered maskable safe circle of radius 40 percent of image width. Coconut and tile as one close compact silhouette, ample uninterrupted background around outer edge. Preserve mascot identity and series warm ivory / teal / mint palette. No extra fruits, no dragonfruit, no Latin or Korean wording, no watermark. Do not draw a phone, presentation mockup, external frame, rounded outside corners, or transparent background. Output just one finished square icon image. Save usable image for project integration.
```

Android maskable 아이콘 편집 프롬프트:

```text
Edit target: this exact finished SequencePang3 coconut app icon. Create its Android MASKABLE companion. Preserve the identical coconut character and identical ivory tile with numeral 3, their colors and details. Change only composition scale and background extension: shrink the entire coconut/leaves/tile assembly to fit inside the centered circle of radius 35% of canvas width, centered at (50%,50%). All leaf tips, hands and tile corners MUST fit inside that circle. Ample wide forest teal background around all edges. Seamlessly extend the original teal luminous gradient throughout the entire opaque square, without a visible inset square boundary. Do not add any new objects or text. Full-bleed square canvas, no external frame or rounded corners. This is an application asset, not a product mockup.
```

참고한 공식 문서: [manifest](https://web.dev/articles/add-manifest), [service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers), [설치 이벤트](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event).
