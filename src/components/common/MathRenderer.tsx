import React, { useMemo } from 'react';
import katex from 'katex';
import { formatScientificMathAndPowers } from '../../lib/mockTestData';

interface MathRendererProps {
  text: string | undefined | null;
  className?: string;
  as?: 'span' | 'div' | 'p';
}

/**
 * Universal Scientific & Mathematical Renderer for NEET Questions & Options
 * - Renders inline LaTeX ($...$ or \(...\)) and block LaTeX ($$...$$ or \[...\]) via KaTeX
 * - Converts scientific units, powers (m², m³, 10⁻⁷, N/m²), subscripts (T₁, P₀, ε₀, H₂O)
 * - Renders fractions, Greek letters, and chemical notation cleanly
 * - Never shows broken raw LaTeX tags to students
 */
export const MathRenderer: React.FC<MathRendererProps> = ({
  text,
  className = '',
  as = 'div'
}) => {
  const renderedHtml = useMemo(() => {
    if (!text) return '';

    const latexPattern = /(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([^\n]+?\\\))/g;
    const hasLatex = latexPattern.test(text);

    if (hasLatex) {
      try {
        const parts = text.split(latexPattern);
        return parts.map((part) => {
          if (!part) return '';
          if (
            (part.startsWith('$$') && part.endsWith('$$')) ||
            (part.startsWith('$') && part.endsWith('$')) ||
            (part.startsWith('\\[') && part.endsWith('\\]')) ||
            (part.startsWith('\\(') && part.endsWith('\\)'))
          ) {
            const isBlock = part.startsWith('$$') || part.startsWith('\\[');
            const rawMath = part.slice(part.startsWith('$$') || part.startsWith('\\[') || part.startsWith('\\(') ? 2 : 1, -(part.endsWith('$$') || part.endsWith('\\]') || part.endsWith('\\)') ? 2 : 1)).trim();
            try {
              return katex.renderToString(rawMath, {
                displayMode: isBlock,
                throwOnError: false,
                output: 'html'
              });
            } catch {
              return `<span class="font-mono text-slate-800">${escapeHtml(rawMath)}</span>`;
            }
          }
          return escapeHtml(formatScientificMathAndPowers(part))
            .replace(/→/g, '<span class="inline-block px-1 font-bold">→</span>')
            .replace(/⇌/g, '<span class="inline-block px-1 font-bold">⇌</span>')
            .replace(/±/g, '<span class="inline-block px-0.5">±</span>')
            .replace(/×/g, '<span class="inline-block px-0.5">×</span>');
        }).join('');
      } catch {
        // Fallback to formatted text
      }
    }

    const processed = formatScientificMathAndPowers(text);

    // 3. Format superscripts and subscripts using semantic HTML if KaTeX was not invoked
    // Wrap powers and subscripts nicely
    let formatted = escapeHtml(processed);

    // Convert unicode superscripts and subscripts to clean semantic HTML spans if helpful
    // Convert common arrow symbols
    formatted = formatted
      .replace(/→/g, '<span class="inline-block px-1 font-bold">→</span>')
      .replace(/⇌/g, '<span class="inline-block px-1 font-bold">⇌</span>')
      .replace(/±/g, '<span class="inline-block px-0.5">±</span>')
      .replace(/×/g, '<span class="inline-block px-0.5">×</span>');

    return formatted;
  }, [text]);

  const Component = as;

  return (
    <Component
      className={`math-rendered-content ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
