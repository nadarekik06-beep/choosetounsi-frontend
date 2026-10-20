export interface LegalSection {
  id: string
  heading: string
  /** Paragraphs, in order. */
  body?: string[]
  /** Bullet list after the paragraphs. */
  items?: string[]
  /** Paragraphs after the list. */
  after?: string[]
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
