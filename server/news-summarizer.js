require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const CACHE_PATH = path.join(__dirname, 'news-cache.json');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function summarizeHeadlines(headlines) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[news-summarizer] No ANTHROPIC_API_KEY — skipping summarization');
    return headlines.map(h => ({ ...h, summary: null }));
  }

  const headlineList = headlines
    .map((h, i) => `${i + 1}. ${h.headline}`)
    .join('\n');

  const prompt = `다음 영문 경제 뉴스 헤드라인들을 각각 한국어 한 문장(30자 이내)으로 요약해줘.
JSON 배열로만 응답해. 각 항목: {"headline": "원문", "summary": "한국어 요약"}

헤드라인 목록:
${headlineList}`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].text.trim();
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array in response');

    const summaries = JSON.parse(jsonMatch[0]);
    return headlines.map((h, i) => ({
      ...h,
      summary: summaries[i]?.summary || null,
    }));
  } catch (err) {
    console.error('[news-summarizer] Claude API error:', err.message);
    return headlines.map(h => ({ ...h, summary: null }));
  }
}

function saveCache(news, cachePath = CACHE_PATH) {
  const today = new Date().toISOString().split('T')[0];
  const cache = {
    date: today,
    updatedAt: new Date().toISOString(),
    news,
  };
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf-8');
}

module.exports = { summarizeHeadlines, saveCache, CACHE_PATH };
