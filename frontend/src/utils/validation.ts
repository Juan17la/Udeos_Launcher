/** A text rule: a pattern the trimmed value must match and the length the
 *  input is capped at. Screens read `maxLength` for the input and `test`
 *  for the submit button, so a rule lives in exactly one place. */
export class TextRule {
  constructor(private readonly pattern: RegExp, readonly maxLength: number) {}

  normalize(raw: string): string {
    return raw.trim()
  }

  test(raw: string): boolean {
    return this.pattern.test(this.normalize(raw))
  }
}

/** Minecraft's own nickname rule: 3–16 letters, digits or underscores. */
export const NICKNAME = new TextRule(/^[A-Za-z0-9_]{3,16}$/, 16)

/** An instance name only has to be non-empty; it names a folder, so it is capped. */
export const INSTANCE_NAME = new TextRule(/\S/, 40)
