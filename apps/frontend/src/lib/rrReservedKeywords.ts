/**
 * Reserved words that cannot be used as usernames.
 * Covers JavaScript/TypeScript keywords, SQL keywords, and other blocked values.
 */
export const RESERVED_KEYWORDS = new Set([
  "break", "case", "catch", "class", "const", "continue", "debugger",
  "default", "delete", "do", "else", "export", "extends", "false",
  "finally", "for", "function", "if", "import", "in", "instanceof",
  "new", "null", "return", "super", "switch", "this", "throw", "true",
  "try", "typeof", "var", "void", "while", "with", "yield", "let",
  "package", "private", "protected", "public", "static", "any", "boolean",
  "constructor", "declare", "get", "module", "require", "number", "set",
  "string", "symbol", "type", "undefined", "unknown", "never", "readonly",
  "keyof", "infer", "as", "from", "of", "namespace", "interface",
  "implements", "enum", "await", "select", "insert", "update", "drop",
  "truncate", "alter", "create", "table", "database", "index", "use",
  "where", "join", "left", "right", "inner", "outer", "on", "and", "or",
  "not", "union", "values", "into", "order", "by", "group", "having",
  "limit", "offset", "distinct", "all", "exists", "like", "between", "is",
]);
