/**
 * Spoken word list for Passphra.si.
 *
 * Rules every word follows (brief §Rules): short, common, concrete, easy to
 * say and hard to mishear on a bad line. No homophones (no pear/pair, sun/son,
 * flower/flour, rose/rows, deer/dear …), no close rhymes kept side by side
 * (kitten vs mitten, carrot vs parrot — one of each pair was cut), nothing
 * alarming or rude, and nothing that reuses a word from the app's own copy
 * ("check", "match", "code", "money", "help").
 *
 * A word is picked by index (`wordAt`), so a localized list (Portuguese,
 * Hebrew) can slot in later as a sibling entry. Both phones of a pair must use
 * the same list — they will, as long as the list is chosen per pair and not per
 * phone. v1 ships English only.
 *
 * Do NOT reorder or remove words once phones are paired in the wild: the index
 * is what both phones agree on. Appending is also a change (it moves `% length`)
 * — bump WORD_LIST_VERSION and the derivation label if the list ever changes.
 */
export const WORD_LIST_VERSION = 1;

const EN: readonly string[] = [
  "acorn", "almond", "anchor", "apple", "arrow", "autumn", "badger", "balloon",
  "bamboo", "banana", "banjo", "barley", "basket", "beaver", "biscuit", "bison",
  "blanket", "blossom", "bottle", "bracelet", "broccoli", "brownie", "bubble", "bucket",
  "buffalo", "cabbage", "cabin", "cactus", "camel", "camera", "canary", "candle",
  "canoe", "canyon", "captain", "carpet", "cashew", "castle", "cherry", "chimney",
  "cinnamon", "clover", "cocoa", "coconut", "comet", "compass", "cookie", "cotton",
  "cowboy", "coyote", "crayon", "cricket", "cupcake", "daisy", "dinner", "dolphin",
  "domino", "donkey", "duckling", "eagle", "emerald", "envelope", "falcon", "feather",
  "fiddle", "flamingo", "forest", "fossil", "fountain", "garden", "garlic", "giraffe",
  "ginger", "glacier", "goose", "grape", "gravy", "guitar", "hammock", "hamster",
  "harbor", "harvest", "hedgehog", "hippo", "holly", "honey", "iceberg", "igloo",
  "island", "jacket", "jasmine", "jelly", "jigsaw", "jungle", "kayak", "kettle",
  "kitten", "kiwi", "koala", "ladder", "lagoon", "lantern", "lavender", "lemon",
  "lettuce", "lily", "llama", "lobster", "lollipop", "magnet", "mango", "maple",
  "meadow", "melon", "monkey", "muffin", "mushroom", "mustard", "napkin", "noodle",
  "nutmeg", "oatmeal", "ocean", "octopus", "olive", "orange", "orbit", "orchid",
  "otter", "owl", "oyster", "paddle", "panda", "paprika", "parrot", "parsley",
  "pasta", "peach", "peacock", "peanut", "pecan", "pelican", "pencil", "penguin",
  "pepper", "piano", "pickle", "pigeon", "pillow", "pilot", "pinecone", "planet",
  "plum", "pocket", "popcorn", "potato", "pretzel", "puffin", "pumpkin", "puppy",
  "puzzle", "quilt", "rabbit", "raccoon", "radio", "radish", "raisin", "raven",
  "rhubarb", "ribbon", "river", "robin", "rocket", "saddle", "salmon", "sapphire",
  "sardine", "saucer", "scarf", "seagull", "sesame", "shamrock", "shovel", "silver",
  "skillet", "snowman", "sofa", "sparrow", "spinach", "sponge", "spoon", "squirrel",
  "strawberry", "sugar", "summer", "sunflower", "swan", "sweater", "table", "taco",
  "tangerine", "teapot", "teddy", "thimble", "tiger", "toaster", "toffee", "tomato",
  "tortoise", "toucan", "tractor", "trolley", "trophy", "trumpet", "tugboat", "tulip",
  "turnip", "turtle", "tuxedo", "umbrella", "valley", "vanilla", "velvet", "violin",
  "waffle", "wagon", "walnut", "whistle", "willow", "window", "winter", "wombat",
  "yogurt", "zebra", "zipper", "hazel", "lizard", "nectar", "oasis", "mammoth",
  "glove", "drum", "seashell", "rainbow",
];

export const WORD_LISTS = { en: EN } as const;
export type WordLocale = keyof typeof WORD_LISTS;

export function wordAt(index: number, locale: WordLocale = "en"): string {
  const list = WORD_LISTS[locale];
  return list[index % list.length];
}

export function wordCount(locale: WordLocale = "en"): number {
  return WORD_LISTS[locale].length;
}
