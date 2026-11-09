import React from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';

interface MonacoEditorWrapperProps {
  value: string;
  language?: string;
  readOnly?: boolean;
  onChange?: (val: string | undefined) => void;
  height?: string;
  theme?: 'vs-dark' | 'light';
  originalValue?: string; // If provided, renders DiffEditor
}

export const MonacoEditorWrapper: React.FC<MonacoEditorWrapperProps> = ({
  value,
  language = 'python',
  readOnly = false,
  onChange,
  height = '100%',
  theme = 'vs-dark',
  originalValue,
}) => {
  // Map common languages to Monaco language identifiers
  const normalizeLanguage = (lang: string) => {
    const l = lang.toLowerCase();
    if (l.includes('python')) return 'python';
    if (l.includes('typescript') || l.includes('tsx')) return 'typescript';
    if (l.includes('javascript') || l.includes('jsx')) return 'javascript';
    if (l.includes('json')) return 'json';
    if (l.includes('html')) return 'html';
    if (l.includes('css')) return 'css';
    if (l.includes('markdown')) return 'markdown';
    if (l.includes('sql')) return 'sql';
    if (l.includes('shell') || l.includes('bash')) return 'shell';
    if (l.includes('yaml')) return 'yaml';
    return 'plaintext';
  };

  const monacoLang = normalizeLanguage(language);

  if (originalValue !== undefined) {
    return (
      <div className="w-full h-full border border-slate-800 rounded-lg overflow-hidden bg-[#1e1e1e]">
        <DiffEditor
          height={height}
          language={monacoLang}
          original={originalValue}
          modified={value}
          theme={theme}
          options={{
            readOnly: true,
            renderSideBySide: true,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full border border-slate-800 rounded-lg overflow-hidden bg-[#1e1e1e]">
      <Editor
        height={height}
        language={monacoLang}
        value={value}
        theme={theme}
        onChange={onChange}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: 'on',
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        }}
      />
    </div>
  );
};

