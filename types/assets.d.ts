/**
 * CSS imports ke liye ambient declarations.
 *
 * Admin plain CSS use karta hai (D-28) aur har component apni `.css` khud import
 * karta hai (`Sidebar.jsx` → `Sidebar.css`). Vite ye handle karta hai, par `checkJs`
 * wale editor ko har aise import pe "module nahi mila" dikhta hai — poore admin me
 * ye shor har component pe aata.
 *
 * Ye file **TypeScript adopt karna nahi hai** (D-03 waise hi hai). Yahan koi code
 * nahi hai, sirf ek ambient declaration taaki editor bundler ke behaviour ko samjhe.
 */
declare module '*.css'
declare module '*.svg'
declare module '*.png'
declare module '*.jpg'
declare module '*.webp'
