// Text fields accept **bold** markers (rendered as <strong> by LegalDocument).

export interface LegalSection {
  id: string
  heading: string
  /** Paragraphs, in order. */
  body?: string[]
  /** Bullet list after the paragraphs. */
  items?: string[]
  /** Numbered steps after the bullets. */
  steps?: string[]
  /** Paragraphs after the lists. */
  after?: string[]
  /** Highlighted tip shown at the end of the section. */
  note?: string
}

export interface LegalDoc {
  title: string
  intro: string
  /** "Last updated" line. */
  updated: string
  /** Shown when the text is a draft pending legal review. */
  draftNotice?: string
  tocTitle: string
  sections: LegalSection[]
}

/** "Made by" block shown at the end of the legal pages. */
export interface MadeBy {
  title: string
  body: string
}
