import { Project, SyntaxKind, JsxOpeningElement, JsxSelfClosingElement } from "ts-morph";
import path from "path";

const nativeToSharedMap: Record<string, string> = {
  button: "NativeButton",
  input: "NativeInput",
  textarea: "NativeTextarea",
  select: "NativeSelect",
  img: "NativeImg",
  a: "NativeA",
  table: "NativeTable",
};

const componentsMap: Record<string, string> = {
  NativeButton: "@/components/shared/native",
  NativeInput: "@/components/shared/native",
  NativeTextarea: "@/components/shared/native",
  NativeSelect: "@/components/shared/native",
  NativeImg: "@/components/shared/native",
  NativeA: "@/components/shared/native",
  NativeTable: "@/components/shared/native",
};

async function run() {
  const project = new Project({ tsConfigFilePath: "./tsconfig.json" });

  const files = project.getSourceFiles().filter(sf => {
    const p = sf.getFilePath();
    return !p.includes("node_modules") && !p.includes(".next") && !p.includes("dist") && !p.includes("scripts") && !p.includes("src/components/shared");
  });

  let elementsReplaced = 0;

  for (const sf of files) {
    let changed = false;
    const elementsToRename: { node: JsxOpeningElement | JsxSelfClosingElement, from: string, to: string }[] = [];
    const importsToAdd = new Set<string>();

    sf.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.JsxOpeningElement || node.getKind() === SyntaxKind.JsxSelfClosingElement) {
        const tagName = (node as any).getTagNameNode().getText();
        if (nativeToSharedMap[tagName]) {
          elementsToRename.push({ node: node as any, from: tagName, to: nativeToSharedMap[tagName] });
          importsToAdd.add(nativeToSharedMap[tagName]);
        }
      }
    });

    if (elementsToRename.length > 0) {
      // Add imports
      for (const component of importsToAdd) {
        const importPath = componentsMap[component];
        if (importPath) {
          // Check if already imported
          const existingImport = sf.getImportDeclarations().find(imp => imp.getModuleSpecifierValue() === importPath);
          if (!existingImport) {
            sf.addImportDeclaration({
              namedImports: [component],
              moduleSpecifier: importPath
            });
          } else {
             const hasNamed = existingImport.getNamedImports().some(n => n.getName() === component);
             if (!hasNamed) {
                existingImport.addNamedImport(component);
             }
          }
        }
      }

      // Rename elements
      for (const item of elementsToRename) {
         try {
           const tagNameNode = item.node.getTagNameNode();
           tagNameNode.replaceWithText(item.to);
           
           if (item.node.getKind() === SyntaxKind.JsxOpeningElement) {
             const parent = item.node.getParent();
             if (parent && parent.getKind() === SyntaxKind.JsxElement) {
                const closing = (parent as any).getClosingElement();
                closing.getTagNameNode().replaceWithText(item.to);
             }
           }
           
           // Special case for img -> NativeImg
           if (item.to === "NativeImg") {
             // ensure it has alt
             const hasAlt = item.node.getAttributes().some((a:any) => a.getKind() === SyntaxKind.JsxAttribute && a.getName() === "alt");
             if (!hasAlt) {
               item.node.addAttribute({ name: "alt", initializer: '""' });
             }
           }

           elementsReplaced++;
           changed = true;
         } catch (e) {
           console.error("Failed to rename node in " + sf.getFilePath(), e);
         }
      }
    }

    if (changed) {
      sf.saveSync();
    }
  }

  console.log(`Replaced ${elementsReplaced} raw HTML elements with shared components.`);
}

run().catch(console.error);
