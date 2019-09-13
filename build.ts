const s = require('shelljs')
const config = require('./tsconfig.json');
const outDir = config.compilerOptions.outDir;

s.rm('-rf', outDir);
s.mkdir(outDir);
s.cp('.env', `${outDir}/.env`);
s.cp('templates', `${outDir}/templates`);
s.cp('public', `${outDir}/public`);
s.cp('server/common/api.yml', `${outDir}/server/common/api.yml`);