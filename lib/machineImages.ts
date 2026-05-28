const MACHINE_IMAGE_MATCHERS: Array<{ test: RegExp; file: string }> = [
  { test: /(tray separator|trayseprator|tray)/i, file: "trayseprator.jpeg" },
  { test: /paddy/i, file: "PADDY SORT-i5.jpeg" },
  { test: /thickness|thick thin|thickthin|thick|thin/i, file: "thicknessgrader.jpeg" },
  { test: /length|length grader|length sort/i, file: "lengthgrader.jpg" },
  { test: /stone/i, file: "STONE SORT-i.jpeg" },
  { test: /(colour|color).*sort|sortex|intel vision|bright/i, file: "colorsorter.png" },
  { test: /sifter|sift|shifter/i, file: "sifter.png" },
  { test: /husker|husk/i, file: "husker.jpg" },
  { test: /silky|polisher/i, file: "silky.jpg" },
  { test: /clean/i, file: "CLEAN-i.jpeg" },
  { test: /white|whitener|whiteness/i, file: "whitener.jpg" },
  { test: /blend|pack/i, file: "BLEND & PACK i12.jpeg" },
];

export function getMachineImageFile(name: string): string | null {
  const candidate = MACHINE_IMAGE_MATCHERS.find((matcher) => matcher.test.test(name));
  return candidate ? candidate.file : null;
}

export function getMachineImageSrc(name: string): string | null {
  const file = getMachineImageFile(name);
  return file ? `/machineimages/${encodeURIComponent(file)}` : null;
}
