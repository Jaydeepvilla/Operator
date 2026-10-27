const fs = require('fs');

let content = fs.readFileSync('src/components/forms/onboarding-wizard.tsx', 'utf8');

// 1. Fix "I don't have a website yet" - make it a pure text link, not a Button component
const oldLinkBlock = `<Button
            type="button"
            onClick={() => {
              setNoWebsite((v) => !v);
              setUrl("");
              setError("");
            }}
            className="text-caption text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
          >
            {noWebsite ? "I have a website" : "I don't have a website yet"}
          </Button>`;

const newLinkBlock = `<div className="pt-1">
            <button
              type="button"
              onClick={() => {
                setNoWebsite((v) => !v);
                setUrl("");
                setError("");
              }}
              className="text-body-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4 cursor-pointer"
            >
              {noWebsite ? "← I have a website" : "I don't have a website yet"}
            </button>
          </div>`;

if (content.includes(oldLinkBlock)) {
  content = content.replace(oldLinkBlock, newLinkBlock);
  console.log('Fixed website link');
} else {
  console.log('Could not find old website link block directly, doing regex replace');
  content = content.replace(
    /<Button\s+type="button"\s+onClick=\{[^}]*setNoWebsite[^}]*\}[\s\S]*?<\/Button>/,
    newLinkBlock
  );
}

// 2. In ScreenVerify:
// Remove stepsList definition
content = content.replace(
  /\s*const stepsList = \[\s*\{ id: "info"[\s\S]*?\{ id: "greeting"[\s\S]*?\}\s*\];\s*/,
  '\n'
);

// Remove the top 3-Step Wizard Navigation bar completely
content = content.replace(
  /\s*\{\/\* Clean 3-Step Wizard Navigation \(Replaced Tabs\) \*\/\}[\s\S]*?\{stepsList\.map\([\s\S]*?<\/button>\s*\);\s*\}\)\}\s*<\/div>/,
  ''
);

// Sub-step 1: add "Business Info" heading & change button to "Next"
const oldSubstep1Start = `{subStep === "info" && (
        <div className="space-y-space-4 animate-fade-up" style={{ animationFillMode: "both" }}>`;

const newSubstep1Start = `{subStep === "info" && (
        <div className="space-y-space-4 animate-fade-up" style={{ animationFillMode: "both" }}>
          <div>
            <h3 className="text-body-md font-bold text-foreground">Business Info</h3>
            <p className="text-body-sm text-muted-foreground mt-0.5">
              Review and confirm your business details.
            </p>
          </div>`;

content = content.replace(oldSubstep1Start, newSubstep1Start);

// Sub-step 1 bottom button: change "Next: Services" to "Next"
content = content.replace(
  /<span>Next: Services<\/span>/g,
  '<span>Next</span>'
);
content = content.replace(
  /<p className="text-center text-caption text-muted-foreground mt-space-2\.5">\s*Step 1 of 3 • Review basic company details\s*<\/p>/g,
  ''
);

// Sub-step 2 heading: "Services"
content = content.replace(
  /<h3 className="text-body-md font-bold text-foreground">Services & Offerings<\/h3>/g,
  '<h3 className="text-body-md font-bold text-foreground">Services</h3>'
);

// Sub-step 2 bottom button: change "Next: AI Greeting" to "Next"
content = content.replace(
  /<span>Next: AI Greeting<\/span>/g,
  '<span>Next</span>'
);
content = content.replace(
  /<p className="text-center text-caption text-muted-foreground mt-space-2\.5">\s*Step 2 of 3 • \{services\.filter\(\(s\) => s\.accepted\)\.length\} active services selected\s*<\/p>/g,
  ''
);

// Sub-step 3 heading: "AI Greeting"
content = content.replace(
  /<h3 className="text-body-md font-bold text-foreground">AI Greeting & Voice Persona<\/h3>/g,
  '<h3 className="text-body-md font-bold text-foreground">AI Greeting</h3>'
);
content = content.replace(
  /<p className="text-center text-caption text-muted-foreground mt-space-2\.5">\s*Step 3 of 3 • You can refine everything later in Settings & Knowledge Base\s*<\/p>/g,
  ''
);

fs.writeFileSync('src/components/forms/onboarding-wizard.tsx', content, 'utf8');
console.log('Successfully updated onboarding-wizard.tsx!');
