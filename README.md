# MJO-POLYMER

`mjo-polymer` is an adaptation of the Polymer library to be able to use components created by yourself without the need to create an entire polymer-based site. In essence, what this library achieves is being able to use Polymer in a simple and efficient way in any personalized web page or made in Wordpress by adding only a few lines of code. A kind of improved lit-element since you can take advantage of the full potential of Polymer by creating web components with fully optimized resources for the web.

In addition, additional useful functionalities have been added for various works in javascript, taking advantage of the potential of the original library.

## Install

```
$ npm i mjo-polymer
```

## Use

Adding custom components is very simple, you just have to create a Polymer web component as you can see in the <a href="https://polymer-library.polymer-project.org/3.0/docs/about_30" target="_blank">Polymer 3</a> documentation itself, varying only the routes of the imports in the javascript file:

<span style="font-size:12px">my-component.js</span>

```javascript
// Import the PolymerElement base class and html helper
import {
  PolymerElement,
  html,
  Polymer,
} from "/node_modules/mjo-polymer/polymer/polymer-element.js";

// Define an element class
class myComponent extends PolymerElement {
  // Define public API properties
  static get properties() {
    return { name: String };
  }

  // Define the element's template
  static get template() {
    return html` Hello {{name}}, I am your componente `;
  }
}

// Register the element with the browser
customElements.define("my-component", myComponent);
```

<span style="font-size:12px">index.html</span>

```html
<!DOCTYPE html>
<html lang="en">
  <head></head>
  <body>
    <my-component name="Charles"></my-component>
    <iron-icon icon="mail"></iron-icon>

    <!-- Only for not chromiun navigators -->
    <script src="/node_modules/mjo-webcomponents/webcomponentsjs/webcomponents-loader.js"></script>
    <!-- Only for not chromiun navigators -->
    <script type="module" src="/node_modules/mjo-polymer/polymer/polymer-element.js"></script>
    <script type="module" src="/node_modules/mjo-polymer/iron-icons/iron-icons.js"></script>
    <script type="module" src="/my-component.js"></script>
  </body>
</html>
```

As seen in the previous example, creating a custom component and including it in a custom-built website or even with a CMS is extremely simple. The advantage of `mjo-polymer` over` lit-element` is that in the creation of the component we can make use of all the complex functionalities of polymer like `dom-if`,` dom-repeat` among many other things.

In addition, as we have mentioned previously, we have added additional functionalities to the `Polymer` class that are sure to be useful to a great extent for the creation of web pages.

View on <a href="https://codesandbox.io/s/mjo-polymer-7gbm4">CODESANDBOX</a>

## Iron icons

`mjo-polymer` viene con una colección de iron-icons listos para su uso como puede verse en el ejemplo anterior. Puedes ver una lista completa de los iconos disponibles en `http://yourdomain.com/node_modules/mjo-polymer/iron-icons/demo/index.html`

## Additional functionalities

### Poylmer.Animate()

As if it were the jQuery animate function with this function, we can create animations in DOM elements in a simple way. These animations make use of the CSS engine so they are optimized for use in most browsers.

```typescript
Animate( el: HTMLElement, props: Object, settings?: { speed: number, effect: string, delay: number }| Function, callback?: Function ) : void
```

<span style="font-size:12px">index.js</span>

```javascript
// @ts-check

import { Polymer } from "/node_modules/mjo-polymer/polymer/polymer-element.js";

let divToAnimate = document.querySelector( "#divToAnimate" );

Polymer.Animate( divToAnimate, {
	left: 50%,
	top: 50%,
	width: 150px
}, {
	speed: 500,
	effect: "ease-in",
	delay; 1000
}, () => {
	// Do something when end animation
})
```

### Polymer.Colors...

With this method we can treat colors in javascript in a simple and efficient way. This class allows us to convert colors from `HEX to RGB` or from` HEX to HSL` or from `RGBA to HSLA`, etc... It also allows us to obtain the contrast of a color to know if it is light or dark know the format of a color that we pass in a string.

<span style="font-size:12px">index.js</span>

```javascript
// @ts-check

import { Polymer } from "/node_modules/mjo-polymer/polymer/polymer-element.js";

// Know color format
let format = Polymer.Colors.type("#000000"); // format = "HEX"

// Convert to RGB
let rgb = Polymer.Colors.toRGB("#000000"); // rgb = "rgb(0,0,0);

// Convert to RGBA
let rgba = Polymer.Colors.toRGBA("#000000", 0.8); // rgba = "rgba(0,0,0,.8)

// Convert to HSL
let hsl = Polymer.Colors.toHSL("rgb(0,0,0)"); // hsl = "hsl(0,0%,0%)"

// Convert to HSLA
let hsla = Polymer.Colors.toHSLA("#000000", 0.7); // hsla = "hsl(0,0%,0%,.7)"

// Convert to HEX
let hex = Polymer.Colors.toHEX("hsl(0,0%,0%)"); // hex = "#000000"

// Get contrast
let contrast1 = Polymer.Colors.contrast("#000000"); // contrast1 = "dark";
let contrast2 = Polymer.Colors.contrast("#FFFFFF"); // contrast2 = "light";
```

### Polymer.Fade...

With this method we can make HTML elements appear or disappear as if it were jQuery.

```typescript
Fade.in( el: HTMLElement, settings?: { speed: number, effect: string }|Function, callback?: Function ) : void
```

```typescript
Fade.out( el: HTMLElement, settings?: { speed: number, effect: string }|Function, callback?: Function ) : void
```

```typescript
Fade.toggle( el: HTMLElement, settings?: { speed: number, effect: string }|Function, callback?: Function ) : void
```

<span style="font-size:12px">index.js</span>

```javascript
// @ts-check

import { Polymer } from "/node_modules/mjo-polymer/polymer/polymer-element.js";

let el = document.querySelector("#myElement");

Polymer.Fade.in(
  el,
  {
    speed: 500,
    effect: "ease-in",
  },
  () => {
    // Do something when animation end
  }
);

Polymer.Fade.out(el, () => {
  // Do something when animation end
});
```

### Polymer.Slide...

Method similar to `Polymer.Fade` only this one does it with a blind effect.

```typescript
Fade.down( el: HTMLElement, settings?: { speed: number, effect: string }|Function, callback?: Function ) : void
```

```typescript
Fade.up( el: HTMLElement, settings?: { speed: number, effect: string }|Function, callback?: Function ) : void
```

```typescript
Fade.toggle( el: HTMLElement, settings?: { speed: number, effect: string }|Function, callback?: Function ) : void
```

<span style="font-size:12px">index.js</span>

```javascript
// @ts-check

import { Polymer } from "/node_modules/mjo-polymer/polymer/polymer-element.js";

let el = document.querySelector("#myElement");

Polymer.Fade.down(
  el,
  {
    speed: 500,
    effect: "ease-in",
  },
  () => {
    // Do something when animation end
  }
);

Polymer.Fade.up(el, () => {
  // Do something when animation end
});
```

### Polymer.ListenDom...

This method simulates the `jQuery.on` or` jQuery.off` method, putting DOM elements to listen for events even though they are not yet in the DOM at load time.

```typescript
ListenDom.on( event: string, selector: string, func: Function ) : void
```

```typescript
ListenDom.off( event: string, selector: string, func: Function ) : void
```

<span style="font-size:12px">index.js</span>

```javascript
// @ts-check

import { Polymer } from "/node_modules/mjo-polymer/polymer/polymer-element.js";

Polymer.ListenDom.on("click", ".myDiv input[name=id]", () => {
  // When you click on an element that matches the indicated selector, this function will be invoked
});

// Listen for the click on the given selector and invoke myFunc
Polymer.ListenDom.on("click", ".myDiv input[name=email]", myFunc);
// Removes the click of the given selector element from listening
Polymer.ListenDom.off("click", ".myDiv input[name=email]", myFunc);

function myFunc() {
  // When you click on an element that matches the indicated selector, this function will be invoked
}
```

### Polymer.Parallax...

This method creates a parallax effect on a given element.

```typescript
Parallax.init( el: HTMLElement, settings?: { property: string, direction: string, speed: number, bgColor: string } ) : void
```

<span style="font-size:12px">index.js</span>

```javascript
// @ts-check

import { Polymer } from "/node_modules/mjo-polymer/polymer/polymer-element.js";

let el = document.querySelector("#myElement");

// Create the parallax effect with a background image that is in the #myElement element
Polymer.Parallax.inig(el, {
  property: "background",
  direction: "down",
  speed: 15,
  bgColor: "#000000",
});

let el2 = document.querySelector("#myElement2");

// Create the parallax effect animating the #myElement2 element
Polymer.Parallax.inig(el2, {
  property: "Element",
  direction: "up",
  speed: 5,
});
```

### Polymer.scroll...

Animate the scroll of the page or a scrollable element.

```typescript
scroll.to( height: number, duration?: number, scrollable?: HTMLElement ) : void
```

```typescript
scroll.top( duration: number, scrollable?: HTMLElement ) => void
```

```typescript
scroll.bottom( duration: number, scrollable?: HTMLElement ) => void
```

```typescript
scroll.toElement( el: HTMLElement, margin?: number, duration?: number, scrollable?: HTMLElement ) => void
```

<span style="font-size:12px">index.js</span>

```javascript
// @ts-check

import { Polymer } from "/node_modules/mjo-polymer/polymer/polymer-element.js";

// Animate the page scroll up to a height of 500 in 300ms
Polymer.scroll.to(500, 300);

// Animate the #myElement scroll to a height of 500 in 300ms
let el = document.querySelector("#myElement");
Polymer.scroll.to(500, 300, el);

// Animate the page scroll to the top in 300ms
Polymer.scroll.top(300);

// Animate the page scroll to the bottom by 300ms
Polymer.scroll.bottom(300);

// Animate the page scroll up to the # myELement2 element by 300ms leaving a 50px top margin
let el2 = document.querySelector("#myElement2");
Polymer.scroll.toElement(el2, 50, 300);
```

### Polymer.TextareaAdjust...

Makes a textarea self-adjusting in height as you type inside it.

```typescript
TextareaAdjust.init( el: TextAreaElement, settings: { maxHeight: number }) : void
```

<span style="font-size:12px">index.js</span>

```javascript
// @ts-check

import { Polymer } from "/node_modules/mjo-polymer/polymer/polymer-element.js";

// Convert a textarea into auto adjustable with a maximum height of 500px
let textarea = document.querySelector("#myTextArea");
Polymer.TextareaAdjust.init(textarea, { maxHeight: 500 });
```

### Polymer.SliderElement...

Makes an element scroll through its parent element when scrolling the page vertically.

```typescript
SliderElement.init( el: HTMLElement, settings: { headFixHeight: number, footerFixHeight: number, minWidth: number, marginStart: number }, scrollable?: HTMLElement ) : void
```

<span style="font-size:12px">index.html</span>

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <style>
      header {
        position: fixed;
        top: 0;
        width: 100%;
        left: 0;
        background-color: #333333;
        color: white;
        height: 70px;
      }
      .flex-container {
        position: relative;
        margin-top: 90px;
        display: flex;
        flex-flow: row wrap;
        heigh: 1800px;
      }
      .main {
        position: relative;
        flex-grow: 1;
        flex-basis: 0;
      }
      .container {
        position: relative;
        flex-grow: 0;
        flex-basis: 300px;
      }
    </style>
  </head>
  <body>
    <header>HEADER</header>
    <div class="flex-container">
      <div class="main">Left Column MAIN</div>
      <div class="container">
        <div class="slider-element">
          Righ column slider element into container parent when window scroll
        </div>
      </div>
    </div>
    <!-- Only for not chromiun navigators -->
    <script src="/node_modules/mjo-webcomponents/webcomponentsjs/webcomponents-loader.js"></script>
    <!-- Only for not chromiun navigators -->
    <script type="module" src="/node_modules/mjo-polymer/polymer/polymer-element.js"></script>
    <script type="module" src="/index.js"></script>
  </body>
</html>
```

<span style="font-size:12px">index.js</span>

```javascript
// @ts-check

import { Polymer } from "/node_modules/mjo-polymer/polymer/polymer-element.js";

// The .slider-element element will slide through its parent when the window is scrolled
// and the top of the window reaches the .slider-element leaving a 20px top margin between
// the top and the slider-element
let headerHeigh = document.querySelector("header").offsetHeigh;
let el = document.querySelector(".slider-element");
Polymer.SliderElement.init(el, { headFixHeight: headerHeigh, marginStart: 20 });
```

In this case, we will put an example where the element that we want to scroll does not depend on the scroll of the page, but on the scroll of the main element.

<span style="font-size:12px">index.html</span>

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <style>
      body {
        overflow: hidden;
      }
      header {
        position: relative;
        background-color: #333333;
        color: white;
        height: 70px;
      }
      main {
        position: absolute;
        top: 70px;
        left: 0;
        width: calc(100vh - 70px);
        overflow-x: auto;
      }
      .flex-container {
        position: relative;
        display: flex;
        flex-flow: row wrap;
        heigh: 1800px;
      }
      .main {
        position: relative;
        flex-grow: 1;
        flex-basis: 0;
      }
      .container {
        position: relative;
        flex-grow: 0;
        flex-basis: 300px;
      }
    </style>
  </head>
  <body>
    <header>HEADER</header>
    <main>
      <div class="flex-container">
        <div class="main">Left Column MAIN</div>
        <div class="container">
          <div class="slider-element">
            Righ column slider element into container parent when window scroll
          </div>
        </div>
      </div>
    </main>
    <!-- Only for not chromiun navigators -->
    <script src="/node_modules/mjo-webcomponents/webcomponentsjs/webcomponents-loader.js"></script>
    <!-- Only for not chromiun navigators -->
    <script type="module" src="/node_modules/mjo-polymer/polymer/polymer-element.js"></script>
    <script type="module" src="/index.js"></script>
  </body>
</html>
```

<span style="font-size:12px">index.js</span>

```javascript
// @ts-check

import { Polymer } from "/node_modules/mjo-polymer/polymer/polymer-element.js";

// The .slider-element element will slide through its parent when the window is scrolled
// and the top of the main element reaches the .slider-element leaving a 0px top margin between
// the top and the slider-element
let el = document.querySelector(".slider-element");
let main = document.querySelector("main");
Polymer.SliderElement.init(el, {}, main);
```

<p style="text-align: center; padding: 50px 0">
	My sincere thanks to the Polymer team for creating this fantastic library.<br><br>
	<a href="https://www.polymer-project.org/">Polymer Project</a><br>
	<a href="https://polymer-library.polymer-project.org/3.0/docs/about_30">Polymer Library</a><br>
	<a href="https://www.npmjs.com/package/@polymer/polymer">Polymer Original</a>
</p>

<p style="text-align: center; padding: 50px 0">
    <b>Contacto</b><br><br>Manu J. Overa<br><a href="mailto:manu.giralda@gmail.com">manu.giralda@gmail.com</a><br><br>
</p>
