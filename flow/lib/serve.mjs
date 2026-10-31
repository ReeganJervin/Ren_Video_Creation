// Starts flow-mcp's own engine and local API for one Google account, without opening its control panel.
// Run by flow-video.js with the account's settings in the environment (FLOW_MCP_HOME, FLOW_MCP_PORT,
// FLOW_MCP_CDP_PORT, FLOW_MCP_OUTPUT), which flow-mcp reads when it loads, so they must be set before the import.
//   node serve.mjs <flow-mcp folder>
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.argv[2];
const load = f => import(pathToFileURL(join(root, 'dist', f)).href);
const { LocalCore } = await load('core.js');
const { startServer, PORT } = await load('server.js');
const role = await startServer(new LocalCore());
// owner: this process drives Flow until it is stopped; client: another flow-mcp already serves this port
console.log(JSON.stringify({ role, port: PORT }));
if (role !== 'owner') process.exit(role === 'client' ? 0 : 1);
