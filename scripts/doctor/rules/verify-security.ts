import { DoctorContext, DoctorRule, RuleResult, Violation } from "../types";
import { SyntaxKind } from "ts-morph";
import path from "path";
import fs from "fs";

export const verifySecurity: DoctorRule = {
  id: "security",
  name: "Security",
  description: "Verifies security compliance and best practices.",
  severity: "Error",
  category: "Architecture",
  async execute(context: DoctorContext): Promise<RuleResult> {
    const violations: Violation[] = [];
    const { projectAst, cwd } = context;

    const sourceFiles = projectAst.getSourceFiles();

    for (const sourceFile of sourceFiles) {
      const filePath = sourceFile.getFilePath();

      // 1. Detect exposed non-public env variables in Client Components
      const isClientComponent = sourceFile.getStatements().some(stmt => 
        stmt.isKind(SyntaxKind.ExpressionStatement) && 
        stmt.getExpression().isKind(SyntaxKind.StringLiteral) && 
        stmt.getExpression().getText() === '"use client"'
      );

      if (isClientComponent) {
        const propertyAccesses = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression);
        for (const access of propertyAccesses) {
            const expression = access.getExpression().getText();
            if (expression === "process.env") {
                const envName = access.getName();
                if (!envName.startsWith("NEXT_PUBLIC_") && envName !== "NODE_ENV") {
                    violations.push({
                        file: filePath,
                        line: access.getStartLineNumber(),
                        message: `Security Risk: Non-public env variable 'process.env.${envName}' accessed in a Client Component.`
                    , severity: 'Error' });
                }
            }
        }
      }

      // 2. Detect Raw SQL string interpolation risks
      // Very basic heuristic for spotting potential SQL injection strings
      const templateExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.TemplateExpression);
      for (const tpl of templateExpressions) {
         const text = tpl.getText().toUpperCase();
         const isSql = 
            (text.includes("SELECT ") && text.includes(" FROM ")) || 
            text.includes("INSERT INTO ") || 
            (text.includes("UPDATE ") && text.includes(" SET ")) || 
            text.includes("DELETE FROM ");
            
         if (isSql) {
            const parent = tpl.getParent();
            const isDrizzleSafe = parent && parent.isKind(SyntaxKind.TaggedTemplateExpression) && parent.getTag().getText() === "sql";
            
            if (!isDrizzleSafe) {
                violations.push({
                    file: filePath,
                    line: tpl.getStartLineNumber(),
                    message: `Security Risk: Possible raw SQL query with string interpolation detected. Suggestion: Ensure parameterized queries or Drizzle ORM is used.`
                , severity: 'Error' });
            }
         }
      }
    }

    // 3. Detect missing auth guard in middleware
    const middlewarePath = path.join(cwd, "src", "middleware.ts");
    const proxyPath = path.join(cwd, "src", "proxy.ts");
    
    let authFile = null;
    if (fs.existsSync(middlewarePath)) authFile = middlewarePath;
    else if (fs.existsSync(proxyPath)) authFile = proxyPath;

    if (authFile) {
        const middlewareContent = fs.readFileSync(authFile, "utf-8");
        if (!middlewareContent.includes("authMiddleware") && !middlewareContent.includes("session") && !middlewareContent.includes("NextAuth")) {
            violations.push({
                file: authFile,
                message: `Security Risk: Middleware does not seem to implement an authentication guard.`
            , severity: 'Error' });
        }
    } else {
       violations.push({
           message: `Security Risk: No middleware.ts (or proxy.ts) found in src/ directory. Ensure routes are properly protected.`
       , severity: 'Error' });
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
