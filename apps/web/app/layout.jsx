export const metadata = {
  title: 'CMS',
  description: 'MERN CMS Framework',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
