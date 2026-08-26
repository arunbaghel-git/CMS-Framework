/**
 * Footer ke text blocks me phone aur email ko clickable banane wala helper — D-44.
 *
 * Client jo likhta hai wo **plain text** hai (`footerColumns[].textBlocks[].text`), aur
 * wahi rehna chahiye: usme HTML chalane ka matlab hota admin panel se stored XSS ka raasta
 * khol dena. Par phone number jo phone pe tap na ho, wo ek travel site ke footer me asli
 * nuksaan hai.
 *
 * Isliye link **render ke waqt** bante hain, data me kuch store nahi hota. Client ko koi
 * naya field nahi bharna padta, aur purana data bhi turant clickable ho jaata hai.
 *
 * ## Phone sirf `phone` icon wale block me
 *
 * Ye sabse zaroori shart hai. Bina iske pincode link ban jaate: reference ke apne footer
 * me "A&N Islands 744102" aur "New Delhi 110005" hain, aur koi bhi thoda dhila phone
 * regex unhe pakad leta — aur `tel:744102` jaisa toota link footer me chala jaata, bina
 * kisi error ke.
 *
 * Icon hi wo jagah hai jahan client pehle se bata chuka hai ki is block me kya hai. Uska
 * dobara istemaal karna naya field maangne se behtar hai.
 *
 * **Email ke saath ye shart nahi hai** — email ka shape (`kuch@kuch.kuch`) itna khaas hai
 * ki wo galti se kisi pate ya date me nahi milta.
 */

/** `something@domain.tld` — TLD zaroori hai, warna "@handle" bhi match ho jaata. */
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/

/**
 * Kam se kam 10 digit ka number, jisme space aur hyphen chal sakte hain.
 *
 * `[\d\s-]` me `/` **jaan-boojh kar nahi** hai: reference ka "+91 98100 66496 / 98110
 * 66496" isi se do alag link banta hai, ek lamba nahi. Wahi asli use case tha.
 *
 * `{8,}` ke dono taraf ek-ek `\d` hai, isliye match hamesha digit pe shuru aur khatam
 * hota hai — trailing space link ke andar nahi jaata.
 */
const PHONE = /\+?\d[\d\s-]{8,}\d/

/**
 * Email **pehle** hai. Alternation left-biased hai, to ek hi jagah pe dono lag sakte hon
 * to email jeetta hai — `user9810066496@x.com` jaise address ka aadha hissa phone ban kar
 * nahi tootta.
 */
const WITH_PHONE = new RegExp(`(${EMAIL.source})|(${PHONE.source})`, 'g')
const EMAIL_ONLY = new RegExp(`(${EMAIL.source})`, 'g')

/**
 * `tel:` href ke liye number saaf karta hai.
 *
 * Admin me phone padhne ke liye likha jaata hai ("+91 98100 66496"), aur wo waise ka waisa
 * `tel:` me daalne pe kai dialer usse theek se nahi kholte. Dikhne wala text original hi
 * rehta hai — sirf href saaf hota hai.
 *
 * @param {string} phone
 */
export const telHref = (phone) => 'tel:' + String(phone).replace(/[^\d+]/g, '')

/**
 * Text ko render karne laayak tukdon me todta hai.
 *
 * Har tukda ya to plain text hai (`{ text }`) ya ek link (`{ text, href }`). Component
 * inhe map kar ke `<a>` ya bare text render karta hai — yaani `dangerouslySetInnerHTML`
 * kahin nahi aata, aur wahi is design ka poora point hai.
 *
 * @param {string} text
 * @param {{ phone?: boolean }} [options] `phone: true` tabhi jab block ka icon `phone` ho
 * @returns {{ text: string, href?: string }[]}
 */
export function linkifyParts(text, { phone = false } = {}) {
  const source = String(text ?? '')
  if (!source) return []

  const parts = []
  let cursor = 0

  for (const match of source.matchAll(phone ? WITH_PHONE : EMAIL_ONLY)) {
    const [value, email] = match

    if (match.index > cursor) parts.push({ text: source.slice(cursor, match.index) })

    parts.push({ text: value, href: email ? `mailto:${value}` : telHref(value) })
    cursor = match.index + value.length
  }

  if (cursor < source.length) parts.push({ text: source.slice(cursor) })

  return parts
}
