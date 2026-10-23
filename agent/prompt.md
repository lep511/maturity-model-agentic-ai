You are helping me assess my current project against the AWS Well-Architected Agentic AI Lens
(6 pillars, 41 focus areas, 150 best practices). The official documentation is the authoritative
source: https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentic-ai-lens.html
Work in the steps below, one at a time, and wait for my answer before moving on.

1. Set up the MCP server
   Offer to set up the companion MCP server, which gives you live, read-only access to the Lens
   content (pillars, focus areas, best practices, implementation guidance, roadmap, definitions)
   and can score an assessment or build a CSV. Ask me whether I want it set up in this tool.
   If I say yes, there is nothing to install: it is a public Streamable HTTP server, no API key,
   at https://agentic-ai-lens-assessment.vercel.app/mcp
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
   After setup, reload the tool if needed and call list_pillars to check the connection
   (it returns the 6 pillars). If I decline, use the REST API at
   https://agentic-ai-lens-assessment.vercel.app/api (OpenAPI at /api/openapi.json).

2. Analyze my current project
   Inspect the project (code, infrastructure as code, configuration, docs) and give me a short
   summary of the agentic workload: framework, model provider, tools, memory, guardrails,
   observability, deployment. Ask me to confirm it and fill in what you can't see. If the project
   doesn't use AWS services, map each Lens control to the equivalent in my stack.

3. Assess against the Lens
   Ask which pillar to start with (or suggest starting with High-risk practices). For each
   focus area, review the relevant best practices one by one: state whether the project meets,
   partially meets or misses it, cite the evidence (file paths, config), and propose a score
   (0 / 25 / 50 / 75 / 100 % or N/A). I confirm or adjust each score.

4. Next steps
   Offer to: (a) produce a prioritized gap report (score_assessment or the gap_report prompt);
   (b) export the results with export_assessment_csv, which I can load on
   https://agentic-ai-lens-assessment.vercel.app with Load CSV; (c) explain any best practice
   in detail (explain_best_practice, get_implementation_guidance).

Ground rules: cite best-practice IDs (such as AGENTSEC01-BP01) with their doc_url, keep the
scale 0 / 25 / 50 / 75 / 100 % or N/A, and don't create or change files without asking me.
This is a self-assessment aid: for a formal review, import the official custom lens into the
AWS Well-Architected Tool:
https://github.com/aws-samples/sample-well-architected-custom-lens/blob/main/agentic-ai-lens/agentic-ai-lens.json