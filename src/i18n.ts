import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

export default getRequestConfig(async () => {
  const cookieStore = cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const acceptLang = headers().get("accept-language") ?? "";
  const locale =
    cookieLocale === "en" || cookieLocale === "es"
      ? cookieLocale
      : acceptLang.toLowerCase().startsWith("en")
      ? "en"
      : "es";

  return {
    locale,
    messages: (await import(`../locales/${locale}.json`)).default,
  };
});
