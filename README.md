# aurelia-react-loader
This plugin allows you to load and render React/Preact components in your Aurelia application.

## Installation
First install the loader plugin.

```
au install aurelia-react-loader
```

Then register the plugin with Aurelia.

```diff
export function configure(aurelia) {
  aurelia.use
    .standardConfiguration()
    .developmentLogging()
+   .plugin('aurelia-react-loader');

  aurelia.start().then(() => aurelia.setRoot());
}
```

## Usage

Import react components into Aurelia views just like you import a custom element. 
Just specify the `react-component!` loader before the module name. 

In `aurelia-view.html`:
```html
<template>
  <require from="react-component!my-react-component.js"></require>
  <my-react-component name.bind="someCrazyName" on-click.bind="submit"></my-react-component>
</template>
```

In `my-react-component.js`:
```jsx
import React from 'react';
import PropTypes from 'prop-types';

export class MyReactComponent extends React.Component {
  static propTypes = {
    name: PropTypes.string,
    onClick: PropTypes.func
  }

  render() {
    let { name, onClick } = this.props;
    return (<button onClick={onClick}>Hello, {name}</button>);
  }
}
```

# Use Preact instead of React
As Preact is way smaller than React I consider it to be the better library to choose (if possible) when adding 3rd-Party components.

#### Install preact
```bash
au install preact
au install preact-compat
```

#### Mapping React to Preact
First of all we have to tell our loader to map the load of react to load preact instead. For RequireJS you just have to
add a small part to the loader section in your aurelia.json. For webpack or SystemJS I don't know. 
Feel free to tell me how it works so that I can add it here.
```json
"loader": {
  "type": "require",
  "configTarget": "vendor-bundle.js",
  "includeBundleMetadataInConfig": "auto",
  "config": {
    "map": {
      "*": {
        "react": "preact",
        "react-dom": "preact-compat"
      }
    }
  },
  ...
}
```

With the new aurelia-cli (> 1.0.0-beta.1) this is not enough. To tell the tracer the same like RequireJS we have to rewrite
the loaded module by using the `onRequiringModule` hook. 
```js
function writeBundles() {
  return buildCLI.dest({
    onRequiringModule(moduleId) {
      if (moduleId === 'react') {
        return ['preact'];
      }
      if (moduleId === 'react-dom') {
        return ['preact-compat'];
      }
    }
  });
}
``` 

# How it works
### General
The aurelia-react-loader hooks into the require loading process and receives an object of react component classes like `{MyReactComponent: class MyReactComponent}`.
All keys within this object are the exported classes, vars, etc and the plugin uses them to register the html tag by converting the name to kebab case.
Now the plugin creates a wrapper class which is actually a aurelia custom element which renders into it's element the react component.
To be able to bind the component props via aurelia's binding engine the plugin creates a bindable attribute for each property defined in `propTypes`.
If you haven't defined propTypes you can also bind a object to props. The plugin also considers the defaultProps and passes a merged object to the createElement function.

The react element is rendered into a div container beside possible `<au-content>` first. This ensures all styles are applied
to your component and the lifecycle componentDidMount is really meaning that it's available in the dom. After the element is
rendered and the children were projected the rendered component is appended to the custom element's div element and the previous container is removed.

### Content projection
To enable the content projection into react components the plugin passes `createElement('slot')` as children to the component.
Once your component used {this.props.children} and a `<slot>` element will be rendered as html the plugin know it must project the content.
To do that the aurelia-react-loader takes the already rendered children from `<au-content>` and appends them before the `<slot>` inside the component html.
After the children are moved, the slot placeholder gets removed and the html is appended to the custom element's `<div>` element.

### Lifecycle
- **CustomElement.attached()** -> React component will be rendered if not done yet and mounted to the dom and therefore `componentDidMount` will be called
- **CustomElement.detached()** -> React component is unmounted from dom and `componentWillUnmount` will be called 
- **CustomElement.unbind()** -> React component will be completely destroyed and un-rendered
- **CustomElement.anyChanged()** -> Once any bound attribute changes `componentWillReceiveProps` will be called and props on component will be updated


A few things to note:
* React component names are converted to kebab case for safe use in HTML. `<MyReactComponent foo={bar} />` in jsx becomes `<my-react-component props.bind="{foo:bar}"></my-react-component>` in an HTML Aurelia template.
* Pass props to the React component with the `props` binding. The component will be re-rendered when the binding changes.
* If you need to reference the React component directly it is stored in the `component` property of the custom element's view model. You can use a `ref` binding to access it.
* All functions exported from the required module are assumed to be React components, and wrapped with custom elements. Both stateful and stateless React components are supported.
