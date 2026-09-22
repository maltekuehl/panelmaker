"use client"
import { useEffect } from "react"
import * as CookieConsent from "vanilla-cookieconsent"
import pluginConfig from "./cookie-consent-config"

import "vanilla-cookieconsent/dist/cookieconsent.css"

const CookieConsentComponent = () => {
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("noCookieConsent")) return
    CookieConsent.run(pluginConfig)
  }, [])

  return null
}

export default CookieConsentComponent
