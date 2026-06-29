import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const tools = [
  {
    name: 'search_book_reviews',
    description: '책 제목으로 다른 독자들의 독후감과 리뷰를 검색합니다.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '검색할 쿼리 (예: "채식주의자 독후감 감상")',
        },
      },
      required: ['query'],
    },
  },
];

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

  const { bookTitle, myReview } = req.body;
  if (!bookTitle || !myReview) {
    return res.status(400).json({ error: '책 제목과 감상평을 입력해주세요.' });
  }

  const messages = [
    {
      role: 'user',
      content: `책 제목: "${bookTitle}"

나의 독후감:
${myReview}

위 책에 대한 다른 독자들의 독후감과 리뷰를 검색해서, 내 생각과 비슷한 부분과 다른 시각을 정리해줘. 그리고 내가 놓쳤을 수 있는 흥미로운 관점도 알려줘.`,
    },
  ];

  // 에이전트 루프
  let response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    tools,
    messages,
  });

  while (response.stop_reason === 'tool_use') {
    const toolUse = response.content.find((b) => b.type === 'tool_use');
    const searchResults = await searchReviews(toolUse.input.query);

    messages.push({ role: 'assistant', content: response.content });
    messages.push({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(searchResults),
        },
      ],
    });

    response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      tools,
      messages,
    });
  }

  const result = response.content.find((b) => b.type === 'text')?.text ?? '';
  return res.status(200).json({ result });
}
