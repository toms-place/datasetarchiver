import * as React from 'react'
import * as ReactDOM from 'react-dom'
import {
	BrowserRouter as Router,
	Switch,
	Route,
} from 'react-router-dom'
import { Container } from 'semantic-ui-react'
import Sparql from './components/Sparql'
import Menu from './components/Menu'
import Swagger from './components/Swagger'
import Home from './components/Home'
import ErrorBoundary from './boundaries/errors'

ReactDOM.render(
	<Router>

		<Container style={{ marginTop: '2em' }}>
			<Menu />

			<Switch>
				<Route exact path="/">
					<Home />
				</Route>
				<Route path="/yasgui">
					<Sparql />
				</Route>
				<Route path="/api-doc">
					<ErrorBoundary>
						<Swagger />
					</ErrorBoundary>
				</Route>
			</Switch>

		</Container>
	
	</Router>,
	document.getElementById('root')
)