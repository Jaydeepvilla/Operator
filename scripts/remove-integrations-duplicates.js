const fs = require('fs');

let file = fs.readFileSync('src/app/integrations/page.tsx', 'utf8');

// Find the duplicate SECTION 2: ELEVATED NETWORK GRAPH VISUALIZER
const dupStart = file.indexOf('SECTION 2: ELEVATED NETWORK GRAPH VISUALIZER');
const customReq = file.indexOf('SECTION 7: REQUEST CUSTOM INTEGRATION');

if (dupStart !== -1 && customReq !== -1) {
  const cutStart = file.lastIndexOf('{/*', dupStart);
  const cutEnd = file.lastIndexOf('{/*', customReq);

  file = file.slice(0, cutStart) + file.slice(cutEnd);
  console.log('Removed duplicate sections from integrations page!');
  fs.writeFileSync('src/app/integrations/page.tsx', file, 'utf8');
} else {
  console.log('Not found:', { dupStart, customReq });
}
