import * as React from 'react'
export default function App() {
	React.useEffect(() => {

		// eslint-disable-next-line @typescript-eslint/no-empty-function
		return () => {}
	}, [])
	return <div id='stats' />
}