import s from 'shelljs'
import config from './tsconfig.json'
const outDir = config.compilerOptions.outDir

s.cp('src/utils/compareSourceOfDatasets.py', `${outDir}/utils/`)