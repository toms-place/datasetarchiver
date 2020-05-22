const config = {
	entry: __dirname + '/src/client/index.tsx',
	output: {
		path: __dirname + '/public',
		filename: 'client.js'
	},
	resolve: {
	// Add '.ts' and '.tsx' as resolvable extensions.
		extensions: ['.ts', '.tsx', '.js', '.jsx']
	},
	module: {
		rules: [{
			test: /\.ts(x?)$/,
			exclude: /node_modules/,
			use: [{
				loader: 'ts-loader',
				options: {
					configFile: 'react.tsconfig.json'
				}
			}]
		},
		{
			test: /\.css$/i,
			use: ['style-loader', 'css-loader'],
		},
		// All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
		{
			enforce: 'pre',
			test: /\.js$/,
			loader: 'source-map-loader'
		}
		]
	},

	// When importing a module whose path matches one of the following, just
	// assume a corresponding global variable exists and use that instead.
	// This is important because it allows us to avoid bundling all of our
	// dependencies, which allows browsers to cache those libraries between builds.
	externals: {
		'react': 'React',
		'react-dom': 'ReactDOM',
		'@triply/yasgui': 'Yasgui'
	}
}
  
module.exports = (_env, argv) => {
  
	if (argv.mode === 'development') {
		config.mode = 'development'
		config.devtool = 'source-map'
		config.watch = true
	} else {
		config.mode = 'production'
	}
  
	return config
}
