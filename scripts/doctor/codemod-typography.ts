import fs from "fs";
import path from "path";

function walk(dir: string): string[] {
  let files: string[] = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (f !== "node_modules" && f !== ".next" && f !== "dist" && f !== "build") {
        files = files.concat(walk(p));
      }
    } else if (f.endsWith(".tsx") || f.endsWith(".ts")) {
      files.push(p);
    }
  }
  return files;
}

const files = walk("src");
let replacedSub12Count = 0;
let replacedWeightCount = 0;
let modifiedFilesCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, "utf8");
  let modified = false;

  // Replace sub-12px arbitrary text sizes with text-caption
  const sub12Regex = /\btext-\[(?:9|10|11)px\]/g;
  const sub12Matches = content.match(sub12Regex);
  if (sub12Matches) {
    content = content.replace(sub12Regex, "text-caption");
    replacedSub12Count += sub12Matches.length;
    modified = true;
  }

  // Replace excessive font weights with font-semibold
  const weightRegex = /\bfont-extrabold\b/g;
  const weightMatches = content.match(weightRegex);
  if (weightMatches) {
    content = content.replace(weightRegex, "font-semibold");
    replacedWeightCount += weightMatches.length;
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(file, content, "utf8");
    modifiedFilesCount++;
    console.log(`Normalized typography in ${file}`);
  }
}

console.log(`\nTypography Normalization Complete.`);
console.log(`Modified files: ${modifiedFilesCount}`);
console.log(`Sub-12px classes converted to text-caption: ${replacedSub12Count}`);
console.log(`Font-extrabold converted to font-semibold: ${replacedWeightCount}`);
