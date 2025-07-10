Attempting to make a fully working chess UI in TS.

I am using custom elements for the board, squares, and pieces. Right now <sw-board></sw-board> in html should initialize everything.

This is the first time I've used layers of inheritance with custom elements. It makes perfect sense because Piece handles the drag and drop functionality, etc.

The Piece class is an abstract class which is another interesting feature.

The rules are mostly easier than I thought to figure out, except for handling checks / getting out of checks / moving into checks.
