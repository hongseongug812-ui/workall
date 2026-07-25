// 글로벌 검색 프레임워크. 각 모듈(태스크/위키/CRM/재무 등)은 자신만의 검색 함수를
// registerSearchProvider로 등록하면 된다. 상단 검색창은 이 레지스트리 하나만 호출해서
// 모든 모듈의 결과를 동시에 받는다 — 모듈이 새로 생겨도 검색 라우트는 바뀌지 않는다.
const providers = new Map();

// provider: (userId, query) => Array<{ id, title, snippet, link }>
function registerSearchProvider(module, provider) {
  providers.set(module, provider);
}

function runGlobalSearch(userId, query) {
  const results = [];
  for (const [module, provider] of providers) {
    let items = [];
    try {
      items = provider(userId, query) || [];
    } catch (err) {
      console.error(`검색 프로바이더 오류 (${module}):`, err);
    }
    if (items.length > 0) results.push({ module, items });
  }
  return results;
}

module.exports = { registerSearchProvider, runGlobalSearch };
