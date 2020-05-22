import * as React from 'react'

export default class ErrorBoundary extends React.Component {
	constructor(props: Readonly<{}>) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError(error: any) {
		// Update state so the next render will show the fallback UI.
		return { hasError: true }
	}

	render() {
		//@ts-ignore
		if (this.state.hasError) {
			// You can render any custom fallback UI
			return <h1>Something went wrong.</h1>
		}

		return this.props.children 
	}
}
