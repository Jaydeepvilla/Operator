import { Project, SyntaxKind } from "ts-morph";
import path from "path";
import fs from "fs";

async function run() {
  const project = new Project({
    tsConfigFilePath: "./tsconfig.json",
  });

  const files = project.getSourceFiles().filter(sf => {
    const p = sf.getFilePath();
    return !p.includes("node_modules") && !p.includes(".next") && !p.includes("dist") && !p.includes("scripts");
  });

  let consoleLogsRemoved = 0;
  let importsFixed = 0;

  for (const sf of files) {
    let changed = false;

    // 1. Remove console.log
    const calls = sf.getDescendantsOfKind(SyntaxKind.CallExpression);
    // iterate backwards so removing doesn't mess up indices
    for (const call of [...calls].reverse()) {
      if (call.getText().startsWith("console.log")) {
        try {
          // If it's a statement, remove the statement
          const statement = call.getFirstAncestorByKind(SyntaxKind.ExpressionStatement);
          if (statement) {
            statement.remove();
          } else {
            // It might be part of an expression e.g. a => console.log(a)
            // Just replace with void 0
            call.replaceWithText("void 0");
          }
          consoleLogsRemoved++;
          changed = true;
        } catch (e) {
          // Ignore
        }
      }
    }

    // 2. Fix imports
    const imports = sf.getImportDeclarations();
    for (const imp of imports) {
      const mod = imp.getModuleSpecifierValue();
      if (mod.includes("../../..")) {
        // e.g. "../../../../../server/db" -> "@/server/db"
        // Let's find the absolute path it points to and then relativize it from src
        try {
          const dir = path.dirname(sf.getFilePath());
          const resolved = path.resolve(dir, mod);
          const srcPath = path.resolve(process.cwd(), "src");
          if (resolved.startsWith(srcPath)) {
            const rel = path.relative(srcPath, resolved).replace(/\\/g, "/");
            imp.setModuleSpecifier(`@/${rel}`);
            importsFixed++;
            changed = true;
          }
        } catch (e) {
          // Ignore
        }
      }
    }

    if (changed) {
      sf.saveSync();
    }
  }

  console.log(`Removed ${consoleLogsRemoved} console.logs.`);
  console.log(`Fixed ${importsFixed} deep relative imports.`);
}

run().catch(console.error);
