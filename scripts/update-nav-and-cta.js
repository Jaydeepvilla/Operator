const fs = require('fs');

// 1. Update MarketingNav
let nav = fs.readFileSync('src/components/marketing/nav.tsx', 'utf8');

nav = nav.replace(
  /<Show when="signed-in">[\s\S]*?<UserAvatarMenu avatarClass="h-8 w-8" \/>\s*<\/Show>/,
  `<Show when="signed-in">
      {user?.onboardingCompleted ? (
        <Link
          href="/dashboard"
          className="text-body-sm text-muted-foreground hover:text-foreground transition-colors px-space-3 py-space-2"
        >
          Dashboard
        </Link>
      ) : (
        <Link
          href="/onboarding"
          className="text-body-sm font-medium text-primary hover:text-primary/80 transition-colors px-space-3 py-space-2 flex items-center gap-1"
        >
          Continue Setup <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
      <UserAvatarMenu avatarClass="h-8 w-8" />
    </Show>`
);

nav = nav.replace(
  /<Show when="signed-in">[\s\S]*?<UserAvatarMenu \/>\s*<\/div>\s*<\/Show>/,
  `<Show when="signed-in">
      {user?.onboardingCompleted ? (
        <Link
          href="/dashboard"
          onClick={() => setMobileOpen(false)}
          className="block px-space-3 py-space-2 text-body-sm text-center text-muted-foreground border border-[hsl(var(--foreground)/0.08)] radius-md"
        >
          Dashboard
        </Link>
      ) : (
        <Link
          href="/onboarding"
          onClick={() => setMobileOpen(false)}
          className="block px-space-3 py-space-2 text-body-sm text-center font-medium text-primary border border-primary/20 bg-primary/5 radius-md"
        >
          Continue Setup →
        </Link>
      )}
      <div className="flex justify-center pt-space-1">
        <UserAvatarMenu />
      </div>
    </Show>`
);

fs.writeFileSync('src/components/marketing/nav.tsx', nav, 'utf8');
console.log('MarketingNav successfully updated!');

// 2. Update SessionAwareCta
let cta = fs.readFileSync('src/components/marketing/session-aware-cta.tsx', 'utf8');

cta = cta.replace(
  /const targetHref = isAuthenticated \? signedInHref : signedOutHref;/,
  `const isComplete = Boolean(user?.onboardingCompleted);
  const targetHref = isAuthenticated ? (isComplete ? signedInHref : "/onboarding") : signedOutHref;`
);

cta = cta.replace(
  /const label = isAuthenticated \? signedInText : signedOutText;/,
  `const label = isAuthenticated ? (isComplete ? signedInText : "Continue setup") : signedOutText;`
);

cta = cta.replace(
  /if \(isAuthenticated\) \{\s*router\.push\(signedInHref\);\s*\} else \{/g,
  `if (isAuthenticated) {
      router.push(isComplete ? signedInHref : "/onboarding");
    } else {`
);

fs.writeFileSync('src/components/marketing/session-aware-cta.tsx', cta, 'utf8');
console.log('SessionAwareCta successfully updated!');
