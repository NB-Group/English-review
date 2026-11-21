export function datasetBasePath(baseUrl: string, configuredBase?: string): string {
  const root = (configuredBase ?? `${baseUrl}data/`).replace(/\/+$/, '')
  return `${root}/kaogang/`
}
