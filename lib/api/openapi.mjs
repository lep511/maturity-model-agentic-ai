// OpenAPI 3.1 description of the read-only Lens API.

export function buildOpenApi(origin, version, data) {
  const riskEnum = ['High', 'Medium', 'Low'];
  const pillarSlugs = data.pillars.map(p => p.slug);
  const roadmapIds = (data.lens.roadmap || []).map(r => r.id);
  const okJson = (schemaRef, description) => ({
    description,
    content: { 'application/json': { schema: { $ref: `#/components/schemas/${schemaRef}` } } },
  });
  const errorRef = { $ref: '#/components/responses/Error' };
  const param = (name, description, schema = { type: 'string' }, where = 'query', required = false) =>
    ({ name, in: where, required, description, schema });

  return {
    openapi: '3.1.0',
    info: {
      title: 'AWS Well-Architected Agentic AI Lens Self-Assessment API',
      version,
      summary: 'Read-only API over the condensed content of the AWS Well-Architected Agentic AI Lens',
      description: `Unofficial study aid. Content condensed from the ${data.lens.title} (AWS documentation, ${data.lens.published}). Always refer to the official documentation at ${data.lens.doc_url}. All endpoints are GET, public and CORS-enabled; responses are cached per deployment.`,
    },
    servers: [{ url: origin }],
    tags: [
      { name: 'meta' }, { name: 'pillars' }, { name: 'focus-areas' }, { name: 'best-practices' }, { name: 'roadmap' }, { name: 'definitions' },
    ],
    paths: {
      '/api': { get: { tags: ['meta'], summary: 'API index', operationId: 'getIndex', responses: { 200: okJson('Index', 'Lens metadata, counts and endpoint list') } } },
      '/api/openapi.json': { get: { tags: ['meta'], summary: 'This OpenAPI document', operationId: 'getOpenApi', responses: { 200: { description: 'OpenAPI 3.1 document', content: { 'application/json': { schema: { type: 'object' } } } } } } },
      '/api/lens': { get: { tags: ['meta'], summary: 'Lens metadata', operationId: 'getLens', responses: { 200: okJson('Lens', 'Abstract, design principles, pillars, roadmap, definitions and counts') } } },
      '/api/pillars': { get: { tags: ['pillars'], summary: 'List pillars', operationId: 'listPillars', responses: { 200: okJson('PillarList', 'The six pillars') } } },
      '/api/pillars/{slug}': { get: { tags: ['pillars'], summary: 'Get a pillar', operationId: 'getPillar',
        parameters: [param('slug', 'Pillar slug, name, prefix or abbreviation (case-insensitive)', { type: 'string', enum: pillarSlugs }, 'path', true)],
        responses: { 200: okJson('Pillar', 'Pillar with design principles and focus areas'), 404: errorRef } } },
      '/api/focus-areas': { get: { tags: ['focus-areas'], summary: 'List focus areas', operationId: 'listFocusAreas',
        parameters: [
          param('pillar', 'Filter by pillar slug, name, prefix or abbreviation'),
          param('roadmap', 'Filter by Lens roadmap reading path id or label', { type: 'string', enum: roadmapIds }),
          param('expand', 'Set to 1 to include intro, capability intent, maturity levels and common issues', { type: 'string', enum: ['0', '1'] }),
        ],
        responses: { 200: okJson('FocusAreaList', 'Focus areas'), 400: errorRef } } },
      '/api/focus-areas/{id}': { get: { tags: ['focus-areas'], summary: 'Get a focus area', operationId: 'getFocusArea',
        parameters: [param('id', 'Focus area id, e.g. AGENTOPS01 (case-insensitive)', { type: 'string', pattern: '^(?i)AGENT[A-Z]+\\d{2}$' }, 'path', true)],
        responses: { 200: okJson('FocusAreaDetail', 'Focus area with maturity levels and best practices'), 404: errorRef } } },
      '/api/best-practices': { get: { tags: ['best-practices'], summary: 'List best practices', operationId: 'listBestPractices',
        parameters: [
          param('pillar', 'Filter by pillar slug, name, prefix or abbreviation'),
          param('focus_area', 'Filter by focus area id (AGENTOPS01 or AGENTOPS01)'),
          param('risk', 'Filter by risk level; comma-separated values allowed', { type: 'string', example: 'High' }),
          param('roadmap', 'Filter by Lens roadmap reading path id or label', { type: 'string', enum: roadmapIds }),
          param('q', 'Case-insensitive substring search over id, title, summary, desired outcome, focus area, services and pillar'),
          param('fields', 'Comma-separated list of fields to return for each item'),
          param('limit', 'Page size (default: all, max 500)', { type: 'integer', minimum: 1, maximum: 500 }),
          param('offset', 'Zero-based offset', { type: 'integer', minimum: 0 }),
        ],
        responses: { 200: okJson('BestPracticeList', 'Best practices'), 400: errorRef } } },
      '/api/best-practices/{id}': { get: { tags: ['best-practices'], summary: 'Get a best practice', operationId: 'getBestPractice',
        parameters: [
          param('id', 'Best practice id, e.g. AGENTOPS01-BP01 (AGENTOPS01_BP01 also accepted)', { type: 'string' }, 'path', true),
          param('include', 'Set to guidance to embed the guidance markdown', { type: 'string', enum: ['guidance'] }),
        ],
        responses: { 200: okJson('BestPractice', 'Best practice'), 404: errorRef } } },
      '/api/best-practices/{id}/guidance': { get: { tags: ['best-practices'], summary: 'Get the implementation guidance', operationId: 'getBestPracticeGuidance',
        parameters: [
          param('id', 'Best practice id', { type: 'string' }, 'path', true),
          param('format', 'json returns {id, title, doc_url, markdown}; default is text/markdown', { type: 'string', enum: ['json'] }),
        ],
        responses: {
          200: { description: 'Condensed implementation guidance', content: {
            'text/markdown': { schema: { type: 'string' } },
            'application/json': { schema: { $ref: '#/components/schemas/Guidance' } } } },
          404: errorRef } } },
      '/api/roadmap': { get: { tags: ['roadmap'], summary: 'List roadmap reading paths', operationId: 'listRoadmap', responses: { 200: okJson('RoadmapList', 'Reading paths') } } },
      '/api/roadmap/{id}': { get: { tags: ['roadmap'], summary: 'Get a reading path', operationId: 'getRoadmap',
        parameters: [param('id', 'Reading path id or label', { type: 'string', enum: roadmapIds }, 'path', true)],
        responses: { 200: okJson('Roadmap', 'Reading path with focus areas and best practices'), 404: errorRef } } },
      '/api/definitions': { get: { tags: ['definitions'], summary: 'List definitions', operationId: 'listDefinitions',
        parameters: [param('q', 'Case-insensitive substring filter on term and definition')],
        responses: { 200: okJson('DefinitionList', 'Glossary terms') } } },
    },
    components: {
      responses: {
        Error: { description: 'Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      },
      schemas: {
        Error: { type: 'object', required: ['error'], properties: { error: { type: 'object', required: ['code', 'message'], properties: { code: { type: 'string' }, message: { type: 'string' } }, additionalProperties: true } } },
        Counts: { type: 'object', properties: { pillars: { type: 'integer' }, focus_areas: { type: 'integer' }, best_practices: { type: 'integer' }, risk: { $ref: '#/components/schemas/RiskCounts' } } },
        RiskCounts: { type: 'object', properties: { High: { type: 'integer' }, Medium: { type: 'integer' }, Low: { type: 'integer' } } },
        Links: { type: 'object', additionalProperties: { type: ['string', 'null'], format: 'uri' } },
        Index: { type: 'object', properties: { name: { type: 'string' }, version: { type: 'string' }, description: { type: 'string' }, lens: { type: 'object' }, counts: { $ref: '#/components/schemas/Counts' }, endpoints: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, url: { type: 'string' }, description: { type: 'string' } } } }, openapi: { type: 'string' } } },
        Lens: { type: 'object', properties: { title: { type: 'string' }, published: { type: 'string' }, doc_url: { type: 'string' }, abstract: { type: 'array', items: { type: 'string' } }, design_principles: { type: 'array', items: { $ref: '#/components/schemas/Principle' } }, pillars: { type: 'array', items: { type: 'object' } }, roadmap: { type: 'array', items: { type: 'object' } }, definitions: { type: 'array', items: { $ref: '#/components/schemas/Definition' } }, counts: { type: 'object' } } },
        Principle: { type: 'object', properties: { title: { type: 'string' }, text: { type: 'string' } } },
        Definition: { type: 'object', properties: { term: { type: 'string' }, definition: { type: 'string' } } },
        DefinitionList: { type: 'object', properties: { count: { type: 'integer' }, items: { type: 'array', items: { $ref: '#/components/schemas/Definition' } } } },
        Pillar: { type: 'object', properties: { name: { type: 'string' }, slug: { type: 'string', enum: pillarSlugs }, prefix: { type: 'string' }, short: { type: 'string' }, abbr: { type: 'string' }, intro: { type: 'string' }, counts: { $ref: '#/components/schemas/Counts' }, focus_areas: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, question: { type: 'string' } } } }, design_principles: { type: 'array', items: { $ref: '#/components/schemas/Principle' } }, doc_url: { type: 'string' }, links: { $ref: '#/components/schemas/Links' } } },
        PillarList: { type: 'object', properties: { count: { type: 'integer' }, items: { type: 'array', items: { $ref: '#/components/schemas/Pillar' } } } },
        MaturityLevel: { type: 'object', properties: { level: { type: 'integer', minimum: 1, maximum: 5 }, name: { type: 'string', enum: ['Initial', 'Emerging', 'Defined', 'Proactive', 'Optimized'] }, description: { type: 'string', description: 'Markdown; may contain links' } } },
        FocusArea: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, question: { type: 'string' }, pillar: { type: 'string' }, pillar_slug: { type: 'string' }, roadmap: { type: 'array', items: { type: 'string', enum: roadmapIds } }, best_practices: { type: 'array', items: { type: 'string' } }, counts: { type: 'object' }, doc_url: { type: 'string' }, links: { $ref: '#/components/schemas/Links' }, intro: { type: 'string' }, capability_intent: { type: 'array', items: { type: 'string' } }, maturity_levels: { type: 'array', items: { $ref: '#/components/schemas/MaturityLevel' } }, common_issues: { type: 'array', items: { type: 'string' } } } },
        FocusAreaList: { type: 'object', properties: { count: { type: 'integer' }, items: { type: 'array', items: { $ref: '#/components/schemas/FocusArea' } } } },
        FocusAreaDetail: { allOf: [{ $ref: '#/components/schemas/FocusArea' }, { type: 'object', properties: { best_practices_detail: { type: 'array', items: { $ref: '#/components/schemas/BestPractice' } } } }] },
        BestPractice: { type: 'object', properties: { id: { type: 'string', example: 'AGENTOPS01-BP01' }, title: { type: 'string' }, pillar: { type: 'string' }, pillar_slug: { type: 'string' }, focus_area_id: { type: 'string' }, focus_area: { type: 'string' }, focus_area_question: { type: 'string' }, risk: { type: 'string', enum: riskEnum }, aws_services: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' }, desired_outcome: { type: 'array', items: { type: 'string' } }, roadmap: { type: 'array', items: { type: 'string' } }, doc_url: { type: 'string', format: 'uri' }, guidance_markdown: { type: ['string', 'null'] }, links: { $ref: '#/components/schemas/Links' } } },
        BestPracticeList: { type: 'object', properties: { total: { type: 'integer' }, count: { type: 'integer' }, offset: { type: 'integer' }, limit: { type: 'integer' }, items: { type: 'array', items: { $ref: '#/components/schemas/BestPractice' } } } },
        Guidance: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, doc_url: { type: 'string' }, markdown: { type: 'string' } } },
        Roadmap: { type: 'object', properties: { id: { type: 'string', enum: roadmapIds }, label: { type: 'string' }, intro: { type: 'string' }, focus_areas: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, summary: { type: 'string' }, name: { type: 'string' }, best_practices: { type: 'array', items: { type: 'string' } }, best_practices_detail: { type: 'array', items: { $ref: '#/components/schemas/BestPractice' } } } } }, counts: { type: 'object' }, links: { $ref: '#/components/schemas/Links' } } },
        RoadmapList: { type: 'object', properties: { count: { type: 'integer' }, items: { type: 'array', items: { $ref: '#/components/schemas/Roadmap' } } } },
      },
    },
  };
}
