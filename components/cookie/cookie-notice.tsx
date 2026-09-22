import CookieConsentComponent from "./cookie-consent"

export const CookieNotice = () => {
  if (process.env.NODE_ENV === "test") {
    // Skip rendering in test environment
    return null
  }

  return (
    <div id="cookieconsent" suppressHydrationWarning>
      <CookieConsentComponent />
    </div>
  )
}
