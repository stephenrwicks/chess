Work in progress. No AI used for this project. No libraries except plain TS

This is a chess analysis board that enforces all chess rules, records notation, and has standard drag + drop, load position, rewind, etc. features.

The key to making this work is the FenReader class. It parses a FEN (Forsyth-Edwards Notation) string to determine board position, move legality, game state, etc. The game stores an array of FEN strings representing each position the game reached. Since each FEN is stored we can also determine threefold repetition by checking if any position appears three times.