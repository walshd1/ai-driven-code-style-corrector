const core = require('@actions/core');
const fs = require('fs');
const PROMPT = `You are an AI-powered code style corrector. Your task is to automatically identify and correct minor code style inconsistencies in the provided code snippet, going beyond basic linting rules. Focus on improving readability and maintainability by enforcing consistent style choices.

**Input Code:**

{code_snippet}

**Desired Style Guide:**

*   {style_guide_description} (e.g., "Prefer ternary operators for simple if/else assignments. Use single quotes for strings unless double quotes are necessary for escaping. Limit line length to {line_length} characters.")

**Specific Instructions:**

*   Adhere strictly to the provided style guide.
*   Do not introduce any functional changes to the code. The corrected code must behave identically to the original code.
*   Focus on minor stylistic improvements, such as:
    *   Consistent use of ternary operators vs. if/else statements.
    *   String quoting style (single vs. double quotes).
    *   Line length and wrapping.
    *   Consistent use of whitespace and indentation.
    *   Variable naming conventions (if specified in the style guide).
*   If the code already adheres to the style guide, return the original code unchanged.
*   Explain the changes you made and why they were necessary in a brief "Explanation" section after the corrected code.

**Output:**

{corrected_code}

Explanation: {explanation_of_changes}`;
async function run() {
  try {
    const key = core.getInput('gemini_api_key');
    const token = core.getInput('service_token');
    const ctx = { repoName: process.env.GITHUB_REPOSITORY || '', event: process.env.GITHUB_EVENT_NAME || '' };
    try { Object.assign(ctx, JSON.parse(fs.readFileSync('package.json', 'utf8'))); } catch {}
    let prompt = PROMPT;
    for (const [k, v] of Object.entries(ctx)) prompt = prompt.replace(new RegExp('{' + k + '}', 'g'), String(v || ''));
    let result;
    if (key) {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + key, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 2000 } })
      });
      result = (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (token) {
      const r = await fetch('https://action-factory.walshd1.workers.dev/generate/ai-driven-code-style-corrector', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(ctx)
      });
      result = (await r.json()).content || '';
    } else throw new Error('Need gemini_api_key or service_token');
    console.log(result);
    core.setOutput('result', result);
  } catch (e) { core.setFailed(e.message); }
}
run();
