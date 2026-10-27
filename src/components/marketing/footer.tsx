import Link from "next/link";
import { NativeA } from "@/components/shared/native";
import { Logo } from "@/components/shared/logo";

const FOOTER_COLS = [
  {
    title: "Product",
    links: [
      ["Features", "/features"],
      ["Pricing", "/pricing"],
      ["Integrations", "/integrations"],
      ["Demo", "/demo"],
      ["Changelog", "/changelog"],
    ],
  },
  {
    title: "Resources",
    links: [
      ["Documentation", "/docs"],
      ["Security", "/security"],
      ["Contact", "/contact"],
      ["About", "/about"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-[hsl(var(--foreground)/0.06)]">
      <div className="mx-auto max-w-6xl px-space-6 py-space-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-10">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="inline-block mb-space-4">
              <Logo iconClassName="h-5 w-5" />
            </Link>
            <p className="text-body-sm text-muted-foreground leading-relaxed max-w-xs">
              The Autonomous AI Receptionist Platform. Operator is a product of <span className="text-foreground font-medium">Nexx Technologies</span>.
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <p className="text-body-sm font-medium text-foreground mb-space-4">
                {col.title}
              </p>
              <ul className="space-y-space-2">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-body-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-space-16 pt-space-8 border-t border-[hsl(var(--foreground)/0.06)] flex flex-col sm:flex-row items-center justify-between gap-space-4">
          <p className="text-caption text-muted-foreground">
            © {new Date().getFullYear()} Operator. Part of Nexx Technologies. All rights reserved.
          </p>
          <div className="flex items-center gap-space-4 text-muted-foreground">
            {/* X / Twitter */}
            <NativeA href="https://x.com/nexxtechnologies" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="hover:text-foreground transition-colors p-1 hover:bg-muted/30 rounded">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </NativeA>

            {/* Reddit */}
            <NativeA href="https://reddit.com/r/nexxtechnologies" target="_blank" rel="noopener noreferrer" aria-label="Reddit" className="hover:text-[#FF4500] transition-colors p-1 hover:bg-muted/30 rounded">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.197-2.512-.73a.326.326 0 0 0-.232-.095z" />
              </svg>
            </NativeA>

            {/* Instagram */}
            <NativeA href="https://instagram.com/nexxtechnologies" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-[#E4405F] transition-colors p-1 hover:bg-muted/30 rounded">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
            </NativeA>

            {/* Facebook */}
            <NativeA href="https://facebook.com/nexxtechnologies" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-[#1877F2] transition-colors p-1 hover:bg-muted/30 rounded">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </NativeA>

            {/* Threads */}
            <NativeA href="https://threads.net/@nexxtechnologies" target="_blank" rel="noopener noreferrer" aria-label="Threads" className="hover:text-foreground transition-colors p-1 hover:bg-muted/30 rounded">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.186 24C5.464 24 0 18.675 0 12.12 0 5.565 5.464.24 12.186.24c6.643 0 11.996 5.176 12.034 11.758 0 .285-.224.516-.503.516h-2.585a.512.512 0 0 1-.504-.472c-.31-3.69-3.792-6.524-8.442-6.524-5.074 0-9.206 4.07-9.206 9.602 0 5.533 4.132 9.603 9.206 9.603 3.66 0 6.677-2.008 7.876-5.239.062-.167.22-.275.397-.275h2.646c.264 0 .487.197.52.458C22.617 20.08 17.886 24 12.186 24zm4.498-11.878c0-2.825-1.944-4.839-4.57-4.839-2.67 0-4.664 2.054-4.664 4.84 0 2.802 2.004 4.847 4.664 4.847 1.488 0 2.807-.638 3.65-1.722.106-.136.29-.187.447-.123l1.85.748c.18.073.284.265.238.455-1.282 2.651-3.722 4.093-6.185 4.093-4.323 0-7.794-3.376-7.794-8.298 0-4.921 3.471-8.297 7.794-8.297 4.28 0 7.7 3.332 7.7 8.297v.512a.513.513 0 0 1-.513.513h-7.118a.513.513 0 0 0-.513.513c0 .878.694 1.583 1.56 1.583 1.26 0 2.068-.737 2.068-1.72v-.002zm-3.13-1.602c-.08-.857-.775-1.51-1.637-1.51-.861 0-1.558.653-1.636 1.51h3.273z"/>
              </svg>
            </NativeA>

            {/* LinkedIn */}
            <NativeA href="https://linkedin.com/company/nexxtechnologies" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="hover:text-[#0A66C2] transition-colors p-1 hover:bg-muted/30 rounded">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </NativeA>
          </div>
        </div>
      </div>
    </footer>
  );
}
