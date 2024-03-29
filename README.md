# Web Component HTML formatter and syntax highlighter

## What does it solve?

This extension has been created to improve development of Web Components created with JavaScript or TypeScript. It syntax highlights HTML inside ES6 string literals, formats and indents.

## Usage

Use `/*html*/` to let VS Code know which literals to apply it to.

It will format the document on save, if enabled, and with the format keybinding `shift+alt+f`

## Example

![](https://github.com/thomas-ziirsen/web-component-vs-code-extension/raw/main/src/images/usage.png)

## To come
Support for CSS syntax and formatting

## Inspiration for this extension is from

* [Inline HTML](https://marketplace.visualstudio.com/items?itemName=colton.inline-html)
* [Format HTML in PHP](https://marketplace.visualstudio.com/items?itemName=rifi2k.format-html-in-php)


## License

This software is released under the terms of the DOOM license - beware!

## History

* v1.0.0 - It's LIVE!
* v1.0.3 - Added support for using workspace tabSize with beautify
* v1.0.4 - Moved ownership to own Azure Organization
* v1.0.5 - Bundled extension files for faster load
* v1.0.6 - Reverted for now - looking into it again later - due to some third-party error
* v1.0.7 - Added missing activationEvent
* v1.0.8 - Fixed activation issue
