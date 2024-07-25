# markdowntopdfjs

Node module that converts Markdown files to PDFs.

Your markdown will first be converted into HTML through the parsing of `remarkable`, then pushed into the HTML5 Boilerplate `index.html`. Phantomjs renders the page and saves it to a PDF. You can even customise the style of the PDF by passing an optional path to your CSS _and_ you can pre-process your markdown file before it is converted to a PDF by passing in a pre-processing function, for templating.

## Install

```sh
npm install  markdowntopdfjs
```

## Options

Pass an options object (`mdtopdf({/* options */})`) to configure the output.

### options.cwd

Type: `String`
Default value: `process.cwd()`

Current working directory.

### options.phantomPath

Type: `String`
**required**

Path to the [phantomjs](https://phantomjs.org/download.html) binary.

### options.cssPath

Type: `String`
Default value: `[module path]/markdowntopdf/css/pdf.css`

Path to custom CSS file, relative to the current directory.

### options.highlightCssPath

Type: `String`
Default value: `[module path]/markdowntopdf/css/highlight.css`

Path to custom highlight CSS file (for code highlighting with [highlight.js](https://highlightjs.org)), relative to the current directory.

### options.paperFormat

Type: `String`
Default value: `A4`

'A3', 'A4', 'A5', 'Legal', 'Letter' or 'Tabloid'.

### options.paperOrientation

Type: `String`
Default value: `portrait`

'portrait' or 'landscape'.

### options.paperBorder

Type: `String`
Default value: `2cm`

Supported dimension units are: 'mm', 'cm', 'in', 'px'

### options.runningsPath

Type: `String`
Default value: `runnings.js`

Path to CommonJS module which sets the page header and footer (see [runnings.js](runnings.js)).

### options.renderDelay

Type: `Number`
Default value: Time until [`page.onLoadFinished`](http://phantomjs.org/api/webpage/handler/on-load-finished.html) event fired

Delay (in ms) before the PDF is rendered.

### options.loadTimeout

Type: `Number`
Default value: `10000`

If `renderDelay` option isn't set, this is the timeout (in ms) before the page is rendered in case the `page.onLoadFinished` event doesn't fire.

### options.preProcessMd

Type: `Function`
Default value: `function () { return through() }`

A function that returns a [through2 stream](https://npmjs.org/package/through2) that transforms the markdown before it is converted to HTML.

### options.preProcessHtml

Type: `Function`
Default value: `function () { return through() }`

A function that returns a [through2 stream](https://npmjs.org/package/through2) that transforms the HTML before it is converted to PDF.

### options.remarkable

Type: `object`
Default value: `{ breaks: true }`

A config object that is passed to [remarkable](https://www.npmjs.com/package/remarkable#options), the underlying markdown parser.

#### options.remarkable.preset

Type: `String`
Default value: `default`

Use remarkable [presets](https://www.npmjs.com/package/remarkable#presets) as a convenience to quickly enable/disable active syntax rules and options for common use cases.

Supported values are `default`, `commonmark` and `full`

#### options.remarkable.plugins

Type: `Array` of remarkable-plugin `Function`s
Default value: `[]`

An array of Remarkable plugin functions, that extend the markdown parser functionality.

#### options.remarkable.syntax

Type: `Array` of optional remarkable syntax `Strings`s
Default value: `[]`

An array of [optional Remarkable syntax extensions](https://github.com/jonschlinkert/remarkable#syntax-extensions), disabled by default, that extend the markdown parser functionality.

## More examples

### From string to path

```javascript
const mdtopdf = require('markdowntopdfjs')

let md = '# First level title',
  outputPdfPath = '/path/to/doc.pdf'

mdtopdf({
  phantomPath: path.resolve(__dirname, './bin/phantomjs.exe')
  // or linux
  // phantomPath: path.resolve(__dirname, './bin/phantomjs')
})
  .from.string(md)
  .to(outputPdfPath, function () {
    console.log('Created', outputPdfPath)
  })
```

### From multiple paths to multiple paths

```javascript
const mdtopdf = require('markdowntopdfjs')

let mdDocs = ['home.md', 'order.md', 'about.md'],
  pdfDocs = mdDocs.map(function (d) {
    return 'out/' + d.replace('.md', '.pdf')
  })

mdtopdf({
  phantomPath: path.resolve(__dirname, './bin/phantomjs.exe')
  // or linux
  // phantomPath: path.resolve(__dirname, './bin/phantomjs')
})
  .from(mdDocs)
  .to(pdfDocs, function () {
    pdfDocs.forEach(function (d) {
      console.log('Created', d)
    })
  })
```

### Concat from multiple paths to single path

```javascript
const mdtopdf = require('markdowntopdfjs')

let mdDocs = ['header.md', 'content.md', 'footer.md'],
  bookPath = '/path/to/book.pdf'

mdtopdf({
  phantomPath: path.resolve(__dirname, './bin/phantomjs.exe')
  // or linux
  // phantomPath: path.resolve(__dirname, './bin/phantomjs')
})
  .concat.from(mdDocs)
  .to(bookPath, function () {
    console.log('Created', bookPath)
  })
```

### Transform markdown before conversion

```javascript
const mdtopdf = require('markdowntopdfjs'),
  split = require('split'),
  through = require('through'),
  duplexer = require('duplexer')

function preProcessMd() {
  // Split the input stream by lines
  var splitter = split()

  // Replace occurences of "foo" with "bar"
  var replacer = through(function (data) {
    this.queue(data.replace(/foo/g, 'bar') + '\n')
  })

  splitter.pipe(replacer)
  return duplexer(splitter, replacer)
}

mdtopdf({
  preProcessMd: preProcessMd,
  phantomPath: path.resolve(__dirname, './bin/phantomjs.exe')
  // or linux
  // phantomPath: path.resolve(__dirname, './bin/phantomjs')
})
  .from('/path/to/document.md')
  .to('/path/to/document.pdf', function () {
    console.log('Done')
  })
```

### Remarkable options and plugins

Example using [remarkable-classy](https://www.npmjs.com/package/remarkable-classy) plugin:

```javascript
const mdtopdf = require('markdowntopdfjs')

const options = {
  remarkable: {
    html: true,
    breaks: true,
    plugins: [require('remarkable-classy')],
    syntax: ['footnote', 'sup', 'sub']
  },
  phantomPath: path.resolve(__dirname, './bin/phantomjs.exe')
  // or linux
  // phantomPath: path.resolve(__dirname, './bin/phantomjs')
}

mdtopdf(options)
  .from('/path/to/document.md')
  .to('/path/to/document.pdf', function () {
    console.log('Done')
  })
```

## Contribute

Feel free to dive in! [Open an issue](https://github.com/xzhangsir/markdowntopdf/issues) or submit PRs.

## License

[MIT](LICENCE) © xin
