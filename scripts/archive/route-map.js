const fs = require('fs');
const path = require('path');

const appDir = path.join(process.cwd(), 'src/app');

function getRoutes(dir, routeList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getRoutes(filePath, routeList);
    } else if (file === 'page.tsx') {
      routeList.push(filePath);
    }
  }
  return routeList;
}

const pages = getRoutes(appDir);
const report = pages.map(filePath => {
  const relativePath = path.relative(appDir, filePath).replace(/\\/g, '/');
  
  // Compute URL
  let url = '/' + relativePath.replace(/\/page\.tsx$/, '').replace(/page\.tsx$/, '');
  
  // Remove route groups like (dashboard), (auth), etc.
  url = url.split('/').filter(segment => !segment.startsWith('(') || !segment.endsWith(')')).join('/');
  
  if (url === '') url = '/';
  
  const isDynamic = url.includes('[');
  
  return {
    filePath: `src/app/${relativePath}`,
    url,
    isDynamic,
    exists: 'Yes'
  };
});

console.log(JSON.stringify(report, null, 2));
