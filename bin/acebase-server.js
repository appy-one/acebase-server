#!/usr/bin/env node

if (process.argv[2] === 'start') {
    require('../dist/cjs/start');
}
else {
    console.log(`[acebase-server CLI] unknown instruction. Did you mean "npx acebase-server start"?`);
}
