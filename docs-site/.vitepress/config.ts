import { defineConfig, type PageData } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

// docs.torale.ai 301s to docs.webwhen.ai post-cutover. Bake webwhen.ai into
// canonicals + sitemap so the live origin owns the index signal. Otherwise
// pages declare "I am a duplicate of docs.torale.ai" while docs.torale.ai
// redirects back here — a canonical/redirect loop. See #294.
const SITE_ORIGIN = 'https://docs.webwhen.ai'
const SITE_DESCRIPTION = 'webwhen developer documentation — REST API and Python SDK for the agent that watches the open web.'

export default withMermaid(
  defineConfig({
  title: 'webwhen docs',
  description: SITE_DESCRIPTION,
  base: '/',
  lang: 'en-US',
  lastUpdated: true,
  cleanUrls: true,

  sitemap: {
    hostname: SITE_ORIGIN,
    transformItems: (items) =>
      items
        .filter((item) => item.url !== '404')
        .map((item) => ({ ...item, url: item.url.replace(/\/$/, '') || '/' })),
  },

  ignoreDeadLinks: [
    // Ignore localhost URLs in documentation
    /^http:\/\/localhost/
  ],

  // Mermaid pulls in 30+ diagram chunks via dynamic import; without this filter
  // VitePress emits `<link rel="modulepreload">` for every one of them (plus
  // katex, dagre, cose-bilkent) on every page, including the home page which
  // has zero diagrams. Only one page in the site (architecture/self-scheduling-
  // agents) actually renders mermaid. Demoting these to `<link rel="prefetch">`
  // via `shouldPreload` lets the browser still grab them on idle bandwidth so
  // mermaid renders fast on the one page that uses it, without contending with
  // the LCP on every other page. ~600KB of contention dropped from first paint.
  // See #306.
  shouldPreload: (link, _page) =>
    !/(?:Diagram|diagram-|katex|dagre|cose-bilkent|-definition|virtual_mermaid)/.test(link),

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/logo-32.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '64x64', href: '/logo-64.png' }],
    ['meta', { name: 'theme-color', content: '#0B0B0C' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'webwhen docs' }],
    // Reuse the webwhen.ai OG image for docs social cards. docs-site has no
    // og-image asset of its own (and the previous `${SITE_ORIGIN}/og-image.png`
    // 404'd, breaking social card scrapers). Cross-origin OG images are fine —
    // all major crawlers fetch them. See #seo-preflight.
    ['meta', { property: 'og:image', content: 'https://webwhen.ai/og-image.webp' }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: 'https://webwhen.ai/og-image.webp' }],
  ],

  // Per-page meta has to land in static HTML — VitePress sets it client-side
  // otherwise, and Googlebot sees only the global <title>webwhen docs</title>.
  transformPageData(pageData: PageData) {
    const rel = pageData.relativePath
      .replace(/\.md$/, '')
      .replace(/(^|\/)index$/, '')
    const canonical = rel ? `${SITE_ORIGIN}/${rel}` : `${SITE_ORIGIN}/`
    const pageTitle = pageData.title || pageData.frontmatter.title || 'webwhen docs'
    const pageDescription = pageData.frontmatter.description || SITE_DESCRIPTION
    const fullTitle = pageTitle === 'webwhen docs' ? pageTitle : `${pageTitle} | webwhen docs`

    pageData.frontmatter.head ??= []
    const head = pageData.frontmatter.head as Array<[string, Record<string, string>]>
    const has = (tag: string, attr: string, value: string) =>
      head.some(([t, a]) => t === tag && a?.[attr] === value)

    const injected: Array<[string, Record<string, string>]> = [
      ['link', { rel: 'canonical', href: canonical }],
      ['meta', { name: 'description', content: pageDescription }],
      ['meta', { property: 'og:title', content: fullTitle }],
      ['meta', { property: 'og:description', content: pageDescription }],
      ['meta', { property: 'og:url', content: canonical }],
      ['meta', { name: 'twitter:title', content: fullTitle }],
      ['meta', { name: 'twitter:description', content: pageDescription }],
    ]
    for (const entry of injected) {
      const [tag, attrs] = entry
      const key = 'rel' in attrs ? 'rel' : 'property' in attrs ? 'property' : 'name'
      if (!has(tag, key, attrs[key])) head.push(entry)
    }
  },

  themeConfig: {
    // Dark-mode variant: the static mark hardcodes #0B0B0C ink, so a separate
    // light-on-dark asset is needed for the dark theme nav (same pattern as
    // the frontend Footer's webwhen-mark-dark.svg). Replace with a single
    // currentColor mark when the design system ships one.
    logo: { light: '/logo.svg', dark: '/logo-dark.svg' },

    nav: [
      { text: 'Getting Started', link: '/getting-started/', activeMatch: '/getting-started/' },
      { text: 'Architecture', link: '/architecture/self-scheduling-agents', activeMatch: '/architecture/' },
      { text: 'API', link: '/api/overview', activeMatch: '/api/' },
      { text: 'SDK', link: '/sdk/quickstart', activeMatch: '/sdk/' },
      { text: 'App', link: 'https://webwhen.ai' }
    ],

    sidebar: {
      '/getting-started/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Overview', link: '/getting-started/' },
            { text: 'Python SDK', link: '/getting-started/sdk' }
          ]
        }
      ],

      '/architecture/': [
        {
          text: 'Architecture',
          items: [
            { text: 'Self-Scheduling Agents', link: '/architecture/self-scheduling-agents' },
            { text: 'Grounded Search', link: '/architecture/grounded-search' },
            { text: 'Watch State Machine', link: '/architecture/task-state-machine' },
            { text: 'Connector Trust Model', link: '/architecture/connectors-trust' }
          ]
        }
      ],


      '/sdk/': [
        {
          text: 'Python SDK',
          items: [
            { text: 'Quickstart', link: '/sdk/quickstart' },
            { text: 'Installation', link: '/sdk/installation' },
            { text: 'Authentication', link: '/sdk/authentication' },
            { text: 'Watches', link: '/sdk/tasks' },
            { text: 'Async Client', link: '/sdk/async' },
            { text: 'Error Handling', link: '/sdk/errors' },
            { text: 'Examples', link: '/sdk/examples' }
          ]
        }
      ],

      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/overview' },
            { text: 'Authentication', link: '/api/authentication' },
            { text: 'Watches', link: '/api/tasks' },
            { text: 'Executions', link: '/api/executions' },
            { text: 'Notifications', link: '/api/notifications' },
            { text: 'Errors', link: '/api/errors' }
          ]
        }
      ],

    },

    // Repo rename to webwhen is deferred per CLAUDE.md — keep torale URL.
    socialLinks: [
      { icon: 'github', link: 'https://github.com/prassanna-ravishankar/torale' }
    ],

    search: {
      provider: 'local',
      options: {
        detailedView: true
      }
    },

    editLink: {
      pattern: 'https://github.com/prassanna-ravishankar/torale/edit/main/docs-site/:path',
      text: 'Edit this page on GitHub'
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 webwhen'
    }
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    lineNumbers: false
  },

  mermaid: {
    theme: 'base',
    themeVariables: {
      // webwhen palette: warm canvas, near-black ink, single ember accent.
      primaryColor: '#FAFAF7',           // canvas
      primaryTextColor: '#0B0B0C',       // ink-1
      primaryBorderColor: '#0B0B0C',     // ink-1

      secondaryColor: '#FFFFFF',         // paper
      secondaryTextColor: '#0B0B0C',     // ink-1
      secondaryBorderColor: '#E6E6E0',   // ink-6 hairline

      tertiaryColor: '#F4F2EC',          // canvas-soft
      tertiaryTextColor: '#5C5C60',      // ink-3
      tertiaryBorderColor: '#E6E6E0',    // ink-6 hairline

      // General styling — editorial, calm.
      background: '#FFFFFF',
      mainBkg: '#FAFAF7',
      lineColor: '#0B0B0C',
      textColor: '#0B0B0C',
      fontFamily: 'Instrument Sans, Inter, system-ui, sans-serif',
      fontSize: '16px',

      // Flowchart — hairline borders, ink lines.
      nodeBorder: '#0B0B0C',
      clusterBkg: '#F4F2EC',
      clusterBorder: '#0B0B0C',
      defaultLinkColor: '#0B0B0C',

      // Node colors
      nodeTextColor: '#0B0B0C',

      // Single ember accent — terracotta, used sparingly for emphasis.
      accentColor: '#C9582A',
      accentTextColor: '#FFFFFF'
    }
  }
})
)
