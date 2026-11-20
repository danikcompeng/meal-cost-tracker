import { createCn } from "cn/config";

// cn joins class names and drops the ones a later class overrides
// ("px-2 px-4" -> "px-4"). It has to know our own text size, text-label
// (13 px, app/globals.css): a "text-" class it doesn't know counts as a
// text colour, so "text-label text-muted-foreground" would lose one of
// the two.
// It also knows our two press shrinks (globals.css) are one setting, so a
// full-width Button's "press-wide" replaces the "press" every Button has.
export const cn = createCn({
  extend: {
    classGroups: { "font-size": [{ text: ["label"] }], press: ["press", "press-wide"] },
  },
});
