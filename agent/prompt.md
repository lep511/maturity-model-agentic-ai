I'm using the AWS Well-Architected Agentic AI Lens Self-Assessment at
https://agentic-ai-lens-assessment.vercel.app, an unofficial study aid for self-assessing an
agentic AI workload against the 150 best practices of the AWS Well-Architected Agentic AI Lens
(6 pillars, 41 focus areas). Its content is condensed from the official AWS documentation,
which stays the authoritative source:
https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentic-ai-lens.html
Help me in the three steps below, one at a time, and wait for my answer before moving on.

1. Walk me through the page. Explain it briefly, then ask what I want to look at in more detail.
   - Sessions (header): every assessment is a named session whose scores and comments stay in
     this browser (localStorage). I can create, switch, rename and delete sessions.
   - Filters (left sidebar): pillar, Lens roadmap reading path, focus area, "Not assessed" and
     "Excluded"; the search box above the cards matches titles, IDs and focus areas.
   - Best-practice cards: risk (High / Medium / Low), related AWS services, a summary and the
     desired outcome. I score each one 0 %, 25 %, 50 %, 75 %, 100 % or Excluded (not applicable)
     and can add a comment. "Implementation guidance" shows the official implementation steps, and each
     focus area shows its question, capability intent, five maturity levels and common issues.
   - Score panel: overall score, progress per pillar and a radar chart. Scores are coverage over
     the applicable practices: unassessed ones count as 0 %, excluded ones are left out.
   - Export CSV saves the whole session (all 150 practices), Load CSV turns such a file into a
     new session, Print Report builds a printable report, Reset All clears the current session,
     and About summarizes the Lens (design principles, pillars, definitions).

2. Ask me which model provider my agentic workload uses (for example Amazon Bedrock and
   Amazon Bedrock AgentCore, the Anthropic API, OpenAI, Google Gemini, Azure OpenAI, or
   open-weight models I host myself). The Lens names AWS services; for another provider, tell me
   which controls play the same role and which practices apply unchanged, so my scores reflect
   my real setup.

3. Offer to set up the MCP server. This page has a companion MCP server that gives you live,
   read-only access to the same Lens content (pillars, focus areas, best practices with their
   implementation guidance, roadmap and definitions) and can score an assessment or build a CSV
   the page imports. Ask me whether I want it set up in this coding tool. If I say yes, there is
   nothing to install: it is a public Streamable HTTP server, no API key, at
   https://agentic-ai-lens-assessment.vercel.app/mcp
   Name it "agentic-ai-lens". Config locations:
     - Kiro: ~/.kiro/settings/mcp.json under "mcpServers":
       "agentic-ai-lens": {"url": "https://agentic-ai-lens-assessment.vercel.app/mcp"}
     - Cursor: ~/.cursor/mcp.json under "mcpServers", the same entry as Kiro
     - Claude Code: run `claude mcp add --transport http agentic-ai-lens https://agentic-ai-lens-assessment.vercel.app/mcp`
     - Codex: run `codex mcp add agentic-ai-lens --url https://agentic-ai-lens-assessment.vercel.app/mcp`,
       or add [mcp_servers.agentic-ai-lens] with url = "https://agentic-ai-lens-assessment.vercel.app/mcp"
       to ~/.codex/config.toml
     - VS Code: mcp.json under "servers":
       "agentic-ai-lens": {"type": "http", "url": "https://agentic-ai-lens-assessment.vercel.app/mcp"}
       (.vscode/mcp.json for this workspace, or "MCP: Open User Configuration" for all of them)
   If the tool only runs local servers, clone https://github.com/lep511/maturity-model-agentic-ai,
   run `npm ci` (Node.js 24 or later) and register command "node" with args
   ["/path/to/maturity-model-agentic-ai/mcp/stdio.mjs"].
   After setup, reload the tool if it needs it and call list_pillars to check the connection
   (it returns the 6 pillars). If I decline, read the same content from the REST API at
   https://agentic-ai-lens-assessment.vercel.app/api (OpenAPI at /api/openapi.json).

Then offer what we can do next:
  - Review one focus area with me, practice by practice (MCP prompt review_focus_area, or
    get_focus_area and get_best_practice), and finish with export_assessment_csv. Save the CSV
    only if I agree; I load it on the page with Load CSV.
  - Turn a CSV I exported from the page into a prioritized gap report (score_assessment, or the
    gap_report prompt).
  - Explain a best practice (explain_best_practice, get_implementation_guidance), or look at my
    workload's code and infrastructure and point out the practices it meets or misses.

Ground rules: cite best-practice IDs (such as AGENTSEC01-BP01) with their doc_url, keep the
page's scale (0 / 25 / 50 / 75 / 100 % or N/A), and don't create or change files without asking
me. This is a self-assessment aid: for a formal review, import the official custom lens into the
AWS Well-Architected Tool
(https://github.com/aws-samples/sample-well-architected-custom-lens/blob/main/agentic-ai-lens/agentic-ai-lens.json).
