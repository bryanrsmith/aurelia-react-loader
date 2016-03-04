# aurelia-react-loader
Load React components directly from Aurelia views

## Installation
First install the loader plugin with jspm.

```
jspm install npm:aurelia-react-loader
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

# Use

Import react components into Aurelia views just like you import a custom element. Just specify the `!react-component` loader after the module name.

In `aurelia-view.html`:
```html
<template>
  <require from="my-react-component.js!react-component"></require>

  <input ref="in" />
  <my-react-component props.bind="{ name: in.value, onClick: submit }"></my-react-component>
</template>
```

In `my-react-component.js`:
```jsx
import React from 'react';

export class MyReactComponent extends React.Component {
  render() {
    let { name, onClick } = this.props;
    return (<button onClick={onClick}>Hello, {name}</button>);
  }
}
```

A few things to note:
* React component names are converted to kebab case for safe use in HTML. `<MyReactComponent foo={bar} />` in jsx becomes `<my-react-component props.bind="{foo:bar}"></my-react-component>` in an HTML Aurelia template.
* Pass props to the React component with the `props` binding. The component will be re-rendered when the binding changes.
* If you need to reference the React component directly it is stored in the `component` property of the custom element's view model. You can use a `ref` binding to access it.
* All functions exported from the required module are assumed to be React components, and wrapped with custom elements. Both stateful and stateless React components are supported.
