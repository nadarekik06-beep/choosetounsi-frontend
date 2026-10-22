import type { Locale } from '@/i18n/config'
import type { MadeBy } from './types'

// Same names as the About page (messages/*.json → about.signature).
export const MADE_BY: Record<Locale, MadeBy> = {
  fr: {
    title: 'Fait avec passion',
    body: 'ChooseTounsi a été imaginé et développé par Abderahmen et Nada, deux étudiants de 22 ans, dans le cadre de leur Projet de Fin d’Études (PFE). Une plateforme née d’une passion : donner aux vendeurs tunisiens la place qu’ils méritent.',
  },
  en: {
    title: 'Made with passion',
    body: 'ChooseTounsi was imagined and built by Abderahmen and Nada, two 22-year-old students, as their final-year graduation project (PFE). A platform born from one passion: giving Tunisian sellers the place they deserve.',
  },
  ar: {
    title: 'صُنع بشغف',
    body: 'فكّر في ChooseTounsi وطوّره عبدالرحمان وندى، طالبان يبلغان من العمر 22 سنة، في إطار مشروع ختم الدروس (PFE). منصّة وُلدت من شغف واحد: أن ينال البائعون التونسيون المكانة التي يستحقّونها.',
  },
}
