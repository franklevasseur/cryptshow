export const LOREM_IPSUM = `Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing
non, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula
orci, pharetra pretium, feugiat eu, lobortis quis, pede.
Phasellus molestie magna non est. Phasellus libero.
Nullam sit amet turpis elementum ligula vehicula consequat.
Morbi a ipsum. Integer a nibh. In quis justo.
Maecenas rhoncus aliquam lacus. Morbi quis tortor id nulla ultrices aliquet.
Maecenas leo odio, condimentum id, luctus nec, molestie sed, justo.
Donec vitae sapien ut libero venenatis faucibus.
Nullam justo. Aliquam quis turpis eget elit sodales scelerisque.
Sed ante. Vivamus tortor.`

export const editor = (text: string): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    resolve(text)
  })

export default editor
