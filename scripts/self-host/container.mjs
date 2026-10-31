import {readConfig} from '../../server/config.mjs';
import {startServer} from '../../server/index.mjs';
// The container publishes only a loopback host port through Compose.
const instance=await startServer({...readConfig(),host:'0.0.0.0'});
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>instance.close().then(()=>process.exit(0)));
