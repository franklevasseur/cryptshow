import differ from 'ansi-diff-stream'

const lb = /\r?\n/

export type EditorEvent = {
  value: string
  aborted: boolean
}

export class Editor {
  private out: differ.AnsiDiffStream
  private aborted: boolean = false
  private value: string = ''

  private lines: string[]

  constructor(text: string) {
    this.out = differ()
    this.out.pipe(process.stdout)
    this.lines = text.split(lb)
  }

  public on(event: string, cb: (event: EditorEvent) => void): this {
    this.out.on(event, cb)
    return this
  }

  public update = () => {
    this.value = this.lines.join('\n')
    this.emit()
  }

  private emit = () => {
    const ev: EditorEvent = {
      value: this.value,
      aborted: !!this.aborted,
    }
    this.out.write(ev)
  }
}

const editor = (text: string) => {
  const p = new Editor(text)
  p.update()
  return p
}

export default editor
