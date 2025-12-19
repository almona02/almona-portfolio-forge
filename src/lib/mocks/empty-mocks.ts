// Empty mocks for excluded packages to prevent circular dependencies
// These packages are excluded from the bundle and loaded from CDN at runtime

// refractor mock
export const refractor = {
  highlight: (_code: string, _language?: string) => ({ 
    value: '', 
    type: 'root', 
    children: [],
    language: _language || 'text'
  }),
  register: (_language: any) => {},
  alias: (_aliases: Record<string, string | string[]>) => {},
  registered: (_language: string) => false,
  listLanguages: () => [] as string[],
  languages: {} as Record<string, any>,
};

// prismjs mock
export const Prism = {
  highlight: (_code: string, _grammar: any, _language: string) => '',
  languages: {} as Record<string, any>,
  hooks: { all: {} as Record<string, any> },
  highlightAll: () => {},
  highlightElement: () => {},
};

// highlight.js mock
export const hljs = {
  highlight: (_code: string, _options: { language: string }) => ({ 
    value: '', 
    language: 'plaintext',
    relevance: 0
  }),
  listLanguages: () => [] as string[],
  getLanguage: (_name: string) => null,
  registerLanguage: () => {},
  configure: () => {},
};

// markdown-it mock
export const markdownit = () => ({
  render: (_md: string) => '',
  use: (_plugin: any) => {},
  set: (_options: any) => {},
  configure: (_preset: string) => {},
  enable: (_list: string[]) => {},
  disable: (_list: string[]) => {},
});

// unified ecosystem mocks
export const unified = () => ({
  use: () => {},
  process: () => Promise.resolve({ value: '' }),
  processSync: () => ({ value: '' }),
});

export const remark = unified;
export const rehype = unified;

// Default exports for compatibility
export default {
  refractor,
  Prism,
  hljs,
  markdownit,
  unified,
  remark,
  rehype,
};

