// Failed synthetic tests are also visible as Actions annotations when raw logs
// require sign-in. Keep the normal spec reporter for full diagnostic output.
export default async function* actionTestReporter(events) {
  for await (const item of events) {
    if (item.type !== "test:fail" || process.env.GITHUB_ACTIONS !== "true")
      continue;
    const error = item.data.details?.error;
    const message = [item.data.name, error?.cause?.message || error?.message]
      .filter(Boolean)
      .join(": ")
      .slice(0, 2500)
      .replaceAll("%", "%25")
      .replaceAll("\r", "%0D")
      .replaceAll("\n", "%0A");
    yield `::error title=Yardımcı testi::${message}\n`;
  }
}
