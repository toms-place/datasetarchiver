const s = require('shelljs')
const config = require('./tsconfig.json');
const outDir = config.compilerOptions.outDir;

s.rm('-rf', outDir);
s.mkdir(outDir);
s.cp('.env', `${outDir}/.env`);
s.cp('-R', 'src/public/', `${outDir}/public`);
s.cp('-R', 'src/templates/', `${outDir}/templates`);
s.mkdir('-p', `${outDir}/server/apps/api/`);
s.mkdir('-p', `${outDir}/src/server/utils/`);
s.cp('-R', 'src/server/utils/compareSourceOfDatasets.py', `${outDir}/src/server/utils/compareSourceOfDatasets.py`);
s.cp('-R', 'src/server/apps/api/api.yml', `${outDir}/server/apps/api/api.yml`);