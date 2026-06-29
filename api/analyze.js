import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const tools = [
  {
    name: 'search_reviews',
    description: '작품 제목으로 다른 사람들의 리뷰와 감상을 검색합니다.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '검색할 쿼리 (예: "채식주의자 독후감 감상")' },
      },
      required: ['query'],
    },
  },
  {
    name: 'structure_result',
    description: '검색과 분석이 완료되면 이 툴을 호출해서 결과를 세 섹션으로 구조화합니다.',
    input_schema: {
      type: 'object',
      properties: {
        similar: { type: 'string', description: '내 감상과 비슷한 시각들' },
        different: { type: 'string', description: '나와 다른 시각들' },
        missed: { type: 'string', description: '내가 놓쳤을 수 있는 흥미로운 관점들' },
      },
      required: ['similar', 'different', 'missed'],
    },
  },
];

const mediaConfig = {
  book:  { label: '책',         audience: '독자들',   reviewWord: '독후감과 리뷰' },
  movie: { label: '영화',       audience: '관객들',   reviewWord: '리뷰와 감상' },
  drama: { label: '드라마',     audience: '시청자들', reviewWord: '리뷰와 감상' },
  anime: { label: '애니메이션', audience: '시청자들', reviewWord: '리뷰와 감상' },
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

  const messages = [
    {
      role: 'user',
      content: `${cfg.label} 제목: "${title}"

나의 감상:
${review}

위 ${cfg.label}에 대한 다른 ${cfg.audience}의 ${cfg.reviewWord}를 search_reviews 툴로 검색한 뒤, 분석이 끝나면 반드시 structure_result 툴을 호출해 결과를 반환해주세요.

각 섹션 작성 기준:
- similar: 내 감상과 비슷하거나 공감대가 형성된 시각들
- different: 나와 다른 관점이나 반대되는 해석들
- missed: 내가 놓쳤을 수 있는 흥미로운 관점이나 새로운 시각들

각 섹션은 불릿 포인트나 문단으로 작성하고, 표(table)는 사용하지 마세요.`,
    },
  ];

  let response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    tools,
    messages,
  });

  const allSources = [];

  while (response.stop_reason === 'tool_use') {
    const toolUses = response.content.filter((b) => b.type === 'tool_use');

    const structureCall = toolUses.find((t) => t.name === 'structure_result');
    if (structureCall) {
      return res.status(200).json({ result: structureCall.input, sources: allSources });
    }

    const toolResults = await Promise.all(
      toolUses.map(async (toolUse) => {
        const searchResults = await searchReviews(toolUse.input.query);
        searchResults.forEach((r) => {
          if (r.url && !allSources.find((s) => s.url === r.url)) {
            allSources.push({ title: r.title, url: r.url });
          }
        });
        return {
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(searchResults),
        };
      })
    );

    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });

    response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      tools,
      messages,
    });
  }

  // Claude가 structure_result를 안 쓴 경우 fallback
  const text = response.content.find((b) => b.type === 'text')?.text ?? '';
  return res.status(200).json({ result: { similar: text, different: '', missed: '' }, sources: allSources });
}
