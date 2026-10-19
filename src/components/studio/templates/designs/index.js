import broadsheet from './broadsheet/index.js';

// The newsletter design systems, in picker order. Each is
// { id, label, description, className, Masthead, options } and is drawn by
// NewsletterPage; add one by adding its file here.
export const DESIGNS = [broadsheet];

export const DEFAULT_DESIGN = DESIGNS[0].id;

/** The design with this id, or the default one. */
export const designById = (id) => DESIGNS.find((d) => d.id === id) ?? DESIGNS[0];
