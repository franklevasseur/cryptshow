import readline, { Key } from 'readline'
import { Logger } from './logger'

export class Editor {
  private _x = 0
  private _y = 0
  private _txt = ''
  private _int = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true, historySize: 0 })

  constructor(private _logger: Logger) {}

  public edit(fileContent: string): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      this._txt = fileContent
      this._init()
      this._refresh()

      process.stdin.on('keypress', (str: string, key: Key) => {
        // if ctrl-c is pressed, abort
        if (key.ctrl && key.name === 'c') {
          this._cleanup()
          resolve(fileContent)
        }

        if (key.name === 'up') {
          this._y = Math.max(0, this._y - 1)
        }
        if (key.name === 'down') {
          this._y += 1
        }
        if (key.name === 'left') {
          this._x -= Math.max(0, this._x - 1)
        }
        if (key.name === 'right') {
          this._x += 1
        }

        if (key.name === 'backspace') {
          this._txt = this._txt.slice(0, this._x - 1) + this._txt.slice(this._x)
          this._x -= 1
        }
        if (key.name === 'delete') {
          this._txt = this._txt.slice(0, this._x) + this._txt.slice(this._x + 1)
        }

        // if a character is pressed, insert
        if (str) {
          this._txt = this._txt.slice(0, this._x) + str + this._txt.slice(this._x - 1)
          this._x += 1
        }

        this._refresh()
      })
    })
  }

  private _init() {
    readline.emitKeypressEvents(process.stdin)
    process.stdin.setRawMode(true)
    console.clear()
    process.stdout.write(this._txt)
  }

  private _refresh() {
    process.stdout.cursorTo(this._x, this._y)
  }

  private _cleanup() {
    this._int.close()
  }
}
