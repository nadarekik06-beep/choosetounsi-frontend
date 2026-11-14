import type { Locale } from '@/i18n/config'
import type { LegalDoc } from './types'
import { SUPPORT_GMAIL, WHATSAPP_DISPLAY } from '@/lib/contactInfo'

// Customer-facing page of the exchange-first policy (backend: App\Services\Returns\ReturnPolicy).
// Facts it relies on (check them when the platform changes): 48 h from the real delivered date,
// 2 to 3 photos for every reason, refund in cash by the courier at pick-up, amount fixed before
// the pick-up, inspection by the shop afterwards, "changed my mind" excluded for some categories.
// No fee amounts here: the form shows the exact amounts before the request is sent.

const UPDATED = '14/11/2026'

/** Keeps phone numbers and e-mails left-to-right inside Arabic text. */
const ltr = (s: string) => `⁦${s}⁩`

const fr: LegalDoc = {
  title: 'Politique d’échange et de remboursement',
  intro: 'Échange facile sous 48h. Remboursement si le produit est défectueux, non conforme ou si l’échange est impossible.',
  updated: `Dernière mise à jour : ${UPDATED}`,
  tocTitle: 'Sommaire',
  sections: [
    {
      id: 'delai', heading: '1. Combien de temps ai-je ?',
      body: ['Vous avez **48 heures après la livraison de votre colis** pour faire une demande d’échange ou de remboursement. Le délai est compté à partir de la date réelle de livraison indiquée par notre transporteur, colis par colis.'],
      note: 'Passé ce délai, le bouton de réclamation est fermé et la date de fin du délai vous est indiquée.',
    },
    {
      id: 'motifs', heading: '2. Ce qui est possible selon le motif',
      body: ['L’**échange est toujours proposé en premier**. Le remboursement est proposé en second, quand le motif le permet.'],
      items: [
        '**La taille ne me va pas** : échange. Le remboursement n’est possible que si l’échange est impossible (article en rupture). Les frais de l’échange sont payés par vous au livreur.',
        '**Article défectueux ou endommagé** : échange ou remboursement. Vous ne payez aucun frais : la boutique prend l’enlèvement à sa charge.',
        '**Mauvais article ou non conforme à la description** : échange ou remboursement, sans frais pour vous.',
        '**J’ai changé d’avis** : échange, ou remboursement si l’article est neuf, non porté et avec ses étiquettes. Les frais de retour sont déduits de votre remboursement, et le montant exact vous est montré avant l’envoi de la demande.',
      ],
    },
    {
      id: 'photos', heading: '3. Les photos',
      body: ['Pour **toute demande**, ajoutez **2 à 3 photos** de l’article. La boutique les examine et accepte la demande avant que l’enlèvement soit organisé.'],
    },
    {
      id: 'impossible', heading: '4. Et si l’échange est impossible ?',
      body: ['Si l’article n’existe plus dans la taille ou la couleur voulue, le remboursement vous est proposé automatiquement. La boutique peut aussi nous signaler qu’un échange est impossible : vous êtes prévenu(e) et vous pouvez passer au remboursement en un clic.'],
    },
    {
      id: 'remboursement', heading: '5. Comment suis-je remboursé(e) ?',
      items: [
        'Le remboursement se fait **en espèces, par le livreur, au moment où il récupère l’article chez vous**.',
        'Son **montant est calculé et fixé avant l’enlèvement** : c’est exactement la somme que le livreur vous remet.',
        'Seule la partie des articles retournés vous est remboursée : si vous gardez d’autres articles, le total de la commande est recalculé comme si les articles retournés n’avaient jamais été commandés.',
      ],
    },
    {
      id: 'controle', heading: '6. Le contrôle de l’article retourné',
      body: ['Quand l’article arrive chez la boutique, elle vérifie qu’il est conforme. Si ce n’est pas le cas, notre équipe examine les photos et décide au cas par cas. Si l’article vous est renvoyé, le colis est livré contre remboursement en espèces : le livreur vous demande le montant du remboursement que vous avez déjà reçu, plus les frais de livraison, et vous pouvez voir les photos et le motif depuis le suivi de votre demande. Si vous refusez le colis, l’article retourne chez la boutique et notre équipe décide de nouveau.'],
    },
    {
      id: 'exclusions', heading: '7. Articles non repris en cas de changement d’avis',
      body: ['Pour des raisons d’hygiène ou de nature du produit, le retour « j’ai changé d’avis » n’est pas possible pour certaines catégories : sous-vêtements et lingerie, maillots de bain, cosmétiques et beauté, hygiène intime, produits alimentaires, articles personnalisés. L’échange ou le remboursement reste possible si le produit est défectueux ou non conforme.'],
    },
    {
      id: 'aide', heading: '8. Besoin d’aide ?',
      body: [`Écrivez-nous sur WhatsApp (${WHATSAPP_DISPLAY}) ou à ${SUPPORT_GMAIL}, ou ouvrez le chat d’assistance du site.`],
    },
  ],
}

const en: LegalDoc = {
  title: 'Exchange and refund policy',
  intro: 'Easy exchange within 48h. Refund if the product is defective, not as described, or if the exchange is impossible.',
  updated: `Last updated: ${UPDATED}`,
  tocTitle: 'Contents',
  sections: [
    {
      id: 'delai', heading: '1. How long do I have?',
      body: ['You have **48 hours after your parcel is delivered** to ask for an exchange or a refund. The time is counted from the real delivery date given by our carrier, parcel by parcel.'],
      note: 'After that, the complaint button is closed and you are told when the deadline ended.',
    },
    {
      id: 'motifs', heading: '2. What is possible, depending on the reason',
      body: ['An **exchange is always offered first**. A refund is offered second, when the reason allows it.'],
      items: [
        '**The size doesn’t fit**: exchange. A refund is only possible if the exchange is impossible (item out of stock). The exchange delivery is paid by you to the courier.',
        '**Defective or damaged item**: exchange or refund. You pay nothing: the shop covers the pick-up.',
        '**Wrong item or not as described**: exchange or refund, at no cost to you.',
        '**I changed my mind**: exchange, or a refund if the item is new, unworn and still has its tags. The return fee is deducted from your refund, and the exact amount is shown before you send the request.',
      ],
    },
    {
      id: 'photos', heading: '3. Photos',
      body: ['For **every request**, add **2 to 3 photos** of the item. The shop reviews them and accepts the request before the pick-up is organised.'],
    },
    {
      id: 'impossible', heading: '4. What if the exchange is impossible?',
      body: ['If the item no longer exists in the size or colour you want, a refund is offered to you automatically. The shop can also tell us an exchange is impossible: you are notified and can switch to a refund in one click.'],
    },
    {
      id: 'remboursement', heading: '5. How am I refunded?',
      items: [
        'The refund is made **in cash, by the courier, when he collects the item from you**.',
        'Its **amount is calculated and fixed before the pick-up**: it is exactly the sum the courier hands you.',
        'Only the returned items are refunded: if you keep other items, the order total is recalculated as if the returned items had never been ordered.',
      ],
    },
    {
      id: 'controle', heading: '6. Checking the returned item',
      body: ['When the item reaches the shop, the shop checks that it is in order. If it is not, our team reviews the photos and decides case by case. If the item is sent back to you, the parcel is delivered cash on delivery: the courier asks for the refund you already received plus the delivery fee, and you can see the photos and the reason from your request tracking. If you refuse the parcel, the item goes back to the shop and our team decides again.'],
    },
    {
      id: 'exclusions', heading: '7. Items not taken back when you change your mind',
      body: ['For hygiene or product reasons, "I changed my mind" returns are not possible for some categories: underwear and lingerie, swimwear, cosmetics and beauty, intimate hygiene, food, personalised items. Exchange or refund remains possible if the product is defective or not as described.'],
    },
    {
      id: 'aide', heading: '8. Need help?',
      body: [`Write to us on WhatsApp (${WHATSAPP_DISPLAY}) or at ${SUPPORT_GMAIL}, or open the support chat on the site.`],
    },
  ],
}

const ar: LegalDoc = {
  title: 'سياسة الاستبدال والاسترجاع',
  intro: 'استبدال سهل خلال 48 ساعة. استرجاع المبلغ إذا كان المنتج معيبًا أو غير مطابق أو إذا تعذّر الاستبدال.',
  updated: `آخر تحديث: ${UPDATED}`,
  tocTitle: 'المحتويات',
  sections: [
    {
      id: 'delai', heading: '1. كم من الوقت لدي؟',
      body: ['لديك **48 ساعة بعد تسليم طردك** لطلب الاستبدال أو استرجاع المبلغ. تُحسب المهلة من تاريخ التسليم الفعلي الذي يحدده شريك التوصيل، طردًا بطرد.'],
      note: 'بعد انتهاء المهلة يُغلق زر الشكوى ويُعلمك الموقع بتاريخ انتهائها.',
    },
    {
      id: 'motifs', heading: '2. ما هو الممكن حسب السبب',
      body: ['**الاستبدال يُقترح دائمًا أولًا**. ويُقترح استرجاع المبلغ ثانيًا عندما يسمح السبب بذلك.'],
      items: [
        '**المقاس لا يناسبني**: استبدال. لا يمكن استرجاع المبلغ إلا إذا تعذّر الاستبدال (نفاد المخزون). تدفع أنت تكلفة توصيل الاستبدال للموزّع.',
        '**منتج معيب أو متضرر**: استبدال أو استرجاع. لا تدفع أي شيء: يتحمل المتجر تكلفة الاستلام.',
        '**منتج خاطئ أو غير مطابق للوصف**: استبدال أو استرجاع دون أي تكلفة عليك.',
        '**غيّرت رأيي**: استبدال، أو استرجاع إذا كان المنتج جديدًا وغير مستعمل وبه بطاقاته. تُخصم تكلفة الإرجاع من المبلغ المسترجع، ويُعرض عليك المبلغ الدقيق قبل إرسال الطلب.',
      ],
    },
    {
      id: 'photos', heading: '3. الصور',
      body: ['لكل **طلب**، أضف **من صورتين إلى 3 صور** للمنتج. يراجعها المتجر ويقبل الطلب قبل تنظيم الاستلام.'],
    },
    {
      id: 'impossible', heading: '4. وإذا تعذّر الاستبدال؟',
      body: ['إذا لم يعد المنتج متوفرًا بالمقاس أو اللون المطلوب، نقترح عليك استرجاع المبلغ تلقائيًا. ويمكن للمتجر أيضًا إبلاغنا بأن الاستبدال غير ممكن: يصلك إشعار ويمكنك التحويل إلى الاسترجاع بنقرة واحدة.'],
    },
    {
      id: 'remboursement', heading: '5. كيف أسترجع مبلغي؟',
      items: [
        'يتم الاسترجاع **نقدًا عن طريق الموزّع، عند استلامه المنتج منك**.',
        '**يُحسب المبلغ ويُحدَّد قبل الاستلام**: هو بالضبط المبلغ الذي يسلّمه لك الموزّع.',
        'تُسترجع فقط قيمة المنتجات المُرجَعة: إذا احتفظت بمنتجات أخرى، يُعاد حساب مجموع الطلب كما لو أن المنتجات المُرجَعة لم تُطلب أبدًا.',
      ],
    },
    {
      id: 'controle', heading: '6. فحص المنتج المُرجَع',
      body: ['عند وصول المنتج إلى المتجر، يتحقق من مطابقته. إن لم يكن مطابقًا، يراجع فريقنا الصور ويقرر حالة بحالة. وإذا أُعيد المنتج إليك، يُسلَّم الطرد مقابل الدفع نقدًا عند الاستلام: يطلب منك الموزّع المبلغ الذي استرجعته مسبقًا مضافًا إليه تكلفة التوصيل، ويمكنك الاطلاع على الصور والسبب من صفحة تتبع طلبك. وإذا رفضت الطرد، يعود المنتج إلى المتجر ويقرر فريقنا من جديد.'],
    },
    {
      id: 'exclusions', heading: '7. منتجات لا تُقبل عند تغيير الرأي',
      body: ['لأسباب تتعلق بالنظافة أو بطبيعة المنتج، لا يمكن الإرجاع بسبب «غيّرت رأيي» في بعض الفئات: الملابس الداخلية، ملابس السباحة، مستحضرات التجميل، النظافة الحميمة، المواد الغذائية، المنتجات المخصصة. يبقى الاستبدال أو الاسترجاع ممكنًا إذا كان المنتج معيبًا أو غير مطابق.'],
    },
    {
      id: 'aide', heading: '8. هل تحتاج مساعدة؟',
      body: [`راسلنا على واتساب (${ltr(WHATSAPP_DISPLAY)}) أو على ${ltr(SUPPORT_GMAIL)}، أو افتح محادثة الدعم في الموقع.`],
    },
  ],
}

export const RETURNS_POLICY: Record<Locale, LegalDoc> = { fr, en, ar }
