import {noView, customElement, bindable} from 'aurelia-templating';
import {decorators} from 'aurelia-metadata';
import {createElement} from 'react';
import {render} from 'react-dom';

/**
 * Configure the aurelia loader to use handle urls with !component
 * @param {FrameworkConfiguration} config
 */
export function configure(config) {
  const loader = config.aurelia.loader;
  loader.addPlugin('react-component', {
    fetch(address) {
      return loader.loadModule(address)
        .then(getComponents);
    }
  });
}

/**
 * Extract the components from the loaded module
 * @param {Object} module Object containing all exported properties
 * @returns {Object}
 */
export function getComponents(module) {
  return Object.keys(module).reduce((elements, name) => {
    if (typeof module[name] === 'function') {
      const elementName = camelToKebab(name);
      elements[elementName] = wrapComponent(module[name], elementName);
    }
    return elements;
  }, {});
}

/**
 * Converts camel case to kebab case
 * @param {string} str
 * @returns {string}
 */
function camelToKebab(str) {
  // Matches all places where a two upper case chars followed by a lower case char are and split them with an hyphen
  return str.replace(/([a-zA-Z])([A-Z][a-z])/g, (match, before, after) =>
    `${before.toLowerCase()}-${after.toLowerCase()}`
  ).toLowerCase();
}

/**
 * Wrap the React components into an ViewModel with bound attributes for the defined PropTypes
 * @param {Object} component
 * @param {string} elementName
 * @returns {Object}
 */
function wrapComponent(component, elementName) {
  let bindableProps = [];
  if (component.propTypes) {
    bindableProps = Object.keys(component.propTypes).map(prop => bindable({
      name: prop,
      attribute: camelToKebab(prop),
      changeHandler: 'updateProps',
      defaultBindingMode: 1
    }));
  }
  return decorators(
    noView(),
    customElement(elementName),
    bindable({name: 'props', attribute: 'props', changeHandler: 'updateProps', defaultBindingMode: 1}),
    ...bindableProps
  ).on(createWrapperClass(component));
}

/**
 * Create a wrapper class for the component
 * @param {Object} component
 * @returns {WrapperClass}
 */
function createWrapperClass(component) {
  return class WrapperClass {
    static inject = [Element];

    /**
     * @param {Element} element
     */
    constructor(element) {
      this.element = element;
    }

    /**
     * Re-render the Preact component when values changed
     */
    attached() {
      if (!this.component) {
        this.render();
      } else if (typeof this.component.componentDidMount === 'function') {
        this.component.componentDidMount();
      }
    }

    /**
     * Triggers un-mound function to release events
     */
    detached() {
      if (this.component && typeof this.component.componentWillUnmount === 'function') {
        this.component.componentWillUnmount();
      }
    }

    /**
     * Un-render the component
     */
    unbind() {
      this.component = null;
      this.element.component = null;
      render('', this.element, this.component);
    }

    /**
     * Determine props passed to create react elements
     * @returns {Object}
     */
    getProps() {
      const props = this.props || {};
      // Copy bound properties because Object.assign doesn't work deep
      for (const prop in this) {
        if (this[prop] !== undefined && typeof this[prop] !== 'function') {
          props[prop] = this[prop] === '' ? true : this[prop];
        }
      }
      delete props.element;

      return Object.assign({}, component.defaultProps, props);
    }

    /**
     * Will be called when bindable updated
     */
    updateProps() {
      if (this.component && typeof this.component.componentWillReceiveProps === 'function') {
        const props = this.getProps();
        this.component.componentWillReceiveProps(props);
        this.component.props = props;
      }
    }

    /**
     * Render Preact component
     */
    render() {
      // Create container in active dom to apply styles already
      const container = document.createElement('div');
      this.element.appendChild(container);

      // Render react component with a slot as children into a container to possibly replace the slot with real children
      const reactElement = createElement(component, this.getProps(), createElement('slot'));
      this.component = render(reactElement, container);
      this.element.component = this.component;

      const slot = container.querySelector('slot');
      // If no slot is rendered the component doesn't accept children
      if (slot) {
        const content = this.element.querySelector('au-content');
        if (!content) {
          return;
        }
        // Move original children to slot position
        for (let i = 0; i < content.children.length; i++) {
          slot.parentNode.insertBefore(content.children[i], slot);
        }
        slot.parentNode.removeChild(slot);
        this.insertContainerContent(container, content);
      } else {
        this.insertContainerContent(container);
      }
    }

    /**
     * Moves content of the container into the correct place within this element
     * @param {HTMLElement} container
     * @param {HTMLElement} replacement
     */
    insertContainerContent(container, replacement) {
      // Append child to fragment to get rid of container element which can break element flow
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < container.children.length; i++) {
        fragment.appendChild(container.children[i]);
      }
      // Either replace au-content or just append if no children are passed
      if (replacement) {
        this.element.replaceChild(fragment, replacement);
      } else {
        this.element.appendChild(fragment);
      }
      // Container is now obsolete as the children are laying directly under the parent
      this.element.removeChild(container);
    }
  };
}
