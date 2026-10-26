import { DoctorContext, DoctorRule, RuleResult, Violation } from "../types";
import { SyntaxKind, Node, SourceFile } from "ts-morph";
import path from "path";
import fs from "fs";

export const verifyAiCompliance: DoctorRule = {
  id: "ai-compliance",
  name: "AI Compliance",
  description: "Prevents AI coding agents from introducing bad code into the project.",
  severity: "Critical",
  category: "AI Quality",
  async execute(context: DoctorContext): Promise<RuleResult> {
    const violations: Violation[] = [];
    const { projectAst, cwd, changedFiles } = context;

    let filesToScan = projectAst.getSourceFiles();
    if (changedFiles && changedFiles.length > 0) {
      const changedSet = new Set(changedFiles.map(f => path.resolve(cwd, f)));
      filesToScan = filesToScan.filter(sf => changedSet.has(path.resolve(sf.getFilePath())));
    }

    filesToScan = filesToScan.filter(sf => {
      const p = sf.getFilePath();
      return !p.includes("node_modules") && !p.includes(".next") && !p.includes("dist") && !p.includes("build") && !p.includes("coverage") && !p.includes("scratch") && !p.includes("scripts");
    });

    let componentReuseViolations = 0;
    let architectureViolations = 0;
    let designSystemViolations = 0;
    let maintainabilityViolations = 0;
    let productionReadinessViolations = 0;

    const nativeToSharedMap: Record<string, string> = {
      button: "Button",
      input: "Input",
      textarea: "Textarea",
      select: "Select",
      dialog: "Dialog",
      img: "Image",
      a: "Link",
      table: "Table",
    };

    // Helper to add violation and increment penalty
    const addV = (v: Violation, category: "componentReuse" | "architecture" | "designSystem" | "maintainability" | "production") => {
      violations.push(v);
      if (category === "componentReuse") componentReuseViolations++;
      if (category === "architecture") architectureViolations++;
      if (category === "designSystem") designSystemViolations++;
      if (category === "maintainability") maintainabilityViolations++;
      if (category === "production") productionReadinessViolations++;
    };

    const isClientComponent = (sourceFile: SourceFile) => {
      const firstStatement = sourceFile.getStatements()[0];
      if (firstStatement && firstStatement.getKind() === SyntaxKind.ExpressionStatement) {
        const text = firstStatement.getText();
        if (text.includes('"use client"') || text.includes("'use client'")) {
          return true;
        }
      }
      return false;
    };

    for (const sourceFile of filesToScan) {
      const filePath = sourceFile.getFilePath();
      const numLines = sourceFile.getEndLineNumber();
      const isClient = isClientComponent(sourceFile);

      const isComponentFile = (filePath.includes("components") || filePath.includes("app")) && !filePath.includes("schema.ts");
      if (isComponentFile) {
        if (numLines > 3500) {
          addV({ file: filePath, line: 1, message: `Component exceeds 3500 lines (${numLines}).`, severity: "Critical", canAutoFix: false, risk: "High" }, "maintainability");
        } else if (numLines > 3000) {
          addV({ file: filePath, line: 1, message: `Component exceeds 3000 lines (${numLines}).`, severity: "Error", canAutoFix: false, risk: "Medium" }, "maintainability");
        } else if (numLines > 2500) {
          addV({ file: filePath, line: 1, message: `Component exceeds 2500 lines (${numLines}).`, severity: "Warning", canAutoFix: false, risk: "Low" }, "maintainability");
        }
      }

      // 14. DESIGN PATTERNS / ARCHITECTURE
      const fileName = path.basename(filePath, path.extname(filePath));
      if (fileName.toLowerCase().startsWith("new")) {
        const potentialShared = fileName.substring(3).toLowerCase(); // "NewButton" -> "button"
        if (nativeToSharedMap[potentialShared]) {
          addV({ file: filePath, line: 1, message: `Detected 'New${nativeToSharedMap[potentialShared]}' when shared version already exists.`, severity: "Error", canAutoFix: false, risk: "High" }, "architecture");
        }
      }

      // Check imports
      const imports = sourceFile.getImportDeclarations();
      for (const imp of imports) {
        const moduleSpecifier = imp.getModuleSpecifierValue();
        if (moduleSpecifier.includes("../../..")) {
          addV({ file: filePath, line: imp.getStartLineNumber(), message: `Relative import chain too deep: '${moduleSpecifier}'. Use path aliases like '@/'`, severity: "Warning", canAutoFix: false, risk: "Low" }, "architecture");
        }
      }

      let stateVarCount = 0;

      // 12. COMPLEXITY & 10. PRODUCTION & 7. SECURITY & 1. DESIGN SYSTEM
      sourceFile.forEachDescendant(node => {
        const kind = node.getKind();
        
        if (kind === SyntaxKind.CallExpression) {
          const callText = node.getText();
          // Production: console.log
          if (callText.startsWith("console.log")) {
            addV({ file: filePath, line: node.getStartLineNumber(), message: "AI left console.log in code.", severity: "Error", canAutoFix: true, risk: "Low", replacement: "" }, "production");
          }
          if (callText.startsWith("useState")) {
            stateVarCount++;
          }
        }

        if (kind === SyntaxKind.DebuggerStatement) {
          addV({ file: filePath, line: node.getStartLineNumber(), message: "AI left debugger in code.", severity: "Error", canAutoFix: true, risk: "Low", replacement: "" }, "production");
        }

        if (kind === SyntaxKind.SingleLineCommentTrivia || kind === SyntaxKind.MultiLineCommentTrivia) {
          const text = node.getText().toLowerCase();
          if (text.includes("todo") || text.includes("fixme") || text.includes("mock") || text.includes("fake")) {
            addV({ file: filePath, line: node.getStartLineNumber(), message: `Temporary comment found: ${text.trim().substring(0, 30)}...`, severity: "Warning", canAutoFix: false, risk: "Low" }, "production");
          }
        }

        if (kind === SyntaxKind.PropertyAccessExpression) {
           const text = node.getText();
           if (text.startsWith("process.env.") && isClient && !text.startsWith("process.env.NEXT_PUBLIC_")) {
             addV({ file: filePath, line: node.getStartLineNumber(), message: `Potential secret exposure: ${text} used in client component.`, severity: "Critical", canAutoFix: false, risk: "High" }, "architecture");
           }
        }
        
        if (kind === SyntaxKind.JsxAttribute) {
          const name = (node as any).getNameNode().getText();
          
          if (name === "dangerouslySetInnerHTML") {
            addV({ file: filePath, line: node.getStartLineNumber(), message: `Security risk: dangerouslySetInnerHTML used.`, severity: "Error", canAutoFix: false, risk: "High" }, "architecture");
          }
          
          if (name === "className") {
            const init = (node as any).getInitializer?.();
            if (init && init.getKind() === SyntaxKind.StringLiteral) {
               const val = init.getLiteralValue();
               
               // Check Design System hardcoded values
               const hardcodedMatches = val.match(/\b(?:w|h|p|m|gap|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr|inset|top|bottom|left|right|text|bg|border|rounded|shadow|z|opacity)-\[[^\]]+\]\b/g);
               if (hardcodedMatches) {
                 for (const match of hardcodedMatches) {
                    if (!match.includes("var(") && !match.includes("calc(")) {
                      addV({ file: filePath, line: node.getStartLineNumber(), message: `New hardcoded design value introduced: ${match}`, severity: "Error", canAutoFix: false, risk: "Medium" }, "designSystem");
                    }
                 }
               }
               
               // Check Responsive (fixed width/height)
               const fixedMatches = val.match(/\b(?:w|h)-\[[0-9]+px\]\b/g);
               if (fixedMatches) {
                 addV({ file: filePath, line: node.getStartLineNumber(), message: `Fixed responsive constraint: ${fixedMatches[0]}`, severity: "Warning", canAutoFix: false, risk: "Medium" }, "architecture");
               }
            }
          }
        }

        if (kind === SyntaxKind.JsxOpeningElement || kind === SyntaxKind.JsxSelfClosingElement) {
           const tagName = (node as any).getTagNameNode().getText();
           
           if (nativeToSharedMap[tagName] && !filePath.includes("components/shared") && !filePath.includes("components\\shared")) {
              const expectedComponentFile = path.join(cwd, "src", "components", "shared", `${nativeToSharedMap[tagName].toLowerCase()}.tsx`);
              if (fs.existsSync(expectedComponentFile)) {
                addV({ file: filePath, line: node.getStartLineNumber(), message: `Raw HTML <${tagName}> used. Could reuse <${nativeToSharedMap[tagName]}>.`, severity: "Warning", canAutoFix: true, risk: "Low" }, "componentReuse");
              }
           }
           
           if (tagName === "img") {
              // check alt
              const hasAlt = (node as any).getAttributes().some((a: any) => a.getKind() === SyntaxKind.JsxAttribute && a.getNameNode().getText() === "alt");
              if (!hasAlt) {
                 addV({ file: filePath, line: node.getStartLineNumber(), message: `Accessibility: <img> missing 'alt' attribute.`, severity: "Error", canAutoFix: false, risk: "Medium" }, "architecture");
              }
           }
        }
        
        // Functions
        if (kind === SyntaxKind.FunctionDeclaration || kind === SyntaxKind.ArrowFunction || kind === SyntaxKind.FunctionExpression) {
          const startLine = node.getStartLineNumber();
          const endLine = node.getEndLineNumber();
          if (endLine - startLine > 3000) {
             addV({ file: filePath, line: startLine, message: `Function exceeds 3000 lines (${endLine - startLine}).`, severity: "Warning", canAutoFix: false, risk: "Low" }, "maintainability");
          }
        }
      });

      if (stateVarCount > 50) {
         addV({ file: filePath, line: 1, message: `Too many state variables (${stateVarCount}). Consider useReducer or refactoring.`, severity: "Warning", canAutoFix: false, risk: "Medium" }, "maintainability");
      }
    }

    const componentReuseScore = Math.max(0, 100 - componentReuseViolations * 5);
    const architectureScore = Math.max(0, 100 - architectureViolations * 10);
    const designSystemScore = Math.max(0, 100 - designSystemViolations * 5);
    const maintainabilityScore = Math.max(0, 100 - maintainabilityViolations * 5);
    const productionReadinessScore = Math.max(0, 100 - productionReadinessViolations * 10);

    const totalPenalties = 
      (100 - componentReuseScore) + 
      (100 - architectureScore) + 
      (100 - designSystemScore) + 
      (100 - maintainabilityScore) + 
      (100 - productionReadinessScore);
    
    const aiScore = Math.max(0, 100 - totalPenalties);
    
    let aiStatus = "Rejected";
    if (aiScore >= 95) aiStatus = "Excellent";
    else if (aiScore >= 85) aiStatus = "Good";
    else if (aiScore >= 75) aiStatus = "Needs Review";
    else if (aiScore >= 65) aiStatus = "Poor";

    return {
      id: this.id,
      name: this.name,
      category: this.category,
      passed: aiScore >= 80,
      score: aiScore,
      violations,
      metadata: {
        aiScore,
        aiStatus,
        componentReuseScore,
        architectureScore,
        designSystemScore,
        maintainabilityScore,
        productionReadinessScore
      }
    };
  }
};
