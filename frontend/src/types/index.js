/**
 * @typedef {Object} Project
 * @property {string} id
 * @property {string} name
 * @property {string} contentType - 'blog_article' | 'linkedin_post' | 'professional_email' | 'video_script' | 'sales_page' | 'book_chapter'
 * @property {string} budgetMode - 'fast' | 'standard' | 'premium'
 * @property {string} status - 'draft' | 'briefed' | 'planned' | 'writing' | 'review' | 'completed'
 * @property {number|null} qualityScore
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string} userId
 */

/**
 * @typedef {Object} Brief
 * @property {string} id
 * @property {string} projectId
 * @property {string} mission
 * @property {string} objective
 * @property {string} audience
 * @property {string} problem
 * @property {string} promise
 * @property {string} angle
 * @property {string} [channel]
 * @property {string} [tone]
 * @property {string} cta
 * @property {string} [constraints]
 * @property {string} forbidden
 * @property {string} [sources]
 * @property {string} [notes]
 * @property {string} createdAt
 */

/**
 * @typedef {Object} BrandVoice
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} tone
 * @property {string} vocabulary
 * @property {string} forbiddenWords
 * @property {string} styleExamples
 * @property {string} userId
 * @property {string} createdAt
 */

/**
 * @typedef {Object} ContentVersion
 * @property {string} id
 * @property {string} projectId
 * @property {number} version
 * @property {string} content
 * @property {string} agentName
 * @property {string} createdAt
 */

/**
 * @typedef {Object} AgentRun
 * @property {string} id
 * @property {string} projectId
 * @property {string} agentName
 * @property {string} status - 'pending' | 'running' | 'success' | 'failed'
 * @property {Object} input
 * @property {Object} output
 * @property {number} tokensUsed
 * @property {number} cost
 * @property {string} createdAt
 * @property {string} completedAt
 */

/**
 * @typedef {Object} QualityScore
 * @property {number} total - 0-100
 * @property {string} decision - 'ACCEPTÉ' | 'À CORRIGER' | 'BLOQUÉ'
 * @property {string} feedback
 * @property {Object} criteria
 * @property {number} criteria.structure
 * @property {number} criteria.clarity
 * @property {number} criteria.relevance
 * @property {number} criteria.tone
 * @property {number} criteria.cta
 * @property {number} criteria.seo
 * @property {number} criteria.originality
 * @property {number} criteria.engagement
 * @property {number} criteria.accuracy
 * @property {number} criteria.brandAlignment
 * @property {number} retryCount
 */

/**
 * @typedef {Object} WorkflowConfig
 * @property {string} budgetMode - 'fast' | 'standard' | 'premium'
 * @property {string} [brandVoiceId]
 * @property {boolean} [skipHumanizer]
 * @property {boolean} [skipBrandVoice]
 */

/**
 * @typedef {Object} Budget
 * @property {string} projectId
 * @property {number} costLimit
 * @property {number} costUsed
 * @property {number} callLimit
 * @property {number} callsUsed
 */

/**
 * SSE Event types
 * @typedef {'agent_start'|'agent_end'|'agent_error'|'token'|'workflow_complete'|'workflow_error'|'step_update'|'quality_score'|'budget_update'} SSEEventType
 */

/**
 * @typedef {Object} SSEEvent
 * @property {SSEEventType} type
 * @property {string} [agent]
 * @property {string} [content]
 * @property {string} [message]
 * @property {QualityScore} [qualityScore]
 * @property {Budget} [budget]
 * @property {number} timestamp
 */

export {}
