import { Document } from "@langchain/core/documents";

export  function reciprocalRankFusion(results: Document[][], k = 60) {
  const fusedScores = new Map();
  console.log("RRF Results:", results);

  for (const docs of results) {
    docs.forEach((doc, rank) => {
      const key = doc.metadata?.source || doc.pageContent;
      const prev = fusedScores.get(key) || { score: 0, doc };
      prev.score += 1 / (k + rank + 1); // +1 for 1-based rank
      fusedScores.set(key, prev);
    });
  }

  const reranked = Array.from(fusedScores.values())
    .sort((a, b) => b.score - a.score);

  return reranked;
}
