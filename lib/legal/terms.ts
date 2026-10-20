import type { Locale } from '@/i18n/config'
import type { LegalDoc } from './types'
import { CONTACT_EMAIL, SUPPORT_GMAIL, WHATSAPP_DISPLAY } from '@/lib/contactInfo'

// TODO(legal): DRAFT — must be reviewed by a lawyer against Tunisian law before it is relied on:
//   e-commerce law (loi n° 2000-83 du 9 août 2000), consumer protection (loi n° 92-117) incl. the
//   legal withdrawal period, protection des données (loi organique n° 2004-63, INPDP), invoicing /
//   tax obligations of the platform and of sellers, minimum age, competent court, and the legal
//   identity of the operator (company name, registration number, address) still missing below.
// The flows described match the platform as built on 2026-10-20: cash on delivery only, delivery by
// Intigo, returns requested within 48 h of delivery (Complaint::COMPLAINT_WINDOW_HOURS), refund rules
// of App\Services\Returns\ReturnService, Green / Red / Black Pepper seller plans with a commission
// per sale (amounts on /become-a-vendor and in the seller area, they change over time).

const UPDATED = '20/10/2026'

const fr: LegalDoc = {
  title: 'Conditions d’utilisation',
  intro: 'Ces conditions s’appliquent à toute personne qui utilise ChooseTounsi, la marketplace des vendeurs tunisiens : acheteurs et vendeurs. En créant un compte ou en passant une commande, vous les acceptez.',
  updated: `Dernière mise à jour : ${UPDATED}`,
  tocTitle: 'Sommaire',
  sections: [
    {
      id: 'role', heading: '1. Le rôle de ChooseTounsi',
      body: [
        'ChooseTounsi met en relation des acheteurs et des vendeurs installés en Tunisie. Chaque produit est vendu par la boutique indiquée sur sa fiche : c’est elle qui est responsable du produit, de sa description et de sa préparation. ChooseTounsi organise la commande, le paiement à la livraison, la livraison avec son partenaire et le traitement des retours.',
        'Certains produits sont vendus directement par ChooseTounsi (par exemple la marque WearTounsi) : pour ceux-là, ChooseTounsi est le vendeur.',
      ],
    },
    {
      id: 'compte', heading: '2. Votre compte',
      items: [
        'Les informations de votre compte (nom, e-mail, téléphone, adresses) doivent être exactes : elles servent à livrer vos commandes.',
        'Vous êtes responsable de votre mot de passe et de ce qui est fait avec votre compte.',
        'Nous pouvons suspendre ou fermer un compte en cas de fraude, d’abus ou de non-respect de ces conditions.',
      ],
    },
    {
      id: 'commandes', heading: '3. Commandes et prix',
      items: [
        'Les prix sont affichés en dinars tunisiens (DT). Les frais de livraison sont calculés et affichés avant la confirmation de la commande.',
        'Une commande avec des produits de plusieurs boutiques donne un colis par boutique.',
        'Votre commande est confirmée après vérification ; vous suivez chaque étape dans « Mes commandes » et par e-mail.',
        'Pour annuler une commande qui n’est pas encore partie, contactez-nous au plus vite (page Contact ou WhatsApp).',
        'Les codes promo et coupons s’appliquent selon les conditions affichées avec le code.',
      ],
    },
    {
      id: 'paiement', heading: '4. Paiement à la livraison',
      body: [
        'Le paiement se fait en espèces au livreur, à la réception du colis. Vous ne payez rien en ligne. D’autres moyens de paiement ne sont proposés que s’ils apparaissent au moment de la commande.',
        'Si vous refusez un colis à la livraison, il retourne chez le vendeur et vous ne payez rien.',
      ],
    },
    {
      id: 'livraison', heading: '5. Livraison',
      items: [
        'Les colis sont livrés par notre partenaire de livraison (Intigo) à l’adresse indiquée dans la commande, partout en Tunisie.',
        'Les délais annoncés sont indicatifs. Restez joignable au numéro donné : le livreur peut vous appeler.',
        'Vous recevez un e-mail et une notification quand le colis part en livraison et quand il est livré.',
      ],
    },
    {
      id: 'retours', heading: '6. Réclamations, retours et remboursements',
      items: [
        'Délai : vous pouvez faire une réclamation dans les 48 heures qui suivent la livraison, une réclamation par commande, depuis « Réclamations ».',
        'Demande : choisissez les articles concernés et le motif (mauvais produit, mauvaise taille ou couleur, produit endommagé, autre), décrivez le problème et ajoutez au moins une photo.',
        'Décision : la boutique accepte ou refuse le retour. Si elle refuse, vous pouvez demander à ChooseTounsi de trancher ; ChooseTounsi valide aussi les retours acceptés.',
        'Retour du produit : un livreur vient récupérer l’article, qui doit être complet et dans l’état décrit. Il est vérifié par rapport à vos photos.',
        'Remboursement : rien n’est remboursé avant que l’article soit récupéré et vérifié. Pour une commande payée à la livraison, le livreur vous rembourse en espèces au moment du ramassage.',
        'Montant : ce que vous avez réellement payé pour les articles retournés (réduction ou coupon déduits). Les frais de retour sont à la charge du vendeur si le produit était erroné ou défectueux ; ils sont déduits du remboursement si vous changez d’avis (motif « autre »).',
      ],
      after: ['Vous suivez chaque étape dans « Mes retours » et par e-mail.'],
    },
    {
      id: 'vendeurs', heading: '7. Vendeurs',
      items: [
        'Pour vendre, vous déposez une demande vendeur ; ChooseTounsi l’examine et peut l’accepter ou la refuser.',
        'Vous êtes responsable de vos produits : ils doivent être légaux, conformes à leur description et à leurs photos, au bon prix, et disponibles en stock. Chaque produit est vérifié par l’équipe avant d’être publié.',
        'Vous préparez les commandes rapidement et les remettez au livreur à votre adresse de ramassage, que vous tenez à jour.',
        'Vous traitez les réclamations de vos clients de bonne foi et acceptez les retours justifiés.',
        'Vous respectez vos obligations légales et fiscales de commerçant.',
      ],
    },
    {
      id: 'commission', heading: '8. Commission, abonnements et versements',
      items: [
        'ChooseTounsi prélève une commission sur chaque vente. Son taux dépend du prix du produit et de votre plan.',
        'Trois plans vendeur : Green Pepper (gratuit), Red Pepper et Black Pepper (abonnements mensuels payants, avec une commission réduite et plus d’outils). Les prix, taux et avantages en vigueur sont affichés sur la page « Devenir vendeur » et dans votre espace vendeur.',
        'Le montant de vos ventes vous est versé après la livraison et une fois l’argent encaissé par le livreur reversé à ChooseTounsi, après déduction de la commission, des frais de livraison à votre charge et des éventuels ajustements (par exemple un retour remboursé).',
        'Les campagnes publicitaires (« Promouvoir ») sont payées d’avance depuis votre portefeuille publicitaire.',
      ],
    },
    {
      id: 'avis', heading: '9. Avis et contenus',
      body: ['Les avis doivent être honnêtes et concerner un produit réellement acheté. Nous pouvons retirer un avis, un produit ou un contenu illégal, trompeur ou injurieux.'],
    },
    {
      id: 'responsabilite', heading: '10. Responsabilité',
      items: [
        'Chaque vendeur est responsable des produits qu’il vend. ChooseTounsi est responsable de son propre service : la plateforme, l’organisation de la commande, du paiement à la livraison et des retours tels que décrits ci-dessus.',
        'Notre responsabilité est limitée au montant de la commande concernée, sauf faute grave ou disposition légale contraire.',
        'Nous faisons de notre mieux pour que le site reste disponible, sans pouvoir garantir l’absence d’interruptions ; nous ne sommes pas responsables des retards dus à des événements indépendants de notre volonté.',
      ],
    },
    {
      id: 'donnees', heading: '11. Données personnelles',
      body: ['L’utilisation de vos données est décrite dans notre Politique de confidentialité.'],
    },
    {
      id: 'loi', heading: '12. Droit applicable et contact',
      body: [
        'Ces conditions sont soumises au droit tunisien. En cas de désaccord, contactez-nous d’abord : nous cherchons toujours une solution à l’amiable.',
        `Contact : ${CONTACT_EMAIL} · ${SUPPORT_GMAIL} · WhatsApp ${WHATSAPP_DISPLAY}. Nous pouvons modifier ces conditions ; la date de mise à jour figure en haut de la page.`,
      ],
    },
  ],
}

const en: LegalDoc = {
  title: 'Terms of Use',
  intro: 'These terms apply to everyone who uses ChooseTounsi, the marketplace of Tunisian sellers: buyers and sellers. By creating an account or placing an order you accept them.',
  updated: `Last updated: ${UPDATED}`,
  tocTitle: 'Contents',
  sections: [
    {
      id: 'role', heading: '1. What ChooseTounsi does',
      body: [
        'ChooseTounsi connects buyers with sellers based in Tunisia. Each product is sold by the shop shown on its page: that shop is responsible for the product, its description and its preparation. ChooseTounsi runs the ordering, cash on delivery, delivery with its partner and the handling of returns.',
        'Some products are sold directly by ChooseTounsi (for example the WearTounsi brand): for those, ChooseTounsi is the seller.',
      ],
    },
    {
      id: 'compte', heading: '2. Your account',
      items: [
        'Your account details (name, e-mail, phone, addresses) must be accurate: they are used to deliver your orders.',
        'You are responsible for your password and for what is done with your account.',
        'We may suspend or close an account in case of fraud, abuse or breach of these terms.',
      ],
    },
    {
      id: 'commandes', heading: '3. Orders and prices',
      items: [
        'Prices are shown in Tunisian dinars (TND). Delivery fees are calculated and shown before you confirm the order.',
        'An order with products from several shops becomes one parcel per shop.',
        'Your order is confirmed after a check; you follow each step in “My orders” and by e-mail.',
        'To cancel an order that has not shipped yet, contact us as soon as possible (Contact page or WhatsApp).',
        'Promo codes and coupons apply under the conditions shown with the code.',
      ],
    },
    {
      id: 'paiement', heading: '4. Cash on delivery',
      body: [
        'You pay the courier in cash when you receive the parcel. Nothing is paid online. Other payment methods are offered only when they appear at checkout.',
        'If you refuse a parcel at the door, it goes back to the seller and you pay nothing.',
      ],
    },
    {
      id: 'livraison', heading: '5. Delivery',
      items: [
        'Parcels are delivered by our delivery partner (Intigo) to the address in the order, anywhere in Tunisia.',
        'Announced delivery times are estimates. Stay reachable on the phone number you gave: the courier may call you.',
        'You get an e-mail and a notification when the parcel is out for delivery and when it is delivered.',
      ],
    },
    {
      id: 'retours', heading: '6. Complaints, returns and refunds',
      items: [
        'Time limit: you can file a complaint within 48 hours of delivery, one complaint per order, from “Complaints”.',
        'Request: choose the items and the reason (wrong product, wrong size or colour, damaged product, other), describe the problem and add at least one photo.',
        'Decision: the shop accepts or refuses the return. If it refuses, you can ask ChooseTounsi to decide; ChooseTounsi also validates accepted returns.',
        'Sending the item back: a courier picks up the item, which must be complete and in the condition described. It is checked against your photos.',
        'Refund: nothing is refunded before the item is picked up and checked. For a cash-on-delivery order, the courier pays you back in cash at pick-up.',
        'Amount: what you actually paid for the returned items (discounts and coupons deducted). Return shipping is paid by the seller when the product was wrong or defective; it is deducted from the refund when you changed your mind (reason “other”).',
      ],
      after: ['You follow each step in “My returns” and by e-mail.'],
    },
    {
      id: 'vendeurs', heading: '7. Sellers',
      items: [
        'To sell, you submit a seller application; ChooseTounsi reviews it and may accept or refuse it.',
        'You are responsible for your products: they must be legal, match their description and photos, be correctly priced and in stock. Every product is checked by the team before it is published.',
        'You prepare orders promptly and hand them to the courier at your pickup address, which you keep up to date.',
        'You handle your customers’ complaints in good faith and accept justified returns.',
        'You meet your legal and tax obligations as a trader.',
      ],
    },
    {
      id: 'commission', heading: '8. Commission, plans and payouts',
      items: [
        'ChooseTounsi takes a commission on each sale. The rate depends on the product price and your plan.',
        'Three seller plans: Green Pepper (free), Red Pepper and Black Pepper (paid monthly subscriptions with a lower commission and more tools). Current prices, rates and benefits are shown on the “Become a seller” page and in your seller area.',
        'Your sales are paid out after delivery, once the cash collected by the courier has been remitted to ChooseTounsi, minus the commission, delivery costs you bear and any adjustments (for example a refunded return).',
        'Advertising campaigns (“Promote”) are prepaid from your ad wallet.',
      ],
    },
    {
      id: 'avis', heading: '9. Reviews and content',
      body: ['Reviews must be honest and about a product you actually bought. We may remove a review, product or content that is illegal, misleading or abusive.'],
    },
    {
      id: 'responsabilite', heading: '10. Liability',
      items: [
        'Each seller is responsible for the products they sell. ChooseTounsi is responsible for its own service: the platform and the handling of orders, cash on delivery and returns as described above.',
        'Our liability is limited to the amount of the order concerned, except in case of gross negligence or where the law provides otherwise.',
        'We do our best to keep the site available but cannot guarantee it will never be interrupted; we are not liable for delays caused by events beyond our control.',
      ],
    },
    {
      id: 'donnees', heading: '11. Personal data',
      body: ['How we use your data is described in our Privacy Policy.'],
    },
    {
      id: 'loi', heading: '12. Governing law and contact',
      body: [
        'These terms are governed by Tunisian law. If there is a disagreement, please contact us first: we always look for an amicable solution.',
        `Contact: ${CONTACT_EMAIL} · ${SUPPORT_GMAIL} · WhatsApp ${WHATSAPP_DISPLAY}. We may update these terms; the date of the last update is shown at the top of the page.`,
      ],
    },
  ],
}

const ar: LegalDoc = {
  title: 'شروط الاستخدام',
  intro: 'تنطبق هذه الشروط على كل من يستعمل ChooseTounsi، سوق البائعين التونسيين: المشترين والبائعين. بإنشاء حساب أو إرسال طلب، فإنك توافق عليها.',
  updated: `آخر تحديث: ${UPDATED}`,
  tocTitle: 'المحتويات',
  sections: [
    {
      id: 'role', heading: '1. دور ChooseTounsi',
      body: [
        'تربط ChooseTounsi بين المشترين والبائعين المقيمين في تونس. يُباع كل منتج من طرف المتجر المذكور في صفحته، وهو المسؤول عن المنتج ووصفه وتحضيره. تتولّى ChooseTounsi تنظيم الطلب، والدفع عند الاستلام، والتوصيل مع شريكها، ومعالجة الإرجاعات.',
        'بعض المنتجات تبيعها ChooseTounsi مباشرة (مثل علامة WearTounsi)، وفي هذه الحالة تكون ChooseTounsi هي البائع.',
      ],
    },
    {
      id: 'compte', heading: '2. حسابك',
      items: [
        'يجب أن تكون معطيات حسابك (الاسم، البريد الإلكتروني، الهاتف، العناوين) صحيحة، لأنها تُستعمل لتوصيل طلباتك.',
        'أنت مسؤول عن كلمة السر وعن كل ما يتم عبر حسابك.',
        'يمكننا تعليق حساب أو غلقه في حالة الاحتيال أو التجاوز أو عدم احترام هذه الشروط.',
      ],
    },
    {
      id: 'commandes', heading: '3. الطلبات والأسعار',
      items: [
        'الأسعار معروضة بالدينار التونسي. تُحتسب مصاريف التوصيل وتُعرض قبل تأكيد الطلب.',
        'الطلب الذي يضمّ منتجات من عدّة متاجر يُقسَّم إلى طرد لكل متجر.',
        'يُؤكَّد طلبك بعد التثبّت، وتتابع كل مرحلة في «طلباتي» وعبر البريد الإلكتروني.',
        'لإلغاء طلب لم يُشحن بعد، اتصل بنا في أقرب وقت (صفحة الاتصال أو واتساب).',
        'تُطبَّق رموز التخفيض والكوبونات حسب الشروط المذكورة مع الرمز.',
      ],
    },
    {
      id: 'paiement', heading: '4. الدفع عند الاستلام',
      body: [
        'تدفع نقدًا لعون التوصيل عند استلام الطرد، ولا تدفع شيئًا عبر الإنترنت. لا تُقترح طرق دفع أخرى إلا إذا ظهرت عند إتمام الطلب.',
        'إذا رفضت الطرد عند التوصيل، يعود إلى البائع ولا تدفع شيئًا.',
      ],
    },
    {
      id: 'livraison', heading: '5. التوصيل',
      items: [
        'يوصل شريكنا (Intigo) الطرود إلى العنوان المذكور في الطلب، في كامل تراب الجمهورية.',
        'آجال التوصيل المعلنة تقريبية. ابقَ متاحًا على رقم الهاتف الذي أعطيته: قد يتصل بك عون التوصيل.',
        'تتلقى رسالة وإشعارًا عند خروج الطرد للتوصيل وعند تسليمه.',
      ],
    },
    {
      id: 'retours', heading: '6. الشكاوى والإرجاع والاسترجاع',
      items: [
        'الأجل: يمكنك تقديم شكوى خلال 48 ساعة من التسليم، شكوى واحدة لكل طلب، من قسم «الشكاوى».',
        'الطلب: اختر المنتجات المعنية والسبب (منتج خاطئ، مقاس أو لون خاطئ، منتج متضرّر، سبب آخر)، واشرح المشكل وأضف صورة واحدة على الأقل.',
        'القرار: يقبل المتجر الإرجاع أو يرفضه. إذا رفض، يمكنك أن تطلب من ChooseTounsi الفصل في الأمر، كما تصادق ChooseTounsi على الإرجاعات المقبولة.',
        'إرجاع المنتج: يأتي عون توصيل لاستلام المنتج، ويجب أن يكون كاملًا وفي الحالة الموصوفة، ويُقارَن بصورك.',
        'الاسترجاع: لا يُسترجع أي مبلغ قبل استلام المنتج والتثبّت منه. بالنسبة للطلبات المدفوعة عند الاستلام، يعيد لك عون التوصيل المبلغ نقدًا عند الاستلام.',
        'المبلغ: ما دفعته فعلًا مقابل المنتجات المُرجعة (بعد طرح التخفيضات والكوبونات). يتحمّل البائع مصاريف الإرجاع إذا كان المنتج خاطئًا أو معيبًا، وتُطرح من المبلغ إذا غيّرت رأيك (سبب «آخر»).',
      ],
      after: ['تتابع كل مرحلة في «إرجاعاتي» وعبر البريد الإلكتروني.'],
    },
    {
      id: 'vendeurs', heading: '7. البائعون',
      items: [
        'للبيع، تقدّم طلب بائع، وتدرسه ChooseTounsi ويمكنها قبوله أو رفضه.',
        'أنت مسؤول عن منتجاتك: يجب أن تكون قانونية، ومطابقة لوصفها وصورها، بالسعر الصحيح، ومتوفّرة في المخزون. يراجع الفريق كل منتج قبل نشره.',
        'تحضّر الطلبات بسرعة وتسلّمها لعون التوصيل في عنوان الاستلام الذي تحافظ على تحيينه.',
        'تعالج شكاوى حرفائك بحسن نيّة وتقبل الإرجاعات المبرّرة.',
        'تحترم التزاماتك القانونية والجبائية كتاجر.',
      ],
    },
    {
      id: 'commission', heading: '8. العمولة والاشتراكات والدفعات',
      items: [
        'تقتطع ChooseTounsi عمولة على كل عملية بيع، وتتغيّر نسبتها حسب سعر المنتج وباقتك.',
        'ثلاث باقات للبائعين: Green Pepper (مجانية)، Red Pepper وBlack Pepper (اشتراكات شهرية بعمولة أقل وأدوات أكثر). الأسعار والنسب والمزايا الحالية معروضة في صفحة «كن بائعًا» وفي فضاء البائع.',
        'تُدفع لك مبيعاتك بعد التسليم، وبعد أن يُحوَّل المبلغ الذي حصّله عون التوصيل إلى ChooseTounsi، مع طرح العمولة ومصاريف التوصيل التي تتحمّلها وأي تعديلات (مثل إرجاع مُسترجَع).',
        'تُدفع الحملات الإشهارية («روّج») مسبقًا من محفظتك الإشهارية.',
      ],
    },
    {
      id: 'avis', heading: '9. التقييمات والمحتوى',
      body: ['يجب أن تكون التقييمات صادقة وتخصّ منتجًا اشتريته فعلًا. يمكننا حذف أي تقييم أو منتج أو محتوى غير قانوني أو مضلّل أو مسيء.'],
    },
    {
      id: 'responsabilite', heading: '10. المسؤولية',
      items: [
        'كل بائع مسؤول عن المنتجات التي يبيعها. ChooseTounsi مسؤولة عن خدمتها: المنصّة وتنظيم الطلب والدفع عند الاستلام والإرجاع كما هو موصوف أعلاه.',
        'تقتصر مسؤوليتنا على مبلغ الطلب المعني، إلا في حالة الخطأ الجسيم أو إذا نصّ القانون على خلاف ذلك.',
        'نبذل جهدنا ليبقى الموقع متاحًا دون أن نضمن عدم انقطاعه، ولسنا مسؤولين عن التأخير الناتج عن أحداث خارجة عن إرادتنا.',
      ],
    },
    {
      id: 'donnees', heading: '11. البيانات الشخصية',
      body: ['طريقة استعمال بياناتك موضّحة في سياسة الخصوصية.'],
    },
    {
      id: 'loi', heading: '12. القانون المنطبق والاتصال',
      body: [
        'تخضع هذه الشروط للقانون التونسي. في حالة خلاف، اتصل بنا أولًا: نبحث دائمًا عن حلّ ودّي.',
        `الاتصال: ${CONTACT_EMAIL} · ${SUPPORT_GMAIL} · واتساب ${WHATSAPP_DISPLAY}. قد نعدّل هذه الشروط؛ تاريخ آخر تحديث مذكور في أعلى الصفحة.`,
      ],
    },
  ],
}

export const TERMS: Record<Locale, LegalDoc> = { fr, en, ar }
