# MCP Configuration Setup

This document explains how to set up Model Context Protocol (MCP) servers for enhanced development experience with this Almona portfolio project.

## MCP Settings Configuration

The optimal MCP configuration for this React/TypeScript portfolio project includes:

### Required MCP Servers
1. **filesystem** - File operations within the project
2. **git** - Git repository management
3. **github** - GitHub integration
4. **fetch** - HTTP requests for API testing
5. **sequential-thinking** - Enhanced problem-solving

### Configuration File Location
The MCP settings should be configured in:
```
Windows: %APPDATA%\Code\User\globalStorage\blackboxapp.blackboxagent\settings\blackbox_mcp_settings.json
```

### Configuration Content
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "c:/projects/almona-portfolio-forge"],
      "env": {}
    },
    "git": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-git"],
      "env": {}
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your-github-token-here"
      }
    },
    "fetch": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"],
      "env": {}
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"],
      "env": {}
    }
  }
}
```

### GitHub Token Setup
To get your GitHub personal access token:
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo`, `user`, and optionally `admin:org`
4. Copy the token and replace "your-github-token-here" in the settings file

### Installation
All MCP servers will be automatically installed via npx when the configuration is loaded.

### Usage
Once configured, these MCP servers will provide enhanced capabilities for:
- File system operations
- Git repository management
- GitHub integration
- HTTP API testing
- Advanced problem-solving assistance
