const s = require('shelljs')
const config = require('./tsconfig.json');
const outDir = config.compilerOptions.outDir;

s.rm('-rf', outDir);
s.mkdir(outDir);
s.cp('.env', `${outDir}/.env`);
s.mkdir(`${outDir}/server/`);
s.mkdir(`${outDir}/server/apps`);
s.mkdir(`${outDir}/server/apps/api`);
//s.cp('server/common/api.yml', `${outDir}/server/common/api.yml`);
s.cp('server/apps/api/api.yml', `${outDir}/server/apps/api/api.yml`);