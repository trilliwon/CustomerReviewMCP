# App Store Connect MCP Server

A Model Context Protocol (MCP) server for interacting with the App Store Connect API. This server provides tools for managing apps, customer reviews, and beta testing in App Store Connect.

## Features

- **App Management**
  - List all apps
  - Get detailed app information
  - View app metadata and relationships

- **Customer Review Management**
  - List all customer reviews for an app
  - List customer reviews for a specific App Store Version
  - Create responses to customer reviews
  - Delete customer review responses
  - Get existing customer review responses

- **Beta Testing**
  - List beta groups
  - View beta group details and relationships

- **User Management**
  - List team members
  - View user roles and permissions
  - Filter users by role and access

## Installation

```bash
npm install @your-org/app-store-connect-mcp-server
```

## Configuration

Add the following to your Claude Desktop configuration file:

### macOS
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

### Windows
```bash
%APPDATA%\Claude\claude_desktop_config.json
```

```json
{
  "mcpServers": {
    "app-store-connect": {
      "command": "npx",
      "args": [
        "-y",
        "@your-org/app-store-connect-mcp-server"
      ],
      "env": {
        "APP_STORE_CONNECT_KEY_ID": "YOUR_KEY_ID",
        "APP_STORE_CONNECT_ISSUER_ID": "YOUR_ISSUER_ID",
        "APP_STORE_CONNECT_P8_PATH": "/path/to/your/auth-key.p8"
      }
    }
  }
}
```

## Authentication

1. Generate an App Store Connect API Key from [App Store Connect](https://appstoreconnect.apple.com/access/api)
2. Download the .p8 private key file
3. Note your Key ID and Issuer ID
4. Set the environment variables in your configuration

## Available Tools

### App Management
- `list_apps`: Get a list of all apps in App Store Connect
- `get_app_info`: Get detailed information about a specific app

### Customer Review Management
- `list_customer_reviews`: List all customer reviews for an app
- `list_customer_reviews_for_version`: List customer reviews for a specific App Store Version
- `create_customer_review_response`: Create or replace a response to a customer review
- `delete_customer_review_response`: Delete a response to a customer review
- `get_customer_review_response`: Get the response to a specific customer review

### Beta Testing
- `list_beta_groups`: List all beta testing groups with their relationships

### User Management
- `list_users`: List all team members with role filtering and relationship inclusion

## Error Handling

The server implements proper error handling for:
- Invalid authentication
- Missing required parameters
- API rate limits
- Network issues
- Invalid operations

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run type checking
npm run type-check
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Related Links
- [Model Context Protocol Documentation](https://modelcontextprotocol.io)
- [App Store Connect API Documentation](https://developer.apple.com/documentation/appstoreconnectapi)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)