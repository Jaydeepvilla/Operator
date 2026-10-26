import { DoctorContext, DoctorRule, RuleResult, Violation } from "../types";
import path from "path";
import fs from "fs";

export const verifyUnused: DoctorRule = {
  id: "unused",
  name: "Unused Tokens",
  description: "Verifies unused compliance and best practices.",
  severity: "Error",
  category: "Quality & Compliance",
  async execute(context: DoctorContext): Promise<RuleResult> {
    const violations: Violation[] = [];
    const { projectAst, cwd } = context;

    const sourceFiles = projectAst.getSourceFiles();

    // 1. Detect unused shared components
    const sharedDir = path.join(cwd, "src", "components", "shared");
    if (fs.existsSync(sharedDir)) {
      const sharedComponents = fs.readdirSync(sharedDir)
        .filter(f => f.endsWith(".tsx") || f.endsWith(".ts"))
        .map(f => f.replace(/\.tsx?$/, ""));

      const usedSharedComponents = new Set<string>();

      // Scan all files (app and other components) for imports from shared components
      for (const sourceFile of sourceFiles) {
        const filePath = sourceFile.getFilePath();
        
        const imports = sourceFile.getImportDeclarations();
        for (const imp of imports) {
          const moduleSpecifier = imp.getModuleSpecifierValue();
          // Heuristic: Check if the import path ends with the component name
          for (const component of sharedComponents) {
            if (moduleSpecifier.endsWith(`shared/${component}`) || 
                (moduleSpecifier.includes("components/shared") && moduleSpecifier.includes(component))) {
              usedSharedComponents.add(component);
            }
            // Also check relative imports if the current file is nearby
            if (moduleSpecifier.startsWith(".") && filePath.includes("components")) {
              const resolvedPath = path.resolve(path.dirname(filePath), moduleSpecifier);
              if (resolvedPath.replace(/\\/g, "/").includes(`components/shared/${component}`)) {
                usedSharedComponents.add(component);
              }
            }
          }
        }
      }

      // Design system primitives and structural components that are provided for future use
      const ALLOWED_UNUSED_COMPONENTS = new Set([
        "avatar",
        "badge",
        "dropdown-menu",
        "error-boundary",
        "error-state",
        "section-header",
        "separator",
        "tabs",
        "tooltip",
        "progress",
        "maze-snippet",
        "scroll-reveal-observer",
        "org-switcher",
        "global-search-dialog",
        "notifications-dropdown"
      ]);

      // Check which components are unused
      for (const component of sharedComponents) {
        if (!usedSharedComponents.has(component) && !ALLOWED_UNUSED_COMPONENTS.has(component)) {
          violations.push({
            file: path.join(sharedDir, `${component}.tsx`),
            message: `Unused shared component: '${component}' is exported but never imported anywhere.`,
            severity: 'Error'
          });
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
