"use client";

import Script from "next/script";

interface MazeSnippetProps {
  apiKey?: string;
}

/**
 * MazeSnippet loads the official Maze.co Universal Tracking Snippet.
 *
 * It enables:
 * - Live website testing and prototype validation
 * - In-product surveys and usability feedback widgets
 * - Heatmaps and user session interaction tracking
 *
 * Configured via NEXT_PUBLIC_MAZE_API_KEY in environment or passed via `apiKey` prop.
 */
export function MazeSnippet({ apiKey }: MazeSnippetProps) {
  const key =
    apiKey ||
    process.env.NEXT_PUBLIC_MAZE_API_KEY ||
    "240861ba-3ed9-427b-9d55-dbee9c2d6668";

  if (!key) {
    return null;
  }

  return (
    <Script
      id="maze-universal-snippet"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
(function (m, a, z, e) {
  var s, t, u, v;
  try {
    t = m.sessionStorage.getItem('maze-us');
  } catch (err) {}

  if (!t) {
    t = new Date().getTime();
    try {
      m.sessionStorage.setItem('maze-us', t);
    } catch (err) {}
  }

  u = document.currentScript || (function () {
    var w = document.getElementsByTagName('script');
    return w[w.length - 1];
  })();
  v = u && u.nonce;

  s = a.createElement('script');
  s.src = z + '?apiKey=' + encodeURIComponent(e);
  s.async = true;
  if (v) s.setAttribute('nonce', v);
  a.getElementsByTagName('head')[0].appendChild(s);
  m.mazeUniversalSnippetApiKey = e;
})(window, document, 'https://snippet.maze.co/maze-universal-loader.js', ${JSON.stringify(key)});
`,
      }}
    />
  );
}
