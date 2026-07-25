// 현재 존재하는 모듈들의 검색 프로바이더 등록. 앞으로 태스크/위키/CRM/재무 모듈이
// 생기면 이 파일에 registerSearchProvider 호출만 추가하면 글로벌 검색에 자동 포함된다.
const db = require("../db");
const { registerSearchProvider } = require("./registry");

registerSearchProvider("messenger", (userId, query) => db.searchMessages(userId, query));

registerSearchProvider("directory", (userId, query) => db.searchUsers(query, { excludeUserId: userId }));

registerSearchProvider("project", (userId, query) => db.searchTasks(userId, query));

registerSearchProvider("wiki", (userId, query) => db.searchWikiPages(userId, query));

registerSearchProvider("crm", (userId, query) => db.searchCrmCustomers(userId, query));

module.exports = {};
