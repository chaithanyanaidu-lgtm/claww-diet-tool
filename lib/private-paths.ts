// Pages that only make sense signed in: the plan list and a saved plan (not /plan/new or /plan/preview).
const PRIVATE = [/^\/plans\/?$/, /^\/plan\/(?!new\/?$|preview\/?$)[^/]+\/?$/];

export const isPrivatePath = (pathname: string) => PRIVATE.some((re) => re.test(pathname));
