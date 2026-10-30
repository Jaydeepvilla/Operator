import { Project, SyntaxKind, JsxElement, JsxSelfClosingElement } from "ts-morph";
import * as path from "path";

// Initialize Project
const project = new Project({
  tsConfigFilePath: path.join(__dirname, "../tsconfig.json"),
});

const scrollClasses = [
  "overflow-y-auto",
  "overflow-x-auto",
  "overflow-auto",
  "overflow-y-scroll",
  "overflow-x-scroll",
  "overflow-scroll",
  "sidebar-scroll",
  "premium-scroll",
  "action-center-scroll",
  "scrollbar-none",
  "scrollbar-hide",
  "no-scrollbar",
  "scrollbar-thin",
  "scrollbar-thumb-zinc-800"
];

const scrollClassRegex = new RegExp(
  `\\b(${scrollClasses.join("|")})\\b`,
  "g"
);

function cleanClassName(value: string): string {
  return value
    .replace(scrollClassRegex, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanExpressionText(text: string): string {
  return text.replace(/'[^']*'|"[^"]*"|`[^`]*`/g, (match) => {
    return cleanClassName(match);
  });
}

let totalFound = 0;
let totalMigrated = 0;

console.log("Scanning repository for scrollable containers...");

const sourceFiles = project.getSourceFiles("src/**/*.tsx");

for (const sourceFile of sourceFiles) {
  const filePath = sourceFile.getFilePath();
  if (filePath.endsWith("scroll-area.tsx")) continue;

  let fileModified = false;
  let foundScrollContainer = true;

  while (foundScrollContainer) {
    foundScrollContainer = false;

    const jsxElements = sourceFile.getDescendantsOfKind(SyntaxKind.JsxElement);
    const jsxSelfClosingElements = sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement);
    const elementsToProcess = [...jsxElements, ...jsxSelfClosingElements];

    for (const element of elementsToProcess) {
      let isScrollContainer = false;
      let classNameAttribute: any = null;

      try {
        if (element.wasForgotten()) continue;
      } catch {
        continue;
      }

      const openEl = element.getKind() === SyntaxKind.JsxElement 
        ? (element as JsxElement).getOpeningElement() 
        : (element as JsxSelfClosingElement);

      const attributes = openEl.getAttributes();
      for (const attr of attributes) {
        if (attr.getKind() === SyntaxKind.JsxAttribute) {
          const jsxAttr = attr as any;
          if (jsxAttr.getNameNode().getText() === "className") {
            classNameAttribute = jsxAttr;
            break;
          }
        }
      }

      if (!classNameAttribute) continue;

      const initializer = classNameAttribute.getInitializer();
      if (!initializer) continue;

      let originalClassNameText = "";
      let isExpression = false;

      if (initializer.getKind() === SyntaxKind.StringLiteral) {
        originalClassNameText = initializer.getLiteralValue();
      } else if (initializer.getKind() === SyntaxKind.JsxExpression) {
        isExpression = true;
        originalClassNameText = initializer.getText();
      }

      const hasScrollClass = scrollClasses.some(cls => originalClassNameText.includes(cls));
      if (hasScrollClass) {
        isScrollContainer = true;
        totalFound++;
      }

      if (isScrollContainer) {
        // Detect scroll direction
        const textToCheck = originalClassNameText.toLowerCase();
        const hasY = textToCheck.includes("overflow-y") || textToCheck.includes("sidebar-scroll") || textToCheck.includes("premium-scroll");
        const hasX = textToCheck.includes("overflow-x") || textToCheck.includes("horizontal");
        
        let directionAttr: { name: string; initializer: string } | null = null;
        if (hasY && !hasX) {
          directionAttr = { name: "horizontal", initializer: "{false}" };
        } else if (hasX && !hasY) {
          directionAttr = { name: "vertical", initializer: "{false}" };
        }

        // Clean classes from className attribute
        if (!isExpression) {
          const cleaned = cleanClassName(originalClassNameText);
          classNameAttribute.setInitializer(`"${cleaned}"`);
        } else {
          const cleanedText = cleanExpressionText(originalClassNameText);
          classNameAttribute.setInitializer(cleanedText);
        }

        const tagName = openEl.getTagNameNode().getText();

        if (tagName === "div") {
          if (element.getKind() === SyntaxKind.JsxElement) {
            const el = element as JsxElement;
            const opening = el.getOpeningElement();
            const closing = el.getClosingElement();
            
            let openingText = opening.getText().replace(/^<div/, "<ScrollArea");
            const closingText = closing.getText().replace(/<\/div>$/, "</ScrollArea>");
            
            if (directionAttr) {
              const attrString = ` ${directionAttr.name}=${directionAttr.initializer}`;
              if (openingText.endsWith("/>")) {
                openingText = openingText.slice(0, -2) + attrString + "/>";
              } else if (openingText.endsWith(">")) {
                openingText = openingText.slice(0, -1) + attrString + ">";
              }
            }
            
            const bodyText = el.getSourceFile().getFullText().substring(
              opening.getEnd(),
              closing.getStart()
            );
            
            const newText = `${openingText}${bodyText}${closingText}`;
            el.replaceWithText(newText);
          } else {
            const el = element as JsxSelfClosingElement;
            let elText = el.getText().replace(/^<div/, "<ScrollArea");
            if (directionAttr) {
              const attrString = ` ${directionAttr.name}=${directionAttr.initializer}`;
              if (elText.endsWith("/>")) {
                elText = elText.slice(0, -2) + attrString + "/>";
              } else if (elText.endsWith(">")) {
                elText = elText.slice(0, -1) + attrString + ">";
              }
            }
            el.replaceWithText(elText);
          }
          fileModified = true;
          totalMigrated++;
          foundScrollContainer = true;
          sourceFile.saveSync();
          sourceFile.refreshFromFileSystemSync();
          console.log(`[MIGRATED] div -> ScrollArea in ${path.relative(process.cwd(), filePath)}`);
          break; // Break the elements loop to restart with clean AST
        } else {
          if (element.getKind() === SyntaxKind.JsxElement) {
            const el = element as JsxElement;
            const opening = el.getOpeningElement();
            const closing = el.getClosingElement();
            
            const bodyText = el.getSourceFile().getFullText().substring(
              opening.getEnd(),
              closing.getStart()
            );
            const extraProps = directionAttr ? ` ${directionAttr.name}=${directionAttr.initializer}` : "";
            const newText = `${opening.getText()}<ScrollArea className="h-full w-full"${extraProps}>${bodyText}</ScrollArea>${closing.getText()}`;
            el.replaceWithText(newText);
            fileModified = true;
            totalMigrated++;
            foundScrollContainer = true;
            sourceFile.saveSync();
            sourceFile.refreshFromFileSystemSync();
            console.log(`[WRAPPED] ${tagName} -> ScrollArea inside in ${path.relative(process.cwd(), filePath)}`);
            break; // Break the elements loop to restart with clean AST
          } else {
            console.warn(`[SKIPPED] Self-closing ${tagName} in ${path.relative(process.cwd(), filePath)}`);
          }
        }
      }
    }
  }

  if (fileModified) {
    const imports = sourceFile.getImportDeclarations();
    const hasScrollAreaImport = imports.some(imp => {
      return imp.getModuleSpecifierValue().includes("scroll-area") ||
             imp.getNamedImports().some(n => n.getName() === "ScrollArea");
    });

    if (!hasScrollAreaImport) {
      sourceFile.addImportDeclaration({
        namedImports: ["ScrollArea"],
        moduleSpecifier: "@/components/ui/scroll-area",
      });
    }

    sourceFile.saveSync();
  }
}

console.log("\n==========================================");
console.log(`Migration Complete:`);
console.log(`- Total scroll containers found: ${totalFound}`);
console.log(`- Total migrated: ${totalMigrated}`);
console.log("==========================================");
