# LLM Support for Better Auth

This implementation adds LLM-optimized documentation endpoints to your HAProxy WebUI application, following the Better Auth LLM support pattern described at https://www.better-auth.com/docs/introduction.

## What is LLM Support?

LLM Support provides AI models with structured documentation about your authentication system in a format they can easily parse and use to:
- Generate correct authentication code
- Answer questions about your auth setup
- Provide accurate implementation suggestions
- Understand your API endpoints and usage patterns

## Endpoint

A single endpoint has been created to expose your authentication documentation:

### `/llms.txt`
Standard LLMs.txt endpoint following the LLMs.txt specification
- **URL:** `http://localhost:3000/llms.txt`
- **Format:** Markdown
- **Cache:** 1 hour

## What's Included

The LLMs.txt documentation includes:

- **Authentication Endpoints:** All available auth endpoints with client and server usage examples
- **Database Schema:** Complete schema for users, sessions, and accounts tables
- **Configuration:** Server setup, environment variables, and cookie settings
- **Client Setup:** How to create and use the Better Auth client
- **Protected Routes:** Examples for protecting server components and API routes
- **Security Features:** Overview of security measures in place
- **Migration Guide:** Information for migrating from legacy authentication

## Usage

### For AI Assistants (Claude, ChatGPT, etc.)

When asking your AI assistant for help with authentication, you can reference:

```
Read http://localhost:3000/llms.txt and help me implement authentication
```

Or in production:
```
Read https://your-domain.com/llms.txt and help me add authentication to my page
```

### For Cursor/VSCode with MCP

While Better Auth provides an official MCP server at `https://mcp.inkeep.com/better-auth/mcp`, your local LLMs.txt endpoint provides project-specific context about your exact authentication setup.

### Manual Access

You can view the documentation directly:
```bash
curl http://localhost:3000/llms.txt
```

Or visit it in your browser to see the full authentication documentation.

## Files Created

1. **`/app/llms.txt/route.ts`** - LLMs.txt endpoint
2. **`/LLMS_SUPPORT.md`** - This documentation file

## Updating the Documentation

To update the authentication documentation exposed via this endpoint:

1. Edit `/app/llms.txt/route.ts`
2. Modify the `content` string with updated information
3. The endpoint is statically generated, so changes will be visible after rebuilding or in development mode immediately

## Benefits

✅ **Better AI Assistance:** AI tools can provide more accurate code suggestions
✅ **Consistent Documentation:** Single source of truth for auth implementation
✅ **Developer Onboarding:** New developers can query the documentation via AI
✅ **API Discoverability:** Clear endpoint documentation with usage examples
✅ **Type Safety:** Examples show correct TypeScript usage

## Example AI Prompts

With the LLMs.txt endpoint in place, you can ask AI assistants:

- "Read http://localhost:3000/llms.txt and create a protected admin page"
- "Based on http://localhost:3000/llms.txt, show me how to implement sign out"
- "Using the auth setup from http://localhost:3000/llms.txt, protect this API route: [paste code]"
- "Read http://localhost:3000/llms.txt and explain how sessions work in this app"

## Related Better Auth Features

This implementation complements other Better Auth AI tooling:

- **Official LLMs.txt:** https://better-auth.com/llms.txt (general Better Auth docs)
- **Skills:** `npx skills add better-auth/skills` (add Better Auth context to AI assistants)
- **MCP Server:** `https://mcp.inkeep.com/better-auth/mcp` (Better Auth MCP integration)

Your local `/llms.txt` provides **project-specific** context, while Better Auth's official resources provide **framework-level** documentation.

## Testing

Test that the endpoint is working:

```bash
# Test the endpoint
curl http://localhost:3000/llms.txt

# Check headers
curl -I http://localhost:3000/llms.txt
```

Expected response:
- Status: 200 OK
- Content-Type: text/markdown; charset=utf-8
- Cache-Control: public, max-age=3600

## Production Deployment

The endpoints work automatically in production. Make sure to:

1. Update any localhost URLs in AI prompts to your production domain
2. The static generation ensures fast response times
3. Consider adding authentication if you don't want the docs publicly accessible

## References

- [Better Auth LLM Support](https://www.better-auth.com/docs/introduction#ai-tooling)
- [LLMs.txt Standard](https://llmstxt.org/)
- [Better Auth Documentation](https://better-auth.com/docs)
