import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const tools = [
  {
    name: 'search_reviews',
    description: '작품 제목으로 다른 사람들의 리뷰와 감상을 검색합니다. 다양한 쿼리로 여러 번 호출해서 풍부한 독자 반응을 수집하세요.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '검색 쿼리. 예: "채식주의자 독후감 블로그", "채식주의자 리뷰 아쉬운점"' },
      },
      required: ['query'],
    },
  },
  {
    name: 'structure_result',
    description: '검색과 분석이 모두 완료된 후 최종 결과를 구조화해서 반환합니다. 반드시 search_reviews를 최소 3회 호출한 이후에만 사용하세요.',
    input_schema: {
      type: 'object',
      properties: {
        similar: {
          type: 'string',
          description: '사용자 감상과 비슷한 다른 독자들의 반응. 각 포인트 끝에 [N] 형식으로 출처 번호 표시.',
        },
        different: {
          type: 'string',
          description: '사용자와 다른 시각이나 반대 해석을 가진 독자들의 반응. 각 포인트 끝에 [N] 출처 번호 표시.',
        },
        missed: {
          type: 'string',
          description: '사용자가 놓쳤을 수 있는 흥미로운 관점. 각 포인트 끝에 [N] 출처 번호 표시.',
        },
        sources: {
          type: 'array',
          description: '본문에서 [N]으로 인용한 출처 목록. 번호는 1부터 시작.',
          items: {
            type: 'object',
            properties: {
              n:     { type: 'number', description: '출처 번호' },
              title: { type: 'string', description: '출처 제목' },
              url:   { type: 'string', description: '출처 URL' },
            },
            required: ['n', 'title', 'url'],
          },
        },
      },
      required: ['similar', 'different', 'missed', 'sources'],
    },
  },
];

const mediaConfig = {
  book:  { label: '책',         noun: '독자',   searchTerms: ['독후감 후기', '서평 블로그', '리뷰 비판 아쉬운점'] },
  movie: { label: '영화',       noun: '관객',   searchTerms: ['관람후기 감상', '리뷰 블로그', '비판 단점 아쉬운점'] },
  drama: { label: '드라마',     noun: '시청자', searchTerms: ['시청후기 감상', '리뷰 블로그', '비판 단점 아쉬운점'] },
  anime: { label: '애니메이션', noun: '시청자', searchTerms: ['감상 후기', '리뷰 블로그', '비판 단점 아쉬운점'] },
};

async function searchReviews(query) {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      max_results: 5,
      search_depth: 'basic',
      include_answer: false,
    }),
  });
  const data = await response.json();
  return data.results?.map((r) => ({ title: r.title, content: r.content, url: r.url })) ?? [];
}

function buildPrompt(cfg, title, review) {
  const exampleQueries = cfg.searchTerms.map((t) => `"${title} ${t}"`).join(', ');

  return `당신은 사용자의 작품 감상을 다른 실제 독자들의 반응과 비교해주는 에이전트입니다.

## 작품 정보
- ${cfg.label}: "${title}"
- 사용자 감상: ${review}

## 작업 순서

### 1단계 — 다각도 검색 (search_reviews 최소 3회 필수)
아래 유형으로 각각 검색하세요. 예시 쿼리: ${exampleQueries}

- **일반 독자 후기**: "[제목] 독후감" / "[제목] 감상 후기 블로그"
- **커뮤니티·SNS 반응**: "[제목] 리뷰 어땠나요" / "[제목] 느낀점 의견"
- **비판·다른 시각**: "[제목] 비판 아쉬운점 단점" / "[제목] 별로였던 이유"

### 2단계 — 출처 번호 부여
검색 결과 각 출처에 [1], [2], [3]... 번호를 붙이세요. 같은 URL이 여러 검색에 나왔다면 같은 번호를 사용하세요.

### 3단계 — structure_result 호출
아래 기준으로 각 섹션을 작성하고 반드시 출처를 인라인으로 표시하세요.

**similar** — 사용자 감상과 비슷하거나 공감대가 형성된 ${cfg.noun}들의 반응
**different** — 나와 다른 관점이나 반대되는 해석을 가진 ${cfg.noun}들의 시각
**missed** — 사용자 감상에 아예 등장하지 않는 새로운 해석 틀이나 주제. 사용자가 미처 주목하지 않은 상징, 사회적 맥락, 전혀 다른 해석 방식. "이런 관점에서 볼 수도 있었구나"라는 느낌을 주는 것이어야 하며, **different와 겹치지 않도록** 주의.

## 작성 원칙
- 평론가 분석보다 **일반 ${cfg.noun}의 날 것 반응**을 우선하세요
- 검색 결과에서 실제로 발견한 내용만 쓰고, 없으면 억지로 만들지 마세요
- 가능하면 원문 표현을 짧게 인용하세요 (예: "결말이 너무 열려 있어서 답답했다는 반응 [2]")
- 각 불릿 포인트마다 반드시 [N] 출처를 하나 이상 붙이세요
- 표(table)는 사용하지 마세요`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { mediaType = 'book', title, review } = req.body;
  if (!title || !review) {
    return res.status(400).json({ error: '제목과 감상평을 입력해주세요.' });
  }

  const cfg = mediaConfig[mediaType] || mediaConfig.book;
  const messages = [{ role: 'user', content: buildPrompt(cfg, title, review) }];

  let response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 6000,
    tools,
    messages,
  });

  // 서버에서 직접 출처 번호 관리 — 에이전트 응답에 의존하지 않음
  const sourceRegistry = {}; // url -> { n, title, url }
  let sourceCounter = 1;

  while (response.stop_reason === 'tool_use') {
    const toolUses = response.content.filter((b) => b.type === 'tool_use');

    const structureCall = toolUses.find((t) => t.name === 'structure_result');
    if (structureCall) {
      const sources = Object.values(sourceRegistry).sort((a, b) => a.n - b.n);
      return res.status(200).json({ result: structureCall.input, sources });
    }

    const toolResults = await Promise.all(
      toolUses.map(async (toolUse) => {
        const searchResults = await searchReviews(toolUse.input.query);

        // 새 URL만 번호 부여, 중복은 기존 번호 재사용
        const numbered = searchResults.map((r) => {
          if (!sourceRegistry[r.url]) {
            sourceRegistry[r.url] = { n: sourceCounter++, title: r.title, url: r.url };
          }
          return { ...r, sourceNumber: sourceRegistry[r.url].n };
        });

        return {
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(numbered),
        };
      })
    );

    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });

    response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 6000,
      tools,
      messages,
    });
  }

  // fallback
  const text = response.content.find((b) => b.type === 'text')?.text ?? '';
  const sources = Object.values(sourceRegistry).sort((a, b) => a.n - b.n);
  return res.status(200).json({
    result: { similar: text, different: '', missed: '' },
    sources,
  });
}
