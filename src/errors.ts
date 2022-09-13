export class CryptShowError extends Error {
  public readonly messages: string[]
  constructor(m: string | string[]) {
    const messages = typeof m === 'string' ? [m] : m
    super(messages.join('\n'))
    this.messages = messages
  }
}
