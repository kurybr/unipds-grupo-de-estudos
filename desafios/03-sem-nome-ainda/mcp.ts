import { MCPAdapter } from "@langchain/mcp-adapters";


export const mcps = new MCPAdapter({
    servers: {
        mongodb: {
            command: "npx",
            args: ["-y", "mongodb-mcp-server@latest", "--readOnly"],
            env: {
                MDB_MCP_CONNECTION_STRING: "mongodb://localhost:27017/hotina"
            }
        },
        chrome: { 
            command: 'npx',
            args: ["-y", "chrome-devtools-mcp@latest"]
        }
    }
});
