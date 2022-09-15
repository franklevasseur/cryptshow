// forked from https://github.com/hakash/termit
import terminalKit from 'terminal-kit'
import clipboardy from 'clipboardy'

type TermitProps = {
  title: string
  content: string
}

type NextCb = (err?: Error) => void
type Position = { x: number; y: number }
type BufferElement = {
  char: string
}

type KeyData = {
  isCharacter: boolean
  code: Buffer
}

type SelectionRegion = {
  xmin: number
  xmax: number
  ymin: number
  ymax: number
}

type TextBuffer = terminalKit.TextBuffer & {
  x: number
  y: number
  cx: number
  cy: number
  buffer: BufferElement[][]
  selectionRegion: SelectionRegion | null
  backDelete: (x: number) => void
  setSelectionRegion: (region: SelectionRegion) => void
  deleteSelection: () => void
  resetSelectionRegion: () => void
}

const DEFAULT_STATUS_BAR_MESSAGE = 'Esc:exit    Ctrl+C:copy    Ctrl+X:cut    Ctrl+V:paste'
const DEFAULT_TITLE_BAR_TITLE = 'Welcome to Termit - The TERMinal edITor!'

export class Termit {
  private constructor(
    private title: string,
    private term: terminalKit.Terminal,
    private statusBarTimer: number | NodeJS.Timeout | undefined,
    private resizeTimer: number | NodeJS.Timeout | undefined,
    private screenBuffer: terminalKit.ScreenBuffer,
    private textBuffer: TextBuffer,
    private exitObserver: NextCb | undefined,
  ) {}

  public static async edit(props: Partial<TermitProps> = {}): Promise<string> {
    const title = props.title ?? DEFAULT_TITLE_BAR_TITLE
    const term = terminalKit.terminal
    const statusBarTimer = undefined
    const screenBuffer = new terminalKit.ScreenBuffer({
      dst: term,
      height: term.height - 2,
      y: 2,
    })

    const textBuffer = new terminalKit.TextBuffer({
      dst: screenBuffer,
    }) as TextBuffer
    textBuffer.setText('')

    return new Promise((resolve, reject) => {
      const inst = new Termit(title, term, statusBarTimer, undefined, screenBuffer, textBuffer, (err?: Error) => {
        if (err) {
          reject(err)
        } else {
          resolve(inst.textBuffer.getText())
        }
      })

      inst.term.on('resize', inst.onResize.bind(inst))
      inst.term.on('key', inst.onKey.bind(inst))
      inst.term.fullscreen(true)
      inst.textBuffer.moveTo(0, 0)
      inst.screenBuffer.moveTo(0, 0)
      inst.term.grabInput({ mouse: undefined })
      inst.drawStatusBar()
      inst.drawTitleBar()
      inst.draw()
      if (props.content) {
        inst.load(props.content)
      }
    })
  }

  private clean() {
    this.term.grabInput(false)
    this.term.fullscreen(false)
  }

  private drawBar(pos: Position, message: string, invert: boolean = false) {
    if (invert) {
      this.term.moveTo(pos.x, pos.y).styleReset.white.bold.eraseLine(' ' + message)
    } else {
      this.term.moveTo(pos.x, pos.y).styleReset.bgWhite.black.bold.eraseLine(' ' + message)
    }
  }

  private drawStatusBar(message: string = DEFAULT_STATUS_BAR_MESSAGE, timeout: number = -1) {
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
    this.drawBar({ x: 1, y: 1 }, this.title)
  }

  private load(content: string) {
    this.textBuffer.moveTo(0, 0)
    this.textBuffer.setText('')
    this.textBuffer.insert(content)
    this.textBuffer.moveTo(0, 0)
    this.draw()
  }

  private exit() {
    setTimeout(() => {
      this.clean()
      if (this.exitObserver) {
        this.exitObserver()
      }
    })
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

  private onKey(key: string, matches: string[], data: KeyData) {
    try {
      switch (key) {
        case 'ESCAPE':
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
        case 'SHIFT_RIGHT':
          this.shiftRight()
          break
        case 'SHIFT_LEFT':
          this.shiftLeft()
          break
        case 'SHIFT_UP':
          this.shiftUp()
          break
        case 'SHIFT_DOWN':
          this.shiftDown()
          break
        case 'SHIFT_END':
          this.shiftEnd()
          break
        case 'SHIFT_HOME':
          this.shiftHome()
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
        case 'CTRL_C':
          this.copy()
          break
        case 'CTRL_X':
          this.cut()
          break
        case 'CTRL_V':
          this.paste()
          break
        case 'CTRL_A':
          this.selectAll()
        default:
          if (data.isCharacter) {
            this.write(key)
          }
      }
    } catch (thrown) {
      const err = thrown instanceof Error ? thrown : new Error(`${thrown}`)
      this.drawStatusBar(`Error: "${err.message}"`, 4000)
    }
  }

  private write(text: string) {
    this.deleteSelection()
    this.textBuffer.insert(text)
    this.draw()
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
      this.textBuffer.x = new_buffer_x
      this.textBuffer.y = new_buffer_y
      this.textBuffer.draw()
      this.screenBuffer.draw({
        delta: true,
      })
    }

    this.textBuffer.drawCursor()
    this.screenBuffer.drawCursor()
  }

  private left() {
    if (this.textBuffer.selectionRegion) {
      const { tail } = this._toPosition(this.textBuffer.selectionRegion)
      this.textBuffer.moveTo(tail.x, tail.y)
    }
    this.textBuffer.moveBackward(false)
    this.textBuffer.resetSelectionRegion()
    this.draw()
  }

  private right() {
    if (this.textBuffer.selectionRegion) {
      const { head } = this._toPosition(this.textBuffer.selectionRegion)
      this.textBuffer.moveTo(head.x, head.y)
    }

    if (this.textBuffer.cy >= this.textBuffer.buffer.length) {
      this.textBuffer.resetSelectionRegion()
      this.draw()
      return
    }

    this.textBuffer.moveForward(false)
    this.textBuffer.resetSelectionRegion()
    this.draw()
  }

  private up() {
    if (this.textBuffer.selectionRegion) {
      const { tail } = this._toPosition(this.textBuffer.selectionRegion)
      this.textBuffer.moveTo(tail.x, tail.y)
    }
    this.textBuffer.moveUp()
    if (this.textBuffer.cx > this.textBuffer.buffer[this.textBuffer.cy].length - 1) {
      this.textBuffer.moveToEndOfLine()
    }
    this.textBuffer.resetSelectionRegion()
    this.draw()
  }

  private down() {
    if (this.textBuffer.selectionRegion) {
      const { head } = this._toPosition(this.textBuffer.selectionRegion)
      this.textBuffer.moveTo(head.x, head.y)
    }

    if (this.textBuffer.cy >= this.textBuffer.buffer.length - 1) {
      this.textBuffer.resetSelectionRegion()
      this.draw()
      return
    }

    this.textBuffer.moveDown()
    if (this.textBuffer.cx > this.textBuffer.buffer[this.textBuffer.cy].length - 1) {
      this.textBuffer.moveToEndOfLine()
    }
    this.textBuffer.resetSelectionRegion()
    this.draw()
  }

  private startOfLine() {
    this.textBuffer.resetSelectionRegion()
    this.textBuffer.moveToColumn(0)
    this.draw()
  }

  private endOfLine() {
    this.textBuffer.resetSelectionRegion()
    this.textBuffer.moveToEndOfLine()
    this.draw()
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
    this.deleteSelection()
    this.textBuffer.delete(1)
    this.draw()
  }

  private backspace() {
    this.deleteSelection()
    this.textBuffer.backDelete(1)
    this.draw()
  }

  private deleteSelection() {
    if (!this.textBuffer.selectionRegion) {
      return
    }

    const { tail } = this._toPosition(this.textBuffer.selectionRegion)
    this.textBuffer.deleteSelection()
    this.textBuffer.moveTo(tail.x, tail.y)
  }

  private newLine() {
    this.deleteSelection()
    this.textBuffer.newLine()
    this.draw()
  }

  private tab() {
    this.deleteSelection()
    this.textBuffer.insert('\t')
    this.draw()
  }

  private shiftRight() {
    const currentSelection: SelectionRegion = this.textBuffer.selectionRegion ?? this._emptySelection()
    const { tail, head } = this._toPosition(currentSelection)
    const cur: Position = { x: this.textBuffer.cx, y: this.textBuffer.cy }

    let newSelection: SelectionRegion
    if (this._getIdx(tail) >= this._getIdx(cur)) {
      const newHead = this._getPos(this._getIdx(head) + 1)
      newSelection = this._fromPosition({ tail, head: newHead })
    } else {
      const newTail = this._getPos(this._getIdx(tail) + 1)
      newSelection = this._fromPosition({ tail: newTail, head })
    }

    this.textBuffer.setSelectionRegion(newSelection)
    this.draw()
  }

  private shiftLeft() {
    const currentSelection: SelectionRegion = this.textBuffer.selectionRegion ?? this._emptySelection()
    const { tail, head } = this._toPosition(currentSelection)
    const cur: Position = { x: this.textBuffer.cx, y: this.textBuffer.cy }

    let newSelection: SelectionRegion
    if (this._getIdx(head) <= this._getIdx(cur)) {
      const newTail = this._getPos(this._getIdx(tail) - 1)
      newSelection = this._fromPosition({ tail: newTail, head })
    } else {
      const newHead = this._getPos(this._getIdx(head) - 1)
      newSelection = this._fromPosition({ tail, head: newHead })
    }

    this.textBuffer.setSelectionRegion(newSelection)
    this.draw()
  }

  private shiftDown() {
    const currentSelection: SelectionRegion = this.textBuffer.selectionRegion ?? this._emptySelection()
    const { tail, head } = this._toPosition(currentSelection)
    const cur: Position = { x: this.textBuffer.cx, y: this.textBuffer.cy }

    let newSelection: SelectionRegion
    if (this._getIdx(tail) >= this._getIdx(cur)) {
      const newHead = { ...head, y: Math.min(this.textBuffer.getContentSize().height - 1, head.y + 1) }
      newSelection = this._fromPosition({ tail, head: newHead })
    } else {
      const newTail = { ...tail, y: tail.y + 1 }
      newSelection = this._fromPosition({ tail: newTail, head })
    }

    this.textBuffer.setSelectionRegion(newSelection)
    this.draw()
  }

  private shiftUp() {
    const currentSelection: SelectionRegion = this.textBuffer.selectionRegion ?? this._emptySelection()
    const { tail, head } = this._toPosition(currentSelection)
    const cur: Position = { x: this.textBuffer.cx, y: this.textBuffer.cy }

    let newSelection: SelectionRegion
    if (this._getIdx(head) <= this._getIdx(cur)) {
      const newTail = { ...tail, y: Math.max(0, tail.y - 1) }
      newSelection = this._fromPosition({ tail: newTail, head })
    } else {
      const newHead = { ...head, y: head.y - 1 }
      newSelection = this._fromPosition({ tail, head: newHead })
    }

    this.textBuffer.setSelectionRegion(newSelection)
    this.draw()
  }

  private shiftEnd() {
    const currentSelection: SelectionRegion = this.textBuffer.selectionRegion ?? this._emptySelection()
    const { tail, head } = this._toPosition(currentSelection)
    const cur: Position = { x: this.textBuffer.cx, y: this.textBuffer.cy }

    let newSelection: SelectionRegion
    if (this._getIdx(tail) >= this._getIdx(cur)) {
      const newHead = { ...head, x: this.textBuffer.buffer[head.y].length }
      newSelection = this._fromPosition({ tail, head: newHead })
    } else {
      const newTail = { ...tail, x: this.textBuffer.buffer[tail.y].length }
      newSelection = this._fromPosition({ tail: newTail, head })
    }

    this.textBuffer.setSelectionRegion(newSelection)
    this.draw()
  }

  private shiftHome() {
    const currentSelection: SelectionRegion = this.textBuffer.selectionRegion ?? this._emptySelection()
    const { tail, head } = this._toPosition(currentSelection)
    const cur: Position = { x: this.textBuffer.cx, y: this.textBuffer.cy }

    let newSelection: SelectionRegion
    if (this._getIdx(head) <= this._getIdx(cur)) {
      const newTail = { ...tail, x: 0 }
      newSelection = this._fromPosition({ tail: newTail, head })
    } else {
      const newHead = { ...head, x: 0 }
      newSelection = this._fromPosition({ tail, head: newHead })
    }

    this.textBuffer.setSelectionRegion(newSelection)
    this.draw()
  }

  private copy() {
    if (this.textBuffer.selectionRegion) {
      const { tail, head } = this._toPosition(this.textBuffer.selectionRegion)
      const tailIdx = this._getIdx(tail)
      const headIdx = this._getIdx(head)
      const text = this.textBuffer.getText().slice(tailIdx, headIdx)
      clipboardy.writeSync(text)
    }
  }

  private cut() {
    if (this.textBuffer.selectionRegion) {
      this.copy()
      this.delete()
    }
  }

  private paste() {
    this.deleteSelection()
    const text = clipboardy.readSync()
    this.textBuffer.insert(text)
    this.draw()
  }

  private selectAll() {
    const contentSize = this.textBuffer.getContentSize()
    const selection: SelectionRegion = {
      xmin: 0,
      xmax: contentSize.width,
      ymin: 0,
      ymax: contentSize.height - 1,
    }
    this.textBuffer.setSelectionRegion(selection)
    this.draw()
  }

  private _emptySelection(): SelectionRegion {
    return {
      xmin: this.textBuffer.cx,
      xmax: this.textBuffer.cx,
      ymin: this.textBuffer.cy,
      ymax: this.textBuffer.cy,
    }
  }

  private _toPosition(sel: SelectionRegion): { tail: Position; head: Position } {
    let tail = { x: sel.xmin, y: sel.ymin }
    let head = { x: sel.xmax, y: sel.ymax }
    if (this._getIdx(tail) > this._getIdx(head)) {
      ;[tail, head] = [head, tail]
    }
    return { tail, head }
  }

  private _fromPosition({ tail, head }: { tail: Position; head: Position }): SelectionRegion {
    if (this._getIdx(tail) > this._getIdx(head)) {
      ;[tail, head] = [head, tail]
    }
    return {
      xmin: tail.x,
      xmax: head.x,
      ymin: tail.y,
      ymax: head.y,
    }
  }

  private _getIdx(pos: Position): number {
    const n = this.textBuffer.buffer.slice(undefined, pos.y).reduce((acc, cur) => acc + cur.length, 0)
    return n + pos.x
  }

  private _getPos(idx: number): Position {
    let x = 0
    let y = 0
    let n = 0
    while (n < idx) {
      if (x >= this.textBuffer.buffer[y].length) {
        x = 0
        y++
      } else {
        x++
        n++
      }
    }
    return { x, y }
  }
}
