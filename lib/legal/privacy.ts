import type { Locale } from '@/i18n/config'
import type { LegalDoc } from './types'
import { CONTACT_EMAIL, SUPPORT_GMAIL, WHATSAPP_DISPLAY } from '@/lib/contactInfo'

// TODO(legal): DRAFT — must be reviewed by a lawyer against Tunisian law before it is relied on:
//   loi organique n° 2004-63 du 27 juillet 2004 (protection des données à caractère personnel),
//   prior declaration / authorisation with the INPDP (Instance Nationale de Protection des Données
//   Personnelles), transfers of data abroad (Brevo, Google, Groq are outside Tunisia), retention
//   periods required by Tunisian accounting / tax law, and the identity + address of the data
//   controller (legal entity, registration number) which are still missing below.
// Facts described here match the platform as built on 2026-10-20 (backend + storefront code).

const UPDATED = '22/10/2026'

const fr: LegalDoc = {
  title: 'Politique de confidentialité',
  intro: 'Cette politique explique quelles données personnelles ChooseTounsi collecte quand vous utilisez la marketplace (acheteurs et vendeurs), pourquoi, avec qui elles sont partagées, combien de temps elles sont gardées et comment exercer vos droits.',
  updated: `Dernière mise à jour : ${UPDATED}`,
  tocTitle: 'Sommaire',
  sections: [
    {
      id: 'collecte', heading: '1. Les données que nous collectons',
      items: [
        'Compte : nom, adresse e-mail, mot de passe (enregistré chiffré, jamais en clair), langue choisie, photo de profil si vous en ajoutez une.',
        'Connexion avec Google : si vous choisissez « Continuer avec Google », Google nous transmet votre nom, votre adresse e-mail, votre identifiant Google et votre photo de profil. Nous ne recevons jamais votre mot de passe Google.',
        'Téléphone et adresses de livraison : numéro de téléphone, nom du destinataire, gouvernorat, délégation, adresse et code postal.',
        'Commandes : produits achetés, montants, mode de paiement (paiement à la livraison), statut de livraison, historique des commandes, réclamations et retours (avec les photos que vous envoyez), avis laissés sur les produits.',
        'Vendeurs : informations de la demande vendeur (nom complet, téléphone, nom et description de la boutique, adresse de ramassage, photos envoyées), produits publiés, ventes, commissions et versements.',
        'Utilisation du site : produits consultés et cliqués, recherches et messages envoyés à l’assistant du chat support, pour vous recommander des produits et améliorer le service.',
        'Données techniques : adresse IP, type de navigateur, journaux techniques (sécurité, détection des abus).',
      ],
    },
    {
      id: 'finalites', heading: '2. Pourquoi nous les utilisons',
      items: [
        'Créer et gérer votre compte, vous connecter (y compris via Google).',
        'Traiter vos commandes : transmettre la commande au vendeur, organiser la livraison avec notre partenaire de livraison, encaisser le paiement à la livraison, gérer les réclamations, retours et remboursements.',
        'Vous informer : e-mails et notifications sur le site pour vos commandes, votre compte et, pour les vendeurs, les ventes et la boutique. Les prestataires qui nous aident sont listés à la section 3.',
        'E-mails de recommandations et bons plans : seulement si vous l’avez accepté (désactivé par défaut). Chaque e-mail contient un lien de désabonnement, et vous pouvez changer d’avis à tout moment dans votre profil.',
        'Personnaliser la boutique (produits recommandés) et mesurer ce qui fonctionne.',
        'Assurer la sécurité de la plateforme, prévenir la fraude et respecter nos obligations légales (comptabilité, factures).',
      ],
    },
    {
      id: 'destinataires', heading: '3. Avec qui nous partageons vos données, et pourquoi',
      body: ['Nous ne vendons jamais vos données. Nous en partageons uniquement le strict nécessaire avec les partenaires ci-dessous, et seulement pour faire fonctionner le service :'],
      items: [
        'Le vendeur de votre commande — pour préparer et expédier votre colis. Il reçoit votre nom, votre téléphone, votre adresse de livraison et les articles qui le concernent (pas vos autres commandes).',
        'Intigo, notre livreur — pour vous livrer, encaisser le paiement à la livraison et gérer les retours. Il reçoit le nom du destinataire, le téléphone, l’adresse, le montant à encaisser et les informations du colis.',
        'Brevo, notre service d’e-mails — pour vous envoyer les e-mails de commande, de compte et (si vous l’avez accepté) de recommandations. Il reçoit votre adresse e-mail et le contenu de ces e-mails.',
        'Google — seulement si vous choisissez « Continuer avec Google », pour vous connecter. Google nous confirme votre identité ; nous ne recevons jamais votre mot de passe.',
        'Groq, l’intelligence artificielle de l’assistant de chat — pour répondre à vos questions. Il reçoit uniquement le texte que vous écrivez à l’assistant.',
        'Notre hébergeur — pour faire tourner le site : vos données sont stockées sur ses serveurs.',
        'Les autorités — uniquement si la loi nous y oblige.',
      ],
      after: ['Brevo, Google et Groq traitent ces données en dehors de la Tunisie.'],
    },
    {
      id: 'conservation', heading: '4. Combien de temps nous les gardons',
      items: [
        'Compte et adresses : tant que votre compte existe. Après une demande de suppression, nous supprimons ou anonymisons vos données, sauf celles que la loi nous oblige à garder.',
        'Commandes et factures : pendant la durée exigée par la réglementation comptable et fiscale.',
        'Historique de navigation utilisé pour les recommandations : 12 mois au maximum.',
        'Journaux techniques des serveurs : 14 jours. Échanges avec le partenaire de livraison (statuts des colis) : 6 mois.',
      ],
    },
    {
      id: 'droits', heading: '5. Vos droits',
      body: ['Vous pouvez à tout moment demander à :'],
      items: [
        'accéder aux données que nous avons sur vous ;',
        'corriger des données inexactes (la plupart se modifient directement dans votre profil : nom, téléphone, adresses) ;',
        'supprimer votre compte et vos données ;',
        'vous opposer aux e-mails de recommandations (lien de désabonnement ou réglage dans votre profil).',
      ],
      after: [
        `Pour exercer ces droits, écrivez-nous depuis l’adresse e-mail de votre compte à ${CONTACT_EMAIL} ou ${SUPPORT_GMAIL}, ou utilisez la page Contact. Nous répondons dans un délai d’un mois au plus. Nous pouvons vous demander de confirmer votre identité.`,
        'Vous pouvez aussi saisir l’Instance Nationale de Protection des Données Personnelles (INPDP).',
      ],
    },
    {
      id: 'cookies', heading: '6. Cookies et stockage local',
      body: ['Nous n’utilisons pas de cookies publicitaires ni d’outils de mesure d’audience de tiers. Le site enregistre seulement dans votre navigateur ce qui est nécessaire à son fonctionnement :'],
      items: [
        'votre jeton de connexion (stockage local) et un cookie technique indiquant que vous êtes connecté (24 heures) ;',
        'votre langue (cookie NEXT_LOCALE, 1 an) ;',
        'un identifiant de visite aléatoire pour les visiteurs non connectés (stockage local), qui sert aux recommandations ;',
        'quelques préférences d’affichage (fenêtres déjà fermées, thème de l’espace vendeur).',
      ],
      after: ['Vous pouvez les effacer depuis les réglages de votre navigateur ; vous serez alors déconnecté.'],
    },
    {
      id: 'securite', heading: '7. Sécurité',
      body: ['Le site est accessible uniquement en HTTPS, les mots de passe sont chiffrés et l’accès aux données est limité aux personnes qui en ont besoin. Aucun numéro de carte bancaire n’est enregistré sur nos serveurs.'],
    },
    {
      id: 'contact', heading: '8. Nous contacter',
      body: [`Pour toute question sur vos données : ${CONTACT_EMAIL} · ${SUPPORT_GMAIL} · WhatsApp ${WHATSAPP_DISPLAY}, ou la page Contact. Nous pouvons modifier cette politique ; la date de mise à jour figure en haut de la page.`],
    },
  ],
}

const en: LegalDoc = {
  title: 'Privacy Policy',
  intro: 'This policy explains what personal data ChooseTounsi collects when you use the marketplace (buyers and sellers), why, who receives it, how long it is kept and how to exercise your rights.',
  updated: `Last updated: ${UPDATED}`,
  tocTitle: 'Contents',
  sections: [
    {
      id: 'collecte', heading: '1. Data we collect',
      items: [
        'Account: name, e-mail address, password (stored hashed, never in clear text), language, profile photo if you add one.',
        'Google sign-in: if you choose “Continue with Google”, Google sends us your name, e-mail address, Google account ID and profile photo. We never receive your Google password.',
        'Phone and delivery addresses: phone number, recipient name, governorate, delegation, address and postal code.',
        'Orders: products bought, amounts, payment method (cash on delivery), delivery status, order history, complaints and returns (including the photos you send), product reviews.',
        'Sellers: seller application details (full name, phone, shop name and description, pickup address, uploaded photos), listed products, sales, commissions and payouts.',
        'Use of the site: products viewed and clicked, searches and messages sent to the support chat assistant, to recommend products and improve the service.',
        'Technical data: IP address, browser type, technical logs (security, abuse detection).',
      ],
    },
    {
      id: 'finalites', heading: '2. Why we use it',
      items: [
        'To create and manage your account and sign you in (including with Google).',
        'To process your orders: pass the order to the seller, arrange delivery with our delivery partner, collect cash on delivery, and handle complaints, returns and refunds.',
        'To keep you informed: e-mails and on-site notifications about your orders and account and, for sellers, sales and their shop. The providers that help us are listed in section 3.',
        'Recommendation and deals e-mails: only if you agreed (off by default). Every such e-mail has an unsubscribe link, and you can change your choice at any time in your profile.',
        'To personalise the shop (recommended products) and measure what works.',
        'To keep the platform secure, prevent fraud and meet our legal obligations (accounting, invoices).',
      ],
    },
    {
      id: 'destinataires', heading: '3. Who we share data with and why',
      body: ['We never sell your data. We share only what is strictly needed, with the partners below, and only to run the service:'],
      items: [
        'The seller of your order — to prepare and ship your parcel. They get your name, phone number, delivery address and the items that concern them (not your other orders).',
        'Intigo, our delivery partner — to deliver to you, collect cash on delivery and handle returns. They get the recipient’s name, phone, address, the amount to collect and the parcel details.',
        'Brevo, our e-mail service — to send you order and account e-mails and (if you agreed) recommendation e-mails. They get your e-mail address and the content of those e-mails.',
        'Google — only if you choose “Continue with Google”, to sign you in. Google confirms who you are; we never receive your password.',
        'Groq, the AI behind the chat assistant — to answer your questions. They only get the text you write to the assistant.',
        'Our hosting provider — to run the site: your data is stored on their servers.',
        'Authorities — only when the law requires it.',
      ],
      after: ['Brevo, Google and Groq process this data outside Tunisia.'],
    },
    {
      id: 'conservation', heading: '4. How long we keep it',
      items: [
        'Account and addresses: as long as your account exists. After a deletion request we delete or anonymise your data, except what the law requires us to keep.',
        'Orders and invoices: for the period required by accounting and tax rules.',
        'Browsing history used for recommendations: 12 months at most.',
        'Server technical logs: 14 days. Exchanges with the delivery partner (parcel statuses): 6 months.',
      ],
    },
    {
      id: 'droits', heading: '5. Your rights',
      body: ['At any time you can ask to:'],
      items: [
        'access the data we hold about you;',
        'correct inaccurate data (most of it can be edited directly in your profile: name, phone, addresses);',
        'delete your account and your data;',
        'object to recommendation e-mails (unsubscribe link or the setting in your profile).',
      ],
      after: [
        `To exercise these rights, write to us from your account’s e-mail address at ${CONTACT_EMAIL} or ${SUPPORT_GMAIL}, or use the Contact page. We answer within one month at most and may ask you to confirm your identity.`,
        'You can also contact the Tunisian data protection authority (INPDP).',
      ],
    },
    {
      id: 'cookies', heading: '6. Cookies and local storage',
      body: ['We use no advertising cookies and no third-party analytics. The site only stores what it needs to work in your browser:'],
      items: [
        'your sign-in token (local storage) and a technical cookie saying you are signed in (24 hours);',
        'your language (NEXT_LOCALE cookie, 1 year);',
        'a random visit ID for visitors who are not signed in (local storage), used for recommendations;',
        'a few display preferences (pop-ups already closed, seller area theme).',
      ],
      after: ['You can clear them in your browser settings; you will then be signed out.'],
    },
    {
      id: 'securite', heading: '7. Security',
      body: ['The site is only served over HTTPS, passwords are hashed and access to data is limited to the people who need it. No bank card number is ever stored on our servers.'],
    },
    {
      id: 'contact', heading: '8. Contact us',
      body: [`Questions about your data: ${CONTACT_EMAIL} · ${SUPPORT_GMAIL} · WhatsApp ${WHATSAPP_DISPLAY}, or the Contact page. We may update this policy; the date of the last update is shown at the top of the page.`],
    },
  ],
}

const ar: LegalDoc = {
  title: 'سياسة الخصوصية',
  intro: 'توضّح هذه السياسة البيانات الشخصية التي تجمعها ChooseTounsi عند استعمالك للمنصّة (مشترين وبائعين)، ولماذا، ومن يتلقاها، ومدة الاحتفاظ بها، وكيف تمارس حقوقك.',
  updated: `آخر تحديث: ${UPDATED}`,
  tocTitle: 'المحتويات',
  sections: [
    {
      id: 'collecte', heading: '1. البيانات التي نجمعها',
      items: [
        'الحساب: الاسم، البريد الإلكتروني، كلمة السر (محفوظة مشفّرة ولا تُخزَّن أبدًا كنصّ واضح)، اللغة، وصورة الملف الشخصي إن أضفتها.',
        'الدخول عبر Google: إذا اخترت «المتابعة مع Google» يرسل لنا Google اسمك وبريدك الإلكتروني ومعرّف حسابك وصورتك. لا نتلقى أبدًا كلمة سر Google.',
        'الهاتف وعناوين التوصيل: رقم الهاتف، اسم المستلم، الولاية، المعتمدية، العنوان والرمز البريدي.',
        'الطلبات: المنتجات المشتراة، المبالغ، طريقة الدفع (الدفع عند الاستلام)، حالة التوصيل، سجلّ الطلبات، الشكاوى والإرجاعات (مع الصور التي ترسلها)، وتقييمات المنتجات.',
        'البائعون: معطيات طلب البيع (الاسم الكامل، الهاتف، اسم المتجر ووصفه، عنوان الاستلام، الصور المرسلة)، المنتجات المنشورة، المبيعات، العمولات والمدفوعات.',
        'استعمال الموقع: المنتجات التي تشاهدها وتنقر عليها، عمليات البحث والرسائل المرسلة إلى مساعد الدردشة، لاقتراح منتجات وتحسين الخدمة.',
        'بيانات تقنية: عنوان IP، نوع المتصفح، السجلات التقنية (الأمان وكشف التجاوزات).',
      ],
    },
    {
      id: 'finalites', heading: '2. لماذا نستعملها',
      items: [
        'لإنشاء حسابك وإدارته وتسجيل دخولك (بما في ذلك عبر Google).',
        'لمعالجة طلباتك: إرسال الطلب إلى البائع، تنظيم التوصيل مع شريك التوصيل، تحصيل المبلغ عند الاستلام، ومعالجة الشكاوى والإرجاعات والاسترجاعات.',
        'لإعلامك: رسائل بريد إلكتروني وإشعارات على الموقع حول طلباتك وحسابك، وللبائعين حول المبيعات والمتجر. المزوّدون الذين يساعدوننا مذكورون في القسم 3.',
        'رسائل التوصيات والعروض: فقط إذا وافقت عليها (معطّلة افتراضيًا). كل رسالة تحتوي على رابط لإلغاء الاشتراك، ويمكنك تغيير اختيارك في أي وقت من ملفك الشخصي.',
        'لتخصيص المتجر (منتجات مقترحة) وقياس ما ينجح.',
        'لحماية المنصّة ومنع الاحتيال واحترام التزاماتنا القانونية (المحاسبة والفواتير).',
      ],
    },
    {
      id: 'destinataires', heading: '3. مع من نشارك بياناتك ولماذا',
      body: ['لا نبيع بياناتك أبدًا. لا نشارك منها إلا ما هو ضروري فعلًا، مع الشركاء التالين فقط، ولغرض تشغيل الخدمة:'],
      items: [
        'بائع طلبك — لتحضير طردك وإرساله. يتلقى اسمك وهاتفك وعنوان التوصيل والمنتجات التي تخصّه (ولا يرى طلباتك الأخرى).',
        'Intigo، شريك التوصيل — لتوصيل طلبك وتحصيل المبلغ عند الاستلام ومعالجة الإرجاعات. يتلقى اسم المستلم والهاتف والعنوان والمبلغ الواجب تحصيله ومعطيات الطرد.',
        'Brevo، خدمة البريد الإلكتروني — لإرسال رسائل الطلبات والحساب، ورسائل التوصيات إن وافقت عليها. يتلقى بريدك الإلكتروني ومحتوى هذه الرسائل.',
        'Google — فقط إذا اخترت «المتابعة عبر Google»، لتسجيل دخولك. يؤكّد Google هويتك، ولا نتلقى كلمة السر أبدًا.',
        'Groq، الذكاء الاصطناعي لمساعد الدردشة — للإجابة عن أسئلتك. لا يتلقى إلا النصّ الذي تكتبه للمساعد.',
        'مزوّد الاستضافة — لتشغيل الموقع: تُخزَّن بياناتك على خوادمه.',
        'السلطات — فقط إذا ألزمنا القانون بذلك.',
      ],
      after: ['تعالج Brevo وGoogle وGroq هذه البيانات خارج تونس.'],
    },
    {
      id: 'conservation', heading: '4. مدة الاحتفاظ',
      items: [
        'الحساب والعناوين: ما دام حسابك موجودًا. بعد طلب الحذف نحذف بياناتك أو نجعلها مجهولة، باستثناء ما يُلزمنا القانون بالاحتفاظ به.',
        'الطلبات والفواتير: طوال المدة التي تفرضها القواعد المحاسبية والجبائية.',
        'سجلّ التصفّح المستعمل للتوصيات: 12 شهرًا على الأكثر.',
        'السجلات التقنية للخوادم: 14 يومًا. المبادلات مع شريك التوصيل (حالات الطرود): 6 أشهر.',
      ],
    },
    {
      id: 'droits', heading: '5. حقوقك',
      body: ['يمكنك في أي وقت أن تطلب:'],
      items: [
        'الاطلاع على البيانات التي نملكها عنك؛',
        'تصحيح البيانات غير الصحيحة (يمكن تعديل أغلبها مباشرة من ملفك الشخصي: الاسم، الهاتف، العناوين)؛',
        'حذف حسابك وبياناتك؛',
        'الاعتراض على رسائل التوصيات (رابط إلغاء الاشتراك أو الإعداد في ملفك الشخصي).',
      ],
      after: [
        `لممارسة هذه الحقوق، راسلنا من البريد الإلكتروني لحسابك على ${CONTACT_EMAIL} أو ${SUPPORT_GMAIL}، أو استعمل صفحة الاتصال. نجيب في أجل أقصاه شهر، وقد نطلب منك تأكيد هويتك.`,
        'يمكنك أيضًا التوجّه إلى الهيئة الوطنية لحماية المعطيات الشخصية (INPDP).',
      ],
    },
    {
      id: 'cookies', heading: '6. ملفات تعريف الارتباط والتخزين المحلي',
      body: ['لا نستعمل ملفات تعريف ارتباط إعلانية ولا أدوات قياس جمهور تابعة لأطراف أخرى. لا يحفظ الموقع في متصفحك إلا ما يلزم لعمله:'],
      items: [
        'رمز تسجيل الدخول (التخزين المحلي) وملف تعريف ارتباط تقني يدلّ على أنك مسجّل الدخول (24 ساعة)؛',
        'لغتك (ملف NEXT_LOCALE، سنة واحدة)؛',
        'معرّف زيارة عشوائي للزوّار غير المسجّلين (التخزين المحلي)، يُستعمل للتوصيات؛',
        'بعض تفضيلات العرض (النوافذ التي أغلقتها، مظهر فضاء البائع).',
      ],
      after: ['يمكنك مسحها من إعدادات متصفحك؛ سيتم عندها تسجيل خروجك.'],
    },
    {
      id: 'securite', heading: '7. الأمان',
      body: ['لا يُعرض الموقع إلا عبر HTTPS، وكلمات السر مشفّرة، والوصول إلى البيانات مقتصر على من يحتاجه. لا يُحفظ أي رقم بطاقة بنكية على خوادمنا.'],
    },
    {
      id: 'contact', heading: '8. اتصل بنا',
      body: [`لأي سؤال حول بياناتك: ${CONTACT_EMAIL} · ${SUPPORT_GMAIL} · واتساب ${WHATSAPP_DISPLAY}، أو صفحة الاتصال. قد نعدّل هذه السياسة؛ تاريخ آخر تحديث مذكور في أعلى الصفحة.`],
    },
  ],
}

export const PRIVACY: Record<Locale, LegalDoc> = { fr, en, ar }
