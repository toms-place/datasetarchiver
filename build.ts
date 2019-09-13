const s = require('shelljs')
const config = require('./tsconfig.json');
const outDir = config.compilerOptions.outDir;

s.rm('-rf', outDir);
s.mkdir(outDir);
s.cp('.env', `${outDir}/.env`);
s.mkdir(`${outDir}/server/`);
s.mkdir(`${outDir}/server/api/`);
//s.cp('server/common/api.yml', `${outDir}/server/common/api.yml`);
s.cp('server/api/api.yml', `${outDir}/server/api/api.yml`);