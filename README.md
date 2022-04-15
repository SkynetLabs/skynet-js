# skynet-js - Javascript Sia Skynet Client

[![Version](https://img.shields.io/github/package-json/v/SkynetLabs/skynet-js)](https://www.npmjs.com/package/skynet-js)
[![Build Status](https://img.shields.io/github/workflow/status/SkynetLabs/skynet-js/Node.js%20CI)](https://github.com/SkynetLabs/skynet-js/actions)
[![Contributors](https://img.shields.io/github/contributors/SkynetLabs/skynet-js)](https://github.com/SkynetLabs/skynet-js/graphs/contributors)
[![License](https://img.shields.io/github/license/SkynetLabs/skynet-js)](https://github.com/SkynetLabs/skynet-js)

A Javascript module that:

- facilitates communication with Sia Skynet portals from the browser
- handles logging into and using MySky
- provides useful functionality for working with Skynet such as parsing out skylinks from URLs

## Updating to v4 from v3

The latest stable major version is `v4`. There are many breaking changes from `v3`.

Please consult [the update guide](https://sdk.skynetlabs.com/v4/#updating-from-v3) for help migrating your code.

## Documentation

For documentation complete with examples, please see [the Skynet SDK docs](https://sdk.skynetlabs.com/?javascript--browser#introduction).

We also have an [introduction workshop for building a web app on Skynet](https://docs.skynetlabs.com/skynet-workshops/introduction-workshop), and an [example tutorial about creating your app without a Javascript framework](https://blog.sia.tech/creating-your-first-web-app-on-skynet-ec6f4fff405f).

## How To Use skynet-js In Your Web Project

If you're thinking, "wait, how can I `import()` in the browser," then here is the answer:

While `skynet-js` is built with Node.js, you can easily compile it to one minified javascript file that is compatible with browsers.

Webpack will compile only the used functions (unused code will be removed automatically), so it is recommended to build your whole project in Node.js and compile it with webpack ([click here for detailed tutorial](https://blog.sia.tech/creating-your-first-web-app-on-skynet-ec6f4fff405f)):

`cd your_project`

`npm install skynet-js`

`npm install webpack webpack-cli --save-dev`

Update your `package.json` file.

```
remove - "main": "index.js",
add    - "private": true,
```

Create folders `mkdir dist src`. Make sure you have your javascript files in `src` and the main (entry) javascript is named `index.js`.

Compile with `npx webpack`! You will find the minified `main.js` in the `dist` folder.

## Development

1. Clone the repository
1. Run `yarn`
1. Run `yarn prepare` to install pre-commit hooks
1. Run `yarn test` to run the tests

Also see our [guide to contributing](https://github.com/SkynetLabs/.github/blob/master/CONTRIBUTING.md).

### Requirements

We have some automated checks that must pass in order for code to be accepted. These include:

- Type-checking and other code lints must pass.
- Every function must have a complete JSDoc-style docstring.
- 100% code coverage is enforced. Every statement and conditional branch must be tested.

Note that the 100% coverage requirement is a _minimum_. Just because a line of code is tested does not mean it is tested _well_, that is, with different values and combinations of values. Tests should be as thorough as possible, within reason.

## Changelogs

- [Stable](./CHANGELOG.md)
- [Beta](./CHANGELOG-BETA.md)
