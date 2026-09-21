/**
 * Meals free text, aur din ka `note` khatam — client ka faisla, 21 Sep (D-104).
 *
 * ## Do badlaav, ek hi jagah
 *
 * Dono `entries.fields.itinerary[]` ke andar hain aur dono ek hi cursor se ho jaate hain. Alag
 * migration likhne ka matlab hota har entry pe do write, bina kisi faayde ke.
 *
 * ```
 *   meals: ['breakfast', 'dinner']   →  ['Breakfast', 'Dinner']
 *   note:  'Approx. 4 hrs …'         →  (hata diya)
 * ```
 *
 * ## `meals` — enum se naam
 *
 * Purane teen values **code** the (`breakfast`), aur theme unhe `MEAL_LABEL` se dikhne wale
 * naam me badalti thi. Ab wahan jo likha hai wahi chhapta hai, to lowercase chhod dene ka
 * matlab hota har purane package pe chip `breakfast, dinner included` — chhote akshar me.
 * Isliye yahan wahi naksha lagaya ja raha hai jo theme lagati thi.
 *
 * ⚠️ **Sirf teen jaane-maane code badalte hain.** Jo pehle se kuch aur ho (koi haath se likhi
 * value) use chhua nahi jaata — migration ka kaam purana contract naye me laana hai, client
 * ka text theek karna nahi.
 *
 * ## `note` — hataya ja raha hai, aur wo client ka faisla hai
 *
 * Ye ek chip thi (`Approx. 4 hrs sightseeing`) aur 200 akshar pe kat jaati thi. Uski jagah ab
 * package ka apna **Notes section** hai (`fields.notes`, Popular add-ons ke theek upar).
 *
 * ⚠️ **Text wapas nahi aayega.** Client se poochha gaya tha (21 Sep) — teen vikalp the: DB me
 * pada rehne do, mita do, ya naye section me jod do. Unhone **mitana** chuna. Isliye `down()`
 * bhi field wapas nahi la sakta; wo sirf shape ka wo hissa lautata hai jo lautaya ja sakta hai.
 *
 * ⚠️ Rollback ka asli raasta **`mongodump`** hai — wahi jo 020 pe likha gaya tha.
 */

/** Purana enum → wo naam jo theme (`MEAL_LABEL`) dikhati thi. */
const MEAL_NAME = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' }

export async function up({ db }) {
  const entries = db.collection('entries')

  const cursor = entries.find(
    { 'fields.itinerary': { $exists: true, $ne: [] } },
    { projection: { 'fields.itinerary': 1 } },
  )

  for await (const doc of cursor) {
    const days = doc.fields?.itinerary ?? []
    let touched = false

    const next = days.map((day) => {
      if (!day || typeof day !== 'object') return day

      const meals = Array.isArray(day.meals)
        ? day.meals.map((meal) => MEAL_NAME[meal] ?? meal)
        : day.meals

      /**
       * `note` ko object se nikaal kar chhodna hi kaafi hai — poora `itinerary` array `$set`
       * hota hai, to bacha hua field apne aap chala jaata hai. `$unset` nested array index pe
       * likhna padta aur wo har din ke liye alag path banata.
       */
      const { note, ...rest } = day

      const mealsChanged =
        Array.isArray(meals) &&
        Array.isArray(day.meals) &&
        meals.some((meal, i) => meal !== day.meals[i])
      if (note === undefined && !mealsChanged) return day

      touched = true
      return { ...rest, ...(meals === undefined ? {} : { meals }) }
    })

    if (touched) {
      await entries.updateOne({ _id: doc._id }, { $set: { 'fields.itinerary': next } })
    }
  }
}

/**
 * Rollback — naam wapas enum me.
 *
 * `note` wapas nahi aata (upar dekho). Jo meal teen jaane-maane naamon me se nahi hai wo
 * waisa ka waisa rehta hai — purana schema use reject karta, par migration ka kaam client ka
 * text phenkna nahi hai. Us soorat me purana enum wala schema hi lautana galat faisla hoga,
 * aur wo faisla yahan se nahi liya ja sakta.
 */
export async function down({ db }) {
  const entries = db.collection('entries')

  const cursor = entries.find(
    { 'fields.itinerary': { $exists: true, $ne: [] } },
    { projection: { 'fields.itinerary': 1 } },
  )

  for await (const doc of cursor) {
    const days = doc.fields?.itinerary ?? []
    let touched = false

    const next = days.map((day) => {
      if (!day || typeof day !== 'object' || !Array.isArray(day.meals)) return day

      const meals = day.meals.map((meal) => {
        const code = String(meal ?? '').toLowerCase()
        return MEAL_NAME[code] ? code : meal
      })

      if (meals.every((m, i) => m === day.meals[i])) return day

      touched = true
      return { ...day, meals }
    })

    if (touched) {
      await entries.updateOne({ _id: doc._id }, { $set: { 'fields.itinerary': next } })
    }
  }
}
