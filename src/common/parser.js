/**
 * Parser module for brand classification and boolean matching
 */

// ---------------------
// Boolean query matching
// ---------------------

/**
 * Determines if an article matches a boolean query.
 * Supported operators: AND, OR, NOT, parentheses, quoted phrases, suffix wildcard "*" for prefix token match.
 * Preprocessing: strip HTML, lowercase, replace punctuation/hyphens with spaces, collapse whitespace.
 * @param {string} articleText
 * @param {string} query
 * @returns {boolean}
 */
export function matchesBooleanQuery(articleText, query) {
  if (!query || typeof query !== 'string') {
    return false;
  }

  const normalizedText = normalizeText(articleText ?? '');
  const textTokens = normalizedText.length ? normalizedText.split(' ') : [];
  const textTokenSet = new Set(textTokens);

  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) {
    return false;
  }

  const ast = parseExpression(tokens);
  if (!ast) {
    return false;
  }

  return evaluateAst(ast, { normalizedText, textTokens, textTokenSet });
}

// --------- helpers ---------

function normalizeText(input) {
  if (!input) return '';
  const withoutTags = input.replace(/<[^>]*>/g, ' ');
  const lower = withoutTags.toLowerCase();
  const noPunct = lower.replace(/[^a-z0-9]+/g, ' '); // punctuation and hyphens to spaces
  return noPunct.trim().replace(/\s+/g, ' ');
}

function tokenizeQuery(q) {
  const tokens = [];
  let i = 0;
  const s = q.toLowerCase();

  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '(' || ch === ')') {
      tokens.push(ch);
      i++;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      let phrase = '';
      while (j < s.length && s[j] !== '"') {
        phrase += s[j];
        j++;
      }
      tokens.push({ type: 'phrase', value: normalizeText(phrase) });
      i = j + 1;
      continue;
    }
    // bare word (may include trailing *)
    let j = i;
    let word = '';
    while (j < s.length && !/\s/.test(s[j]) && s[j] !== '(' && s[j] !== ')') {
      word += s[j];
      j++;
    }

    const cleaned = word.toLowerCase().replace(/[^a-z0-9*]+/g, ' ');
    const parts = cleaned.trim().split(/\s+/).filter(Boolean);
    for (const part of parts) {
      if (part === 'and' || part === 'or' || part === 'not') {
        tokens.push({ type: 'op', value: part });
      } else {
        tokens.push({ type: 'term', value: part });
      }
    }
    i = j;
  }
  return insertImplicitAnd(tokens);
}

function insertImplicitAnd(tokens) {
  const result = [];

  const isValue = (tok) => tok === ')' || tok === '(' ? false : tok && tok.type !== 'op';
  const isRightValue = (tok) => tok === '(' || (tok && tok.type !== 'op');

  for (let idx = 0; idx < tokens.length; idx++) {
    const current = tokens[idx];
    const next = tokens[idx + 1];
    result.push(current);

    if (isValue(current) && (isRightValue(next) || (next && next.type === 'op' && next.value === 'not'))) {
      result.push({ type: 'op', value: 'and' });
    }
    if (current === ')' && (isRightValue(next) || (next && next.type === 'op' && next.value === 'not'))) {
      result.push({ type: 'op', value: 'and' });
    }
  }

  return result;
}

// Recursive descent parser with precedence: parentheses > NOT > AND > OR
function parseExpression(tokens) {
  let position = 0;

  function peek() {
    return tokens[position];
  }

  function consume() {
    return tokens[position++];
  }

  function parsePrimary() {
    const tok = peek();
    if (!tok) return null;
    if (tok === '(') {
      consume();
      const expr = parseOr();
      if (peek() === ')') consume();
      return expr;
    }
    if (tok.type === 'phrase' || tok.type === 'term') {
      consume();
      return { type: 'term', value: tok.value, isPhrase: tok.type === 'phrase' || tok.value.includes(' ') };
    }
    return null;
  }

  function parseNot() {
    if (peek() && peek().type === 'op' && peek().value === 'not') {
      consume();
      const node = parseNot();
      return { type: 'not', child: node };
    }
    return parsePrimary();
  }

  function parseAnd() {
    let left = parseNot();
    while (peek() && peek().type === 'op' && peek().value === 'and') {
      consume();
      const right = parseNot();
      left = { type: 'and', left, right };
    }
    return left;
  }

  function parseOr() {
    let left = parseAnd();
    while (peek() && peek().type === 'op' && peek().value === 'or') {
      consume();
      const right = parseAnd();
      left = { type: 'or', left, right };
    }
    return left;
  }

  const ast = parseOr();
  return ast;
}

function evaluateAst(node, ctx) {
  if (!node) return false;
  switch (node.type) {
    case 'term':
      return evaluateTerm(node, ctx);
    case 'not':
      return !evaluateAst(node.child, ctx);
    case 'and':
      return evaluateAst(node.left, ctx) && evaluateAst(node.right, ctx);
    case 'or':
      return evaluateAst(node.left, ctx) || evaluateAst(node.right, ctx);
    default:
      return false;
  }
}

function evaluateTerm(node, ctx) {
  const { normalizedText, textTokens, textTokenSet } = ctx;
  const term = node.value;

  if (!term) return false;

  // Phrase (explicit or contains space after normalization)
  if (node.isPhrase) {
    const phrase = normalizeText(term);
    if (!phrase) return false;
    return normalizedText.includes(phrase);
  }

  // Wildcard suffix: prefix match on tokens
  if (term.endsWith('*')) {
    const prefix = term.slice(0, -1);
    if (!prefix) return false;
    return textTokens.some(t => t.startsWith(prefix));
  }

  // Exact token match
  return textTokenSet.has(term);
}

// ---------------------
// Brand classification (placeholder)
// ---------------------

/**
 * Classifies content based on brand rules
 * @param {string} text - The text content to classify
 * @returns {{brand: string, subbrand: string, sentiment: string} | null}
 */
export function classifyContent(text) {
  // TODO: Implement actual brand classification logic
  if (!text || typeof text !== 'string') {
    return null;
  }

  // Placeholder: always returns null until rules are added
  return null;
}

/**
 * Placeholder for brand rules configuration
 * Each brand will have its own rule following the grammar
 */
export const brandRules = {
  // Example structure:
  // "BrandName": {
  //   rule: "keyword1 AND keyword2",
  //   subbrands: {
  //     "SubbrandA": "keyword3 OR keyword4",
  //     "SubbrandB": "keyword5 NEAR/5 keyword6"
  //   }
  // }
};
