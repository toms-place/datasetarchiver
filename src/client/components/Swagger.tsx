import React from 'react'
import SwaggerUI from 'swagger-ui'
import 'swagger-ui-react/swagger-ui.css'

const DOM_ID = 'swagger-ui-mountpoint'

export default function App() {
	React.useEffect(() => {
		SwaggerUI({
			dom_id: `#${DOM_ID}`,
			url: window.location.origin + '/api/v1/spec',
			deepLinking: true,
			presets: [SwaggerUI.presets.apis],
			plugins: [SwaggerUI.plugins.DownloadUrl]
		})
	
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		return () => {}
	}, [])
	return <div id={DOM_ID} />
}