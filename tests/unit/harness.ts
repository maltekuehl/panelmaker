let failures = 0

export function check(name: string, fn: () => void): void {
  try {
    fn()
    console.log(`  ok  ${name}`)
  } catch (error) {
    failures += 1
    console.error(`FAIL  ${name}\n      ${error instanceof Error ? error.message : String(error)}`)
  }
}

export function finish(suite: string): void {
  if (failures > 0) {
    console.error(`\n${failures} assertion(s) failed`)
    process.exit(1)
  }
  console.log(`\nAll ${suite} assertions passed`)
}
