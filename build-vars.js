// Executed by npm "version" hook
const { readFileSync, writeFileSync } = require('fs');
const { execSync } = require('child_process');
const packageInfo = require('./package.json');

const sources = ['routes/meta-info', 'routes/docs'];
const files = sources.reduce((all ,file) => (all.push(`./dist/cjs/${file}.js`, `./dist/esm/${file}.js`), all), []);
files.forEach(file => {
    const originalContent = readFileSync(file, 'utf8');
    content = originalContent.replace(/%SERVER_VERSION%/g, packageInfo.version);
    if (content !== originalContent) {
        writeFileSync(file, content, 'utf8');
        console.log(`Replaced variable %SERVER_VERSION% with ${packageInfo.version} in ${file}`);
    }
});

execSync(`git add dist`);
