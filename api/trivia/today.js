import { getSupabase } from '../../lib/db.js';
import { json, corsPreflight } from '../../lib/res.js';

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return corsPreflight(res);
  if (req.method !== 'GET') return json(res, { error: 'Method not allowed' }, 405);

  const sb = getSupabase();
  if (!sb) return json(res, { question: null });

  const date = todayUtc();
  const { data: row } = await sb
    .from('daily_trivia')
    .select('question_text, options, correct_index')
    .eq('date', date)
    .single();

  if (!row || !row.options || !Array.isArray(row.options) || row.options.length < 6) {
    const fallback = getFallbackTrivia(date);
    if (fallback) return json(res, { question: fallback });
    return json(res, { question: null });
  }

  const options = shuffle(row.options);
  return json(res, {
    question: {
      questionText: row.question_text,
      options,
    },
  });
}

function getFallbackTrivia(date) {
  const seed = date.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const pool = [
    { q: 'What year was Tetris first released?', opts: ['1984', '1989', '1992', '1979', '1986', '1990'], correct: 0 },
    { q: 'How many unique tetromino shapes are there?', opts: ['5', '6', '7', '8', '4', '9'], correct: 2 },
    { q: 'Which key is typically used to rotate in Tetris?', opts: ['Space', 'Up arrow', 'Enter', 'Shift', 'Tab', 'Ctrl'], correct: 1 },
    { q: 'What is clearing 4 lines at once called?', opts: ['Tetris', 'Quad', 'Super', 'Mega', 'Clear', 'Line'], correct: 0 },
    { q: 'In which country was Tetris created?', opts: ['USA', 'Japan', 'Russia', 'UK', 'Germany', 'China'], correct: 2 },
  ];
  const one = pool[seed % pool.length];
  return { questionText: one.q, options: shuffle(one.opts) };
}
