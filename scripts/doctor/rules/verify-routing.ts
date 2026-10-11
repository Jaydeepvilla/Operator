import { DoctorContext, DoctorRule, RuleResult, Violation } from "../types";
import { SyntaxKind } from "ts-morph";
import glob from "fast-glob";
import path from "path";
import fs from "fs";

export const verifyRouting: DoctorRule = {
  id: "routing",
  name: "Routing",
  description: "Verifies routing compliance and best practices.",
  severity: "Error",
  category: "Architecture",
  async execute(context: DoctorContext): Promise<RuleResult> {
    const violations: Violation[] = [];
    const { projectAst, cwd } = context;

    const sourceFiles = projectAst.getSourceFiles();

    // 1. Detect missing page.tsx in route directories
    const appDir = path.join(cwd, "src", "app");
    if (fs.existsSync(appDir)) {
      const directories = await glob(["src/app/**/"], { cwd, onlyDirectories: true, absolute: true });
      
      for (const dir of directories) {
        // Ignore private folders (folders or subfolders starting with _)
        const relativePath = path.relative(appDir, dir);
        const pathSegments = relativePath.split(/[\\/]/);
        if (pathSegments.some(seg => seg.startsWith("_"))) {
          continue;
        }

        const entries = fs.readdirSync(dir, { withFileTypes: true });
        const files = entries.filter(e => e.isFile()).map(e => e.name);

        // If directory has no files (only subdirectories), it is a valid intermediate route segment
        if (files.length === 0) {
          continue;
        }

        const hasNextFile = files.some(f => 
          /^(page|layout|route|default|loading|error|not-found|template)\.(tsx?|jsx?)$/.test(f)
        );

        // If it has code files (.ts, .tsx, .js, .jsx) but no Next.js route file, flag it
        const hasCodeFiles = files.some(f => /\.(tsx?|jsx?)$/.test(f));
        if (!hasNextFile && hasCodeFiles) {
           violations.push({
             file: dir,
             message: `Directory in app router contains non-route code files without a Next.js route file. Suggestion: Use private folders (_folder) or move code outside of src/app/.`,
             severity: 'Error'
           });
        }
      }
    }

    // 2. Detect broken <Link href="...">
    // For a robust system, we should collect all valid route paths first.
    // For this implementation, we will look for hardcoded link formats that seem broken or empty.
    
    for (const sourceFile of sourceFiles) {
      const jsxElements = [
        ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
        ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
      ];

      for (const el of jsxElements) {
        if (el.getTagNameNode().getText() === "Link") {
          const hrefAttr = el.getAttribute("href");
          if (hrefAttr) {
            // Check if it's a string literal
            const initializer = hrefAttr.asKind(SyntaxKind.JsxAttribute)?.getInitializer();
            if (initializer && initializer.isKind(SyntaxKind.StringLiteral)) {
              const href = initializer.getLiteralText();
              if (href === "" || href === "#") {
                violations.push({
                  file: sourceFile.getFilePath(),
                  line: el.getStartLineNumber(),
                  message: `Empty or dead link detected: href="${href}".`,
                severity: 'Error' });
              }
            }
          } else {
             violations.push({
                file: sourceFile.getFilePath(),
                line: el.getStartLineNumber(),
                message: `<Link> component missing 'href' attribute.`,
              severity: 'Error' });
          }
        }
      }

      // 3. Detect broken imports
      const imports = sourceFile.getImportDeclarations();
      for (const imp of imports) {
         const moduleSpecifier = imp.getModuleSpecifierValue();
         // Basic check: if it's a relative import that doesn't exist
         if (moduleSpecifier.startsWith(".")) {
             const resolvedPath = sourceFile.getDirectory().getPath() + "/" + moduleSpecifier;
             // ts-morph usually handles module resolution, we can check if it resolved
             const sourceFileRef = imp.getModuleSpecifierSourceFile();
             if (!sourceFileRef && !moduleSpecifier.endsWith(".css")) {
                // If it can't resolve it and it's not css (which might not be in AST)
                violations.push({
                  file: sourceFile.getFilePath(),
                  line: imp.getStartLineNumber(),
                  message: `Potentially broken import: '${moduleSpecifier}' could not be resolved in the AST.`,
                severity: 'Error' });
             }
         }
      }
    }

    const passed = violations.length === 0;
    const score = passed ? 100 : Math.max(0, 100 - violations.length * 5);

    return {
      id: this.id,
      name: this.name,
      category: this.category,
      passed,
      score,
      violations,
    };
  }
};
