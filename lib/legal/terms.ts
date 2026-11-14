import type { Locale } from '@/i18n/config'
import type { LegalDoc } from './types'
import { SOCIAL_HANDLE, SUPPORT_GMAIL, WHATSAPP_DISPLAY } from '@/lib/contactInfo'

// TODO(legal): plain-language text, to be reviewed against Tunisian law before it is relied on:
//   e-commerce (loi n° 2000-83), consumer protection (loi n° 92-117, legal withdrawal period),
//   personal data (loi organique n° 2004-63, INPDP), minimum age, competent court and the legal
//   identity of the operator.
// Keep it customer-facing: no provider names, technical details, internal rules or fees/rates.
// Facts it relies on (check them when the platform changes): cash on delivery only, complaints
// within 48 h of the real delivered date (Complaint::COMPLAINT_WINDOW_HOURS), 2-3 photos, exchange first,
// cash refund at pickup (amount fixed before), return fee deducted only when the buyer changes their mind,
// changed-mind exclusions per category, delivery free everywhere (included in the prices).

const UPDATED = '22/10/2026'

/** Keeps phone numbers, e-mails and handles left-to-right inside Arabic text. */
const ltr = (s: string) => `⁦${s}⁩`

const fr: LegalDoc = {
  title: 'Conditions d’utilisation',
  intro: 'Bienvenue sur ChooseTounsi ! Ces conditions expliquent simplement comment fonctionne notre plateforme, pour les acheteurs comme pour les vendeurs. En créant un compte ou en passant commande, vous les acceptez.',
  updated: `Dernière mise à jour : ${UPDATED}`,
  tocTitle: 'Sommaire',
  sections: [
    {
      id: 'chooseTounsi', heading: '1. Qu’est-ce que ChooseTounsi ?',
      body: ['ChooseTounsi est une marketplace qui met en relation des acheteurs et des vendeurs tunisiens. Nous livrons partout en Tunisie.'],
      items: [
        'Chaque boutique est responsable de ses produits : leur description, leurs photos et leur préparation.',
        'Certains produits sont vendus directement par ChooseTounsi, par exemple ceux de notre marque WearTounsi. Dans ce cas, c’est nous le vendeur.',
        'Le nom de la boutique est toujours indiqué sur la fiche du produit.',
      ],
    },
    {
      id: 'compte', heading: '2. Votre compte',
      items: [
        'Donnez des informations exactes (nom, téléphone, adresse) : elles servent à vous livrer.',
        'Gardez votre mot de passe secret. Ce qui est fait avec votre compte est de votre responsabilité.',
        'Un seul compte par personne.',
        'En cas de fraude ou d’abus, nous pouvons suspendre ou fermer un compte.',
      ],
    },
    {
      id: 'commander', heading: '3. Commander',
      items: [
        'Les prix sont affichés en dinars tunisiens (DT).',
        'Avant de confirmer, vous voyez le total de votre commande. La livraison est gratuite : elle est déjà comprise dans les prix affichés.',
        'Une fois votre commande confirmée, le vendeur la prépare et la remet à notre partenaire de livraison.',
        'Si vous commandez dans plusieurs boutiques, vous recevez un colis par boutique.',
        'Vous suivez chaque étape dans « Mes commandes » et par e-mail.',
        'Vous voulez annuler ? Contactez-nous vite, avant que le colis parte.',
      ],
    },
    {
      id: 'payer', heading: '4. Payer',
      body: [
        'Vous payez **à la livraison, en espèces, directement au livreur**. Vous ne payez rien en ligne.',
        'Si vous refusez le colis à la livraison, vous ne payez rien.',
        'D’autres moyens de paiement seront bientôt disponibles.',
      ],
    },
    {
      id: 'livraison', heading: '5. Livraison',
      items: [
        'Nous livrons partout en Tunisie, à l’adresse indiquée dans votre commande.',
        'La livraison est gratuite partout en Tunisie. Aucun frais de livraison n’est ajouté au prix affiché.',
        'Restez joignable : le livreur peut vous appeler.',
        'Vous recevez un message quand le colis part et quand il est livré.',
        'Les délais sont donnés à titre indicatif.',
      ],
    },
    {
      id: 'reclamations', heading: '6. Échanges, retours et remboursements',
      body: [
        '**Échange facile sous 48h.** Remboursement si le produit est défectueux, non conforme ou si l’échange est impossible.',
      ],
      items: [
        '**L’échange est toujours proposé en premier.** Le remboursement n’est proposé qu’ensuite, quand le motif le permet.',
        '**La taille ne me va pas** : échange. Remboursement uniquement si l’échange est impossible (article en rupture de stock). Les frais de l’échange sont à votre charge, payés au livreur.',
        '**Article défectueux, endommagé, mauvais article ou non conforme à la description** : échange ou remboursement, sans aucun frais pour vous.',
        '**J’ai changé d’avis** : échange, ou remboursement si l’article est neuf, non porté et avec ses étiquettes. Pour un échange, les frais de l’échange sont à votre charge, payés au livreur. Pour un remboursement, les frais de retour sont déduits du remboursement ; leur montant exact est affiché avant l’envoi de la demande.',
        '**Pas de retour pour changement d’avis** (hygiène et nature du produit) : sous-vêtements et lingerie, maillots de bain, cosmétiques et beauté, hygiène intime, produits alimentaires, articles personnalisés. Pour ces produits, l’échange ou le remboursement n’est possible que s’ils sont défectueux ou non conformes.',
      ],
      steps: [
        '**Allez dans « Mes réclamations »** (ou « Aide / Réclamation ») dans les **48 heures après la livraison de votre colis** (date de livraison réelle indiquée par notre transporteur).',
        '**Choisissez les articles concernés** et le motif.',
        '**Ajoutez 2 à 3 photos** de l’article, pour tous les motifs, et décrivez le problème.',
        '**Le vendeur examine vos photos** et accepte la demande ; notre équipe la valide. S’il refuse, notre équipe réexamine votre demande.',
        '**Un livreur vient récupérer l’article** (ou apporte le nouvel article et reprend l’ancien, en cas d’échange).',
        '**Vous êtes remboursé en espèces par le livreur**, au moment où il récupère l’article. Le montant est calculé et affiché avant l’envoi de la demande, puis fixé avant l’enlèvement : c’est exactement la somme que le livreur vous remet.',
      ],
      after: [
        'Si l’échange est impossible (rupture de stock, ou la boutique nous le signale), le remboursement vous est proposé en un clic.',
        'Quand l’article arrive chez la boutique, elle le contrôle. S’il n’est pas conforme à ce que vous avez décrit, notre équipe examine les photos et décide au cas par cas. Si l’article vous est renvoyé, il est livré en paiement à la livraison : le livreur vous demande le remboursement déjà reçu plus les frais de livraison. Si vous refusez le colis, l’article retourne chez la boutique.',
        'Un même article ne peut pas être retourné deux fois. Le détail complet est sur la page « Échange et remboursement ».',
      ],
    },
    {
      id: 'devenir-vendeur', heading: '7. Devenir vendeur',
      body: ['C’est gratuit et simple. Connectez-vous (ou créez un compte), puis cliquez sur **« Devenir vendeur »** sur la page d’accueil. Votre demande se fait en 3 étapes :'],
      steps: [
        '**Votre activité** : nom, téléphone, nom de la boutique, jusqu’à 5 catégories, gamme de prix (facultatif).',
        '**Localisation** : adresse exacte de votre local, zone, point exact sur la carte, personne à contacter, code postal.',
        '**Photos et description** : photo de profil, 1 à 5 photos de produits, description et réseaux sociaux (facultatifs).',
      ],
      after: [
        '**L’équipe ChooseTounsi vérifie chaque demande** avant d’ouvrir la boutique. Une fois votre demande acceptée, vous accédez à votre **Espace vendeur**.',
        'Des formules d’abonnement et une commission sur les ventes existent. Tous les détails sont affichés dans votre Espace vendeur.',
      ],
      note: '⚠️ Votre adresse et votre point sur la carte doivent être exacts : c’est là que le livreur vient chercher vos colis. Une mauvaise adresse retarde vos commandes.',
    },
    {
      id: 'engagements', heading: '8. Les engagements des vendeurs',
      body: ['En tant que vendeur, vous vous engagez à :'],
      items: [
        'vendre des produits authentiques, conformes à leurs photos et à leur description ;',
        'afficher le bon prix et garder votre stock à jour ;',
        'préparer vos commandes à temps et les remettre au livreur ;',
        'garder votre adresse de retrait à jour ;',
        'traiter les réclamations de vos clients honnêtement et accepter les retours justifiés ;',
        'respecter vos obligations de commerçant.',
      ],
      after: ['Chaque produit est vérifié par notre équipe avant d’être publié.'],
    },
    {
      id: 'interdit', heading: '9. Ce qui est interdit',
      items: [
        'Vendre des produits illégaux, dangereux ou contrefaits.',
        'Publier de faux avis ou de fausses réclamations.',
        'Donner de fausses informations (identité, adresse, produit).',
        'Toute fraude ou tentative de tromper un acheteur, un vendeur ou ChooseTounsi.',
      ],
      after: ['Nous pouvons retirer un produit ou un contenu, et suspendre le compte concerné.'],
    },
    {
      id: 'avis', heading: '10. Avis et contenus publiés',
      items: [
        'Vos avis doivent être honnêtes et porter sur un produit que vous avez vraiment acheté.',
        'Restez respectueux : pas d’insultes ni de contenu choquant.',
        'Nous pouvons retirer un avis, une photo ou un texte trompeur, injurieux ou illégal.',
      ],
      after: ['Nous pouvons modifier ces conditions. La date de la dernière mise à jour est toujours indiquée en haut de la page.'],
    },
    {
      id: 'contact', heading: '11. Nous contacter',
      body: ['Une question ? Nous sommes là pour vous aider :'],
      items: [
        'Page **Contact**',
        `WhatsApp : **${WHATSAPP_DISPLAY}**`,
        `E-mail : **${SUPPORT_GMAIL}**`,
        `Instagram et TikTok : **${SOCIAL_HANDLE}**`,
      ],
      after: ['En cas de désaccord, contactez-nous d’abord : nous cherchons toujours une solution à l’amiable.'],
    },
  ],
}

const en: LegalDoc = {
  title: 'Terms of Use',
  intro: 'Welcome to ChooseTounsi! These terms explain, in simple words, how our platform works for buyers and sellers. By creating an account or placing an order, you accept them.',
  updated: `Last updated: ${UPDATED}`,
  tocTitle: 'Contents',
  sections: [
    {
      id: 'chooseTounsi', heading: '1. What is ChooseTounsi?',
      body: ['ChooseTounsi is a marketplace that connects buyers with Tunisian sellers. We deliver all over Tunisia.'],
      items: [
        'Each shop is responsible for its own products: their description, photos and preparation.',
        'Some products are sold directly by ChooseTounsi, for example our WearTounsi brand. In that case, we are the seller.',
        'The shop’s name is always shown on the product page.',
      ],
    },
    {
      id: 'compte', heading: '2. Your account',
      items: [
        'Give accurate details (name, phone, address): we use them to deliver to you.',
        'Keep your password secret. You are responsible for what is done with your account.',
        'One account per person.',
        'In case of fraud or abuse, we may suspend or close an account.',
      ],
    },
    {
      id: 'commander', heading: '3. Ordering',
      items: [
        'Prices are shown in Tunisian dinars (DT).',
        'Before you confirm, you see your order total. Delivery is free: it is already included in the displayed prices.',
        'Once your order is confirmed, the seller prepares it and hands it to our delivery partner.',
        'If you order from several shops, you get one parcel per shop.',
        'You can follow every step in “My orders” and by e-mail.',
        'Want to cancel? Contact us quickly, before the parcel leaves.',
      ],
    },
    {
      id: 'payer', heading: '4. Paying',
      body: [
        'You pay **on delivery, in cash, directly to the courier**. You pay nothing online.',
        'If you refuse the parcel at delivery, you pay nothing.',
        'Other payment methods are coming soon.',
      ],
    },
    {
      id: 'livraison', heading: '5. Delivery',
      items: [
        'We deliver all over Tunisia, to the address given in your order.',
        'Delivery is free all over Tunisia. No delivery fee is added to the displayed price.',
        'Keep your phone close: the courier may call you.',
        'You get a message when your parcel leaves and when it is delivered.',
        'Delivery times are an estimate.',
      ],
    },
    {
      id: 'reclamations', heading: '6. Exchanges, returns and refunds',
      body: [
        '**Easy exchange within 48h.** Refund if the product is defective, not as described, or if the exchange is impossible.',
      ],
      items: [
        '**An exchange is always offered first.** A refund is offered second, when the reason allows it.',
        '**The size doesn’t fit**: exchange. A refund is only possible if the exchange is impossible (item out of stock). The exchange delivery is at your expense, paid to the courier.',
        '**Defective, damaged, wrong item or not as described**: exchange or refund, at no cost to you.',
        '**I changed my mind**: exchange, or a refund if the item is new, unworn and still has its tags. For an exchange, the exchange delivery is at your expense, paid to the courier. For a refund, the return fee is deducted from the refund; the exact amount is shown before you send the request.',
        '**No “changed my mind” returns** (hygiene and product nature): underwear and lingerie, swimwear, cosmetics and beauty, intimate hygiene, food, personalised items. For these, exchange or refund is only possible if the product is defective or not as described.',
      ],
      steps: [
        '**Go to “My complaints”** (or “Help / Complaint”) within **48 hours of your parcel’s delivery** (the real delivery date given by our carrier).',
        '**Choose the items concerned** and the reason.',
        '**Add 2 to 3 photos** of the item, for every reason, and describe the problem.',
        '**The seller reviews your photos** and accepts the request; our team validates it. If they refuse, our team looks at your request again.',
        '**A courier collects the item** (or brings the new item and takes the old one back, for an exchange).',
        '**You are refunded in cash by the courier**, when they collect the item. The amount is calculated and shown before you send the request, then fixed before the pick-up: it is exactly the sum the courier hands you.',
      ],
      after: [
        'If the exchange is impossible (out of stock, or the shop tells us), a refund is offered in one click.',
        'When the item reaches the shop, the shop checks it. If it is not as you described, our team reviews the photos and decides case by case. If the item is sent back to you, it is delivered cash on delivery: the courier asks for the refund you already received plus the delivery fee. If you refuse the parcel, the item goes back to the shop.',
        'The same item cannot be returned twice. The full details are on the “Exchange and refund” page.',
      ],
    },
    {
      id: 'devenir-vendeur', heading: '7. Becoming a seller',
      body: ['It is free and simple. Log in (or create an account), then click **“Become a vendor”** on the home page. Your application takes 3 steps:'],
      steps: [
        '**Your business**: name, phone, shop name, up to 5 categories, price range (optional).',
        '**Location**: exact address of your premises, area, exact point on the map, contact person, postal code.',
        '**Photos and description**: profile photo, 1 to 5 product photos, description and social media (optional).',
      ],
      after: [
        '**The ChooseTounsi team checks every application** before opening the shop. Once you are accepted, you get access to your **Seller space**.',
        'Subscription plans and a commission on sales exist. All the details are shown in your Seller space.',
      ],
      note: '⚠️ Your address and map point must be exact: that is where the courier picks up your parcels. A wrong address delays your orders.',
    },
    {
      id: 'engagements', heading: '8. What sellers commit to',
      body: ['As a seller, you commit to:'],
      items: [
        'sell authentic products that match their photos and description;',
        'show the right price and keep your stock up to date;',
        'prepare your orders on time and hand them to the courier;',
        'keep your pickup address up to date;',
        'handle your customers’ complaints honestly and accept justified returns;',
        'meet your obligations as a trader.',
      ],
      after: ['Every product is checked by our team before it is published.'],
    },
    {
      id: 'interdit', heading: '9. What is not allowed',
      items: [
        'Selling illegal, dangerous or counterfeit products.',
        'Posting fake reviews or fake complaints.',
        'Giving false information (identity, address, product).',
        'Any fraud or attempt to deceive a buyer, a seller or ChooseTounsi.',
      ],
      after: ['We may remove a product or content and suspend the account concerned.'],
    },
    {
      id: 'avis', heading: '10. Reviews and published content',
      items: [
        'Your reviews must be honest and about a product you really bought.',
        'Stay respectful: no insults or shocking content.',
        'We may remove a misleading, abusive or illegal review, photo or text.',
      ],
      after: ['We may update these terms. The date of the last update is always shown at the top of the page.'],
    },
    {
      id: 'contact', heading: '11. Contact us',
      body: ['A question? We are here to help:'],
      items: [
        '**Contact** page',
        `WhatsApp: **${WHATSAPP_DISPLAY}**`,
        `E-mail: **${SUPPORT_GMAIL}**`,
        `Instagram and TikTok: **${SOCIAL_HANDLE}**`,
      ],
      after: ['If you disagree with something, contact us first: we always look for a friendly solution.'],
    },
  ],
}

const ar: LegalDoc = {
  title: 'شروط الاستخدام',
  intro: 'مرحبًا بك في ChooseTounsi! تشرح هذه الشروط بكلمات بسيطة كيف تعمل منصّتنا، للمشترين وللبائعين. بإنشاء حساب أو تقديم طلب، فأنت توافق عليها.',
  updated: `آخر تحديث: ${UPDATED}`,
  tocTitle: 'المحتويات',
  sections: [
    {
      id: 'chooseTounsi', heading: '1. ما هي ChooseTounsi؟',
      body: ['ChooseTounsi منصّة بيع تربط المشترين بالبائعين التونسيين. نوصّل إلى كامل تراب الجمهورية.'],
      items: [
        'كل متجر مسؤول عن منتجاته: وصفها وصورها وتحضيرها.',
        'بعض المنتجات تبيعها ChooseTounsi مباشرة، مثل منتجات علامتنا WearTounsi. في هذه الحالة، نحن البائع.',
        'اسم المتجر مذكور دائمًا في صفحة المنتج.',
      ],
    },
    {
      id: 'compte', heading: '2. حسابك',
      items: [
        'قدّم معلومات صحيحة (الاسم، الهاتف، العنوان): نستعملها لتوصيل طلباتك.',
        'احتفظ بكلمة السرّ لنفسك. أنت مسؤول عن كل ما يتمّ بحسابك.',
        'حساب واحد لكل شخص.',
        'في حالة الاحتيال أو التجاوز، يمكننا تعليق الحساب أو غلقه.',
      ],
    },
    {
      id: 'commander', heading: '3. الطلب',
      items: [
        'الأسعار معروضة بالدينار التونسي (DT).',
        'قبل التأكيد، ترى المبلغ الجملي لطلبك. التوصيل مجاني: فهو مشمول مسبقًا في الأسعار المعروضة.',
        'بعد تأكيد طلبك، يحضّره البائع ويسلّمه إلى شريك التوصيل.',
        'إذا طلبت من عدّة متاجر، تتسلّم طردًا من كل متجر.',
        'تتابع كل مرحلة في «طلباتي» وعبر البريد الإلكتروني.',
        'تريد الإلغاء؟ اتصل بنا بسرعة، قبل خروج الطرد.',
      ],
    },
    {
      id: 'payer', heading: '4. الدفع',
      body: [
        'تدفع **عند الاستلام، نقدًا، مباشرة لعون التوصيل**. لا تدفع أي شيء عبر الإنترنت.',
        'إذا رفضت الطرد عند التوصيل، فلا تدفع شيئًا.',
        'طرق دفع أخرى ستكون متوفّرة قريبًا.',
      ],
    },
    {
      id: 'livraison', heading: '5. التوصيل',
      items: [
        'نوصّل إلى كامل تراب الجمهورية، إلى العنوان المذكور في طلبك.',
        'التوصيل مجاني في كامل أنحاء تونس. لا تُضاف أي مصاريف توصيل إلى السعر المعروض.',
        'ابقَ متاحًا على هاتفك: قد يتصل بك عون التوصيل.',
        'تصلك رسالة عند خروج الطرد وعند توصيله.',
        'آجال التوصيل تقريبية.',
      ],
    },
    {
      id: 'reclamations', heading: '6. الاستبدال والإرجاع والاسترجاع',
      body: [
        '**استبدال سهل خلال 48 ساعة.** استرجاع المبلغ إذا كان المنتج معيبًا أو غير مطابق أو إذا تعذّر الاستبدال.',
      ],
      items: [
        '**الاستبدال يُقترح دائمًا أولًا.** ويُقترح الاسترجاع ثانيًا عندما يسمح السبب بذلك.',
        '**المقاس لا يناسبني**: استبدال. لا يمكن الاسترجاع إلا إذا تعذّر الاستبدال (نفاد المخزون). تكلفة توصيل الاستبدال عليك وتُدفع للموزّع.',
        '**منتج معيب أو متضرر أو خاطئ أو غير مطابق للوصف**: استبدال أو استرجاع دون أي تكلفة عليك.',
        '**غيّرت رأيي**: استبدال، أو استرجاع إذا كان المنتج جديدًا وغير مستعمل وبه بطاقاته. في حالة الاستبدال، تكلفة توصيل الاستبدال عليك وتُدفع للموزّع. وفي حالة الاسترجاع، تُخصم مصاريف الإرجاع من المبلغ المسترجع، ويُعرض المبلغ الدقيق قبل إرسال الطلب.',
        '**لا إرجاع بسبب تغيير الرأي** (لأسباب النظافة وطبيعة المنتج): الملابس الداخلية، ملابس السباحة، مستحضرات التجميل، النظافة الحميمة، المواد الغذائية، المنتجات المخصصة. في هذه المنتجات لا يكون الاستبدال أو الاسترجاع ممكنًا إلا إذا كان المنتج معيبًا أو غير مطابق.',
      ],
      steps: [
        '**ادخل إلى «شكاواي»** (أو «مساعدة / شكوى») في أجل **48 ساعة بعد تسليم طردك** (تاريخ التسليم الفعلي الذي يحدده شريك التوصيل).',
        '**اختر المنتجات المعنية** والسبب.',
        '**أضف من صورتين إلى 3 صور** للمنتج، مهما كان السبب، واشرح المشكلة.',
        '**يراجع البائع صورك** ويقبل الطلب، ثم يصادق عليه فريقنا. إذا رفض، يعيد فريقنا دراسة طلبك.',
        '**يأتي عون توصيل لاستلام المنتج** (أو يحضر المنتج الجديد ويستلم القديم في حالة الاستبدال).',
        '**تسترجع أموالك نقدًا من عون التوصيل** عند استلامه للمنتج. يُحسب المبلغ ويُعرض قبل إرسال الطلب، ثم يُحدَّد قبل الاستلام: هو بالضبط المبلغ الذي يسلّمه لك عون التوصيل.',
      ],
      after: [
        'إذا تعذّر الاستبدال (نفاد المخزون، أو أبلغنا المتجر بذلك)، يُقترح عليك الاسترجاع بنقرة واحدة.',
        'عند وصول المنتج إلى المتجر، يفحصه المتجر. إن لم يكن مطابقًا لما وصفته، يراجع فريقنا الصور ويقرر حالة بحالة. وإذا أُعيد المنتج إليك، يُسلَّم مقابل الدفع نقدًا عند الاستلام: يطلب منك عون التوصيل المبلغ الذي استرجعته مسبقًا مضافًا إليه تكلفة التوصيل. وإذا رفضت الطرد، يعود المنتج إلى المتجر.',
        'لا يمكن إرجاع المنتج نفسه مرتين. التفاصيل الكاملة في صفحة «الاستبدال والاسترجاع».',
      ],
    },
    {
      id: 'devenir-vendeur', heading: '7. كيف تصبح بائعًا',
      body: ['الأمر مجاني وبسيط. سجّل دخولك (أو أنشئ حسابًا)، ثم اضغط على **«كن بائعاً»** في الصفحة الرئيسية. يتمّ طلبك في 3 مراحل:'],
      steps: [
        '**نشاطك**: الاسم، الهاتف، اسم المتجر، حتى 5 أصناف، مجال الأسعار (اختياري).',
        '**الموقع**: العنوان الدقيق لمحلّك، المنطقة، النقطة الدقيقة على الخريطة، الشخص الذي نتصل به، الرمز البريدي.',
        '**الصور والوصف**: صورة الملف الشخصي، من 1 إلى 5 صور للمنتجات، وصف وحسابات التواصل الاجتماعي (اختيارية).',
      ],
      after: [
        '**يراجع فريق ChooseTounsi كل طلب** قبل فتح المتجر. بعد قبول طلبك، تدخل إلى **فضاء البائع**.',
        'توجد اشتراكات وعمولة على المبيعات. كل التفاصيل معروضة في فضاء البائع.',
      ],
      note: '⚠️ يجب أن يكون عنوانك ونقطتك على الخريطة دقيقين: هناك يأتي عون التوصيل لأخذ طرودك. العنوان الخاطئ يؤخّر طلباتك.',
    },
    {
      id: 'engagements', heading: '8. التزامات البائعين',
      body: ['بصفتك بائعًا، تلتزم بـ:'],
      items: [
        'بيع منتجات أصلية مطابقة لصورها ووصفها؛',
        'عرض السعر الصحيح وتحيين مخزونك؛',
        'تحضير طلباتك في الوقت وتسليمها لعون التوصيل؛',
        'تحيين عنوان استلام الطرود؛',
        'معالجة شكاوى حرفائك بنزاهة وقبول الإرجاعات المبرّرة؛',
        'احترام التزاماتك كتاجر.',
      ],
      after: ['يراجع فريقنا كل منتج قبل نشره.'],
    },
    {
      id: 'interdit', heading: '9. الممنوعات',
      items: [
        'بيع منتجات غير قانونية أو خطيرة أو مقلّدة.',
        'نشر تقييمات مزيّفة أو شكاوى كاذبة.',
        'تقديم معلومات خاطئة (الهوية، العنوان، المنتج).',
        'كل احتيال أو محاولة لخداع مشترٍ أو بائع أو ChooseTounsi.',
      ],
      after: ['يمكننا حذف منتج أو محتوى وتعليق الحساب المعني.'],
    },
    {
      id: 'avis', heading: '10. التقييمات والمحتوى المنشور',
      items: [
        'يجب أن تكون تقييماتك صادقة وتخصّ منتجًا اشتريته فعلًا.',
        'حافظ على الاحترام: لا شتائم ولا محتوى صادم.',
        'يمكننا حذف تقييم أو صورة أو نصّ مضلّل أو مسيء أو غير قانوني.',
      ],
      after: ['قد نعدّل هذه الشروط. تاريخ آخر تحديث مذكور دائمًا في أعلى الصفحة.'],
    },
    {
      id: 'contact', heading: '11. اتصل بنا',
      body: ['عندك سؤال؟ نحن هنا لمساعدتك:'],
      items: [
        'صفحة **الاتصال**',
        `واتساب: **${ltr(WHATSAPP_DISPLAY)}**`,
        `البريد الإلكتروني: **${ltr(SUPPORT_GMAIL)}**`,
        `إنستغرام وتيك توك: **${ltr(SOCIAL_HANDLE)}**`,
      ],
      after: ['في حالة خلاف، اتصل بنا أوّلًا: نبحث دائمًا عن حلّ ودّي.'],
    },
  ],
}

export const TERMS: Record<Locale, LegalDoc> = { fr, en, ar }
