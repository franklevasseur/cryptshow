import chalk from 'chalk'
import _ from 'lodash'

export type LoggerLevel = 'error' | 'warn' | 'info' | 'debug'

export type LoggerOptions = {
  level: LoggerLevel
}

const DEFAULT_OPTIONS: LoggerOptions = {
  level: 'info',
}

type ChalkColor = (x: string) => string

export class Logger {
  private level: LoggerLevel

  constructor(opts: Partial<LoggerOptions> = {}) {
    const options: LoggerOptions = { ...DEFAULT_OPTIONS, ..._.pickBy(opts) }
    this.level = options.level
  }

  public log(level: LoggerLevel, message: string, metadata?: any): void {
    const prefix = this._toColor(level)(' ')
    if (this._toInt(this.level) >= this._toInt(level)) {
      // eslint-disable-next-line no-console
      console.log(prefix, message, metadata || '')
    }
  }

  public debug(message: string, metadata?: any): void {
    this.log('debug', message, metadata)
  }

  public info(message: string, metadata?: any): void {
    this.log('info', message, metadata)
  }

  public warn(message: string, metadata?: any): void {
    this.log('warn', message, metadata)
  }

  public error(message: string, metadata?: any): void {
    this.log('error', message, metadata)
  }

  private _toInt(level: LoggerLevel): number {
    if (level === 'debug') {
      return 4
    }
    if (level === 'info') {
      return 3
    }
    if (level === 'warn') {
      return 2
    }
    return 1
  }

  private _toColor(level: LoggerLevel): ChalkColor {
    if (level === 'debug') {
      return chalk.bgBlueBright
    }
    if (level === 'info') {
      return chalk.bgGreenBright
    }
    if (level === 'warn') {
      return chalk.bgYellowBright
    }
    return chalk.bgRedBright
  }
}
