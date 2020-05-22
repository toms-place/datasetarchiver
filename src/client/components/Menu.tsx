import React, { Component } from 'react'
import { Menu, MenuItemProps } from 'semantic-ui-react'
import { Link } from 'react-router-dom'

export default class MenuComponent extends Component {
	state = {}

	handleItemClick = (e: React.MouseEvent, { name }: MenuItemProps) => {
		this.setState({ activeItem: name })
	}

	render(): JSX.Element {
		const activeItem = this.state

		return (
			<Menu>
				<Menu.Item 
					header
					as={Link}
					to='/'
					onClick={this.handleItemClick}>
						ODArchiver
				</Menu.Item>
				<Menu.Item
					name='Sparql'
					as={Link}
					to='yasgui'
					active={activeItem === 'Sparql'}
					onClick={this.handleItemClick}
				/>
				<Menu.Item
					name='API Documentation'
					as={Link}
					to='api-doc'
					active={activeItem === 'API Documentation'}
					onClick={this.handleItemClick}
				/>
				<Menu.Item
					name='Presentation'
					active={activeItem === 'Presentation'}
					onClick={(e: React.MouseEvent) => window.location.href = window.location.origin + '/slides'}
				/>
				<Menu.Item
					name='Stats'
					active={activeItem === 'Stats'}
					onClick={(e: React.MouseEvent) => window.location.href = window.location.origin + '/stats'}
				/>
			</Menu>
		)
	}
}