/**
 * `enquiries.notes[]` hata do — client ka faisla (3 Sep).
 *
 * Internal notes ka panel usi din subah bana tha (migration 018) aur usi din client ne use
 * hata diya: _"inside enquiry detail there should be only status dropdown, i dont need quick
 * actions, Activity & Notes, Send Quotation"_.
 *
 * Field, API aur uske test sab hat chuke hain — ye migration purane documents se wo khaana
 * bhi utha deti hai. Client ne saaf kaha "poora hata do, field bhi".
 *
 * ⚠️ Ye D-54 (`availability`) se **ulta** faisla hai, aur wajah maayne rakhti hai: wahan field
 * me asli data baith chuka tha, isliye use Mongo me chhod diya gaya tha. Yahan notes kabhi
 * kisi ne likhe hi nahi the — 018 ne sirf khaali `[]` daala tha. Khaali khaane ko rakhna
 * agle developer ke liye ek jhoothi ummeed chhodna hai ("ye kis kaam ka hai?").
 */

export async function up({ db }) {
  await db
    .collection('enquiries')
    .updateMany({ notes: { $exists: true } }, { $unset: { notes: '' } })
}

export async function down() {
  /**
   * Wapas nahi laaya ja sakta, aur laane ki zaroorat bhi nahi.
   *
   * `notes: []` khaali tha — use dobara daalne se kuch nahi milta. Agar kabhi ye feature
   * wapas aaya, to wo apne migration ke saath aayega, is `down()` se nahi.
   */
}
