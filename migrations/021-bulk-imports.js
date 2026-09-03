/**
 * Bulk Upload — `importRuns` collection ke indexes aur roles ka sync (D-81, client 3 Sep).
 *
 * Client ke paas 20+ itinerary packages Google Docs me likhe hain. Unhe haath se daalne ka
 * matlab hai har package pe 38 khaane bharna. Ab wo ek sheet ka URL paste karta hai aur
 * package ban kar publish ho jaate hain.
 *
 * Is migration me **koi data nahi badalta** — collection nayi hai aur khaali hai.
 */

import { ROLE_PERMISSIONS } from '@cms/shared'

export async function up({ db }) {
  const runs = db.collection('importRuns')

  /**
   * List screen — site ke run, naye pehle.
   *
   * Indexes yahan hain, `model.js` me nahi: production `autoIndex: false` pe chalti hai, to
   * schema me likha index wahan banta hi nahi.
   */
  await runs.createIndex({ siteId: 1, createdAt: -1 }, { name: 'run_list' })

  /**
   * Worker ki claim query.
   *
   * `processImportQueue()` har tick pe ye poochhta hai: koi chalta hua run hai jisme koi
   * pending row bachi ho? Bina index ke wo har tick pe poori collection scan karta — aur wo
   * tick **har 2 second** chalti hai, hamesha, chahe koi import chal raha ho ya nahi.
   */
  await runs.createIndex({ status: 1, 'rows.status': 1 }, { name: 'run_claim' })

  /**
   * ⚠️ **Roles ka sync — aur ye is migration ka sabse chup-chaap zaroori hissa hai.**
   *
   * `tools.import` `permissions.js` me pehle se declared tha, par `roles` ke documents sirf
   * `pnpm seed` pe bharte hain aur wo maujooda install pe dobara nahi chalta. Bina is block ke
   * kisi bhi role ke paas `tools.import` **pahunchta hi nahi** — yaani sidebar me **Bulk Upload
   * kisi ko dikhta hi nahi**, aur koi error bhi nahi aata. Screen ban kar bhi gayab rehti.
   *
   * Yahi block 004, 016, 017 aur 018 me bhi hai. 004 apply ho chuki hai, isliye wo dobara nahi
   * chalti — har naye permission ko apni migration me ye dohrana padta hai.
   *
   * `isBuiltIn: true` custom roles ko chhota hai — unki permissions client ki chuni hui hain.
   */
  const roles = db.collection('roles')

  for (const [key, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    await roles.updateOne({ key, isBuiltIn: true }, { $set: { permissions: [...permissions] } })
  }
}

export async function down({ db }) {
  await db.collection('importRuns').dropIndexes()

  /**
   * Permissions wapas nahi hataye jaate — wahi jo 016/017/018 me hai.
   *
   * Kaun sa permission is migration se pehle kis role pe tha, ye kahin likha nahi hai. Andaza
   * laga kar hataana kisi ka access chup-chaap chheen sakta hai, aur wo is collection ke
   * indexes girane se kahin zyada nuksaandeh hai.
   */
}
