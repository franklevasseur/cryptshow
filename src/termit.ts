// forked from https://github.com/hakash/termit
import terminalKit from 'terminal-kit'

type TermitProps = {
  disableOpen: boolean
  disableSaveAs: boolean
  title: string
}

type NextCb = (err?: Error) => void
type Position = { x: number; y: number }
type BufferElement = {
  char: string
}

let defaults = {
  statusBar: {
    message: 'Ctrl+C:exit',
  },
  titleBar: {
    title: 'Welcome to Termit - The TERMinal edITor!',
  },
}

type TextBuffer = terminalKit.TextBuffer & { cx: number; cy: number; buffer: BufferElement[][] }

export class Termit {
  // ctor
  private disableOpen: boolean
  private disableSaveAs: boolean
  private term: terminalKit.Terminal
  private statusBarTimer: number | NodeJS.Timeout | undefined
  private resizeTimer: number | NodeJS.Timeout | undefined
  private screenBuffer: terminalKit.ScreenBuffer
  private textBuffer: TextBuffer
  private hookChain: (next: NextCb) => void

  // lifecycle
  private disableUserInteraction = false

  constructor(options: Partial<TermitProps> = {}) {
    this.disableOpen = options.disableOpen || false
    if (this.disableOpen) {
      defaults.statusBar.message = defaults.statusBar.message.replace('O:Open  ', '')
    }

    this.disableSaveAs = options.disableSaveAs || false
    if (this.disableSaveAs) {
      defaults.statusBar.message = defaults.statusBar.message.replace('A:save As  ', '')
    }

    defaults.titleBar.title = options.title || defaults.titleBar.title

    this.term = terminalKit.terminal
    this.statusBarTimer = undefined

    this.screenBuffer = new terminalKit.ScreenBuffer({
      dst: this.term,
      height: this.term.height - 2,
      y: 2,
    })

    this.textBuffer = new terminalKit.TextBuffer({
      dst: this.screenBuffer,
    }) as TextBuffer
    this.textBuffer.setText('')

    this.hookChain = (next) => {
      next()
    }
  }

  public addPreSaveHook(hook: NextCb) {
    let self = this
    this.hookChain = (function (chain) {
      return function (next: NextCb) {
        chain.call(self, function () {
          hook.call(self, next.bind(self))
        })
      }.bind(this)
    })(this.hookChain)
  }

  public init(content: string) {
    this.term.on('resize', this.onResize.bind(this))
    this.term.on('key', this.onKey.bind(this))

    this.term.fullscreen(true)

    this.textBuffer.moveTo(0, 0)
    this.screenBuffer.moveTo(0, 0)

    this.term.grabInput({
      // @ts-ignore
      mouse: false,
    })
    this.drawStatusBar()
    this.drawTitleBar()

    this.draw()

    if (content) {
      this.load(content)
    }
  }

  private drawBar(pos: Position, message: string, invert: boolean = false) {
    if (invert) {
      this.term.moveTo(pos.x, pos.y).styleReset.white.bold.eraseLine(' ' + message)
    } else {
      this.term.moveTo(pos.x, pos.y).styleReset.bgWhite.black.bold.eraseLine(' ' + message)
    }
  }

  private drawStatusBar(message: string = defaults.statusBar.message, timeout: number = -1) {
    this.drawBar(
      {
        x: 0,
        y: this.term.height,
      },
      message,
    )

    this.textBuffer.draw()
    this.screenBuffer.draw({
      delta: true,
    })
    this.textBuffer.drawCursor()
    this.screenBuffer.drawCursor()

    if (this.statusBarTimer) {
      clearTimeout(this.statusBarTimer)
    }

    if (timeout >= 0) {
      this.statusBarTimer = setTimeout(() => {
        this.drawStatusBar()
      }, timeout)
    }
  }

  private drawTitleBar() {
    this.drawBar(
      {
        x: 1,
        y: 1,
      },
      defaults.titleBar.title,
    )
  }

  private load(content: string) {
    this.disableUserInteraction = true
    this.textBuffer.moveTo(0, 0)
    this.textBuffer.setText('')
    this.textBuffer.insert(content)
    this.textBuffer.moveTo(0, 0)
    this.disableUserInteraction = false
    this.draw()
  }

  private exit() {
    setTimeout(() => {
      this.term.grabInput(false)
      this.term.fullscreen(false)
      setTimeout(() => process.exit(0), 100)
    }, 100)
  }

  private onResize(width: number, height: number) {
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer)
    }
    this.resizeTimer = setTimeout(() => {
      this.screenBuffer.resize({
        x: 0,
        y: 2,
        width: width,
        height: height - 2,
      })
      this.drawStatusBar()
      this.drawTitleBar()
      this.draw()
    }, 150)
  }

  private onKey(key: string, matches, data) {
    if (this.disableUserInteraction && key !== 'CTRL_C') {
      return
    }

    switch (key) {
      case 'CTRL_C':
        this.exit()
        break
      case 'PAGE_UP':
        this.pgUp()
        break
      case 'PAGE_DOWN':
        this.pgDown()
        break
      case 'UP':
        this.up()
        break
      case 'DOWN':
        this.down()
        break
      case 'LEFT':
        this.left()
        break
      case 'RIGHT':
        this.right()
        break
      case 'HOME':
        this.startOfLine()
        break
      case 'END':
        this.endOfLine()
        break
      case 'TAB':
        this.tab()
        break
      case 'CTRL_HOME':
        this.startOfText()
        break
      case 'CTRL_END':
        this.endOfText()
        break
      case 'DELETE':
        this.delete()
        break
      case 'BACKSPACE':
        this.backspace()
        break
      case 'ENTER':
        this.newLine()
        break
      default:
        if (data.isCharacter) {
          this.textBuffer.insert(key)
          this.draw()
        }
    }
  }

  private draw(delta: boolean = true) {
    this.textBuffer.draw()
    this.screenBuffer.draw({ delta })
    this.drawCursor()
  }

  private drawCursor() {
    let new_buffer_x = this.textBuffer.x
    let new_buffer_y = this.textBuffer.y

    if (this.textBuffer.x < -this.textBuffer.cx) {
      new_buffer_x = Math.min(0, -this.textBuffer.cx + Math.floor(this.screenBuffer.width / 2))
    } else if (this.textBuffer.x > -this.textBuffer.cx + this.screenBuffer.width - 1) {
      new_buffer_x = this.screenBuffer.width / 2 - this.textBuffer.cx
    }

    if (this.textBuffer.y < -this.textBuffer.cy) {
      new_buffer_y = Math.min(0, -this.textBuffer.cy + Math.floor(this.screenBuffer.height / 2))
    } else if (this.textBuffer.y > -this.textBuffer.cy + this.screenBuffer.height - 1) {
      new_buffer_y = this.screenBuffer.height / 2 - this.textBuffer.cy
    }

    if (new_buffer_y != this.textBuffer.y || new_buffer_x != this.textBuffer.x) {
      // @ts-ignore
      this.textBuffer.x = new_buffer_x
      // @ts-ignore
      this.textBuffer.y = new_buffer_y
      this.textBuffer.draw()
      this.screenBuffer.draw({
        delta: true,
      })
    }

    this.textBuffer.drawCursor()
    this.screenBuffer.drawCursor()
  }

  private up() {
    this.textBuffer.moveUp()
    if (this.textBuffer.cx > this.textBuffer.buffer[this.textBuffer.cy].length - 1) {
      this.textBuffer.moveToEndOfLine()
    }
    this.drawCursor()
  }

  private down() {
    if (this.textBuffer.getContentSize().height - 1 > this.textBuffer.cy) {
      this.textBuffer.moveDown()

      if (this.textBuffer.cx > this.textBuffer.buffer[this.textBuffer.cy].length - 1) {
        this.textBuffer.moveToEndOfLine()
      }
      this.drawCursor()
    }
  }

  private left() {
    this.textBuffer.moveBackward(false)
    this.drawCursor()
  }

  private right() {
    if (this.textBuffer.cx < this.getLine().length) {
      this.textBuffer.moveRight()
    } else if (this.textBuffer.getContentSize().height - 1 > this.textBuffer.cy) {
      this.textBuffer.moveTo(0, this.textBuffer.cy + 1)
    }
    this.drawCursor()
  }

  private getLine() {
    return this.textBuffer.buffer[this.textBuffer.cy].reduce((acc, curr) => {
      acc += curr.char.trim()
      return acc
    }, '')
  }

  private startOfLine() {
    this.textBuffer.moveToColumn(0)
    this.drawCursor()
  }

  private endOfLine() {
    this.textBuffer.moveToEndOfLine()
    this.drawCursor()
  }

  private startOfText() {
    this.textBuffer.moveTo(0, 0)
    this.draw()
  }

  private endOfText() {
    let num_lines = this.textBuffer.getContentSize().height - 1
    let last_line = this.textBuffer.buffer[num_lines]
    this.textBuffer.moveTo(last_line.length, num_lines)
    this.draw()
  }

  private pgUp() {
    this.textBuffer.cy = Math.max(0, this.textBuffer.cy - Math.floor(this.screenBuffer.height / 2))
    this.draw()
  }

  private pgDown() {
    this.textBuffer.cy = Math.min(this.textBuffer.getContentSize().height - 1, this.textBuffer.cy + Math.floor(this.screenBuffer.height / 2))
    this.draw()
  }

  private delete() {
    this.textBuffer.delete(1)
    this.draw()
  }

  private backspace() {
    // @ts-ignore
    this.textBuffer.backDelete(1)
    this.draw()
  }

  private newLine() {
    this.textBuffer.newLine()
    this.draw()
  }

  private tab() {
    this.textBuffer.insert('\t')
    this.draw()
  }
}
