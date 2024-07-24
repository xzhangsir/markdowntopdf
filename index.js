const fs = require('fs')
const path = require('path')
const tmp = require('tmp')
const duplexer = require('duplexer')
const extend = require('extend')
const { Remarkable } = require('remarkable')
const childProcess = require('child_process')
const streamft = require('stream-from-to')
const hljs = require('highlight.js')
const through = require('through2')

tmp.setGracefulCleanup()

function mdToPdf(opts) {
  opts = opts || {}
  opts.cwd = opts.cwd ? path.resolve(opts.cwd) : process.cwd()
  opts.runningsPath = opts.runningsPath
    ? path.resolve(opts.runningsPath)
    : path.join(__dirname, 'runnings.js')
  opts.cssPath = opts.cssPath
    ? path.resolve(opts.cssPath)
    : path.join(__dirname, 'css', 'pdf.css')
  opts.highlightCssPath = opts.highlightCssPath
    ? path.resolve(opts.highlightCssPath)
    : path.join(__dirname, 'css', 'highlight.css')
  opts.paperFormat = opts.paperFormat || 'A4'
  opts.paperOrientation = opts.paperOrientation || 'portrait'
  opts.paperBorder = opts.paperBorder || '2cm'
  opts.renderDelay = ~~opts.renderDelay
  opts.loadTimeout = opts.loadTimeout == null ? 10000 : opts.loadTimeout
  opts.preProcessMd =
    opts.preProcessMd ||
    function () {
      return through()
    }
  opts.preProcessHtml =
    opts.preProcessHtml ||
    function () {
      return through()
    }
  opts.remarkable = extend({ breaks: true }, opts.remarkable)
  opts.remarkable.preset = opts.remarkable.preset || 'default'
  opts.remarkable.plugins = opts.remarkable.plugins || []
  opts.remarkable.syntax = opts.remarkable.syntax || []

  let md = ''

  const mdToHtml = through(
    function transform(chunk, enc, cb) {
      md += chunk
      cb()
    },
    function flush(cb) {
      let self = this

      let mdParser = new Remarkable(
        opts.remarkable.preset,
        extend(
          {
            highlight: function (str, language) {
              if (language && hljs.getLanguage(language)) {
                try {
                  return hljs.highlight(str, { language }).value
                } catch (err) {}
              }
              try {
                return hljs.highlightAuto(str).value
              } catch (err) {}

              return ''
            }
          },
          opts.remarkable
        )
      )

      opts.remarkable.plugins.forEach(function (plugin) {
        if (plugin && typeof plugin === 'function') {
          mdParser.use(plugin)
        }
      })

      opts.remarkable.syntax.forEach(function (rule) {
        try {
          mdParser.core.ruler.enable([rule])
        } catch (err) {}
        try {
          mdParser.block.ruler.enable([rule])
        } catch (err) {}
        try {
          mdParser.inline.ruler.enable([rule])
        } catch (err) {}
      })

      self.push(mdParser.render(md))
      self.push(null)
    }
  )
  const inputStream = through()
  const outputStream = through()
  // 先暂停输入流 等数据准备好后 再恢复启动
  inputStream.pause()

  tmp.file({ postfix: '.html' }, function (err, tmpHtmlPath, tmpHtmlFd) {
    if (err) return outputStream.emit('error', err)
    fs.closeSync(tmpHtmlFd)
    tmp.file({ postfix: '.pdf' }, function (err, tmpPdfPath, tmpPdfFd) {
      if (err) return outputStream.emit('error', err)
      fs.closeSync(tmpPdfFd)
      let htmlToTmpHtmlFile = fs.createWriteStream(tmpHtmlPath)
      htmlToTmpHtmlFile.on('finish', function () {
        let childArgs = [
          path.join(__dirname, 'phantom', 'render.js'),
          tmpHtmlPath,
          tmpPdfPath,
          opts.cwd,
          opts.runningsPath,
          opts.cssPath,
          opts.highlightCssPath,
          opts.paperFormat,
          opts.paperOrientation,
          typeof opts.paperBorder === 'object'
            ? JSON.stringify(opts.paperBorder)
            : opts.paperBorder,
          opts.renderDelay,
          opts.loadTimeout
        ]
        fs.access(opts.phantomPath, fs.constants.X_OK, (err) => {
          if (err) {
            fs.chmod(opts.phantomPath, 0o755, (chmodErr) => {
              if (chmodErr) {
                return outputStream.emit('error', chmodErr)
              }
              executePhantom(childArgs, tmpPdfPath, outputStream)
            })
          } else {
            executePhantom(childArgs, tmpPdfPath, outputStream)
          }
        })
      })
      inputStream
        .pipe(opts.preProcessMd())
        .pipe(mdToHtml)
        .pipe(opts.preProcessHtml())
        .pipe(htmlToTmpHtmlFile)

      inputStream.resume()
    })
  })

  function executePhantom(childArgs, tmpPdfPath, outputStream) {
    childProcess.execFile(
      opts.phantomPath,
      childArgs,
      function (err, stdout, stderr) {
        if (stdout) console.log(stdout)
        if (stderr) console.error(stderr)
        if (err) {
          return outputStream.emit('error', err)
        }
        fs.createReadStream(tmpPdfPath).pipe(outputStream)
      }
    )
  }
  return extend(
    duplexer(inputStream, outputStream),
    streamft(function () {
      return mdToPdf(opts)
    })
  )
}

module.exports = mdToPdf
