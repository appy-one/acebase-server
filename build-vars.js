// Executed by npm "prepack" script
const { readFileSync, writeFileSync } = require('fs');
const packageInfo = require('./package.json');

const files = ['./dist/cjs/routes/meta-info.js', './dist/esm/routes/meta-info.js'];
files.forEach(file => {
    let content = readFileSync(file, 'utf8');
    content = content.replace(/%SERVER_VERSION%/g, packageInfo.version);
    writeFileSync(file, content, 'utf8');
    console.log(`Replaced variable %SERVER_VERSION% with ${packageInfo.version} in ${file}`);
});
