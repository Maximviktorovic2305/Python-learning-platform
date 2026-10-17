const configuredCounter =
  process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID?.trim() ?? "";
export const YANDEX_METRIKA_ID =
  /^[1-9]\d{0,14}$/.test(configuredCounter) &&
  Number.isSafeInteger(Number(configuredCounter))
    ? Number(configuredCounter)
    : null;
export const HAS_ANALYTICS = YANDEX_METRIKA_ID !== null;
