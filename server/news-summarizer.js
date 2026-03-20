require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CACHE_PATH = path.join(__dirname, 'news-cache.json');
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

async function summarizeHeadlines(headlines) {
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn('[news-summarizer] No OPENROUTER_API_KEY — skipping summarization');
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
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: OPENROUTER_MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const raw = response.data.choices[0].message.content.trim();
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array in response');

    const summaries = JSON.parse(jsonMatch[0]);
    return headlines.map((h, i) => ({
      ...h,
      summary: summaries[i]?.summary || null,
    }));
  } catch (err) {
    console.error('[news-summarizer] OpenRouter API error:', err.message);
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
