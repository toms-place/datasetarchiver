import * as React from 'react'
import Yasgui from '@triply/yasgui'
import Tab from '@triply/yasgui/build/ts/src/Tab'
import { Container, Header, Grid, Button } from 'semantic-ui-react'

const url = process.env.URL || 'https://archiver.ai.wu.ac.at'

export default class Sparql extends React.Component<{}, { showButton: boolean; query: string }> {
	constructor(props: Readonly<{}>) {
		super(props)
		this.state = {
			showButton: false,
			query: null
		}
	}

	componentDidMount() {
		Yasgui.Yasqe.defaults.requestConfig.endpoint = 'https://archiver.ai.wu.ac.at/sparql'
		Yasgui.Yasqe.defaults.requestConfig.method = 'GET'
		Yasgui.Yasqe.defaults.requestConfig.defaultGraphs = ['https://archiver.ai.wu.ac.at/graph']
		Yasgui.Yasqe.defaults.value = `
		PREFIX csvw: <http://www.w3.org/ns/csvw#>
		PREFIX dcat: <http://www.w3.org/ns/dcat#>
		PREFIX dc: <http://purl.org/dc/elements/1.1>
		
		select ?colname ?coltype ?issued ?md5 ?bytes ?mediaType ?title ?encoding ?delimiter ?dataset ?version 
		from <https://archiver.ai.wu.ac.at/graph>
		where {
			?dataset dc:hasVersion ?version ; dcat:mediaType ?mediaType ; dc:title ?title .
			?version dc:issued ?issued ; dc:identifier ?md5 ; dcat:byteSize ?bytes .
			?csv csvw:url ?version ; csvw:dialect ?sebneum ; csvw:tableSchema ?schema .
			?schema csvw:column ?col .
			?col csvw:name ?colname ; csvw:datatype ?coltype .
			?sebneum csvw:encoding ?encoding ; csvw:delimiter ?delimiter .
		}
		limit 10`

		const yasgui = new Yasgui(document.getElementById('yasgui'), {
			copyEndpointOnNewTab: false
		})
		yasgui.on('query', (instance: Yasgui, tab: Tab) => {
			const val: string = tab.getYasqe().getValue()
			if (val.search('dc:hasVersion') >= 0) {
				this.setState({showButton: true})
				this.setState({query: val})
			} else {
				this.setState({showButton: false})
				this.setState({query: null})
			}
		})

	}

	render() {
		return (
			<Container>
				<Container style={{ marginBottom: '2em', marginTop: '2em' }}>
					<Grid columns='equal'>
						<Grid.Column>
							<Header as='h2' dividing>
								Sparql Interface
							</Header>
							<p>If you perform a query containing dc:hasVersion you can download the versions instantly. </p>
						</Grid.Column>
						<Grid.Column textAlign='right'>
							<div>
								{	this.state.showButton ? 
									<Button content='Download files as ZIP'
										onClick={(e: React.MouseEvent) => {window.open(`${url}/api/v1/get/files/sparql?q=${encodeURIComponent(this.state.query)}`)}}
									/>
									: null
								}
							</div>
						</Grid.Column>
					</Grid>
				</Container>
				<div id='yasgui'></div>
			</Container>
		)
	}
}