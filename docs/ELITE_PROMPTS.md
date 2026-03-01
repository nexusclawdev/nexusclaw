# NexusClaw Elite System Prompts

## Overview
NexusClaw now uses extreme high-quality, optimized system prompts for maximum agent performance.

## What Changed

### Before
- Basic system prompt with minimal guidelines
- Generic instructions
- No structured protocols
- Limited security focus

### After
- **4 specialized elite prompts** for different scenarios
- Comprehensive capability documentation
- Structured execution protocols
- Security-first approach
- Production-grade quality standards

## Prompt Types

### 1. ELITE_SYSTEM_PROMPT (Main)
Used for all standard agent interactions.

**Key Features:**
- Complete tool documentation with use cases
- Code quality standards (security, testing, error handling)
- Task execution protocol (5-step process)
- Web development rules (self-contained HTML)
- Communication guidelines (concise, actionable)
- Performance metrics tracking

### 2. TASK_EXECUTION_PROMPT
Used when agents are assigned autonomous tasks.

**Key Features:**
- Clear deliverable requirements
- Quality standards enforcement
- Testing protocols
- Workspace organization rules
- Real code only (no TODOs)

### 3. SWARM_COORDINATION_PROMPT
Used for multi-agent collaboration.

**Key Features:**
- Communication protocols
- Task delegation patterns
- Conflict resolution
- Knowledge sharing

### 4. SECURITY_HARDENED_PROMPT
Used for high-security environments.

**Key Features:**
- Mandatory security rules
- Input validation requirements
- Threat detection
- Incident response

## Files Modified

1. **src/agent/prompts/elite-prompts.ts** (NEW)
   - All 4 prompt templates
   - ~400 lines of optimized prompts

2. **src/agent/context.ts**
   - Imports elite prompts
   - Uses ELITE_SYSTEM_PROMPT as default
   - Replaces all placeholders with actual values

3. **src/agent/task-worker.ts**
   - Enhanced task execution prompt
   - Includes quality standards
   - Emphasizes real, working code

4. **src/agent/prompts/README.md** (NEW)
   - Complete documentation
   - Best practices guide
   - Customization instructions

## Performance Targets

- **Task Completion Rate**: 95%+
- **Code Quality**: A grade
- **Security Compliance**: 100%
- **Response Time**: <2s average
- **Error Rate**: <5%

## Key Improvements

### Security
- Security rules are mandatory, not optional
- Input validation required
- Credential management protocols
- Threat detection patterns

### Code Quality
- Production-ready code required
- Comprehensive error handling
- Testing before delivery
- No pseudocode or TODOs

### Web Development
- Self-contained HTML files (embedded CSS/JS)
- Never reference external files unless created
- Use CDN links for libraries
- Test all functionality

### Communication
- Concise and actionable
- Transparent reasoning
- Proactive suggestions
- Clear status updates

## Usage

The elite prompts are automatically used by all agents. No configuration needed.

To customize:
1. Copy `elite-prompts.ts` to `custom-prompts.ts`
2. Modify templates
3. Update imports in `context.ts`

## Memory Integration

All agents now have access to:
- Elite prompt guidelines
- HTML development best practices
- Security protocols
- Quality standards

Stored in: `C:\Users\THOR\.claude\projects\D--nexusclaw\memory\MEMORY.md`

## Next Steps

1. Test agents with new prompts
2. Monitor performance metrics
3. Collect feedback
4. Iterate and improve

---

**Upgrade Date**: 2026-03-01
**Status**: ✅ Complete
**Impact**: All agents now use elite prompts
