# Review Prism

책, 영화, 드라마 등 다양한 작품에 대한 나의 감상을 입력하면, AI가 다른 사람들의 시각을 찾아 독서·관람 노트를 풍성하게 만들어주는 에이전트 서비스입니다.

## 주요 기능

- **감상 분석**: 작품 제목과 나의 감상평을 입력하면 AI가 다른 사람들의 리뷰를 자동으로 검색
- **시각 비교**: 내 생각과 비슷한 부분, 다른 관점, 내가 놓쳤을 수 있는 시각을 정리해서 제공
- **풍성한 노트 생성**: 여러 독자·관람객의 시각을 종합해 더 깊이 있는 감상 노트 완성

## 기술 스택

| 구분 | 기술 |
|---|---|
| 프론트엔드 | Vue 3, Vite |
| 백엔드 | Node.js, Express |
| AI | Anthropic Claude (claude-sonnet-4-6) |
| 검색 | Tavily Search API |
| 배포 | Vercel |

## 로컬 실행

**1. 패키지 설치**
```bash
npm install
```

**2. 환경변수 설정**

`.env.local` 파일을 생성하고 아래 키를 입력합니다.
```
ANTHROPIC_API_KEY=your_anthropic_api_key
TAVILY_API_KEY=your_tavily_api_key
```

**3. 개발 서버 실행**
```bash
npm run dev
```

프론트엔드(Vite)와 백엔드(Express) 서버가 동시에 실행됩니다.

## 배포

GitHub 레포지토리를 Vercel에 연결하고, 아래 환경변수를 Vercel 대시보드에 설정합니다.

```
ANTHROPIC_API_KEY
TAVILY_API_KEY
```
