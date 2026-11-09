// Small BM25 keyword search. No native modules and no model download,
// so `npx truthlayer` works everywhere. (Embeddings can be added later as an option.)

const STOP = new Set(
  'a an and are as at be by can could do does did for from has have how i if in into is it its me my of on or our so than that the their them then there these they this to was we what when where which who why will with would you your yes no not'.split(' '),
);

function stem(w) {
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

export function tokenize(text) {
  return (String(text).toLowerCase().match(/[a-z0-9]+(?:[._-][a-z0-9]+)*/g) ?? [])
    .filter((w) => !STOP.has(w))
    .map(stem);
}

export class SearchIndex {
  constructor(docs, { k1 = 1.4, b = 0.75 } = {}) {
    this.docs = docs;
    this.k1 = k1;
    this.b = b;
    this.tf = [];
    this.len = [];
    this.df = new Map();
    for (const d of docs) {
      // The heading counts twice: it says what the section is about.
      const tokens = tokenize(`${d.heading} ${d.heading} ${(d.path ?? []).join(' ')} ${d.text}`);
      const tf = new Map();
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
      for (const t of tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
      this.tf.push(tf);
      this.len.push(tokens.length);
    }
    this.avg = this.len.reduce((a, b) => a + b, 0) / Math.max(1, docs.length);
  }

  search(query, k = 5) {
    const q = [...new Set(tokenize(query))];
    const N = this.docs.length;
    const scored = [];
    for (let i = 0; i < N; i++) {
      let score = 0;
      for (const t of q) {
        const f = this.tf[i].get(t);
        if (!f) continue;
        const df = this.df.get(t);
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        score += (idf * f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + (this.b * this.len[i]) / this.avg));
      }
      if (score > 0) scored.push({ doc: this.docs[i], score });
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, k);
  }
}
