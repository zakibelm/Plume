'use strict';

/**
 * ExportAgent - Pure formatting logic, no LLM call needed.
 * Converts validated content + plan into Markdown or HTML.
 */

/**
 * Format content sections into a Markdown document.
 * @param {string|object} content - Raw content text or { sections: [] } object
 * @param {object} [plan] - Editorial plan with title, structure, etc.
 * @returns {string}
 */
function exportMarkdown(content, plan) {
  const lines = [];
  const now = new Date().toISOString().split('T')[0];

  // Header metadata
  if (plan?.title) {
    lines.push(`# ${plan.title}`);
    lines.push('');
  }

  if (plan?.angle) {
    lines.push(`> **Angle:** ${plan.angle}`);
    lines.push('');
  }

  lines.push(`*Généré le ${now} par Plume AI*`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Content body
  if (typeof content === 'string') {
    lines.push(content);
  } else if (content && typeof content === 'object') {
    if (Array.isArray(content.sections)) {
      for (const section of content.sections) {
        if (section.heading) {
          const level = section.level === 'H1' ? '#' : section.level === 'H2' ? '##' : '###';
          lines.push(`${level} ${section.heading}`);
          lines.push('');
        }

        if (section.content) {
          lines.push(section.content);
          lines.push('');
        }
      }
    } else if (content.text) {
      lines.push(content.text);
    } else {
      lines.push(JSON.stringify(content, null, 2));
    }
  }

  // Footer CTA
  if (plan?.recommended_cta) {
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(`**${plan.recommended_cta}**`);
  }

  return lines.join('\n');
}

/**
 * Format content sections into a minimal but valid HTML document.
 * @param {string|object} content
 * @param {object} [plan]
 * @returns {string}
 */
function exportHtml(content, plan) {
  const title = plan?.title || 'Document Plume';
  const now = new Date().toISOString().split('T')[0];

  const bodyLines = [];

  if (plan?.title) {
    bodyLines.push(`    <h1>${escapeHtml(plan.title)}</h1>`);
  }

  if (plan?.angle) {
    bodyLines.push(`    <blockquote><strong>Angle :</strong> ${escapeHtml(plan.angle)}</blockquote>`);
  }

  bodyLines.push(`    <p><em>Généré le ${now} par Plume AI</em></p>`);
  bodyLines.push('    <hr>');

  if (typeof content === 'string') {
    const paragraphs = content.split(/\n\n+/).filter(Boolean);
    for (const para of paragraphs) {
      if (para.startsWith('# ')) {
        bodyLines.push(`    <h1>${escapeHtml(para.slice(2))}</h1>`);
      } else if (para.startsWith('## ')) {
        bodyLines.push(`    <h2>${escapeHtml(para.slice(3))}</h2>`);
      } else if (para.startsWith('### ')) {
        bodyLines.push(`    <h3>${escapeHtml(para.slice(4))}</h3>`);
      } else {
        bodyLines.push(`    <p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`);
      }
    }
  } else if (content && typeof content === 'object') {
    if (Array.isArray(content.sections)) {
      for (const section of content.sections) {
        if (section.heading) {
          const tag =
            section.level === 'H1' ? 'h1' : section.level === 'H2' ? 'h2' : 'h3';
          bodyLines.push(`    <${tag}>${escapeHtml(section.heading)}</${tag}>`);
        }

        if (section.content) {
          bodyLines.push(`    <p>${escapeHtml(section.content).replace(/\n/g, '<br>')}</p>`);
        }
      }
    } else if (content.text) {
      bodyLines.push(`    <p>${escapeHtml(content.text).replace(/\n/g, '<br>')}</p>`);
    }
  }

  if (plan?.recommended_cta) {
    bodyLines.push('    <hr>');
    bodyLines.push(`    <p><strong>${escapeHtml(plan.recommended_cta)}</strong></p>`);
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.7; color: #1a1a1a; }
    h1, h2, h3 { font-family: -apple-system, sans-serif; }
    blockquote { border-left: 4px solid #e5e7eb; padding-left: 1rem; color: #6b7280; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 2rem 0; }
  </style>
</head>
<body>
${bodyLines.join('\n')}
</body>
</html>`;
}

/**
 * Escape HTML special characters.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return String(str);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = { exportMarkdown, exportHtml };
