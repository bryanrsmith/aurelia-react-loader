import { noView, customElement, bindable } from 'aurelia-templating';
import { decorators } from 'aurelia-metadata';
import React from 'react';
import ReactDOM from 'react-dom';
import hyphenate from 'lodash.kebabcase';

export function configure({ aurelia }) {
	const loader = aurelia.loader;
	loader.addPlugin('react-component', {
		fetch(address) {
			return loader.loadModule(address)
				.then(getReactCustomElements);
		}
	});
}

function getReactCustomElements(module) {
	const elements = {};

	for (const name in module) {
		if (module.hasOwnProperty(name)) {
			const elementName = hyphenate(name);
			elements[elementName] = createReactElement(component, elementName);
		}
	}

	return elements;
}

function createReactElement(component, name) {
	return decorators(
		noView(),
		customElement(name),
		bindable({
			property: 'props',
			propertyChanged: 'propsChanged',
			defaultBindingMode: 1,
		})).on(createCustomElementClass(component));
}

function createCustomElementClass(component) {
	return class ReactComponent {
		static inject() {
			return [ Element ];
		}

		constructor(element) {
			this.element = element;
			this.component = null;
		}

		propsChanged() {
			this.render();
		}

		bind() {
			this.render();
		}

		unbind() {
			ReactDOM.unmountComponentAtNode(this.element);
			this.component = null;
		}

		render() {
			this.component = ReactDOM.render(
				React.createElement(component, this.props),
				this.element
			);
		}
	};
}
