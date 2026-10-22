import type { Locale } from '@/i18n/config'
import type { LegalDoc } from './types'
import { SOCIAL_HANDLE, SUPPORT_GMAIL, WHATSAPP_DISPLAY } from '@/lib/contactInfo'

// TODO(legal): plain-language text, to be reviewed against Tunisian law before it is relied on:
//   loi organique n° 2004-63 du 27 juillet 2004 (protection des données à caractère personnel),
//   declaration / authorisation with the INPDP, transfers of data abroad, retention periods
//   required by accounting / tax law, and the identity of the data controller.
// Keep it customer-facing: no provider names (except "Continuer avec Google", which users see),
// no technical details (storage, logs, cookies names, encryption).

const UPDATED = '22/10/2026'

/** Keeps phone numbers, e-mails and handles left-to-right inside Arabic text. */
const ltr = (s: string) => `⁦${s}⁩`

const fr: LegalDoc = {
  title: 'Politique de confidentialité',
  intro: 'Vos informations vous appartiennent. Cette page explique simplement ce que nous vous demandons, pourquoi, et comment vous gardez le contrôle.',
  updated: `Dernière mise à jour : ${UPDATED}`,
  tocTitle: 'Sommaire',
  sections: [
    {
      id: 'informations', heading: '1. Quelles informations nous demandons',
      body: ['**Pour tout le monde :**'],
      items: [
        'votre nom, votre e-mail et votre mot de passe, pour créer votre compte ;',
        'votre téléphone et votre adresse de livraison ;',
        'vos commandes, vos réclamations (avec les photos envoyées) et vos avis ;',
        'les messages que vous envoyez à notre support ou à notre assistant IA.',
      ],
      after: [
        '**Si vous utilisez « Continuer avec Google » :** Google nous transmet votre nom, votre e-mail et votre photo de profil. Nous ne recevons jamais votre mot de passe Google.',
        '**Pour les vendeurs, en plus :** les informations de votre boutique (nom, téléphone, catégories, description), l’adresse de retrait de vos colis et votre point sur la carte, vos photos de profil et de produits.',
      ],
    },
    {
      id: 'pourquoi', heading: '2. Pourquoi',
      items: [
        'Traiter et livrer vos commandes.',
        'Vous informer du suivi de vos commandes et de vos réclamations.',
        'Vérifier les vendeurs avant d’ouvrir leur boutique.',
        'Vous proposer des produits qui peuvent vous plaire et améliorer le site.',
        'Protéger votre compte et éviter la fraude.',
      ],
    },
    {
      id: 'partage', heading: '3. Avec qui nous les partageons',
      body: ['**Nous ne vendons jamais vos données.** Nous partageons seulement le nécessaire :'],
      items: [
        '**Le vendeur de votre commande** : votre nom, votre téléphone et votre adresse, pour préparer et livrer votre colis. Il ne voit pas vos autres commandes.',
        '**Notre partenaire de livraison** : les mêmes informations, plus le montant à payer, pour vous livrer.',
        '**Notre service d’envoi d’e-mails** : votre adresse e-mail, pour vous envoyer les messages sur vos commandes et votre compte.',
        '**Notre assistant IA** : seulement ce que vous lui écrivez, pour vous répondre.',
        '**Google** : seulement si vous utilisez « Continuer avec Google ».',
        '**Les autorités** : seulement si la loi nous y oblige.',
      ],
    },
    {
      id: 'duree', heading: '4. Combien de temps nous les gardons',
      items: [
        'Tant que votre compte est actif.',
        'Si vous supprimez votre compte, nous effaçons vos informations, sauf ce que la loi nous oblige à garder pour les commandes (par exemple les factures), pendant la durée prévue par la loi.',
      ],
    },
    {
      id: 'droits', heading: '5. Vos droits',
      body: ['À tout moment, vous pouvez :'],
      items: [
        '**consulter** les informations que nous avons sur vous ;',
        '**corriger** une information (la plupart se modifient directement dans votre profil) ;',
        '**supprimer** votre compte et vos informations.',
      ],
      after: [
        `**Comment faire ?** Écrivez-nous depuis l’e-mail de votre compte, par la page **Contact**, à **${SUPPORT_GMAIL}** ou sur WhatsApp au **${WHATSAPP_DISPLAY}**.`,
        'Nous vous répondons dans un délai d’un mois maximum. Nous pouvons vous demander de confirmer votre identité.',
      ],
    },
    {
      id: 'emails', heading: '6. E-mails d’information',
      items: [
        'Les e-mails sur vos commandes et votre compte sont nécessaires : ils vous tiennent informé.',
        'Les e-mails de bons plans et de recommandations ne vous sont envoyés que si vous les avez acceptés.',
        'Vous pouvez vous désabonner en un clic depuis chaque e-mail, ou depuis votre profil.',
      ],
    },
    {
      id: 'securite', heading: '7. Sécurité',
      body: ['Nous protégeons vos informations et seules les personnes qui en ont besoin y ont accès. Nous ne vous demanderons jamais votre mot de passe par téléphone, par message ou par e-mail.'],
    },
    {
      id: 'contact', heading: '8. Nous contacter',
      body: ['Une question sur vos informations ?'],
      items: [
        'Page **Contact**',
        `WhatsApp : **${WHATSAPP_DISPLAY}**`,
        `E-mail : **${SUPPORT_GMAIL}**`,
        `Instagram et TikTok : **${SOCIAL_HANDLE}**`,
      ],
      after: ['Nous pouvons modifier cette politique. La date de la dernière mise à jour est toujours indiquée en haut de la page.'],
    },
  ],
}

const en: LegalDoc = {
  title: 'Privacy Policy',
  intro: 'Your information belongs to you. This page explains, in simple words, what we ask for, why, and how you stay in control.',
  updated: `Last updated: ${UPDATED}`,
  tocTitle: 'Contents',
  sections: [
    {
      id: 'informations', heading: '1. What information we ask for',
      body: ['**For everyone:**'],
      items: [
        'your name, e-mail and password, to create your account;',
        'your phone number and delivery address;',
        'your orders, complaints (with the photos you send) and reviews;',
        'the messages you send to our support team or to our AI assistant.',
      ],
      after: [
        '**If you use “Continue with Google”:** Google sends us your name, e-mail and profile photo. We never receive your Google password.',
        '**For sellers, also:** your shop details (name, phone, categories, description), the address where your parcels are picked up and your map point, and your profile and product photos.',
      ],
    },
    {
      id: 'pourquoi', heading: '2. Why',
      items: [
        'To process and deliver your orders.',
        'To keep you updated on your orders and complaints.',
        'To check sellers before opening their shop.',
        'To suggest products you may like and improve the site.',
        'To protect your account and prevent fraud.',
      ],
    },
    {
      id: 'partage', heading: '3. Who we share it with',
      body: ['**We never sell your data.** We only share what is needed:'],
      items: [
        '**The seller of your order**: your name, phone and address, to prepare and deliver your parcel. They cannot see your other orders.',
        '**Our delivery partner**: the same details, plus the amount to pay, to deliver to you.',
        '**Our e-mail service**: your e-mail address, to send you messages about your orders and account.',
        '**Our AI assistant**: only what you write to it, so it can answer you.',
        '**Google**: only if you use “Continue with Google”.',
        '**The authorities**: only when the law requires it.',
      ],
    },
    {
      id: 'duree', heading: '4. How long we keep it',
      items: [
        'As long as your account is active.',
        'If you delete your account, we erase your information, except what the law requires us to keep for orders (invoices, for example), for the period set by law.',
      ],
    },
    {
      id: 'droits', heading: '5. Your rights',
      body: ['At any time, you can:'],
      items: [
        '**see** the information we hold about you;',
        '**correct** any information (most of it can be edited directly in your profile);',
        '**delete** your account and your information.',
      ],
      after: [
        `**How?** Write to us from your account’s e-mail address, through the **Contact** page, at **${SUPPORT_GMAIL}** or on WhatsApp at **${WHATSAPP_DISPLAY}**.`,
        'We answer within one month at most. We may ask you to confirm your identity.',
      ],
    },
    {
      id: 'emails', heading: '6. Newsletter e-mails',
      items: [
        'E-mails about your orders and account are necessary: they keep you informed.',
        'Deals and recommendation e-mails are only sent if you agreed to receive them.',
        'You can unsubscribe in one click from any of these e-mails, or from your profile.',
      ],
    },
    {
      id: 'securite', heading: '7. Security',
      body: ['We protect your information, and only the people who need it can access it. We will never ask for your password by phone, message or e-mail.'],
    },
    {
      id: 'contact', heading: '8. Contact us',
      body: ['A question about your information?'],
      items: [
        '**Contact** page',
        `WhatsApp: **${WHATSAPP_DISPLAY}**`,
        `E-mail: **${SUPPORT_GMAIL}**`,
        `Instagram and TikTok: **${SOCIAL_HANDLE}**`,
      ],
      after: ['We may update this policy. The date of the last update is always shown at the top of the page.'],
    },
  ],
}

const ar: LegalDoc = {
  title: 'سياسة الخصوصية',
  intro: 'معلوماتك ملكك. تشرح هذه الصفحة ببساطة ما نطلبه منك، ولماذا، وكيف تبقى متحكّمًا فيه.',
  updated: `آخر تحديث: ${UPDATED}`,
  tocTitle: 'المحتويات',
  sections: [
    {
      id: 'informations', heading: '1. ما المعلومات التي نطلبها',
      body: ['**من الجميع:**'],
      items: [
        'اسمك وبريدك الإلكتروني وكلمة السرّ، لإنشاء حسابك؛',
        'رقم هاتفك وعنوان التوصيل؛',
        'طلباتك وشكاواك (مع الصور المرسلة) وتقييماتك؛',
        'الرسائل التي ترسلها إلى فريق الدعم أو إلى مساعدنا الذكي.',
      ],
      after: [
        '**إذا استعملت «المتابعة عبر Google»:** يرسل لنا Google اسمك وبريدك الإلكتروني وصورة ملفك الشخصي. لا نتلقّى أبدًا كلمة سرّ Google.',
        '**من البائعين، إضافة إلى ذلك:** معلومات متجرك (الاسم، الهاتف، الأصناف، الوصف)، عنوان استلام طرودك ونقطتك على الخريطة، وصورة ملفك الشخصي وصور منتجاتك.',
      ],
    },
    {
      id: 'pourquoi', heading: '2. لماذا',
      items: [
        'لمعالجة طلباتك وتوصيلها.',
        'لإعلامك بمتابعة طلباتك وشكاواك.',
        'للتثبّت من البائعين قبل فتح متاجرهم.',
        'لاقتراح منتجات قد تعجبك وتحسين الموقع.',
        'لحماية حسابك وتجنّب الاحتيال.',
      ],
    },
    {
      id: 'partage', heading: '3. مع من نشاركها',
      body: ['**لا نبيع بياناتك أبدًا.** لا نشارك إلا ما هو ضروري:'],
      items: [
        '**بائع طلبك**: اسمك وهاتفك وعنوانك، لتحضير طردك وتوصيله. لا يرى طلباتك الأخرى.',
        '**شريك التوصيل**: نفس المعلومات، مع المبلغ الواجب دفعه، لتوصيل طلبك.',
        '**خدمة إرسال البريد الإلكتروني**: عنوان بريدك، لإرسال الرسائل الخاصّة بطلباتك وحسابك.',
        '**مساعدنا الذكي**: فقط ما تكتبه له، ليجيبك.',
        '**Google**: فقط إذا استعملت «المتابعة عبر Google».',
        '**السلطات**: فقط إذا ألزمنا القانون بذلك.',
      ],
    },
    {
      id: 'duree', heading: '4. كم من الوقت نحتفظ بها',
      items: [
        'ما دام حسابك نشطًا.',
        'إذا حذفت حسابك، نمحو معلوماتك، باستثناء ما يُلزمنا القانون بالاحتفاظ به للطلبات (مثل الفواتير)، طوال المدّة التي يحدّدها القانون.',
      ],
    },
    {
      id: 'droits', heading: '5. حقوقك',
      body: ['في أي وقت، يمكنك:'],
      items: [
        '**الاطّلاع** على المعلومات التي نملكها عنك؛',
        '**تصحيح** أي معلومة (أغلبها يُعدَّل مباشرة من ملفك الشخصي)؛',
        '**حذف** حسابك ومعلوماتك.',
      ],
      after: [
        `**كيف؟** راسلنا من البريد الإلكتروني لحسابك، عبر صفحة **الاتصال**، على **${ltr(SUPPORT_GMAIL)}** أو على واتساب **${ltr(WHATSAPP_DISPLAY)}**.`,
        'نجيبك في أجل أقصاه شهر. قد نطلب منك تأكيد هويتك.',
      ],
    },
    {
      id: 'emails', heading: '6. الرسائل الإخبارية',
      items: [
        'الرسائل الخاصّة بطلباتك وحسابك ضرورية: فهي تُبقيك على علم.',
        'رسائل العروض والاقتراحات لا تُرسل إليك إلا إذا وافقت عليها.',
        'يمكنك إلغاء الاشتراك بنقرة واحدة من كل رسالة، أو من ملفك الشخصي.',
      ],
    },
    {
      id: 'securite', heading: '7. الأمان',
      body: ['نحمي معلوماتك، ولا يطّلع عليها إلا من يحتاجها. لن نطلب منك أبدًا كلمة السرّ عبر الهاتف أو الرسائل أو البريد الإلكتروني.'],
    },
    {
      id: 'contact', heading: '8. اتصل بنا',
      body: ['عندك سؤال حول معلوماتك؟'],
      items: [
        'صفحة **الاتصال**',
        `واتساب: **${ltr(WHATSAPP_DISPLAY)}**`,
        `البريد الإلكتروني: **${ltr(SUPPORT_GMAIL)}**`,
        `إنستغرام وتيك توك: **${ltr(SOCIAL_HANDLE)}**`,
      ],
      after: ['قد نعدّل هذه السياسة. تاريخ آخر تحديث مذكور دائمًا في أعلى الصفحة.'],
    },
  ],
}

export const PRIVACY: Record<Locale, LegalDoc> = { fr, en, ar }
