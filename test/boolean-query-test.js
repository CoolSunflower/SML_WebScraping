import assert from 'assert';
import { matchesBooleanQuery } from '../src/common/parser.js';

const longNegative = 'trends* OR finance OR NYSE OR stock* OR value OR share OR shareholder* OR "share holder*" OR bid OR forecast* OR mercato OR financ* OR invest* OR Benchmar* OR profits OR market OR markets OR marché OR valeur OR bourse OR "wall street" OR mercado OR mercato OR super_stryker OR "mortal kombat" OR mortalkombat* OR ejercito* OR soldad* OR predator* OR R6 OR rainbow6 OR "rainbow 6" OR gun OR gunporn* OR trigger*';

const article1 = `
  <html>
    <body>
      The salvation beams system by Stryker is trending in orthopedics.
      Another line about T2 femur nails and stock performance on Wall Street.
    </body>
  </html>
`;

const article2 = `
  <div>
    Aequalis Humeral Nail delivers stable fixation for proximal humerus fractures.
    Clinical outcomes reported in the latest shoulder symposium proceedings.
  </div>
`;

const article3 = `
  <p>
    Breaking: New tournament for Mortal Kombat with top players; no medical devices here.
    Investors discuss stock trends around gaming companies on Wall Street.
  </p>
`;

const article4 = `
  <section>
    Report on Wright Medical's latest shoulder implant family with trendsetting designs.
    No mention of salvation products or stryker portfolio items.
  </section>
`;

function runCase(label, article, query, expect, note) {
  const result = matchesBooleanQuery(article, query);
  console.log(`\n${label}`);
  console.log('Query :', query);
  console.log('Expect:', expect, note ? `(${note})` : '');
  console.log('Actual:', result);
  assert.strictEqual(result, expect, label);
}

// Query 1
const query1 = '("salvation beams" OR salvationbeams OR "salvation beam" OR salvationbeam) AND (stryker OR wright*)';
runCase('Case 1a: salvation beams present with stryker', article1, query1, true, 'phrase + brand hit');
runCase('Case 1b: salvation beams absent', article4, query1, false, 'no salvation beam mention');

// Query 2
const query2 = '"Aequalis Humeral Nail" OR AequalisHumeralNail';
runCase('Case 2a: aequalis mention', article2, query2, true, 'device present');
runCase('Case 2b: aequalis absent', article1, query2, false, 'device missing');

// Query 3
const query3 = '("T2 femur" OR "T2femur") NOT (' + longNegative + ')';
runCase('Case 3a: t2 femur blocked by negatives', article1, query3, false, 'negative terms present (trending/stock/wall street)');
runCase('Case 3b: t2 femur clean', 'T2 femur nail clinical overview with surgical technique details only.', query3, true, 'positive term with no negatives');
runCase('Case 3c: gaming noise blocked', article3, query3, false, 'negative list hits mortal kombat / stock');

console.log('\nAll boolean-query tests passed.');
